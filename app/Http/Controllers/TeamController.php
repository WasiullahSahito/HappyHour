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
}
