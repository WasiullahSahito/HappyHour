<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Team extends Model
{

    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone_number',
        'date_of_birth',
        'tax_file_number',
        'home_address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'position',
        'branch',
        'department',
        'employment_type',
        'hourly_rate',
        'start_date',
        'staff_code',
        'status', // <-- ADDED
        'schedule',
    ];

    protected $casts = [
        'schedule' => 'array',
        'date_of_birth' => 'date',
        'start_date' => 'date',
        'hourly_rate' => 'decimal:2',
    ];

    public function timesheets()
    {
        return $this->hasMany(Timesheet::class);
    }
    public function weekSchedules()
    {
        return $this->hasMany(TeamWeekSchedule::class);
    }
    /**
     * Get the schedule for a specific week
     *
     * @param string $weekStartDate Format: Y-m-d (Monday of the week)
     * @return array|null
     */
    public function getWeekSchedule($weekStartDate)
    {
        $weekSchedule = $this->weekSchedules()
            ->where('week_start_date', $weekStartDate)
            ->first();

        return $weekSchedule ? $weekSchedule->schedule_data : null;
    }

}
