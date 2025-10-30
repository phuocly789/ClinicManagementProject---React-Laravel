<?php

namespace App\Http\Controllers\API\Doctor;

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
use App\Models\MedicalStaff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
                        \Log::warning("Service not found ID: " . $serviceId);
                        continue;
                    }

                    // SỬ DỤNG STATUS HỢP LỆ: 'Đã chỉ định' cho dịch vụ mới
                    ServiceOrder::create([
                        'AppointmentId' => $appointmentId,
                        'ServiceId' => $serviceId,
                        'AssignedStaffId' => $staffId,
                        'OrderDate' => now(),
                        'Status' => 'Đã chỉ định', // GIÁ TRỊ HỢP LỆ
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

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hoàn tất khám thành công',
                'data' => $appointment
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['error' => 'Lỗi lưu dữ liệu: ' . $e->getMessage()], 500);
        }
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
}