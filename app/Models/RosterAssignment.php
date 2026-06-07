<?php
// app/Models/RosterAssignment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class RosterAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id',
        'prep_area_id',
        'week_start',
        'day',
        'start_time',
        'end_time',
        'break_minutes',
        'total_hours'
    ];

    protected $casts = [
        'week_start' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'total_hours' => 'decimal:2'
    ];

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function prepArea()
    {
        return $this->belongsTo(PrepArea::class);
    }

    /**
     * Calculate total hours worked
     */
    public static function calculateHours($start, $end, $breakMinutes)
    {
        $start = Carbon::parse($start);
        $end = Carbon::parse($end);

        $diffInMinutes = $end->diffInMinutes($start);
        $workMinutes = $diffInMinutes - $breakMinutes;

        return round($workMinutes / 60, 2);
    }
}
