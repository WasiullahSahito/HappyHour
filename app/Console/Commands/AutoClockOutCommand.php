<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Models\Timesheet;
use App\Models\TeamWeekSchedule;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AutoClockOutCommand extends Command
{
    protected $signature   = 'timesheets:auto-clockout';
    protected $description = 'Safety net: auto clock out staff who forgot and are not on the page.';

    public function handle()
    {
        Log::info('[AutoClockout] Cron running at ' . now('UTC')->toIso8601String());

        $timezone = config('app.timezone', 'UTC');

        $activeSheets = Timesheet::whereIn('status', ['active', 'on_break'])
            ->with('team')
            ->get();

        if ($activeSheets->isEmpty()) {
            return;
        }

        $processed = 0;

        foreach ($activeSheets as $sheet) {
            $team = $sheet->team;
            if (!$team) continue;

            // Determine local day/date for the shift — same UTC-parse approach as the controller
            $clockInUtc   = Carbon::parse($sheet->clock_in, 'UTC');
            $clockInLocal = $clockInUtc->copy()->setTimezone($timezone);
            $shiftDate    = $clockInLocal->format('Y-m-d');
            $dayName      = strtolower($clockInLocal->format('l')); // "monday" etc.

            // Week-specific override first, then regular pattern — same as TeamController::getSchedule()
            $weekStart    = $clockInLocal->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d');
            $weekOverride = TeamWeekSchedule::where('team_id', $team->id)
                ->where('week_start_date', $weekStart)
                ->first();

            $scheduleData = $weekOverride
                ? ($weekOverride->schedule_data ?? [])
                : ($team->schedule ?? []);

            $daySchedule = $scheduleData[$dayName] ?? null;

            if (!$daySchedule || empty($daySchedule['active']) || empty($daySchedule['end'])) {
                continue;
            }

            // Build scheduled end in UTC — same as autoClockOut() in the controller
            $scheduledEndLocal = Carbon::parse($shiftDate . ' ' . $daySchedule['end'], $timezone);
            $scheduledEndUtc   = $scheduledEndLocal->copy()->utc();

            if (Carbon::now('UTC')->lt($scheduledEndUtc)) {
                continue; // Not yet time
            }

            try {
                DB::transaction(function () use ($sheet, $scheduledEndUtc, $daySchedule, $timezone) {
                    if ($sheet->break_start && !$sheet->break_end) {
                        $sheet->break_end = $scheduledEndUtc->format('Y-m-d H:i:s');
                    }

                    $sheet->clock_out        = $scheduledEndUtc->format('Y-m-d H:i:s');
                    $sheet->status           = 'completed';
                    $sheet->auto_clocked_out = true;

                    if (!$sheet->entry_type || $sheet->entry_type === 'manual') {
                        $sheet->entry_type = 'clock_in';
                    }

                    $autoNote     = "Auto clocked out at scheduled end ({$daySchedule['end']} {$timezone}).";
                    $sheet->notes = $sheet->notes
                        ? $sheet->notes . ' | ' . $autoNote
                        : $autoNote;

                    $sheet->save();
                });

                Log::info("[AutoClockout] ✅ Sheet #{$sheet->id} — {$team->first_name} {$team->last_name} clocked out at {$daySchedule['end']}");
                $this->info("Clocked out: {$team->first_name} {$team->last_name} at {$daySchedule['end']}");
                $processed++;
            } catch (\Exception $e) {
                Log::error("[AutoClockout] ❌ Sheet #{$sheet->id}: " . $e->getMessage());
            }
        }

        Log::info("[AutoClockout] Done. {$processed} processed.");
    }
}
