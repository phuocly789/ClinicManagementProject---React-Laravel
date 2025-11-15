<?php

use App\Http\Controllers\API\Service\AdminServiceController;
use App\Http\Controllers\API\Receptionist\AppointmentRecepController;
use App\Http\Controllers\API\Receptionist\RoomController;
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
use App\Http\Controllers\API\PatientController;
use App\Http\Controllers\API\Payment\InvoiceController;
use App\Http\Controllers\API\Payment\PaymentController;
//----------------------------------------------Hết-------------------------------
use App\Http\Controllers\API\User\AdminUserController;
use App\Http\Controllers\API\Print\InvoicePrintController;
use App\Http\Controllers\API\Receptionist\MedicalStaffController;
use App\Http\Controllers\API\Receptionist\PatientByRecepController;
use App\Http\Controllers\API\Receptionist\QueueController;
use App\Http\Controllers\API\Receptionist\ReceptionController;
use App\Http\Controllers\API\Technician\TestResultsController;

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
Route::get('/suppliers/all', [SuppliersController::class, 'all']);
Route::post('/suppliers', [SuppliersController::class, 'store']);
Route::put('/suppliers/{id}', [SuppliersController::class, 'update']);
Route::delete('/suppliers/{id}', [SuppliersController::class, 'destroy']);
Route::get('/suppliers/{id}', [SuppliersController::class, 'show']);
//handel excel
Route::get('/medicines/template', [MedicinesController::class, 'downloadTemplate']);
Route::post('/medicines/dry-run', [MedicinesController::class, 'dryRunImport']);
Route::post('/medicines/import', [MedicinesController::class, 'import']);
Route::get('/medicines/export', [MedicinesController::class, 'export']);
Route::post('/medicines/suggest', [MedicinesController::class, 'suggest']);

Route::get('/schedules', [ScheduleController::class, 'index']);
Route::post('/schedules', [ScheduleController::class, 'createSchedule']);
Route::put('/schedules/{scheduleId}', [ScheduleController::class, 'updateSchedule']);
Route::delete('/schedules/{scheduleId}', [ScheduleController::class, 'deleteSchedule']);
Route::get('/staff', [ScheduleController::class, 'getStaff']);


// Auth
Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:api')->post('/auth/logout', [AuthController::class, 'logout']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post("/verification-email", [AuthController::class, 'verificationEmail']);
Route::post("/resend-verification-email", [AuthController::class, 'resendVerificationEmail']);
Route::middleware(['auth:api'])->get('/me', function (Request $request) {
    $user = $request->user();
    return response()->json([
        'user' => [
            'id' => $user->UserId,
            'full_name' => $user->FullName,
            'email' => $user->Email,
            'address' => $user->Address,
            'birthDate' => $user->DateOfBirth,
            'phone' => $user->Phone,
            'username' => $user->Username,
            'is_active' => $user->IsActive,
            'roles' => $user->roles()->pluck('RoleName'),
        ],
    ], 200, [], JSON_UNESCAPED_UNICODE);
});
//admin-revenue
Route::get('/report-revenue/combined', [ReportRevenueController::class, 'getCombinedStatistics']);
Route::get('/report-revenue/detail-revenue', [ReportRevenueController::class, 'getDetailRevenueReport']);
Route::get('/rooms', [RoomController::class, 'getAllRooms']);


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

    // Chỉ định dịch vụ
    Route::post('/appointments/{appointmentId}/assign-services', [ServiceController::class, 'assignServices']);
    Route::get('/doctor/check-roles', [ServiceController::class, 'checkRolesAndTechnicians']);

});

//Nhóm route cho User

Route::prefix('users')->group(function () {
    Route::get('/', [AdminUserController::class, 'index']);
    Route::post('/', [AdminUserController::class, 'store']);
    Route::put('/{id}', [AdminUserController::class, 'update']);
    Route::delete('/{id}', [AdminUserController::class, 'destroy']);
    Route::put('/toggle-status/{id}', [AdminUserController::class, 'toggleStatus']);
    Route::put('/reset-password/{id}', [AdminUserController::class, 'resetPassword']);
});

Route::get('/roles', [AdminUserController::class, 'roles']);
// Route::post('/print/export', [InvoicePrintController::class, 'export']); // POST để pass appointment_id + type
Route::get('/print/{type}/{appointment_id}', [InvoicePrintController::class, 'export']);
Route::post('/print/prescription/preview', [InvoicePrintController::class, 'previewPrescription']);
// Route cho PDF Preview
Route::post('/print/preview-html', [InvoicePrintController::class, 'previewHTML']);


// Technician Routes
Route::prefix('technician')->group(function () {
    // Danh sách dịch vụ
    Route::get('/servicesv1', [TestResultsController::class, 'getAssignedServices']);
    // thay đổi trạng thái dịch vụ
    Route::post('/services/{serviceOrderId}/status', [TestResultsController::class, 'updateServiceStatus']);
});

