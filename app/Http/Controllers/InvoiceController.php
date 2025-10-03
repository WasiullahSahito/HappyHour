<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Ingredient;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
// We don't need the Facade anymore, we will call the client directly.
// use Gemini\Laravel\Facades\Gemini;
use Gemini\Data\Blob;
use Gemini\Enums\MimeType;

class InvoiceController extends Controller
{
    public function index()
    {
        return Invoice::with('supplier')->orderBy('invoice_date', 'desc')->get()->map(function ($invoice) {
            if (empty($invoice->status)) {
                $invoice->status = 'processed';
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
        if ($invoice->status === 'processed' || $invoice->status === 'processing') {
            return response()->json(['message' => 'Invoice has already been processed or is in the queue.'], 409);
        }

        $invoice->status = 'processing';
        $invoice->save();

        try {
            if (!env('GEMINI_API_KEY')) {
                throw new \Exception('Gemini API key is not configured.');
            }

            $filePath = storage_path('app/public/' . $invoice->invoice_file);
            if (!file_exists($filePath)) {
                throw new \Exception('Invoice file not found on the server.');
            }

            $mimeTypeString = mime_content_type($filePath);
            $mimeTypeEnum = MimeType::from($mimeTypeString);
            $prompt = file_get_contents(base_path('prompts/invoice_extraction_prompt.txt'));

            // <<< --- THE FINAL, DIRECT INSTANTIATION FIX IS HERE --- >>>
            // We build the client directly from the core Gemini library. This is the most reliable method.
            // The `\` before Gemini ensures we are using the global namespace.
            $result = \Gemini::client(env('GEMINI_API_KEY'))
                ->geminiProVision()
                ->generateContent([
                    $prompt,
                    new Blob(
                        mimeType: $mimeTypeEnum,
                        data: base64_encode(file_get_contents($filePath))
                    )
                ]);

            $jsonResponse = trim(str_replace(['```json', '```'], '', $result->text()));
            $extractedData = json_decode($jsonResponse, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Gemini Invalid JSON Response for Invoice ' . $invoice->id . ': ' . $jsonResponse);
                throw new \Exception('AI returned an invalid data structure.');
            }

            $invoice->total = $extractedData['totals']['grand_total'] ?? $extractedData['totals']['total'] ?? $invoice->total;
            $invoice->invoice_number = $extractedData['details']['invoice_number'] ?? $invoice->invoice_number;

            if (isset($extractedData['orders']) && is_array($extractedData['orders'])) {
                foreach ($extractedData['orders'] as $item) {
                    $description = $item['description'] ?? null;
                    if ($description && !Ingredient::where('ingredient_name', 'ILIKE', $description)->exists()) {
                        Ingredient::create([
                            'ingredient_name' => $description,
                            'category' => 'Uncategorised',
                            'unit' => 'unit',
                            'primary_supplier_id' => $invoice->supplier_id,
                        ]);
                    }
                }
            }

            $invoice->ai_extraction_data = $extractedData;
            $invoice->status = 'processed';
            $invoice->save();

            return response()->json([
                'message' => 'Invoice processed successfully by AI.',
                'invoice' => $invoice,
            ]);
        } catch (\Exception $e) {
            Log::error("Gemini Processing Error for Invoice ID " . $invoice->id . ": " . $e->getMessage());
            $invoice->status = 'needs review';
            $invoice->save();
            return response()->json(['message' => "AI processing failed: " . $e->getMessage()], 500);
        }
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
