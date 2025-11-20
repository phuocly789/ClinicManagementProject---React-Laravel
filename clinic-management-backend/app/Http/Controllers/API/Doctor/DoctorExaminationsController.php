<?php

namespace App\Http\Controllers\API\Doctor;

use App\Events\QueueStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Diagnosis;
use App\Models\ServiceOrder;
use App\Models\Prescription;
use App\Models\PrescriptionDetail;
use App\Models\Medicine;
use App\Models\Service;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Invoice;
use App\Models\InvoiceDetail;
use App\Models\MedicalStaff;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Reverb\Loggers\Log;

class DoctorExaminationsController extends Controller
{
    public function start(Request $request, $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);

        if (in_array($appointment->Status, ['Đang khám', 'Đã khám'])) {
            return response()->json(['error' => 'Không thể bắt đầu khám cho trạng thái này'], 400);
        }

        $appointment->update([
            'Status' => 'Đang khám',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã bắt đầu khám',
            'data' => $appointment
        ]);
    }

    public function complete(Request $request, $appointmentId)
    {
        $request->validate([
            'symptoms' => 'nullable|string',
            'diagnosis' => 'nullable|string',
            'services' => 'array',
            'prescriptions' => 'array',
            'instructions' => 'nullable|string',
        ]);

        // SỬA: Thêm eager loading để lấy thông tin patient và user
        $appointment = Appointment::with(['patient.user'])->findOrFail($appointmentId);

        $staffId = 4;

        // SỬA: Lấy patient từ relationship đã eager load
        $patient = $appointment->patient;
        if (!$patient) {
            return response()->json(['error' => 'Không tìm thấy bệnh nhân'], 400);
        }

        $staff = MedicalStaff::find($staffId);
        if (!$staff) {
            return response()->json(['error' => 'Không tìm thấy thông tin bác sĩ'], 400);
        }

        DB::beginTransaction();

        try {
            $appointment->update(['Status' => 'Đã khám']);

            if ($request['status'] === 'done') {

                // ✅ Cập nhật Status trong Queue
                DB::table('Queues')
                    ->where('AppointmentId', $appointmentId)
                    ->update(['Status' => 'Đã khám']);

                // ✅ SỬA: Lấy đúng queue vừa update (không dùng whereNull)
                $queueData = DB::table('Queues')
                    ->join('Rooms', 'Queues.RoomId', '=', 'Rooms.RoomId')
                    ->join('Patients', 'Queues.PatientId', '=', 'Patients.PatientId')
                    ->join('Users as PatientUser', 'Patients.PatientId', '=', 'PatientUser.UserId')
                    ->leftJoin('StaffSchedules', function ($join) {
                        $join->on('Queues.RoomId', '=', 'StaffSchedules.RoomId')
                            ->whereDate('StaffSchedules.WorkDate', now()->toDateString());
                    })
                    ->leftJoin('MedicalStaff', 'StaffSchedules.StaffId', '=', 'MedicalStaff.StaffId')
                    ->leftJoin('Users as DoctorUser', 'MedicalStaff.StaffId', '=', 'DoctorUser.UserId')
                    ->where('Queues.AppointmentId', $appointmentId)
                    ->select(
                        'Queues.QueueId',
                        'Queues.PatientId',
                        'PatientUser.FullName as PatientName',
                        'Queues.AppointmentId',
                        'Queues.RecordId',
                        'Queues.QueueDate',
                        'Queues.QueueTime',
                        'Queues.QueuePosition',
                        'Queues.RoomId',
                        'Rooms.RoomName',
                        'Queues.Status',
                        'Queues.TicketNumber',
                        'DoctorUser.FullName as DoctorName'
                    )
                    ->first();

                // ✅ Broadcast nếu có data
                if ($queueData) {
                    // Log::info('Broadcasting completed examination', [
                    //     'queueData' => $queueData,
                    //     'appointmentId' => $appointmentId
                    // ]);

                    broadcast(new QueueStatusUpdated(
                        doctor: null,
                        receptionist: (array) $queueData,
                        roomId: $queueData->RoomId,
                        action: 'completed'
                    ))->toOthers();
                }
            }

            $recordId = $appointment->RecordId;
            if (!$recordId) {
                $medicalRecord = MedicalRecord::create([
                    'PatientId' => $appointment->PatientId,
                    'RecordNumber' => 'REC-' . time(),
                    'IssuedDate' => now(),
                    'Status' => 'Active',
                    'CreatedBy' => $staffId,
                ]);
                $recordId = $medicalRecord->RecordId;
                $appointment->update(['RecordId' => $recordId]);
            }

            // THÊM: Tạo Invoice trước khi tạo ServiceOrder và Prescription
            $invoice = $this->createInvoice($appointment, $staffId, $request);

            if ($request->symptoms || $request->diagnosis) {
                Diagnosis::updateOrCreate(
                    ['AppointmentId' => $appointmentId],
                    [
                        'StaffId' => $staffId,
                        'RecordId' => $recordId,
                        'Symptoms' => $request->symptoms,
                        'Diagnosis' => $request->diagnosis,
                        'DiagnosisDate' => now(),
                    ]
                );
            }

            // SAVE SERVICE ORDERS VỚI STATUS HỢP LỆ
            if ($request->services && is_array($request->services)) {
                foreach ($request->services as $serviceId => $isSelected) {
                    if ($serviceId == 0 || !is_numeric($serviceId) || !$isSelected) {
                        continue;
                    }

                    $service = Service::find($serviceId);
                    if (!$service) {
                        Log::warning("Service not found ID: " . $serviceId);
                        continue;
                    }

                    // SỬ DỤNG STATUS HỢP LỆ: 'Đã chỉ định' cho dịch vụ mới
                    ServiceOrder::create([
                        'AppointmentId' => $appointmentId,
                        'ServiceId' => $serviceId,
                        'AssignedStaffId' => $staffId,
                        'OrderDate' => now(),
                        'Status' => 'Đã chỉ định', // GIÁ TRỊ HỢP LỆ
                        'InvoiceId' => $invoice->InvoiceId, // THÊM: Liên kết với Invoice
                    ]);
                }
            }

            if ($request->prescriptions && count($request->prescriptions) > 0) {
                // SỬA: Lấy tên bệnh nhân từ relationship
                $patientName = 'Bệnh nhân';
                if ($patient->user && $patient->user->FullName) {
                    $patientName = $patient->user->FullName;
                }

                // SỬA: Tạo instructions tự động với tên bệnh nhân
                $instructions = $request->instructions ?? "Đơn thuốc cho bệnh nhân {$patientName}";

                $prescription = Prescription::create([
                    'AppointmentId' => $appointmentId,
                    'StaffId' => $staffId,
                    'RecordId' => $recordId,
                    'Instructions' => $instructions, // SỬA: Dùng instructions đã tạo
                    'PrescriptionDate' => now(),
                ]);

                foreach ($request->prescriptions as $med) {
                    $medicineId = $med['medicineId'] ?? null;
                    if (!$medicineId) {
                        $medicine = Medicine::where('MedicineName', $med['medicine'])->first();
                        if (!$medicine) {
                            throw new \Exception("Không tìm thấy thuốc: " . $med['medicine']);
                        }
                        $medicineId = $medicine->MedicineId;
                    }

                    PrescriptionDetail::create([
                        'PrescriptionId' => $prescription->PrescriptionId,
                        'MedicineId' => $medicineId,
                        'Quantity' => $med['quantity'],
                        'DosageInstruction' => $med['dosage'],
                        'UnitPrice' => $med['unitPrice'] ?? 0,
                        'TotalPrice' => $med['totalPrice'] ?? 0,
                    ]);
                }
            }



            // if ($queueData) {
            //     broadcast(new QueueStatusUpdated(
            //         (array) $queueData,
            //         $queueData->RoomId,
            //         'completed'
            //     ))->toOthers();
            // }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoàn tất khám thành công và đã tạo hóa đơn',
                'data' => [
                    'appointment' => $appointment,
                    'invoice' => $invoice // THÊM: Trả về thông tin invoice
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['error' => 'Lỗi lưu dữ liệu: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Tạo invoice cho cuộc hẹn
     */
    private function createInvoice($appointment, $staffId, $request)
    {
        // Tính tổng tiền
        $totalAmount = 0;
        $invoiceDetails = [];

        // Tính tiền dịch vụ
        if ($request->services && is_array($request->services)) {
            foreach ($request->services as $serviceId => $isSelected) {
                if ($serviceId == 0 || !is_numeric($serviceId) || !$isSelected) {
                    continue;
                }

                $service = Service::find($serviceId);
                if ($service && $service->Price) {
                    $subTotal = $service->Price;
                    $totalAmount += $subTotal;

                    $invoiceDetails[] = [
                        'ServiceId' => $serviceId,
                        'MedicineId' => null,
                        'Quantity' => 1,
                        'UnitPrice' => $service->Price,
                        // KHÔNG THÊM SubTotal - để database tự tính
                    ];
                }
            }
        }

        // Tính tiền thuốc
        if ($request->prescriptions && count($request->prescriptions) > 0) {
            foreach ($request->prescriptions as $med) {
                $medicineId = $med['medicineId'] ?? null;
                $medicineName = $med['medicine'] ?? '';

                if (!$medicineId && $medicineName) {
                    $medicine = Medicine::where('MedicineName', $medicineName)->first();
                    if ($medicine) {
                        $medicineId = $medicine->MedicineId;
                    }
                }

                if ($medicineId) {
                    $quantity = $med['quantity'] ?? 1;
                    $unitPrice = $med['unitPrice'] ?? 0;
                    $totalPrice = $med['totalPrice'] ?? ($quantity * $unitPrice);

                    $totalAmount += $totalPrice;

                    $invoiceDetails[] = [
                        'ServiceId' => null,
                        'MedicineId' => $medicineId,
                        'Quantity' => $quantity,
                        'UnitPrice' => $unitPrice,
                        // KHÔNG THÊM SubTotal - để database tự tính
                    ];
                }
            }
        }

        // Nếu không có dịch vụ hay thuốc, vẫn tạo invoice với phí khám cơ bản
        if ($totalAmount === 0) {
            $totalAmount = 100000; // Phí khám cơ bản mặc định
        }

        // Tạo invoice
        $invoice = Invoice::create([
            'AppointmentId' => $appointment->AppointmentId,
            'PatientId' => $appointment->PatientId,
            'TotalAmount' => $totalAmount,
            'InvoiceDate' => now('Asia/Ho_Chi_Minh'),
            'Status' => 'Chờ thanh toán',
        ]);

        // Tạo invoice details - KHÔNG gửi SubTotal
        foreach ($invoiceDetails as $detail) {
            InvoiceDetail::create(array_merge($detail, ['InvoiceId' => $invoice->InvoiceId]));
        }

        return $invoice;
    }

    public function show($appointmentId)
    {
        $appointment = Appointment::with([
            'diagnoses',
            'service_orders.service',
            'prescriptions.prescription_details.medicine',
        ])->findOrFail($appointmentId);

        $data = [
            'appointment' => $appointment,
            'symptoms' => $appointment->diagnoses->first()->Symptoms ?? '',
            'diagnosis' => $appointment->diagnoses->first()->Diagnosis ?? '',
            'services' => $appointment->service_orders->pluck('ServiceId')->toArray(),
            'prescriptions' => $appointment->prescriptions->flatMap(function ($pres) {
                return $pres->prescription_details->map(function ($detail) {
                    return [
                        'medicine' => $detail->medicine->MedicineName,
                        'quantity' => $detail->Quantity,
                        'dosage' => $detail->DosageInstruction,
                        'unitPrice' => $detail->UnitPrice ?? 0,
                        'totalPrice' => $detail->TotalPrice ?? 0,
                    ];
                });
            })->toArray(),
        ];

        return response()->json($data);
    }

    public function tempSave(Request $request, $appointmentId)
    {
        // Tạm thời không lưu gì cả, chỉ trả về success
        // Hoặc bạn có thể thêm cột DraftData vào bảng Appointments

        return response()->json([
            'success' => true,
            'message' => 'Đã ghi nhận tạm lưu'
        ]);
    }

    public function getRoomInfo(Request $request)
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Lấy StaffId từ MedicalStaff
            $staff = \App\Models\MedicalStaff::where('StaffId', $user->UserId)->first();

            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy thông tin nhân viên y tế.'
                ], 404);
            }

            // Lấy phòng từ StaffSchedules liên quan hôm nay
            $today = Carbon::today()->toDateString(); // 'YYYY-MM-DD'

            $schedule = \App\Models\StaffSchedule::where('StaffId', $staff->StaffId)
                ->whereDate('WorkDate', $today)
                ->with('room')
                ->first();

            if (!$schedule || !$schedule->room) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy phòng của bác sĩ hôm nay.'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Lấy thông tin phòng khám thành công.',
                'data' => [
                    'room_id' => $schedule->room->RoomId,
                    'room_name' => $schedule->room->RoomName,
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server khi lấy thông tin phòng.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
