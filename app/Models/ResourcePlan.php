<?php
// File: app/Models/ResourcePlan.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ResourcePlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'week_start',
        'labor_target_percentage',
        'hourly_rate',
        'revenue_forecast',
        'prep_area_distribution',
        'calculated_hours',
        'weekly_totals',
        'notes'
    ];

    protected $casts = [
        'revenue_forecast' => 'array',
        'prep_area_distribution' => 'array',
        'calculated_hours' => 'array',
        'weekly_totals' => 'array',
        'labor_target_percentage' => 'decimal:2',
        'hourly_rate' => 'decimal:2'
    ];

    /**
     * Calculate and update all derived values
     */
    public function calculateDerivedValues()
    {
        $revenueForecast = $this->revenue_forecast ?? [];
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // Calculate total weekly revenue
        $weeklyRevenue = 0;
        foreach ($days as $day) {
            $weeklyRevenue += $revenueForecast[$day] ?? 0;
        }

        // Calculate total labor budget
        $laborBudget = $weeklyRevenue * ($this->labor_target_percentage / 100);

        // Calculate total hours
        $totalHours = $this->hourly_rate > 0 ? $laborBudget / $this->hourly_rate : 0;

        // Calculate prep area hours if distribution exists
        $calculatedHours = [];
        if (!empty($this->prep_area_distribution)) {
            $calculatedHours = $this->calculatePrepAreaHours();
        }

        $this->weekly_totals = [
            'weekly_revenue' => $weeklyRevenue,
            'weekly_labor_budget' => $laborBudget,
            'weekly_total_hours' => $totalHours
        ];

        $this->calculated_hours = $calculatedHours;

        return $this;
    }

    /**
     * Calculate hours for each prep area
     */
    private function calculatePrepAreaHours()
    {
        $distribution = $this->prep_area_distribution ?? [];
        $revenueForecast = $this->revenue_forecast ?? [];
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        $calculated = [];

        // Calculate daily hours first
        $dailyHours = [];
        foreach ($days as $day) {
            $revenue = $revenueForecast[$day] ?? 0;
            $laborBudget = $revenue * ($this->labor_target_percentage / 100);
            $dailyHours[$day] = $this->hourly_rate > 0 ? $laborBudget / $this->hourly_rate : 0;
        }

        // Calculate hours for each prep area
        foreach ($distribution as $areaId => $percentage) {
            if (!is_numeric($percentage) || $percentage <= 0) continue;

            $areaCalculated = [
                'daily' => [],
                'weekly_total' => 0
            ];

            foreach ($days as $day) {
                $hours = $dailyHours[$day] * ($percentage / 100);
                $areaCalculated['daily'][$day] = round($hours, 1);
                $areaCalculated['weekly_total'] += $hours;
            }

            $areaCalculated['weekly_total'] = round($areaCalculated['weekly_total'], 1);
            $calculated[$areaId] = $areaCalculated;
        }

        return $calculated;
    }

    /**
     * Get daily calculations
     */
    public function getDailyCalculations()
    {
        $revenueForecast = $this->revenue_forecast ?? [];
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $calculations = [];

        foreach ($days as $day) {
            $revenue = $revenueForecast[$day] ?? 0;
            $laborBudget = $revenue * ($this->labor_target_percentage / 100);
            $hours = $this->hourly_rate > 0 ? $laborBudget / $this->hourly_rate : 0;

            $calculations[$day] = [
                'revenue' => $revenue,
                'labor_budget' => round($laborBudget, 2),
                'hours' => round($hours, 1)
            ];
        }

        return $calculations;
    }
}
