<?php
// File: app/Http\Controllers\ResourcePlanController.php

namespace App\Http\Controllers;

use App\Models\ResourcePlan;
use App\Models\PrepArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ResourcePlanController extends Controller
{
    /**
     * Get resource plan for a specific week
     */
    public function show(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'week_start' => 'required|date'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $weekStart = Carbon::parse($request->week_start)->startOfWeek(Carbon::MONDAY)->format('Y-m-d');
            $plan = ResourcePlan::where('week_start', $weekStart)->first();

            // Get prep areas
            $prepAreas = PrepArea::where('status', 'active')->get(['id', 'name']);

            if (!$plan) {
                // Create default plan
                $defaultRevenue = [
                    'monday' => 2500,
                    'tuesday' => 2800,
                    'wednesday' => 3200,
                    'thursday' => 3500,
                    'friday' => 5200,
                    'saturday' => 6800,
                    'sunday' => 4200
                ];

                // Create default distribution
                $distribution = [];
                if ($prepAreas->count() > 0) {
                    $percentage = 100 / $prepAreas->count();
                    foreach ($prepAreas as $index => $area) {
                        $distribution[$area->id] = $index === $prepAreas->count() - 1
                            ? 100 - (floor($percentage) * ($prepAreas->count() - 1))
                            : floor($percentage);
                    }
                }

                $plan = ResourcePlan::create([
                    'week_start' => $weekStart,
                    'labor_target_percentage' => 30,
                    'hourly_rate' => 0,
                    'revenue_forecast' => $defaultRevenue,
                    'prep_area_distribution' => $distribution,
                ]);

                // Calculate derived values
                $plan->calculateDerivedValues()->save();
            }

            return response()->json([
                'plan' => $plan,
                'prep_areas' => $prepAreas
            ]);
        } catch (\Exception $e) {
            Log::error('ResourcePlan Show Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch resource plan'], 500);
        }
    }

    /**
     * Create or update a resource plan
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'week_start' => 'required|date',
                'labor_target_percentage' => 'required|numeric|min:0|max:100',
                'hourly_rate' => 'required|numeric|min:0',
                'revenue_forecast' => 'required|array',
                'revenue_forecast.monday' => 'required|numeric|min:0',
                'revenue_forecast.tuesday' => 'required|numeric|min:0',
                'revenue_forecast.wednesday' => 'required|numeric|min:0',
                'revenue_forecast.thursday' => 'required|numeric|min:0',
                'revenue_forecast.friday' => 'required|numeric|min:0',
                'revenue_forecast.saturday' => 'required|numeric|min:0',
                'revenue_forecast.sunday' => 'required|numeric|min:0',
                'prep_area_distribution' => 'required|array',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Validate distribution totals 100%
            $distributionTotal = array_sum($request->prep_area_distribution);
            if (abs($distributionTotal - 100) > 0.1) {
                return response()->json([
                    'message' => 'Prep area distribution must total 100%',
                    'errors' => ['prep_area_distribution' => ['Total must be 100%']]
                ], 422);
            }

            $weekStart = Carbon::parse($request->week_start)->startOfWeek(Carbon::MONDAY)->format('Y-m-d');

            // Update or create plan
            $plan = ResourcePlan::updateOrCreate(
                ['week_start' => $weekStart],
                [
                    'labor_target_percentage' => $request->labor_target_percentage,
                    'hourly_rate' => $request->hourly_rate,
                    'revenue_forecast' => $request->revenue_forecast,
                    'prep_area_distribution' => $request->prep_area_distribution,
                    'notes' => $request->notes ?? null
                ]
            );

            // Calculate derived values
            $plan->calculateDerivedValues()->save();

            Log::info('Resource plan saved:', [
                'week_start' => $weekStart,
                'plan_id' => $plan->id
            ]);

            return response()->json([
                'message' => 'Resource plan saved successfully',
                'plan' => $plan,
                'id' => $plan->id
            ], 201);
        } catch (\Exception $e) {
            Log::error('ResourcePlan Store Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to save resource plan'], 500);
        }
    }

    /**
     * Get all resource plans
     */
    public function index(Request $request)
    {
        try {
            $plans = ResourcePlan::orderBy('week_start', 'desc')->get();
            return response()->json($plans);
        } catch (\Exception $e) {
            Log::error('ResourcePlan Index Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch resource plans'], 500);
        }
    }

    /**
     * Delete resource plan
     */
    public function destroy($id)
    {
        try {
            $plan = ResourcePlan::findOrFail($id);
            $plan->delete();

            Log::info('Resource plan deleted:', ['plan_id' => $id]);

            return response()->json([
                'message' => 'Resource plan deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('ResourcePlan Destroy Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete resource plan'], 500);
        }
    }
}
