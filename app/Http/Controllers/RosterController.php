<?php

namespace App\Http\Controllers;

use App\Models\Roster;
use App\Models\Team;
use App\Models\PrepArea;
use App\Models\ResourcePlan;
use App\Models\TeamWeekSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class RosterController extends Controller
{
    /**
     * Get roster data for a specific week with all related information
     */
    public function index(Request $request)
    {
        try {
            $request->validate(['week_start' => 'required|date']);

            $weekStart = Carbon::parse($request->week_start)->startOfWeek(Carbon::MONDAY)->format('Y-m-d');

            // Get existing roster entries for the week
            $rosterEntries = Roster::where('week_start', $weekStart)->get();

            // Get resource plan for the week
            $resourcePlan = ResourcePlan::where('week_start', $weekStart)->first();

            // Get active prep areas
            $prepAreas = PrepArea::where('status', 'active')->get(['id', 'name']);

            // Get all active team members with their schedules
            $teamMembers = Team::where('status', 'active')->get();

            // Calculate availability for each team member for the week
            $staffAvailability = [];
            foreach ($teamMembers as $member) {
                $weekSchedule = $this->getWeekSchedule($member, $weekStart);
                $workedHours = $this->calculateWorkedHours($member, $weekStart);
                $scheduledHours = $this->calculateScheduledHours($weekSchedule);

                $staffAvailability[] = [
                    'id' => $member->id,
                    'name' => $member->first_name . ' ' . $member->last_name,
                    'position' => $member->position ?? 'Staff',
                    'week_schedule' => $weekSchedule,
                    'total_scheduled_hours' => $scheduledHours,
                    'worked_hours' => $workedHours,
                    'hours_left' => max(0, $scheduledHours - $workedHours),
                    'utilization_percentage' => $scheduledHours > 0 ? round(($workedHours / $scheduledHours) * 100, 0) : 0
                ];
            }

            // Calculate target hours per day per prep area from resource plan
            $targetHours = $this->calculateTargetHours($resourcePlan, $prepAreas);

            // Calculate assigned hours per day per prep area
            $assignedHours = $this->calculateAssignedHours($rosterEntries, $prepAreas);

            return response()->json([
                'roster_entries' => $rosterEntries,
                'prep_areas' => $prepAreas,
                'staff_availability' => $staffAvailability,
                'target_hours' => $targetHours,
                'assigned_hours' => $assignedHours,
                'resource_plan' => $resourcePlan,
                'week_start' => $weekStart
            ]);
        } catch (\Exception $e) {
            Log::error('Roster Index Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to fetch roster data',
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Assign a staff member to a shift
     */
    public function assignShift(Request $request)
    {
        try {
            $validated = $request->validate([
                'week_start' => 'required|date',
                'team_id' => 'required|exists:teams,id',
                'prep_area_id' => 'required|exists:prep_areas,id',
                'day' => 'required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'start_time' => 'required',
                'end_time' => 'required',
                'break_minutes' => 'nullable|integer|min:0'
            ]);

            $weekStart = Carbon::parse($validated['week_start'])->startOfWeek(Carbon::MONDAY)->format('Y-m-d');

            // Verify staff availability
            $teamMember = Team::findOrFail($validated['team_id']);
            $availability = $this->checkAvailability(
                $teamMember,
                $weekStart,
                $validated['day'],
                $validated['start_time'],
                $validated['end_time']
            );

            if (!$availability['available']) {
                return response()->json([
                    'message' => 'Staff member is not available during this time',
                    'reason' => $availability['reason'],
                    'available_windows' => $availability['available_windows'] ?? []
                ], 422);
            }

            // Calculate shift duration
            $startTime = Carbon::parse($validated['start_time']);
            $endTime = Carbon::parse($validated['end_time']);
            $breakMinutes = $validated['break_minutes'] ?? 30;
            $totalMinutes = $startTime->diffInMinutes($endTime) - $breakMinutes;
            $totalHours = round($totalMinutes / 60, 1);

            // Create roster entry
            $roster = Roster::create([
                'week_start' => $weekStart,
                'team_id' => $validated['team_id'],
                'prep_area_id' => $validated['prep_area_id'],
                'day' => $validated['day'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'break_minutes' => $breakMinutes,
                'total_hours' => $totalHours,
                'assigned_staff' => [$validated['team_id']]
            ]);

            Log::info('Shift assigned:', [
                'roster_id' => $roster->id,
                'team_id' => $validated['team_id'],
                'day' => $validated['day']
            ]);

            // Return updated assignment data
            return response()->json([
                'message' => 'Shift assigned successfully',
                'roster' => $roster,
                'assigned_hours' => $totalHours
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Assign Shift Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to assign shift', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing roster entry
     */
    public function updateShift(Request $request, $id)
    {
        try {
            $roster = Roster::findOrFail($id);

            $validated = $request->validate([
                'start_time' => 'sometimes|required',
                'end_time' => 'sometimes|required',
                'break_minutes' => 'nullable|integer|min:0'
            ]);

            // Recalculate hours if times changed
            if (isset($validated['start_time']) || isset($validated['end_time'])) {
                $startTime = Carbon::parse($validated['start_time'] ?? $roster->start_time);
                $endTime = Carbon::parse($validated['end_time'] ?? $roster->end_time);
                $breakMinutes = $validated['break_minutes'] ?? $roster->break_minutes ?? 30;

                $totalMinutes = $startTime->diffInMinutes($endTime) - $breakMinutes;
                $validated['total_hours'] = round($totalMinutes / 60, 1);
                $validated['break_minutes'] = $breakMinutes;
            }

            $roster->update($validated);

            return response()->json([
                'message' => 'Shift updated successfully',
                'roster' => $roster
            ]);
        } catch (\Exception $e) {
            Log::error('Update Shift Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update shift'], 500);
        }
    }

    /**
     * Remove a staff assignment from roster
     */
    public function removeShift($id)
    {
        try {
            $roster = Roster::findOrFail($id);
            $roster->delete();

            Log::info('Shift removed:', ['roster_id' => $id]);

            return response()->json([
                'message' => 'Shift removed successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Remove Shift Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to remove shift'], 500);
        }
    }

    /**
     * Check staff availability for a specific time slot
     */
    public function checkStaffAvailability(Request $request)
    {
        try {
            $validated = $request->validate([
                'team_id' => 'required|exists:teams,id',
                'week_start' => 'required|date',
                'day' => 'required|string',
                'start_time' => 'nullable',
                'end_time' => 'nullable'
            ]);

            $teamMember = Team::findOrFail($validated['team_id']);
            $weekStart = Carbon::parse($validated['week_start'])->startOfWeek(Carbon::MONDAY)->format('Y-m-d');

            $availability = $this->checkAvailability(
                $teamMember,
                $weekStart,
                $validated['day'],
                $validated['start_time'] ?? null,
                $validated['end_time'] ?? null
            );

            return response()->json($availability);
        } catch (\Exception $e) {
            Log::error('Check Availability Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to check availability'], 500);
        }
    }

    /**
     * Helper: Calculate target hours from resource plan
     */
    private function calculateTargetHours($resourcePlan, $prepAreas)
    {
        $targetHours = [];
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        foreach ($days as $day) {
            $targetHours[$day] = [];

            if ($resourcePlan) {
                // Get daily revenue for this day
                $dailyRevenue = $resourcePlan->revenue_forecast[$day] ?? 0;

                // Calculate daily labor budget
                $dailyLaborBudget = ($dailyRevenue * $resourcePlan->labor_target_percentage) / 100;

                // Calculate total hours for the day
                $dailyHours = $resourcePlan->hourly_rate > 0 ? $dailyLaborBudget / $resourcePlan->hourly_rate : 0;

                // Distribute hours across prep areas based on distribution percentages
                $distribution = $resourcePlan->prep_area_distribution ?? [];

                foreach ($prepAreas as $area) {
                    $percentage = $distribution[$area->id] ?? 0;
                    $targetHours[$day][$area->id] = round(($dailyHours * $percentage) / 100, 1);
                }
            } else {
                // No resource plan - set all to 0
                foreach ($prepAreas as $area) {
                    $targetHours[$day][$area->id] = 0;
                }
            }
        }

        return $targetHours;
    }

    /**
     * Helper: Get week schedule for a team member
     */
    private function getWeekSchedule($teamMember, $weekStart)
    {
        // Check for week-specific schedule override
        $weekSchedule = TeamWeekSchedule::where('team_id', $teamMember->id)
            ->where('week_start_date', $weekStart)
            ->first();

        if ($weekSchedule) {
            return $weekSchedule->schedule_data;
        }

        // Return regular schedule pattern
        return $teamMember->schedule ?? $this->getDefaultSchedule();
    }

    /**
     * Helper: Calculate worked hours for a team member in a week
     */
    private function calculateWorkedHours($teamMember, $weekStart)
    {
        $weekEnd = Carbon::parse($weekStart)->endOfWeek(Carbon::SUNDAY);

        if (!DB::getSchemaBuilder()->hasTable('timesheets')) {
            return 0;
        }

        $timesheets = DB::table('timesheets')
            ->where('team_id', $teamMember->id)
            ->whereBetween('clock_in', [$weekStart, $weekEnd])
            ->where('status', 'completed')
            ->get(['clock_in', 'clock_out', 'break_start', 'break_end']);

        $totalMinutes = 0;

        foreach ($timesheets as $ts) {
            $clockIn = Carbon::parse($ts->clock_in);
            $clockOut = Carbon::parse($ts->clock_out);
            $minutes = $clockIn->diffInMinutes($clockOut);

            // Subtract break duration if both timestamps are present
            if ($ts->break_start && $ts->break_end) {
                $breakStart = Carbon::parse($ts->break_start);
                $breakEnd = Carbon::parse($ts->break_end);
                $minutes -= $breakStart->diffInMinutes($breakEnd);
            }

            $totalMinutes += max(0, $minutes);
        }

        return round($totalMinutes / 60, 1);
    }
        /**
         * Helper: Calculate scheduled hours from schedule array
         */
    private function calculateScheduledHours($schedule)
    {
        $totalHours = 0;
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        foreach ($days as $day) {
            if (isset($schedule[$day]) && isset($schedule[$day]['active']) && $schedule[$day]['active']) {
                try {
                    $start = Carbon::parse($schedule[$day]['start']);
                    $end = Carbon::parse($schedule[$day]['end']);
                    $totalHours += $start->diffInMinutes($end) / 60;
                } catch (\Exception $e) {
                    Log::warning("Error calculating hours for day {$day}: " . $e->getMessage());
                    continue;
                }
            }
        }

        return round($totalHours, 1);
    }

    /**
     * Helper: Check if staff member is available for a time slot
     */
    private function checkAvailability($teamMember, $weekStart, $day, $startTime = null, $endTime = null)
    {
        // Get schedule for the week
        $schedule = $this->getWeekSchedule($teamMember, $weekStart);

        // Check if staff is scheduled to work on this day
        if (!isset($schedule[$day]) || !isset($schedule[$day]['active']) || !$schedule[$day]['active']) {
            return [
                'available' => false,
                'reason' => $teamMember->first_name . ' ' . $teamMember->last_name . ' is not scheduled to work on ' . strtoupper($day),
                'available_windows' => []
            ];
        }

        $scheduleStart = Carbon::parse($schedule[$day]['start']);
        $scheduleEnd = Carbon::parse($schedule[$day]['end']);

        // If specific times provided, check if they fall within scheduled hours
        if ($startTime && $endTime) {
            $requestStart = Carbon::parse($startTime);
            $requestEnd = Carbon::parse($endTime);

            if ($requestStart->lt($scheduleStart) || $requestEnd->gt($scheduleEnd)) {
                return [
                    'available' => false,
                    'reason' => $teamMember->first_name . ' ' . $teamMember->last_name . ' is available on ' . strtoupper($day) . ' from: ' . $scheduleStart->format('H:i') . '-' . $scheduleEnd->format('H:i') . '. Please select times within these windows.',
                    'available_windows' => [
                        [
                            'start' => $scheduleStart->format('H:i'),
                            'end' => $scheduleEnd->format('H:i')
                        ]
                    ]
                ];
            }

            // Check for conflicts with existing roster entries
            $conflicts = Roster::where('team_id', $teamMember->id)
                ->where('week_start', $weekStart)
                ->where('day', $day)
                ->where(function ($query) use ($requestStart, $requestEnd) {
                    $query->where(function ($q) use ($requestStart, $requestEnd) {
                        $q->where('start_time', '<=', $requestStart->format('H:i:s'))
                            ->where('end_time', '>', $requestStart->format('H:i:s'));
                    })->orWhere(function ($q) use ($requestStart, $requestEnd) {
                        $q->where('start_time', '<', $requestEnd->format('H:i:s'))
                            ->where('end_time', '>=', $requestEnd->format('H:i:s'));
                    })->orWhere(function ($q) use ($requestStart, $requestEnd) {
                        $q->where('start_time', '>=', $requestStart->format('H:i:s'))
                            ->where('end_time', '<=', $requestEnd->format('H:i:s'));
                    });
                })
                ->exists();

            if ($conflicts) {
                return [
                    'available' => false,
                    'reason' => $teamMember->first_name . ' ' . $teamMember->last_name . ' is already assigned during this time slot',
                    'available_windows' => []
                ];
            }
        }

        return [
            'available' => true,
            'available_windows' => [
                [
                    'start' => $scheduleStart->format('H:i'),
                    'end' => $scheduleEnd->format('H:i')
                ]
            ]
        ];
    }

    /**
     * Helper: Calculate assigned hours per day per prep area
     */
    private function calculateAssignedHours($rosterEntries, $prepAreas)
    {
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $assignedHours = [];

        foreach ($days as $day) {
            $assignedHours[$day] = [];
            foreach ($prepAreas as $area) {
                $hours = $rosterEntries
                    ->where('day', $day)
                    ->where('prep_area_id', $area->id)
                    ->sum('total_hours');

                $assignedHours[$day][$area->id] = round($hours, 1);
            }
        }

        return $assignedHours;
    }

    /**
     * Helper: Get default schedule
     */
    private function getDefaultSchedule()
    {
        return [
            'monday' => ['active' => false, 'start' => '09:00', 'end' => '17:00'],
            'tuesday' => ['active' => false, 'start' => '09:00', 'end' => '17:00'],
            'wednesday' => ['active' => false, 'start' => '09:00', 'end' => '17:00'],
            'thursday' => ['active' => false, 'start' => '09:00', 'end' => '17:00'],
            'friday' => ['active' => false, 'start' => '09:00', 'end' => '17:00'],
            'saturday' => ['active' => false, 'start' => '10:00', 'end' => '16:00'],
            'sunday' => ['active' => false, 'start' => '10:00', 'end' => '16:00'],
        ];
    }

    /**
     * Save entire roster for a week
     */
    public function save(Request $request)
    {
        $validated = $request->validate([
            'week_start' => 'required|date',
            'shifts' => 'required|array',
            'shifts.*.day' => 'required|string',
            'shifts.*.team_id' => 'required|exists:teams,id',
            'shifts.*.prep_area_id' => 'required|exists:prep_areas,id',
            'shifts.*.start_time' => 'required',
            'shifts.*.end_time' => 'required',
            'shifts.*.break_minutes' => 'nullable|integer',
        ]);

        return DB::transaction(function () use ($validated) {
            $weekStart = Carbon::parse($validated['week_start'])->startOfWeek(Carbon::MONDAY)->format('Y-m-d');

            // Remove old roster for this week
            Roster::where('week_start', $weekStart)->delete();

            foreach ($validated['shifts'] as $shift) {
                $startTime = Carbon::parse($shift['start_time']);
                $endTime = Carbon::parse($shift['end_time']);
                $breakMinutes = $shift['break_minutes'] ?? 30;
                $totalMinutes = $startTime->diffInMinutes($endTime) - $breakMinutes;
                $totalHours = round($totalMinutes / 60, 1);

                Roster::create([
                    'week_start' => $weekStart,
                    'team_id' => $shift['team_id'],
                    'prep_area_id' => $shift['prep_area_id'],
                    'day' => $shift['day'],
                    'start_time' => $shift['start_time'],
                    'end_time' => $shift['end_time'],
                    'break_minutes' => $breakMinutes,
                    'total_hours' => $totalHours,
                    'assigned_staff' => [$shift['team_id']]
                ]);
            }

            return response()->json(['message' => 'Roster saved successfully']);
        });
    }
}
