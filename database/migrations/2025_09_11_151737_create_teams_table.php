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
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();

            // --- FIX 1: ADD STAFF CODE FOR LOGIN ---
            // This code must be unique for each staff member to log in.
            $table->string('staff_code')->unique()->nullable()->index();

            $table->string('phone_number')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('tax_file_number')->nullable();
            $table->text('home_address')->nullable();

            // --- FIX 2: CORRECT EMERGENCY CONTACT COLUMN NAMES ---
            // Changed to match the frontend form and controller logic.
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();

            $table->string('position');
            $table->string('employment_type');
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->string('branch')->nullable();
            $table->json('schedule')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
