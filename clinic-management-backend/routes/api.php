<?php

<<<<<<< HEAD
use Dba\Connection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MedicinesController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\ImportBillController;
use App\Http\Controllers\API\SuppliersController;
=======
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MedicinesController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\Doctor\AppointmentsController;
use App\Http\Controllers\API\Doctor\ExaminationController;
use App\Http\Controllers\API\Doctor\DiagnosisSuggestionController;
use App\Http\Controllers\API\Doctor\DoctorMedicineSearchController;
use App\Http\Controllers\API\Doctor\AIMedicineSuggestionController;
>>>>>>> Thuat/Doctor-Appointment

// ✅ API cơ bản
Route::get('/users', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);

Route::get('/medicines', [MedicinesController::class, 'index']);
Route::get('/medicines/ping', [MedicinesController::class, 'ping']);
Route::post('/medicines', [MedicinesController::class, 'store']);
Route::put('/medicines/{id}', [MedicinesController::class, 'update']);
Route::delete('/medicines/{id}', [MedicinesController::class, 'destroy']);

<<<<<<< HEAD
Route::get('/import-bills', [ImportBillController::class, 'index']);
Route::post('/import-bills', [ImportBillController::class, 'store']);
Route::put('/import-bills/{id}', [ImportBillController::class, 'update']);
Route::delete('/import-bills/{id}', [ImportBillController::class, 'destroy']);
Route::get('/import-bills/{id}', [ImportBillController::class, 'show']);

Route::get('/suppliers', [SuppliersController::class, 'index']);
Route::post('/suppliers', [SuppliersController::class, 'store']);
Route::put('/suppliers/{id}', [SuppliersController::class, 'update']);
Route::delete('/suppliers/{id}', [SuppliersController::class, 'destroy']);
Route::get('/suppliers/{id}', [SuppliersController::class, 'show']);
=======
// ✅ Nhóm route cho Bác sĩ
Route::prefix('doctor')->group(function () {
    // Danh sách bệnh nhân hôm nay
    Route::get('/today-patients', [AppointmentsController::class, 'todayPatients']);
    Route::apiResource('appointments', AppointmentsController::class);

    // Gợi ý chẩn đoán & thuốc
    Route::get('/diagnoses/suggestions', [DiagnosisSuggestionController::class, 'suggestions']);
    Route::get('/medicines/search', [DoctorMedicineSearchController::class, 'search']);
    // Route::get('/medicines/ai-suggest', [DoctorMedicineSearchController::class, 'suggestByAI']);
    Route::get('/ai/medicine-suggestion', [AIMedicineSuggestionController::class, 'suggest']);


    // Khám bệnh
    // Route::get('/examination/today', [ExaminationController::class, 'todayPatients']);
    // Route::get('/examination/{appointmentId}', [ExaminationController::class, 'show']);
    // Route::post('/examination/complete/{appointmentId}', [ExaminationController::class, 'complete']);
});
>>>>>>> Thuat/Doctor-Appointment