//Receptionist Routes
Route::prefix('receptionist')->group(function () {
    //lịch hẹn
    Route::get('/appointments/today', [AppointmentRecepController::class, 'GetAppointmentToday']);
    //hàng chờ
    Route::get('/queue', [QueueController::class, 'GetQueueByDate']);
    Route::get('/queue/{room_id}', [QueueController::class, 'GetQueueByRoomAndDate']);
    Route::post('/queueNoDirect', [QueueController::class, 'CreateQueue']);
    Route::post('/queueDirect', [QueueController::class, 'CreateDicrectAppointment']);
    Route::put('/queue/{queueId}/status', [QueueController::class, 'UpdateQueueStatus']);
    Route::put('/queue/{queueId}/prioritize', [QueueController::class, 'PrioritizeQueue']);
    Route::delete('/queue/{queueId}', [QueueController::class, 'DeleteQueue']);
    //Rooms
    Route::get('/rooms', [RoomController::class, 'getAllRooms']);
    //Tiếp nhận patient
    Route::get('/searchPatient', [PatientByRecepController::class, 'searchPatients']);
    Route::post('/patients', [PatientController::class, 'createPatient']);
    Route::get('/patients', [PatientByRecepController::class, 'getPatient']);
    // Thêm route này vào receptionist routes
    Route::get('/patients/{patientId}', [PatientByRecepController::class, 'getPatientDetails']);
    // Medical staff routes
    Route::get('/medical-staff/schedules', [MedicalStaffController::class, 'getDoctorsWithSchedules']);
    Route::get('/medical-staff/room/{roomId}', [MedicalStaffController::class, 'getDoctorsByRoom']);

    // Complete reception
    Route::post('/complete', [ReceptionController::class, 'completeReception']);

    // Online appointments
    Route::get('/appointments/online', [AppointmentRecepController::class, 'getOnlineAppointments']);
    //notification
    Route::middleware(['auth:api', 'role:Admin,Lễ tân'])
        ->get('/notifications', [ReceptionController::class, 'getNotification']);
});

// Patient Routes
Route::middleware(['auth:api'])
    ->put('/patient/update-profile/{id}', [PatientController::class, 'updateProfile']);
Route::middleware(['auth:api'])
    ->post('/patient/send-vefication-email', [PatientController::class, 'sendVerificationEmail']);
Route::middleware(['auth:api'])
    ->post('/account/change-password', [PatientController::class, 'changePassword']);

// Route::middleware()->post('/auth/login', [AuthController::class, 'login']);

Route::middleware(['auth:api'])
    ->get('/patient/services', [PatientController::class, 'getAllServices']);
Route::middleware(['auth:api'])
    ->post('/patient/appointments/book', [PatientController::class, 'bookingAppointment']);
Route::middleware(['auth:api', 'role:Admin,Bệnh nhân'])
    ->get('/patient/appointments/histories', [PatientController::class, 'appointmentHistories']);
Route::middleware(['auth:api', 'role:Admin,Bệnh nhân'])
    ->put('/patient/appointments/cancel', [PatientController::class, 'cancelAppointment']);
Route::middleware(['auth:api', 'role:Admin,Bệnh nhân'])
    ->get('/patient/appointments/detail', [PatientController::class, 'getDetailAppointment']);
// Route::middleware()->post('/auth/login', [AuthController::class, 'login']);


// Service management routes for Admin
Route::prefix('admin/services')->group(function () {
    Route::get('/', [AdminServiceController::class, 'index']);
    Route::post('/', [AdminServiceController::class, 'store']);
    Route::get('/{id}', [AdminServiceController::class, 'show']);
    Route::put('/{id}', [AdminServiceController::class, 'update']);
    Route::delete('/{id}', [AdminServiceController::class, 'destroy']);
    Route::get('/types/all', [AdminServiceController::class, 'getServiceTypes']);
    Route::get('/type/{type}', [AdminServiceController::class, 'getServicesByType']);
});

// Payment Routes
// MoMo Payment Routes
Route::prefix('payments')->group(function () {
    // Payment APIs
    Route::post('/momo/create', [PaymentController::class, 'createPayment']);
    Route::post('/momo/callback', [PaymentController::class, 'handleCallback'])->name('payment.callback');
    Route::get('/momo/return', [PaymentController::class, 'handleReturn'])->name('payment.return');

    // Reset APIs Payment
    Route::post('/momo/reset', [PaymentController::class, 'resetPayment']);
    Route::post('/momo/reset-stuck-invoices', [PaymentController::class, 'resetStuckInvoices']);
    Route::post('/momo/reset-single-invoice/{invoiceId}', [PaymentController::class, 'resetSingleInvoice']);

    // Invoice Routes
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/payment-history', [InvoiceController::class, 'paymentHistory']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
});
