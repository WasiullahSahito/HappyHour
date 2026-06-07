<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeamWeekSchedule extends Model
{
    use HasFactory;

    protected $table = 'team_week_schedules';

    protected $fillable = [
        'team_id',
        'week_start_date',
        'schedule_data',
    ];

    protected $casts = [
        'schedule_data' => 'array',
        'week_start_date' => 'date',
    ];

    /**
     * Get the team that owns this week schedule
     */
    public function team()
    {
        return $this->belongsTo(Team::class);
    }
}
