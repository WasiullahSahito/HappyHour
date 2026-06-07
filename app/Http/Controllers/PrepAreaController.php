<?php
// File: app/Http/Controllers/PrepAreaController.php

namespace App\Http\Controllers;

use App\Models\PrepArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PrepAreaController extends Controller
{
    /**
     * Display a listing of prep areas
     */
    public function index()
    {
        try {
            $activeAreas = PrepArea::where('status', 'active')->get();
            $inactiveAreas = PrepArea::onlyTrashed()->get();

            return response()->json([
                'active_areas' => $activeAreas,
                'inactive_areas' => $inactiveAreas
            ]);
        } catch (\Exception $e) {
            Log::error('PrepArea Index Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch prep areas'], 500);
        }
    }

    /**
     * Store a newly created prep area
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:prep_areas,name',
                'description' => 'nullable|string',
            ]);

            $prepArea = PrepArea::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => 'active'
            ]);

            Log::info('Prep area created:', ['id' => $prepArea->id, 'name' => $prepArea->name]);

            return response()->json([
                'message' => 'Prep area created successfully',
                'prep_area' => $prepArea
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('PrepArea Store Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create prep area'], 500);
        }
    }

    /**
     * Update the specified prep area
     */
    public function update(Request $request, $id)
    {
        try {
            $prepArea = PrepArea::withTrashed()->findOrFail($id);

            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:prep_areas,name,' . $id,
                'description' => 'nullable|string',
            ]);

            $prepArea->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null
            ]);

            Log::info('Prep area updated:', ['id' => $prepArea->id, 'name' => $prepArea->name]);

            return response()->json([
                'message' => 'Prep area updated successfully',
                'prep_area' => $prepArea
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('PrepArea Update Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update prep area'], 500);
        }
    }

    /**
     * Deactivate (soft delete) a prep area
     */
    public function deactivate($id)
    {
        try {
            $prepArea = PrepArea::findOrFail($id);
            $prepArea->update(['status' => 'inactive']);
            $prepArea->delete(); // Soft delete

            Log::info('Prep area deactivated:', ['id' => $prepArea->id]);

            return response()->json([
                'message' => 'Prep area deactivated successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('PrepArea Deactivate Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to deactivate prep area'], 500);
        }
    }

    /**
     * Reactivate a prep area
     */
    public function reactivate($id)
    {
        try {
            $prepArea = PrepArea::onlyTrashed()->findOrFail($id);
            $prepArea->restore();
            $prepArea->update(['status' => 'active']);

            Log::info('Prep area reactivated:', ['id' => $prepArea->id]);

            return response()->json([
                'message' => 'Prep area reactivated successfully',
                'prep_area' => $prepArea
            ]);
        } catch (\Exception $e) {
            Log::error('PrepArea Reactivate Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to reactivate prep area'], 500);
        }
    }

    /**
     * Permanently delete a prep area
     */
    public function destroy($id)
    {
        try {
            $prepArea = PrepArea::onlyTrashed()->findOrFail($id);
            $prepArea->forceDelete();

            Log::info('Prep area permanently deleted:', ['id' => $id]);

            return response()->json([
                'message' => 'Prep area permanently deleted'
            ]);
        } catch (\Exception $e) {
            Log::error('PrepArea Destroy Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete prep area'], 500);
        }
    }
}
