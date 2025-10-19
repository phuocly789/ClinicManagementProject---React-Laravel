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

        $appointment = Appointment::findOrFail($appointmentId);
        
        // 🆕 Hardcode staffId tạm cho test (thay 1 bằng ID bác sĩ thật từ DB MedicalStaff)
        $staffId = 4; // Auth::id(); // Uncomment khi có auth

        // Validate Patient & Staff
        $patient = Patient::find($appointment->PatientId);
        if (!$patient) {
            return response()->json(['error' => 'Không tìm thấy bệnh nhân'], 400);
        }
        $staff = MedicalStaff::find($staffId);
        if (!$staff) {
            return response()->json(['error' => 'Không tìm thấy thông tin bác sĩ (StaffId: ' . $staffId . ')'], 400);
        }

        DB::beginTransaction();

        try {
            // Update Appointment status
            $appointment->update(['Status' => 'Đã khám']);

            // Link MedicalRecord if not exist
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

            // Save Diagnosis nếu có
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

            // Save ServiceOrders
            foreach ($request->services as $serviceId => $isSelected) {
                if ($isSelected) {
                    $service = Service::find($serviceId);
                    if (!$service) {
                        throw new \Exception("Không tìm thấy dịch vụ ID: " . $serviceId);
                    }

                    ServiceOrder::create([
                        'AppointmentId' => $appointmentId,
                        'ServiceId' => $serviceId,
                        'AssignedStaffId' => $staffId,
                        'OrderDate' => now(),
                        'Status' => 'Pending',
                    ]);
                }
            }

            // Save Prescriptions
            if ($request->prescriptions && count($request->prescriptions) > 0) {
                $prescription = Prescription::create([
                    'AppointmentId' => $appointmentId,
                    'StaffId' => $staffId,
                    'RecordId' => $recordId,
                    'Instructions' => $request->instructions,
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
                    ];
                });
            })->toArray(),
        ];

        return response()->json($data);
    }

    public function tempSave(Request $request, $appointmentId)
    {
        $appointment = Appointment::findOrFail($appointmentId);

        $appointment->update([
            'DraftData' => json_encode($request->all(['symptoms', 'diagnosis', 'services', 'prescriptions'])),
        ]);

        return response()->json(['success' => true, 'message' => 'Đã tạm lưu']);
    }
}