<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('resource_plans', function (Blueprint $table) {
            $table->id();
            $table->date('week_start'); // Monday of the week
            $table->decimal('labor_target_percentage', 5, 2)->default(30);
            $table->decimal('hourly_rate', 8, 2)->default(28.5);
            $table->json('revenue_forecast'); // Store daily revenue as JSON
            $table->json('prep_area_distribution'); // Store prep area percentages as JSON
            $table->json('calculated_hours')->nullable(); // Store calculated hours
            $table->json('weekly_totals')->nullable(); // Store weekly totals
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique('week_start');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resource_plans');
    }
};
