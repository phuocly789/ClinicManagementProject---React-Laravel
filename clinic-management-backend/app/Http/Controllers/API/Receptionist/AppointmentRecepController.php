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

    /**
     * Show the form for creating a new resource.
     */
    public function CreateAppoitment(Request $request)
    {
        $request->validate([
            'PatientId' => 'required|integer|exists:Patients,PatientId',
            'StaffId' => 'required|integer|exists:MedicalStaff,StaffId',
            'Notes' => 'nullable|string'
        ]);

        $patientId = $request->input('PatientId');
        $staffId = $request->input('StaffId');
        $appointmentDate = now('Asia/Ho_Chi_Minh')->format('Y-m-d');
        $appointmentTime = now('Asia/Ho_Chi_Minh')->format('H:i:s');
        $notes = $request->input('Notes', '');

        // $createdBy = auth()->user()->UserId;
        $createdBy = 3;

        //kiểm tra bác sĩ đó có lich làm việc không
        $schedule = StaffSchedule::where('StaffId', $staffId)
            ->whereDate('WorkDate', $appointmentDate)
            ->where('IsAvailable', true)
            ->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Bác sĩ không có lịch làm việc vào ngày đã chọn.'
            ], 400);
        }
        //kiểm tra trùng lịch hẹn
        $existingAppointment = Appointment::where('StaffId', $staffId)
            ->whereDate('AppointmentDate', $appointmentDate)
            ->where('AppointmentTime', $appointmentTime)
            ->first();

        if ($existingAppointment) {
            return response()->json([
                'success' => false,
                'message' => 'Bác sĩ đã có lịch hẹn vào thời gian đã chọn.'
            ], 400);
        }

        //tạo lịch hẹn mới
        $record = MedicalRecord::where('PatientId', $patientId)->first();
        $recordId = $record ? $record->RecordId : null;

        try {
            DB::beginTransaction();
            $appointment = Appointment::create([
                'PatientId' => $patientId,
                'StaffId' => $staffId,
                'ScheduleId' => $schedule->ScheduleId,
                'RecordId' => $recordId,
                'AppointmentDate' => $appointmentDate,
                'AppointmentTime' => $appointmentTime,
                'Status' => 'Đang chờ',
                'CreatedBy' => $createdBy,
                'CreatedAt' => now(),
                'Notes' => $notes
            ]);
            DB::commit();
            return response()->json([
                'success' => true,
                'data' => [
                    'AppointmentId' => $appointment->AppointmentId,
                    'PatientId' => $appointment->PatientId,
                    'StaffId' => $appointment->StaffId,
                    'ScheduleId' => $appointment->ScheduleId,
                    'RecordId' => $appointment->RecordId,
                    'AppointmentDate' => $appointment->AppointmentDate,
                    'AppointmentTime' => is_string($appointment->AppointmentTime) ? substr($appointment->AppointmentTime, 0, 5) : '00:00',
                    'Status' => $appointment->Status,
                    'Notes' => $appointment->notes ?? '',
                ],
                'message' => 'Lịch hẹn được tạo thành công.'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Tạo lịch hẹn thất bại. Vui lòng thử lại.'
            ], 500);
        }
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
