<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\TeamWeekSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TeamController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Team::with('timesheets')->orderBy('created_at', 'desc')->get();
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $teamMember = Team::findOrFail($id);
        return response()->json($teamMember);
    }

    /**
     * Get the current clock-in status for a team member.
     */
    public function status(Team $team)
    {
        $activeSheet = $team->timesheets()
            ->whereIn('status', ['active', 'on_break'])
            ->latest()
            ->first();

        return response()->json($activeSheet);
    }

    /**
     * Authenticate a team member using their staff code.
     */
    public function loginByCode(Request $request)
    {
        $validated = $request->validate(['staff_code' => 'required|string']);

        $teamMember = Team::where('staff_code', $validated['staff_code'])->first();

        if (!$teamMember) {
            return response()->json(['message' => 'Invalid staff code.'], 404);
        }

        if ($teamMember->status !== 'active') {
            return response()->json(['message' => 'Your account is inactive. Please contact a manager.'], 403);
        }

        return response()->json($teamMember);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:teams,email',
            'phone_number' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'tax_file_number' => 'nullable|string',
            'home_address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'position' => 'required|string',
            'branch' => 'required|string',
            'department' => 'required|string',
            'employment_type' => 'required|string',
            'hourly_rate' => 'required|numeric|min:0',
            'start_date' => 'nullable|date',
            'staff_code' => 'required|string|unique:teams,staff_code',
            'schedule' => 'nullable|array',
        ]);

        $validated['status'] = 'inactive';

        $teamMember = Team::create($validated);
        return response()->json($teamMember, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $teamMember = Team::findOrFail($id);
        // Merge current data as defaults to prevent null values
        $defaults = [
            'position' => $teamMember->position ?? 'Manager',
            'branch' => $teamMember->branch ?? 'Sydney CBD',
            'department' => $teamMember->department ?? 'Front of House',
            'employment_type' => $teamMember->employment_type ?? 'Full-Time',
        ];
        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:teams,email,' . $teamMember->id,
            'phone_number' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'tax_file_number' => 'nullable|string',
            'home_address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'position' => 'sometimes|required|string',
            'branch' => 'sometimes|required|string',
            'department' => 'sometimes|required|string',
            'employment_type' => 'sometimes|required|string',
            'hourly_rate' => 'sometimes|required|numeric|min:0',
            'start_date' => 'nullable|date',
            'staff_code' => 'sometimes|required|string|unique:teams,staff_code,' . $teamMember->id,
            'schedule' => 'nullable|array',
        ]);

        // Merge defaults for fields that might be missing
        foreach ($defaults as $key => $value) {
            if (!isset($validated[$key]) || empty($validated[$key])) {
                $validated[$key] = $value;
            }
        }
        $teamMember->update($validated);
        return response()->json($teamMember);
    }

    /**
     * Update just the status of a team member.
     */
    public function updateStatus(Request $request, Team $team)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:active,inactive',
        ]);

        $team->update(['status' => $validated['status']]);

        return response()->json($team);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $teamMember = Team::findOrFail($id);
        $teamMember->delete();
        return response()->json(null, 204);
    }

    public function getRecentTimesheets(Team $team)
    {
        $timesheets = $team->timesheets()
            ->latest('clock_in')
            ->take(5)
            ->get();

        return response()->json($timesheets);
    }

    /**
     * Public registration endpoint
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:teams,email',
            'phone_number' => 'required|string|max:50',
            'date_of_birth' => 'required|date',
            'home_address' => 'required|string|max:100',
            'emergency_contact_name' => 'required|string|max:255',
            'emergency_contact_phone' => 'required|string|max:50',
            'tax_file_number' => 'nullable|string|max:50',
            'start_date' => 'required|date',
            'hourly_rate' => 'nullable|numeric|min:0',
            'schedule' => 'nullable|array',
            'position' => 'nullable|string|max:100',
            'branch' => 'nullable|string|max:100',
            'department' => 'nullable|string|max:100',
            'employment_type' => 'nullable|string|max:100',

        ]);

        do {
            $staffCode = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        } while (Team::where('staff_code', $staffCode)->exists());

        $validated['status'] = 'inactive';
        $validated['staff_code'] = $staffCode;

        if (!isset($validated['hourly_rate'])) {
            $validated['hourly_rate'] = 0.00;
        }

        if (!isset($validated['schedule'])) {
            $validated['schedule'] = $this->getDefaultSchedule();
        }

        $team = Team::create($validated);

        return response()->json([
            'message' => 'Your registration has been submitted. A manager will review your details and activate your account shortly.',
            'staff_code' => $staffCode
        ], 201);
    }

    /**
     * Get schedule for a specific team member
     * Returns both the regular pattern and week-specific override if it exists
     */
    public function getSchedule(Team $team, Request $request)
    {
        $date = $request->query('date');

        // Get the regular pattern from the team's schedule JSON field
        $regularPattern = $team->schedule ?? $this->getDefaultSchedule();

        // If a date is provided, check for week-specific override
        $specificSchedule = null;
        if ($date) {
            $weekStart = Carbon::parse($date)->startOfWeek(Carbon::MONDAY)->format('Y-m-d');

            $weekSchedule = TeamWeekSchedule::where('team_id', $team->id)
                ->where('week_start_date', $weekStart)
                ->first();

            if ($weekSchedule) {
                $specificSchedule = $weekSchedule->schedule_data;
            }
        }

        return response()->json([
            'regular' => $regularPattern,
            'specific' => $specificSchedule
        ]);
    }

    /**
     * Save schedule for a team member
     * If week_start_date is null, updates the regular pattern
     * If week_start_date is provided, creates/updates a week-specific override
     */
    public function saveSchedule(Request $request, Team $team)
    {
        $validated = $request->validate([
            'week_start_date' => 'nullable|date',
            'data' => 'required|array',
            'data.*.active' => 'required|boolean',
            'data.*.start' => 'required|string',
            'data.*.end' => 'required|string',
        ]);

        if ($validated['week_start_date'] === null) {
            // Save as regular pattern
            $team->update(['schedule' => $validated['data']]);

            return response()->json([
                'message' => 'Regular schedule pattern updated successfully',
                'schedule' => $team->schedule
            ]);
        } else {
            // Save as week-specific override
            $weekStart = Carbon::parse($validated['week_start_date'])->startOfWeek(Carbon::MONDAY)->format('Y-m-d');

            TeamWeekSchedule::updateOrCreate(
                [
                    'team_id' => $team->id,
                    'week_start_date' => $weekStart
                ],
                [
                    'schedule_data' => $validated['data']
                ]
            );

            return response()->json([
                'message' => 'Week-specific schedule updated successfully',
                'week_start_date' => $weekStart,
                'schedule' => $validated['data']
            ]);
        }
    }

    /**
     * Get default schedule structure
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
}
