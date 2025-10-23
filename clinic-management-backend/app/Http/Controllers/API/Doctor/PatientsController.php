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
        $patient = Patient::findOrFail($patientId);

        $appointments = Appointment::where('PatientId', $patientId)
            ->with([
                'diagnoses',
                'service_orders.service',
                'prescriptions.prescription_details.medicine',
            ])
            ->orderBy('AppointmentDate', 'desc')
            ->orderBy('AppointmentTime', 'asc')
            ->get();

        $history = $appointments->map(function ($appt) {
            return [
                'visit_date' => $appt->AppointmentDate->format('d/m/Y'),
                'time' => $appt->AppointmentTime ? substr($appt->AppointmentTime, 0, 5) : 'N/A',
                'symptoms' => $appt->diagnoses->first()->Symptoms ?? 'N/A',
                'diagnosis' => $appt->diagnoses->first()->Diagnosis ?? 'N/A',
                'services' => $appt->service_orders->map(function ($order) {
                    return [
                        'name' => $order->service->ServiceName,
                        'price' => $order->service->Price,
                    ];
                }),
                'test_results' => $appt->service_orders->first()->Result ?? 'Chưa có',
                'notes' => $appt->notes ?? 'N/A',
                'prescriptions' => $appt->prescriptions->flatMap(function ($pres) {
                    return $pres->prescription_details->map(function ($detail) {
                        return [
                            'medicine' => $detail->medicine->MedicineName,
                            'quantity' => $detail->Quantity,
                            'dosage' => $detail->DosageInstruction,
                        ];
                    });
                }),
            ];
        });

        // Fix: Dùng JOIN để lấy patient info thay vì relation (tránh null)
        $patientInfo = DB::table('Patients')
            ->join('Users', 'Patients.PatientId', '=', 'Users.UserId')
            ->where('Patients.PatientId', $patientId)
            ->select(
                'Patients.PatientId',
                'Users.FullName',
                'Users.DateOfBirth',
                'Users.Gender',
                'Users.Phone',
                'Users.Address'
            )
            ->first();

        $patientData = $patientInfo ? [
            'patient_id' => $patientInfo->PatientId,
            'name' => $patientInfo->FullName ?? 'N/A',
            'age' => $patientInfo->DateOfBirth ? Carbon::parse($patientInfo->DateOfBirth)->age : 'N/A',
            'gender' => $patientInfo->Gender ?? 'N/A',
            'phone' => $patientInfo->Phone ?? 'N/A',
            'address' => $patientInfo->Address ?? 'N/A',
        ] : [
            'patient_id' => $patient->PatientId,
            'name' => 'N/A',
            'age' => 'N/A',
            'gender' => 'N/A',
            'phone' => 'N/A',
            'address' => 'N/A',
        ];

        return response()->json([
            'success' => true,
            'data' => $history,
            'patient' => $patientData,
            'message' => 'Lấy lịch sử khám thành công'
        ]);
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