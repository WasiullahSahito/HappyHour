<?php

namespace App\Http\Controllers;

use App\Models\Timesheet;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;


class TimesheetController extends Controller
{
    /**
     * Store a newly created resource (Manager Manual Entry)
     */
    public function store(Request $request)
    {
        Log::info("Timesheet Store Request: ", $request->all());

        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:teams,id',
                'date' => 'required|date',
                'clock_in' => 'required',
                'clock_out' => 'required',
                'notes' => 'nullable|string',
            ]);

            // IMPORTANT: Get the user's timezone from request
            $timezone = $request->header('Timezone') ?? config('app.timezone', 'UTC');
            Log::info("Timezone for manual entry: " . $timezone);

            // Parse times in the user's timezone
            $clockInLocal = Carbon::parse($validated['date'] . ' ' . $validated['clock_in'], $timezone);
            $clockOutLocal = Carbon::parse($validated['date'] . ' ' . $validated['clock_out'], $timezone);

            // Handle overnight shifts
            if ($clockOutLocal->lt($clockInLocal)) {
                $clockOutLocal->addDay();
            }

            // Convert to UTC before storing
            $clockInUTC = $clockInLocal->utc();
            $clockOutUTC = $clockOutLocal->utc();

            // Store in database as UTC (PostgreSQL timestamp without time zone)
            $timesheet = Timesheet::create([
                'team_id' => $validated['employee_id'],
                'clock_in' => $clockInUTC->format('Y-m-d H:i:s'), // Store as UTC
                'clock_out' => $clockOutUTC->format('Y-m-d H:i:s'), // Store as UTC
                'notes' => $validated['notes'] ?? 'Manual entry',
                'status' => 'completed',
                'entry_type' => 'manual',
            ]);

            // Log for debugging
            Log::info("Manual entry saved:", [
                'employee_id' => $validated['employee_id'],
                'user_date' => $validated['date'],
                'user_clock_in' => $validated['clock_in'],
                'user_clock_out' => $validated['clock_out'],
                'user_timezone' => $timezone,
                'stored_clock_in_utc' => $clockInUTC->format('Y-m-d H:i:s'),
                'stored_clock_out_utc' => $clockOutUTC->format('Y-m-d H:i:s'),
                'clock_in_local' => $clockInLocal->format('Y-m-d H:i:s'),
                'clock_out_local' => $clockOutLocal->format('Y-m-d H:i:s'),
                'entry_type' => 'manual'
            ]);

            return response()->json($timesheet, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Timesheet Store Error: ' . $e->getMessage());
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Clock In
     */
    public function clockIn(Request $request)
    {
        Log::info("Clock In Request: ", $request->all());

        try {
            $validated = $request->validate(['team_id' => 'required|exists:teams,id']);

            // Check for active shift to prevent duplicates
            $activeShift = Timesheet::where('team_id', $validated['team_id'])
                ->whereIn('status', ['active', 'on_break'])
                ->latest()
                ->first();

            if ($activeShift) {
                return response()->json(['message' => 'You are already clocked in.'], 409);
            }

            // Get user's timezone from request
            $timezone = $request->header('Timezone') ?? config('app.timezone', 'UTC');
            Log::info("Timezone for clock-in: " . $timezone);

            // Get current time in user's timezone and convert to UTC
            $userNow = Carbon::now($timezone);
            $utcTime = $userNow->utc();

            $sheet = new Timesheet();
            $sheet->team_id = $validated['team_id'];
            $sheet->clock_in = $utcTime->format('Y-m-d H:i:s'); // Store as UTC
            $sheet->status = 'active';
            $sheet->entry_type = 'clock_in';
            $sheet->clock_out = null;
            $sheet->break_start = null;
            $sheet->break_end = null;
            $sheet->save();

            // Log for debugging
            Log::info("Clock-in saved:", [
                'team_id' => $validated['team_id'],
                'clock_in_utc' => $sheet->clock_in,
                'clock_in_local' => $userNow->format('Y-m-d H:i:s'),
                'entry_type' => 'clock_in',
                'user_timezone' => $timezone
            ]);

            return response()->json([
                'id' => $sheet->id,
                'team_id' => $sheet->team_id,
                'clock_in' => $sheet->clock_in,
                'clock_out' => $sheet->clock_out,
                'status' => $sheet->status,
                'entry_type' => $sheet->entry_type,
                'clock_in_local' => $userNow->format('Y-m-d H:i:s'),
                'user_timezone' => $timezone
            ], 201);
        } catch (\Exception $e) {
            Log::error('Clock In Critical Error: ' . $e->getMessage());
            return response()->json(['message' => 'System Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Clock Out
     */
    public function clockOut(Request $request)
    {
        try {
            $validated = $request->validate(['team_id' => 'required|exists:teams,id']);

            $sheet = Timesheet::where('team_id', $validated['team_id'])
                ->whereIn('status', ['active', 'on_break'])
                ->latest()
                ->first();

            if (!$sheet) {
                return response()->json(['message' => 'No active shift found to clock out from.'], 404);
            }

            // Get user's timezone from request
            $timezone = $request->header('Timezone') ?? config('app.timezone', 'UTC');
            Log::info("Timezone for clock-out: " . $timezone);

            $userNow = Carbon::now($timezone);
            $utcTime = $userNow->utc();

            // Use Transaction for safety
            DB::transaction(function () use ($sheet, $utcTime, $userNow, $timezone) {
                $sheet->clock_out = $utcTime->format('Y-m-d H:i:s'); // Store as UTC
                $sheet->status = 'completed';

                // Ensure entry_type is set to clock_in (not manual)
                if (!$sheet->entry_type || $sheet->entry_type === 'manual') {
                    $sheet->entry_type = 'clock_in';
                }

                // Auto-end break if they forgot
                if ($sheet->break_start && !$sheet->break_end) {
                    $sheet->break_end = $utcTime->format('Y-m-d H:i:s');
                }

                $sheet->save();

                Log::info("Clock-out saved:", [
                    'team_id' => $sheet->team_id,
                    'clock_out_utc' => $sheet->clock_out,
                    'clock_out_local' => $userNow->format('Y-m-d H:i:s'),
                    'entry_type' => $sheet->entry_type,
                    'user_timezone' => $timezone
                ]);
            });

            return response()->json([
                'id' => $sheet->id,
                'team_id' => $sheet->team_id,
                'clock_in' => $sheet->clock_in,
                'clock_out' => $sheet->clock_out,
                'status' => $sheet->status,
                'entry_type' => $sheet->entry_type,
                'clock_in_local' => Carbon::parse($sheet->clock_in)->setTimezone($timezone)->format('Y-m-d H:i:s'),
                'clock_out_local' => Carbon::parse($sheet->clock_out)->setTimezone($timezone)->format('Y-m-d H:i:s'),
                'user_timezone' => $timezone
            ]);
        } catch (\Exception $e) {
            Log::error('Clock Out Error: ' . $e->getMessage());
            return response()->json(['message' => 'System Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Start Break
     */
    public function startBreak(Request $request)
    {
        try {
            $validated = $request->validate(['team_id' => 'required|exists:teams,id']);

            $sheet = Timesheet::where('team_id', $validated['team_id'])
                ->where('status', 'active')
                ->latest()
                ->first();

            if (!$sheet) return response()->json(['message' => 'No active shift found.'], 404);

            $timezone = $request->header('Timezone') ?? config('app.timezone', 'UTC');
            $userNow = Carbon::now($timezone);
            $utcTime = $userNow->utc();

            $sheet->break_start = $utcTime->format('Y-m-d H:i:s'); // Store as UTC
            $sheet->status = 'on_break';
            $sheet->save();

            Log::info("Break started:", [
                'team_id' => $validated['team_id'],
                'break_start_utc' => $sheet->break_start,
                'break_start_local' => $userNow->format('Y-m-d H:i:s'),
                'user_timezone' => $timezone
            ]);

            return response()->json($sheet);
        } catch (\Exception $e) {
            Log::error('Start Break Error: ' . $e->getMessage());
            return response()->json(['message' => 'System Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * End Break
     */
    public function endBreak(Request $request)
    {
        try {
            $validated = $request->validate(['team_id' => 'required|exists:teams,id']);

            $sheet = Timesheet::where('team_id', $validated['team_id'])
                ->where('status', 'on_break')
                ->latest()
                ->first();

            if (!$sheet) return response()->json(['message' => 'No break found to end.'], 404);

            $timezone = $request->header('Timezone') ?? config('app.timezone', 'UTC');
            $userNow = Carbon::now($timezone);
            $utcTime = $userNow->utc();

            $sheet->break_end = $utcTime->format('Y-m-d H:i:s'); // Store as UTC
            $sheet->status = 'active';
            $sheet->save();

            Log::info("Break ended:", [
                'team_id' => $validated['team_id'],
                'break_end_utc' => $sheet->break_end,
                'break_end_local' => $userNow->format('Y-m-d H:i:s'),
                'user_timezone' => $timezone
            ]);

            return response()->json($sheet);
        } catch (\Exception $e) {
            Log::error('End Break Error: ' . $e->getMessage());
            return response()->json(['message' => 'System Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get timesheets for a specific team member
     */
    public function getTimesheets($teamId)
    {
        try {
            $timesheets = Timesheet::where('team_id', $teamId)
                ->orderBy('clock_in', 'desc')
                ->get();

            return response()->json($timesheets);
        } catch (\Exception $e) {
            Log::error('Get Timesheets Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch timesheets'], 500);
        }
    }
    /**
     * Update a timesheet entry (edit clock_in, clock_out, notes)
     */
    public function update(Request $request, $id)
    {
        Log::info("Timesheet Update Request: ", $request->all());

        try {
            $timesheet = Timesheet::findOrFail($id);

            $validated = $request->validate([
                'date'       => 'required|date',
                'clock_in'   => 'required',
                'clock_out'  => 'required',
                'notes'      => 'nullable|string',
            ]);

            $timezone = $request->header('Timezone') ?? config('app.timezone', 'UTC');

            $clockInLocal  = Carbon::parse($validated['date'] . ' ' . $validated['clock_in'], $timezone);
            $clockOutLocal = Carbon::parse($validated['date'] . ' ' . $validated['clock_out'], $timezone);

            if ($clockOutLocal->lt($clockInLocal)) {
                $clockOutLocal->addDay();
            }

            $clockInUTC  = $clockInLocal->utc();
            $clockOutUTC = $clockOutLocal->utc();

            $timesheet->clock_in  = $clockInUTC->format('Y-m-d H:i:s');
            $timesheet->clock_out = $clockOutUTC->format('Y-m-d H:i:s');
            $timesheet->notes     = $validated['notes'] ?? ($timesheet->notes ?? '');

            // ✅ entry_type is NOT updated – it stays as originally set (clock_in or manual)
            $timesheet->save();

            Log::info("Timesheet updated:", [
                'id'               => $id,
                'user_timezone'    => $timezone,
                'clock_in_utc'     => $timesheet->clock_in,
                'clock_out_utc'    => $timesheet->clock_out,
                'entry_type'       => $timesheet->entry_type, // unchanged
            ]);

            return response()->json($timesheet);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Timesheet Update Error: ' . $e->getMessage());
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }
    public function autoClockOut(Request $request)
    {
        try {
            $validated = $request->validate([
                'team_id'       => 'required|exists:teams,id',
                'scheduled_end' => 'required|string', // "17:00"
            ]);

            $timezone = $request->header('Timezone') ?? config('app.timezone', 'UTC');

            $sheet = Timesheet::where('team_id', $validated['team_id'])
                ->whereIn('status', ['active', 'on_break'])
                ->latest()
                ->first();

            // Already clocked out manually — nothing to do
            if (!$sheet) {
                Log::info("[AutoClockOut] Team #{$validated['team_id']} — already clocked out.");
                return response()->json(['message' => 'Already clocked out.', 'already_done' => true]);
            }

            // Build the scheduled end datetime in user's local timezone, then convert to UTC.
            // Uses today's local date — same pattern as store() and clockIn().
            $todayLocal        = Carbon::now($timezone)->format('Y-m-d');
            $scheduledEndLocal = Carbon::parse($todayLocal . ' ' . $validated['scheduled_end'], $timezone);
            $scheduledEndUtc   = $scheduledEndLocal->copy()->utc();

            DB::transaction(function () use ($sheet, $scheduledEndUtc, $validated, $timezone) {
                // Close any open break at shift end (same as clockOut)
                if ($sheet->break_start && !$sheet->break_end) {
                    $sheet->break_end = $scheduledEndUtc->format('Y-m-d H:i:s');
                }

                // Clock out AT scheduled end time — not "now"
                $sheet->clock_out        = $scheduledEndUtc->format('Y-m-d H:i:s');
                $sheet->status           = 'completed';
                $sheet->auto_clocked_out = true;

                // Preserve entry_type — same rule as clockOut()
                if (!$sheet->entry_type || $sheet->entry_type === 'manual') {
                    $sheet->entry_type = 'clock_in';
                }

                $autoNote     = "Auto clocked out at scheduled end ({$validated['scheduled_end']} {$timezone}).";
                $sheet->notes = $sheet->notes
                    ? $sheet->notes . ' | ' . $autoNote
                    : $autoNote;

                $sheet->save();
            });

            Log::info("[AutoClockOut] ✅ Team #{$validated['team_id']} auto clocked out", [
                'sheet_id'      => $sheet->id,
                'clock_in_utc'  => $sheet->clock_in,
                'clock_out_utc' => $sheet->clock_out,
                'scheduled_end' => $validated['scheduled_end'],
                'timezone'      => $timezone,
            ]);

            return response()->json([
                'id'               => $sheet->id,
                'team_id'          => $sheet->team_id,
                'clock_in'         => $sheet->clock_in,
                'clock_out'        => $sheet->clock_out,
                'status'           => $sheet->status,
                'entry_type'       => $sheet->entry_type,
                'auto_clocked_out' => $sheet->auto_clocked_out,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('[AutoClockOut] Error: ' . $e->getMessage());
            return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }
}
