<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Eager-load timesheets for the main timesheet page
        return Team::with('timesheets')->get();
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
            ->latest() // Get the most recent active sheet
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
            'home_address' => 'nullable|string',
            'position' => 'required|string',
            'employment_type' => 'required|string',
            'hourly_rate' => 'nullable|numeric',
            'start_date' => 'nullable|date',
            'branch' => 'nullable|string',
            'schedule' => 'nullable|array',
        ]);

        $teamMember = Team::create($validated);
        return response()->json($teamMember, 201);
    }
    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $teamMember = Team::findOrFail($id);
        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:teams,email,' . $teamMember->id,
            'phone_number' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'home_address' => 'nullable|string',
            'position' => 'sometimes|required|string',
            'employment_type' => 'sometimes|required|string',
            'hourly_rate' => 'nullable|numeric',
            'start_date' => 'nullable|date',
            'branch' => 'nullable|string',
            'schedule' => 'nullable|array',
        ]);

        $teamMember->update($validated);
        return response()->json($teamMember);
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
        // Eager load the timesheets, order by the most recent clock-in time,
        // limit the result to 5, and return them.
        $timesheets = $team->timesheets()
            ->latest('clock_in') // This is shorthand for orderBy('clock_in', 'desc')
            ->take(5)
            ->get();

        return response()->json($timesheets);
    }
}
