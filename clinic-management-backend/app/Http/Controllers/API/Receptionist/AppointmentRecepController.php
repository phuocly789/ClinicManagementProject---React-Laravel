<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\StaffSchedule;
use Faker\Provider\Medical;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppointmentRecepController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function GetAppointmentToday()
    {
        //
        $today = now()->format('Y-m-d');

        //lấy danh sách appointment theo ngày hiện tại
        $appointments = Appointment::with([
            'patient.User:UserId,FullName',
            'medical_staff.User:UserId,FullName',
            'medical_record:PatientId'
        ])
            ->whereDate('AppointmentDate', $today)
            ->orderBy('AppointmentTime', 'asc')
            ->get()
            ->map(function ($a) {
                return [
                    'AppointmentId' => $a->AppointmentId,
                    'PatientId' => $a->PatientId,
                    'PatientName' => $a->patient?->user?->FullName ?? 'N/A',
                    'DoctorId' => $a->StaffId,
                    'DoctorName' => $a->medical_staff?->user?->FullName ?? 'N/A',
                    'AppointmentDate' => $a->AppointmentDate,
                    'AppointmentTime' => is_string($a->AppointmentTime) ? substr($a->AppointmentTime, 0, 5) : '00:00',
                    'Status' => $a->Status,
                    'MedicalRecordId' => $a->medical_record?->MedicalRecordId ?? null,
                    'Notes' => $a->notes ?? '',
                ];
            });
        return response()->json([
            'success' => true,
            'data' => $appointments,
            'message' => 'Danh sách lịch hẹn hôm nay được tải thành công.'
        ]);
    }

   public function UpdateAppointmentStatus(Request $request, $appointmentId)
    {
        $request->validate([
            'Status' => 'required|string|in:Đã đặt,Đang chờ,Đang khám,Đã khám,Hủy'
        ]);

        $appointment = Appointment::find($appointmentId);
        if (!$appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không tồn tại.'
            ], 404);
        }

        $appointment->Status = $request->input('Status');
        $appointment->save();

        return response()->json([
            'success' => true,
            'data' => [
                'AppointmentId' => $appointment->AppointmentId,
                'Status' => $appointment->Status,
            ],
            'message' => 'Cập nhật trạng thái lịch hẹn thành công.'
        ]);
    }
}
