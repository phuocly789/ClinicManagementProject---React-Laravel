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

    //lấy api lịch hẹn online
    // Trong AppointmentRecepController.php - Bổ sung thêm
    public function getOnlineAppointments(Request $request)
    {
        $request->validate([
            'status' => 'nullable|string|in:Đã đặt,Đang chờ,Đã khám,Hủy',
            'date' => 'nullable|date'
        ]);

        $today = $request->input('date', now()->format('Y-m-d'));
        $status = $request->input('status', 'Đã đặt');

        $appointments = Appointment::with([
            'patient.user:UserId,FullName,Phone,Email,DateOfBirth,Gender,Address',
            'medical_staff.user:UserId,FullName',
            'medical_record'
        ])
            ->whereDate('AppointmentDate', $today)
            ->where('Status', $status)
            ->orderBy('AppointmentTime', 'asc')
            ->get()
            ->map(function ($appointment) {
                return [
                    'AppointmentId' => $appointment->AppointmentId,
                    'PatientId' => $appointment->PatientId,
                    'PatientName' => $appointment->patient->user->FullName,
                    'Phone' => $appointment->patient->user->Phone,
                    'Email' => $appointment->patient->user->Email,
                    'DayOfBirth' => $appointment->patient->user->DateOfBirth,
                    'Gender' => $appointment->patient->user->Gender,
                    'Address' => $appointment->patient->user->Address,
                    'DoctorName' => $appointment->medical_staff->user->FullName ?? 'Chưa phân công',
                    'AppointmentDate' => ($appointment->AppointmentDate),
                    'AppointmentTime' => substr($appointment->AppointmentTime, 0, 5),
                    'Status' => $appointment->Status,
                    'Notes' => $appointment->Notes
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $appointments,
            'message' => 'Danh sách lịch hẹn online được tải thành công.'
        ]);
    }
    public function getAppointmentCountByTimeSlot(Request $request)
    {
        try {
            $request->validate([
                'date' => 'required|date',
                'time' => 'required|date_format:H:i',
                'room_id' => 'nullable|integer',
                'staff_id' => 'nullable|integer'
            ]);

            $date = $request->input('date');
            $time = $request->input('time');
            $roomId = $request->input('room_id');
            $staffId = $request->input('staff_id');

            // Build query
            $query = Appointment::where('AppointmentDate', $date)
                ->where('AppointmentTime', $time)
                ->whereIn('Status', ['Đã đặt', 'Đang chờ', 'Đang khám']); // Chỉ đếm các status đang active

            // Filter by room if provided
            if ($roomId) {
                $query->where('RoomId', $roomId);
            }

            // Filter by staff if provided
            if ($staffId) {
                $query->where('StaffId', $staffId);
            }

            $count = $query->count();
            $maxCapacity = 10; // Số lượng tối đa mỗi khung giờ

            return response()->json([
                'success' => true,
                'data' => [
                    'count' => $count,
                    'maxCapacity' => $maxCapacity,
                    'available' => max(0, $maxCapacity - $count),
                    'isFull' => $count >= $maxCapacity,
                    'timeSlot' => $time,
                    'date' => $date
                ]
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
    // Backend - API mới
    public function getAppointmentCountsByTimeSlots(Request $request)
    {
        try {
            $request->validate([
                'date' => 'required|date',
                'times' => 'required|array',
                'room_id' => 'nullable|integer',
                'staff_id' => 'nullable|integer'
            ]);

            $date = $request->input('date');
            $times = $request->input('times');
            $roomId = $request->input('room_id');
            $staffId = $request->input('staff_id');

            $results = [];

            foreach ($times as $time) {
                $query = Appointment::where('AppointmentDate', $date)
                    ->where('AppointmentTime', $time)
                    ->whereIn('Status', ['Đã đặt', 'Đang chờ', 'Đang khám']);

                if ($roomId) $query->where('RoomId', $roomId);
                if ($staffId) $query->where('StaffId', $staffId);

                $count = $query->count();
                $maxCapacity = 10;

                $results[$time] = [
                    'count' => $count,
                    'maxCapacity' => $maxCapacity,
                    'available' => max(0, $maxCapacity - $count),
                    'isFull' => $count >= $maxCapacity
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $results
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500);
        }
    }
}
