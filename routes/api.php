<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\IngredientController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TimesheetController;
use App\Http\Controllers\AiInsightController;
use App\Http\Controllers\KpiController;
use App\Http\Controllers\SalesReconciliationController;
use App\Http\Controllers\RosterController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PrepAreaController;
use App\Http\Controllers\ResourcePlanController;
use App\Http\Controllers\RosterAssignmentController;
use App\Http\Controllers\StaffRosterController;

/*

|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Supplier Routes
Route::post('suppliers/abn-lookup', [SupplierController::class, 'abnLookup']);
Route::apiResource('suppliers', SupplierController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

// Ingredient Routes
Route::apiResource('ingredients', IngredientController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

// Invoice Routes
Route::post('invoices/{invoice}/process-ai', [InvoiceController::class, 'processWithAI']); // <<< --- ADD THIS NEW ROUTE


Route::apiResource('invoices', InvoiceController::class)->only(['index', 'store', 'show', 'update', 'destroy']);


// Recipe Routes
Route::apiResource('recipes', RecipeController::class)->only(['index', 'store', 'show', 'update', 'destroy']);

// Staff / Team Routes
Route::get('/teams/{team}/timesheets', [TeamController::class, 'getRecentTimesheets']);

Route::post('/teams/login-by-code', [TeamController::class, 'loginByCode']);
Route::get('/teams/{team}/status', [TeamController::class, 'status']); // Get a team member's current clock-in status
Route::apiResource('teams', TeamController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
Route::patch('/teams/{team}/status', [TeamController::class, 'updateStatus']);

Route::post('/staff/register', [TeamController::class, 'register']); // <-- ADD THIS NEW ROUTE

// Timesheet Routes
Route::post('/timesheets/clock-in', [TimesheetController::class, 'clockIn']);
Route::post('/timesheets/clock-out', [TimesheetController::class, 'clockOut']);
Route::post('/timesheets/take-break', [TimesheetController::class, 'startBreak']);
Route::post('/timesheets/end-break', [TimesheetController::class, 'endBreak']);



Route::apiResource('timesheets', TimesheetController::class)->only(['store']); // For manager's manual entry

Route::put('/timesheets/{id}', [TimesheetController::class, 'update']);


// --- AI INSIGHTS ROUTES ---
Route::put('/invoices/{invoice}/update-items', [InvoiceController::class, 'updateItems']);



Route::get('/ai-insights', [AiInsightController::class, 'index']);
Route::post('/ai-insights/generate', [AiInsightController::class, 'generateAll']);
Route::get('/ai-insights/{insight}', [AiInsightController::class, 'show']);

Route::apiResource('kpis', KpiController::class)->only(['index', 'store', 'show']);


Route::prefix('sales-reconciliation')->group(function () {
    Route::get('/dashboard', [SalesReconciliationController::class, 'getDashboardData']);
    Route::get('/', [SalesReconciliationController::class, 'getForDate']);
    Route::get('/history', [SalesReconciliationController::class, 'getHistory']);
    Route::post('/{reconciliation}/upload', [SalesReconciliationController::class, 'uploadReceipt']);
    Route::put('/{reconciliation}/breakdown', [SalesReconciliationController::class, 'updateBreakdown']);
    Route::post('/{reconciliation}/confirm', [SalesReconciliationController::class, 'confirmAndClose']);
    Route::post('/{reconciliation}/flag', [SalesReconciliationController::class, 'flagForReview']);
});

// NEW: Team Schedule Routes
Route::get('/teams/{team}/schedule', [TeamController::class, 'getSchedule']);
Route::post('/teams/{team}/schedule', [TeamController::class, 'saveSchedule']);




// Roster Routes
// Route::prefix('roster')->group(function () {
//     Route::get('/', [RosterController::class, 'index']);
//     Route::post('/save', [RosterController::class, 'save']);
//     Route::post('/assign-staff', [RosterController::class, 'assignStaff']);
//     Route::post('/remove-staff', [RosterController::class, 'removeStaff']);
//     Route::get('/prep-area-stats', [RosterController::class, 'getPrepAreaStats']);
//     Route::get('/all-prep-area-stats', [RosterController::class, 'getAllPrepAreaStats']);
// });










Route::middleware(['api', 'web'])->group(function () {
    Route::post('/admin/login', [AuthController::class, 'login']);
    Route::post('/admin/logout', [AuthController::class, 'logout']);
    Route::get('/admin/check-auth', [AuthController::class, 'checkAuth']);
});

Route::prefix('prep-areas')->group(function () {
    // Get all prep areas (with active and inactive separated)
    Route::get('/', [PrepAreaController::class, 'index']);

    // Create new prep area
    Route::post('/', [PrepAreaController::class, 'store']);

    // Update prep area
    Route::put('/{id}', [PrepAreaController::class, 'update']);

    // Deactivate prep area (soft delete)
    Route::post('/{id}/deactivate', [PrepAreaController::class, 'deactivate']);

    // Reactivate prep area (restore from soft delete)
    Route::post('/{id}/reactivate', [PrepAreaController::class, 'reactivate']);

    // Permanently delete prep area
    Route::delete('/{id}', [PrepAreaController::class, 'destroy']);
});
Route::prefix('resource-plans')->group(function () {
    Route::get('/', [ResourcePlanController::class, 'show']); // GET with ?week_start= parameter
    Route::get('/all', [ResourcePlanController::class, 'index']); // Get all plans
    Route::post('/', [ResourcePlanController::class, 'store']); // Create or update plan
    Route::delete('/{id}', [ResourcePlanController::class, 'destroy']); // Delete plan
});


// Route::prefix('roster-assignments')->group(function () {
//     Route::get('/', [RosterAssignmentController::class, 'index']);
//     Route::post('/', [RosterAssignmentController::class, 'store']);
//     Route::put('/{id}', [RosterAssignmentController::class, 'update']);
//     Route::delete('/{id}', [RosterAssignmentController::class, 'destroy']);
//     Route::get('/availability', [RosterAssignmentController::class, 'getStaffAvailability']);
// });



// Get roster data for a specific week
Route::get('/roster', [RosterController::class, 'index']);

// Assign a staff member to a shift
Route::post('/roster/assign-shift', [RosterController::class, 'assignShift']);

// Update an existing shift
Route::put('/roster/{id}', [RosterController::class, 'updateShift']);

// Remove a shift
Route::delete('/roster/{id}', [RosterController::class, 'removeShift']);

// Check staff availability
Route::post('/roster/check-availability', [RosterController::class, 'checkStaffAvailability']);

// Save entire roster for a week (bulk operation)
Route::post('/roster/save', [RosterController::class, 'save']);


Route::post('/timesheets/auto-clock-out', [TimesheetController::class, 'autoClockOut']);


Route::get('/setup-admin', function () {
    // Safety check — only runs if no admin exists yet
    $exists = \App\Models\User::where('role', 'admin')->exists();

    if ($exists) {
        return response()->json([
            'message' => 'Admin already exists. Remove this route now.',
        ], 403);
    }

    $user = \App\Models\User::create([
        'name'     => 'Admin User',
        'email'    => 'admin@omnimetric.com',
        'username' => 'admin',
        'password' => bcrypt('myonlymetric123?'),
        'role'     => 'admin',
    ]);

    return response()->json([
        'message' => 'Admin created successfully. DELETE THIS ROUTE NOW!',
        'user'    => [
            'id'       => $user->id,
            'name'     => $user->name,
            'email'    => $user->email,
            'username' => $user->username,
            'role'     => $user->role,
        ],
    ]);
});
