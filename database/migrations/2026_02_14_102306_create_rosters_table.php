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
        // Only create if table doesn't exist
        if (!Schema::hasTable('rosters')) {
            Schema::create('rosters', function (Blueprint $table) {
                $table->id();
                $table->date('week_start');
                $table->foreignId('team_id')->constrained('teams')->onDelete('cascade');
                $table->foreignId('prep_area_id')->constrained('prep_areas')->onDelete('cascade');
                $table->string('day');
                $table->time('start_time');
                $table->time('end_time');
                $table->integer('break_minutes')->default(30);
                $table->decimal('total_hours', 5, 1)->default(0);
                $table->json('assigned_staff')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index('week_start');
                $table->index(['week_start', 'day']);
                $table->index(['team_id', 'week_start']);
                $table->index(['prep_area_id', 'week_start']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rosters');
    }
};
