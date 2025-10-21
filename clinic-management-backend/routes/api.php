<?php

use App\Http\Controllers\API\ReportRevenueController;
use Dba\Connection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MedicinesController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\ImportBillController;
use App\Http\Controllers\API\SuppliersController;

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\Doctor\AISuggestionController;
use App\Http\Controllers\API\Doctor\AppointmentsController;
use App\Http\Controllers\API\Doctor\DiagnosisSuggestionController;
use App\Http\Controllers\API\Doctor\DoctorMedicineSearchController;
use App\Http\Controllers\API\Doctor\ServiceController;

Route::get('/users', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);

//check tồn kho
Route::get('/medicines/low-stock', [MedicinesController::class, 'checkLowStock']);
Route::get('/medicines', [MedicinesController::class, 'index']);
Route::get('/medicines/ping', [MedicinesController::class, 'ping']);
Route::post('/medicines', [MedicinesController::class, 'store']);
Route::put('/medicines/{id}', [MedicinesController::class, 'update']);
Route::delete('/medicines/{id}', [MedicinesController::class, 'destroy']);

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


Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/create-user', [AuthController::class, 'createUser']);

//admin-revenue
Route::get('/report-revenue/dashboard', [ReportRevenueController::class, 'getDashboardStatistics']);
Route::get('/report-revenue/revenue', [ReportRevenueController::class, 'getRevenueStatistics']);
Route::get('/report-revenue/combined', [ReportRevenueController::class, 'getCombinedStatistics']);


// Nhóm route cho Bác sĩ
Route::prefix('doctor')->group(function () {
    // Danh sách bệnh nhân hôm nay
    Route::get('/today-patients', [AppointmentsController::class, 'todayPatients']);
    Route::apiResource('appointments', AppointmentsController::class);

    // Gợi ý chẩn đoán & thuốc
    //Gợi ý lấy từ lịch sử bệnh trước đó
    Route::get('/diagnoses/suggestions', [DiagnosisSuggestionController::class, 'suggestions']);
    // Tìm kiếm thuốc theo tên, loại
    Route::get('/medicines/search', [DoctorMedicineSearchController::class, 'search']);
    // Gợi ý thuốc & dịch vụ từ AI
    Route::get('/ai/suggestion', [AISuggestionController::class, 'suggest']);
    // Lấy danh sách dịch vụ
    Route::get('/services', [ServiceController::class, 'index']);



    // Khám bệnh
    // Route::get('/examination/today', [ExaminationController::class, 'todayPatients']);
    // Route::get('/examination/{appointmentId}', [ExaminationController::class, 'show']);
    // Route::post('/examination/complete/{appointmentId}', [ExaminationController::class, 'complete']);
});
