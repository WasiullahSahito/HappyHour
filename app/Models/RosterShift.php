<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RosterShift extends Model
{
    use HasFactory;

    protected $fillable = [
        'week_start',
        'prep_area_id',
        'team_id',
        'day',
        'start_time',
        'end_time',
        'break_minutes',
        'hours',
        'notes'
    ];

    protected $casts = [
        'week_start' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'hours' => 'decimal:2'
    ];

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function prepArea()
    {
        return $this->belongsTo(PrepArea::class);
    }

    public function timesheet()
    {
        return $this->hasOne(Timesheet::class, 'team_id', 'team_id')
            ->whereDate('clock_in', '>=', $this->week_start)
            ->whereDate('clock_in', '<', $this->week_start->copy()->addDays(7));
    }
}
