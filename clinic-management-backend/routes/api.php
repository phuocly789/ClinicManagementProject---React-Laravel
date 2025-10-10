<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MedicinesController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\Doctor\AppointmentsController;
use App\Http\Controllers\API\Doctor\ExaminationController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/users', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);

Route::get('/medicines', [MedicinesController::class, 'index']);
Route::get('/medicines/ping', [MedicinesController::class, 'ping']);
Route::post('/medicines', [MedicinesController::class, 'store']);
Route::put('/medicines/{id}', [MedicinesController::class, 'update']);
Route::delete('/medicines/{id}', [MedicinesController::class, 'destroy']);



// ✅ Nhóm route cho Bác sĩ
Route::prefix('doctor')->group(function () {
    // Lấy danh sách bệnh nhân hôm nay (Today Section)
    Route::get('/today-patients', [AppointmentsController::class, 'todayPatients']);
    Route::apiResource('appointments', AppointmentsController::class);

    // ExaminationController
    Route::get('/examination/today', [ExaminationController::class, 'todayPatients']);
    Route::get('/examination/{appointmentId}', [ExaminationController::class, 'show']);
    Route::post('/examination/complete/{appointmentId}', [ExaminationController::class, 'complete']);
});

