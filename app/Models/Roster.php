<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Roster extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'week_start',
        'team_id',
        'prep_area_id',
        'day',
        'start_time',
        'end_time',
        'break_minutes',
        'total_hours',
        'assigned_staff',
        'notes'
    ];

    protected $casts = [
        'week_start' => 'date',
        'start_time' => 'string',
        'end_time' => 'string',
        'break_minutes' => 'integer',
        'total_hours' => 'decimal:1',
        'assigned_staff' => 'array'
    ];

    /**
     * Get the team member assigned to this roster entry
     */
    public function teamMember()
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    /**
     * Get the prep area for this roster entry
     */
    public function prepArea()
    {
        return $this->belongsTo(PrepArea::class);
    }
}
