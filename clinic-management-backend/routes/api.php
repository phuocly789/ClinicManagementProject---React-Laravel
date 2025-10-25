<?php

use App\Http\Controllers\API\ReportRevenueController;
use App\Http\Controllers\API\ScheduleController;
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
use App\Http\Controllers\API\Doctor\DoctorExaminationsController;
use App\Http\Controllers\API\Doctor\PatientsController;

//----------------------------------------------Hết-------------------------------
use App\Http\Controllers\API\User\UserControllers;



Route::get('/user', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);

//check tồn kho
Route::get('/medicines/low-stock', [MedicinesController::class, 'checkLowStock']);
Route::get('/medicines', [MedicinesController::class, 'index']);
Route::get('/medicines/ping', [MedicinesController::class, 'ping']);
Route::post('/medicines', [MedicinesController::class, 'store']);
Route::put('/medicines/{id}', [MedicinesController::class, 'update']);
Route::delete('/medicines/{id}', [MedicinesController::class, 'destroy']);
Route::get('/medicines/all', [MedicinesController::class, 'all']);

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

Route::get('/schedules', [ScheduleController::class, 'index']);
Route::post('/schedules', [ScheduleController::class, 'createSchedule']);
Route::put('/schedules/{scheduleId}', [ScheduleController::class, 'updateSchedule']);
Route::delete('/schedules/{scheduleId}', [ScheduleController::class, 'deleteSchedule']);



Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

//admin-revenue
Route::get('/report-revenue/combined', [ReportRevenueController::class, 'getCombinedStatistics']);
Route::get('/report-revenue/detail-revenue', [ReportRevenueController::class, 'getDetailRevenueReport']);


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

    // Lấy lịch làm việc của bác sĩ
    Route::get('/schedules/{doctorId}', [AppointmentsController::class, 'getStaffScheduleById']);

    // Lấy danh sách tất cả bệnh nhân 
    Route::get('/patients', [PatientsController::class, 'index']);

    // Lịch sử bệnh nhân
    Route::get('/patients/{patientId}/history', [PatientsController::class, 'getPatientHistory']);


    // Khám bệnh
    Route::prefix('examinations')->group(function () {
        Route::post('{appointmentId}/start', [DoctorExaminationsController::class, 'start']);
        Route::post('{appointmentId}/complete', [DoctorExaminationsController::class, 'complete']);
        Route::get('{appointmentId}', [DoctorExaminationsController::class, 'show']);
        Route::post('{appointmentId}/temp-save', [DoctorExaminationsController::class, 'tempSave']);
    });
});

//Nhóm route cho User

Route::prefix('users')->group(function () {
    Route::get('/', [UserControllers::class, 'index']);
    Route::post('/', [UserControllers::class, 'store']);
    Route::put('/{id}', [UserControllers::class, 'update']);
    Route::delete('/{id}', [UserControllers::class, 'destroy']);
    Route::put('/toggle-status/{id}', [UserControllers::class, 'toggleStatus']);

});

Route::get('/roles', [UserControllers::class, 'roles']);
