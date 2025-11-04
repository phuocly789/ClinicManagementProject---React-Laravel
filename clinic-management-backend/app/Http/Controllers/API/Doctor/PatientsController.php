<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Diagnosis;
use App\Models\ServiceOrder;
use App\Models\Prescription;
use App\Models\PrescriptionDetail;
use App\Models\Medicine;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PatientsController extends Controller
{
    /**
     * Lấy lịch sử khám bệnh của bệnh nhân theo PatientId
     */
   public function getPatientHistory($patientId)
{
    try {
        $patient = Patient::find($patientId);
        
        if (!$patient) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy bệnh nhân',
                'data' => []
            ], 404);
        }

        $appointments = Appointment::where('PatientId', $patientId)
            ->with([
                'diagnoses',
                'service_orders.service',
                'prescriptions.prescription_details.medicine', // QUAN TRỌNG: prescriptions phải thuộc appointment này
            ])
            ->orderBy('AppointmentDate', 'desc')
            ->orderBy('AppointmentTime', 'asc')
            ->get();

        $history = $appointments->map(function ($appt) {
            $diagnosis = $appt->diagnoses->first();

            return [
                'appointment_id' => $appt->AppointmentId,
                'visit_date' => $appt->AppointmentDate->format('d/m/Y'),
                'visit_datetime' => $appt->AppointmentDate->format('Y-m-d') . ($appt->AppointmentTime ? ' ' . substr($appt->AppointmentTime, 0, 5) : ''),
                'time' => $appt->AppointmentTime ? substr($appt->AppointmentTime, 0, 5) : 'N/A',
                'status' => $appt->Status ?? 'N/A',
                'symptoms' => $diagnosis->Symptoms ?? 'Chưa có thông tin',
                'diagnosis' => $diagnosis->Diagnosis ?? 'Chưa có thông tin',
                'diagnosis_date' => $diagnosis ? $diagnosis->DiagnosisDate?->format('d/m/Y H:i') : 'N/A',
                'services' => $appt->service_orders->map(function ($order) {
                    return [
                        'service_id' => $order->service->ServiceId ?? null,
                        'name' => $order->service->ServiceName ?? 'Dịch vụ không xác định',
                        'price' => $order->service->Price ?? 0,
                        'description' => $order->service->Description ?? '',
                        'status' => $order->Status ?? 'N/A',
                        'result' => $order->Result ?? 'Chưa có kết quả'
                    ];
                })->filter(fn($service) => !empty($service['name'])),
                'test_results' => $appt->service_orders->whereNotNull('Result')->pluck('Result')->first() ?? 'Chưa có kết quả xét nghiệm',
                'notes' => $appt->Notes ?? 'Không có ghi chú',

                // CHỈ HIỂN THỊ PRESCRIPTIONS CỦA LẦN KHÁM NÀY
                'prescriptions' => $appt->prescriptions->map(function ($prescription) {
                    return [
                        'prescription_id' => $prescription->PrescriptionId,
                        'instructions' => $prescription->Instructions ?? 'Không có hướng dẫn',
                        'prescription_date' => $prescription->PrescriptionDate?->format('d/m/Y H:i') ?? 'N/A',
                        'medicines' => $prescription->prescription_details->map(function ($detail) {
                            return [
                                'medicine_id' => $detail->medicine->MedicineId ?? null,
                                'medicine_name' => $detail->medicine->MedicineName ?? 'Thuốc không xác định',
                                'quantity' => $detail->Quantity,
                                'unit' => $detail->medicine->Unit ?? 'viên',
                                'dosage' => $detail->DosageInstruction,
                                'unit_price' => $detail->UnitPrice ?? $detail->medicine->Price ?? 0,
                                'total_price' => $detail->TotalPrice ?? 0,
                            ];
                        })
                    ];
                }),

                'total_service_cost' => $appt->service_orders->sum(function ($order) {
                    return $order->service->Price ?? 0;
                }),
                'total_prescription_cost' => $appt->prescriptions->flatMap->prescription_details->sum('TotalPrice')
            ];
        });

        // ... phần còn lại của patient info
        $patientInfo = DB::table('Patients')
            ->join('Users', 'Patients.PatientId', '=', 'Users.UserId')
            ->where('Patients.PatientId', $patientId)
            ->select(
                'Patients.PatientId',
                'Patients.MedicalHistory',
                'Users.FullName',
                'Users.DateOfBirth',
                'Users.Gender',
                'Users.Phone',
                'Users.Email',
                'Users.Address',
                'Users.CreatedAt as RegisteredDate'
            )
            ->first();

        $patientData = [
            'patient_id' => $patientInfo->PatientId,
            'name' => $patientInfo->FullName ?? 'N/A',
            'date_of_birth' => $patientInfo->DateOfBirth ? Carbon::parse($patientInfo->DateOfBirth)->format('d/m/Y') : 'N/A',
            'age' => $patientInfo->DateOfBirth ? Carbon::parse($patientInfo->DateOfBirth)->age : 'N/A',
            'gender' => $patientInfo->Gender ?? 'N/A',
            'phone' => $patientInfo->Phone ?? 'N/A',
            'email' => $patientInfo->Email ?? 'N/A',
            'address' => $patientInfo->Address ?? 'N/A',
            'medical_history' => $patientInfo->MedicalHistory ?? 'Không có tiền sử bệnh',
            'registered_date' => $patientInfo->RegisteredDate ? Carbon::parse($patientInfo->RegisteredDate)->format('d/m/Y') : 'N/A'
        ];

        return response()->json([
            'success' => true,
            'data' => $history,
            'patient' => $patientData,
            'message' => 'Lấy lịch sử khám thành công'
        ]);

    } catch (\Exception $e) {
        \Log::error('Error in getPatientHistory: ' . $e->getMessage());
        
        return response()->json([
            'success' => false,
            'message' => 'Lỗi khi lấy lịch sử khám: ' . $e->getMessage(),
            'data' => []
        ], 500);
    }
}

    /**
     * Lấy danh sách tất cả bệnh nhân (cho lịch sử)
     */
    public function index()
    {
        // Fix: Dùng JOIN để lấy data trực tiếp, tránh relation null
        $patients = DB::table('Patients')
            ->join('Users', 'Patients.PatientId', '=', 'Users.UserId')
            ->select(
                'Patients.PatientId',
                'Users.FullName',
                'Users.DateOfBirth',
                'Users.Gender',
                'Users.Phone',
                'Users.Address'
            )
            ->orderBy('Patients.PatientId', 'desc')
            ->get()
            ->map(function ($row) {
                return [
                    'patient_id' => $row->PatientId,
                    'name' => $row->FullName ?? 'N/A',
                    'age' => $row->DateOfBirth ? Carbon::parse($row->DateOfBirth)->age : 'N/A',
                    'gender' => $row->Gender ?? 'N/A',
                    'phone' => $row->Phone ?? 'N/A',
                    'address' => $row->Address ?? 'N/A',
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $patients,
            'message' => 'Lấy danh sách bệnh nhân thành công'
        ]);
    }
}