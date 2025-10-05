<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Ingredient;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\IngredientPriceHistory;

class InvoiceController extends Controller
{
    public function index()
    {
        return Invoice::with('supplier')->orderBy('invoice_date', 'desc')->get()->map(function ($invoice) {
            if (empty($invoice->status)) {
                $invoice->status = 'uploaded';
            }
            return $invoice;
        });
    }

    public function show($id)
    {
        $invoice = Invoice::with('supplier')->findOrFail($id);
        return response()->json($invoice);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'invoice_file' => 'required|file|mimes:pdf,jpg,png,jpeg|max:4096',
        ]);

        $path = $request->file('invoice_file')->store('invoices', 'public');
        $supplier = Supplier::find($validated['supplier_id']);
        $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $supplier->company_name), 0, 3));

        $invoice = Invoice::create([
            'supplier_id' => $validated['supplier_id'],
            'invoice_date' => $validated['invoice_date'],
            'due_date' => $validated['due_date'],
            'invoice_file' => $path,
            'invoice_number' => $prefix . '-' . date('Ymd') . '-' . Str::random(4),
            'status' => 'uploaded',
        ]);

        return response()->json($invoice->load('supplier'), 201);
    }

    public function processWithAI(Request $request, Invoice $invoice)
    {
        // FIXED: Better status handling
        if ($invoice->status === 'processing') {
            return response()->json(['message' => 'Invoice is currently being processed.'], 409);
        }

        // Allow re-processing for these statuses
        if (!in_array($invoice->status, ['uploaded', 'needs review'])) {
            return response()->json(['message' => 'Invoice has already been processed.'], 409);
        }

        $invoice->status = 'processing';
        $invoice->save();

        try {
            $apiKey = env('GEMINI_API_KEY');
            if (!$apiKey) {
                throw new \Exception('Gemini API key is not configured.');
            }

            $filePath = storage_path('app/public/' . $invoice->invoice_file);
            if (!file_exists($filePath)) {
                throw new \Exception('Invoice file not found on the server.');
            }

            $imageData = base64_encode(file_get_contents($filePath));
            $mimeType = mime_content_type($filePath);

            $prompt = file_get_contents(base_path('prompts/invoice_extraction_prompt.txt'));

            $client = new \GuzzleHttp\Client();

            Log::info("Sending request to Gemini API for invoice {$invoice->id}");

            $response = $client->post("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
                'json' => [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                                [
                                    'inline_data' => [
                                        'mime_type' => $mimeType,
                                        'data' => $imageData
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'topK' => 32,
                        'topP' => 1,
                        'maxOutputTokens' => 4096,
                    ]
                ],
                'timeout' => 60
            ]);

            $result = json_decode($response->getBody(), true);

            if (!isset($result['candidates'][0]['content']['parts'][0]['text'])) {
                Log::error('No text in Gemini response for invoice ' . $invoice->id);
                throw new \Exception('No response from AI model');
            }

            $jsonResponse = trim(str_replace(['```json', '```'], '', $result['candidates'][0]['content']['parts'][0]['text']));

            Log::info("Raw Gemini response for invoice {$invoice->id}: " . $jsonResponse);

            $extractedData = json_decode($jsonResponse, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Gemini Invalid JSON Response for Invoice ' . $invoice->id . ': ' . $jsonResponse . ' Error: ' . json_last_error_msg());
                throw new \Exception('AI returned an invalid data structure. JSON Error: ' . json_last_error_msg());
            }

            // DEBUG: Log what we extracted
            Log::info("Successfully extracted data for invoice {$invoice->id}", [
                'has_orders' => isset($extractedData['orders']),
                'orders_count' => isset($extractedData['orders']) ? count($extractedData['orders']) : 0,
                'orders' => $extractedData['orders'] ?? []
            ]);

            // FIXED: Ensure we have orders array
            if (!isset($extractedData['orders']) || !is_array($extractedData['orders'])) {
                Log::warning('No orders found in extracted data, creating empty array');
                $extractedData['orders'] = [];
            }

            // Calculate and validate totals
            $this->calculateAndValidateTotals($extractedData);

            // Update invoice with extracted data
            $this->updateInvoiceFromExtractedData($invoice, $extractedData);

            // Process ingredients from orders
            $ingredientsAdded = $this->processInvoiceItems($extractedData, $invoice);

            $invoice->ai_extraction_data = $extractedData;
            $invoice->status = 'processed';
            $invoice->save();

            Log::info("Invoice {$invoice->id} processed successfully with " . count($extractedData['orders']) . " items");

            return response()->json([
                'message' => 'Invoice processed successfully by AI. ' . $ingredientsAdded . ' ingredients added/updated.',
                'invoice' => $invoice,
                'ingredients_added' => $ingredientsAdded,
                'items_processed' => count($extractedData['orders'])
            ]);
        } catch (\Exception $e) {
            Log::error("Gemini Processing Error for Invoice ID " . $invoice->id . ": " . $e->getMessage());
            $invoice->status = 'needs review';
            $invoice->save();
            return response()->json(['message' => "AI processing failed: " . $e->getMessage()], 500);
        }
    }

    /**
     * Calculate and validate totals from extracted data
     */
    private function calculateAndValidateTotals(&$extractedData)
    {
        if (empty($extractedData['orders']) || !is_array($extractedData['orders'])) {
            $extractedData['totals'] = [
                'ex_tax' => 0,
                'gst' => 0,
                'grand_total' => 0
            ];
            return;
        }

        $calculatedSubtotal = 0;
        $calculatedGST = 0;

        foreach ($extractedData['orders'] as &$item) {
            // Normalize and validate item data
            $quantity = floatval($item['qty'] ?? $item['quantity'] ?? 1);
            $unitPrice = floatval($item['price'] ?? $item['unit_price'] ?? 0);

            // Calculate total if not provided
            if (!isset($item['total']) || empty($item['total'])) {
                $item['total'] = $quantity * $unitPrice;
            } else {
                $item['total'] = floatval($item['total']);
            }

            // Handle GST - ensure it's a number
            $itemGST = $item['gst'] ?? $item['GST'] ?? 0;
            $item['gst'] = floatval($itemGST);

            $calculatedSubtotal += $item['total'];
            $calculatedGST += $item['gst'];
        }

        // Set up totals if not exists
        if (!isset($extractedData['totals'])) {
            $extractedData['totals'] = [];
        }

        // Use calculated values as fallbacks
        $extractedData['totals']['ex_tax'] = $extractedData['totals']['ex_tax'] ?? $calculatedSubtotal;
        $extractedData['totals']['gst'] = $extractedData['totals']['gst'] ?? $extractedData['totals']['GST'] ?? $calculatedGST;
        $extractedData['totals']['grand_total'] = $extractedData['totals']['grand_total'] ??
            $extractedData['totals']['total'] ??
            $extractedData['totals']['balance_due'] ??
            ($calculatedSubtotal + $calculatedGST);

        // Ensure numeric values
        $extractedData['totals']['ex_tax'] = floatval($extractedData['totals']['ex_tax']);
        $extractedData['totals']['gst'] = floatval($extractedData['totals']['gst']);
        $extractedData['totals']['grand_total'] = floatval($extractedData['totals']['grand_total']);
    }

    /**
     * Update invoice from extracted data
     */
    private function updateInvoiceFromExtractedData($invoice, $extractedData)
    {
        // Update invoice number if found
        if (isset($extractedData['details']['invoice_number'])) {
            $invoice->invoice_number = $extractedData['details']['invoice_number'];
        }

        // Update total from extracted data
        if (isset($extractedData['totals']['grand_total'])) {
            $invoice->total = $extractedData['totals']['grand_total'];
        } elseif (isset($extractedData['totals']['total'])) {
            $invoice->total = $extractedData['totals']['total'];
        } elseif (isset($extractedData['totals']['balance_due'])) {
            $invoice->total = $extractedData['totals']['balance_due'];
        }
    }

    /**
     * Process invoice items and create/update ingredients
     */
    private function processInvoiceItems($extractedData, $invoice)
    {
        $ingredientsAdded = 0;

        if (empty($extractedData['orders']) || !is_array($extractedData['orders'])) {
            return $ingredientsAdded;
        }

        foreach ($extractedData['orders'] as $item) {
            $description = $item['description'] ?? null;
            $price = $item['price'] ?? $item['unit_price'] ?? null;
            $quantity = $item['qty'] ?? $item['quantity'] ?? 1;

            if (!empty($description)) {
                $unit = $this->extractUnitFromDescription($description, $item);

                // Calculate unit price if we have total and quantity
                if (!$price && isset($item['total']) && $quantity > 0) {
                    $price = $item['total'] / $quantity;
                }

                // Use case-insensitive search
                $existingIngredient = Ingredient::whereRaw('LOWER(ingredient_name) = ?', [strtolower(trim($description))])->first();

                if (!$existingIngredient) {
                    $ingredientData = [
                        'ingredient_name' => trim($description),
                        'category' => 'Uncategorised',
                        'unit' => $unit,
                        'primary_supplier_id' => $invoice->supplier_id,
                        'current_price' => $price ? round($price, 2) : null,
                    ];

                    $newIngredient = Ingredient::create($ingredientData);

                    if ($price) {
                        IngredientPriceHistory::create([
                            'ingredient_id' => $newIngredient->id,
                            'price' => round($price, 2),
                            'log_date' => now(),
                        ]);
                    }

                    $ingredientsAdded++;
                } else {
                    // Update existing ingredient price if we have a new price
                    if ($price && $existingIngredient->current_price != round($price, 2)) {
                        $existingIngredient->update(['current_price' => round($price, 2)]);

                        IngredientPriceHistory::create([
                            'ingredient_id' => $existingIngredient->id,
                            'price' => round($price, 2),
                            'log_date' => now(),
                        ]);
                    }
                }
            }
        }

        return $ingredientsAdded;
    }

    private function extractUnitFromDescription($description, $item)
    {
        $description = strtolower($description);

        $unitMap = [
            'kg' => ['kg', 'kilogram', 'kilo'],
            'g' => ['g', 'gram'],
            'litre' => ['litre', 'ltr', 'l', 'liter'],
            'ml' => ['ml', 'millilitre'],
            'each' => ['each', 'unit', 'ea'],
            'carton' => ['ctn', 'carton'],
            'pack' => ['pack', 'pk'],
            'box' => ['box'],
            'bunch' => ['bunch'],
            'bag' => ['bag'],
        ];

        foreach ($unitMap as $unit => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($description, $keyword) !== false) {
                    return $unit;
                }
            }
        }

        $quantity = $item['qty'] ?? $item['quantity'] ?? '';
        $quantityStr = strtolower((string)$quantity);

        foreach ($unitMap as $unit => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($quantityStr, $keyword) !== false) {
                    return $unit;
                }
            }
        }

        return 'unit';
    }

    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        return response()->json($invoice);
    }

    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);
        if ($invoice->invoice_file) {
            Storage::disk('public')->delete($invoice->invoice_file);
        }
        $invoice->delete();
        return response()->json(null, 204);
    }
}
