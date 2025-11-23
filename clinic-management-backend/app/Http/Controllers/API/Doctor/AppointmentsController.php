<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\StaffSchedule;
use App\Models\MedicalStaff;
use App\Models\Queue;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AppointmentsController extends Controller
{
    /**
     * ✅ METHOD TRUNG TÂM: Lấy thông tin doctor từ Auth
     */
    private function getAuthenticatedDoctor()
    {
        $doctor = MedicalStaff::where('StaffId', Auth::id())->first();

        if (!$doctor) {
            throw new \Exception('Không tìm thấy thông tin bác sĩ.');
        }

        return $doctor;
    }

    /**
     * Lấy danh sách bệnh nhân hôm nay (Today Section).
     * Filter theo ngày hiện tại, StaffId của bác sĩ đăng nhập.
     */
    public function todayPatients()
    {
        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            $today = now()->format('Y-m-d');

            // Lấy danh sách appointment của bác sĩ đang đăng nhập
            $appointmentIds = Appointment::where('StaffId', $doctorId)
                ->whereDate('AppointmentDate', $today)
                ->pluck('AppointmentId');

            // Nếu không có appointment nào, trả về mảng rỗng
            if ($appointmentIds->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Không có bệnh nhân nào hôm nay.',
                    'doctor_info' => [
                        'staff_id' => $doctor->StaffId,
                        'specialty' => $doctor->Specialty ?? 'Bác sĩ đa khoa',
                        'license_number' => $doctor->LicenseNumber ?? 'N/A',
                    ],
                    'data' => [],
                    'total' => 0,
                    'statistics' => [
                        'waiting' => 0,
                        'in_progress' => 0,
                        'done' => 0,
                    ]
                ]);
            }

            $queues = Queue::with(['patient.user', 'appointment'])
                ->whereDate('QueueDate', $today)
                ->whereIn('AppointmentId', $appointmentIds)
                ->whereIn('Status', ['waiting', 'in-progress', 'done', 'Đang chờ', 'Đang khám', 'Đã khám'])
                ->orderByRaw("
                CASE 
                    WHEN \"Status\" IN ('Đang khám', 'in-progress') THEN 1
                    WHEN \"Status\" IN ('Đang chờ', 'waiting') THEN 2
                    WHEN \"Status\" IN ('Đã khám', 'done') THEN 3
                    ELSE 4
                END
            ")
                ->orderByRaw("
                CASE 
                    WHEN \"Status\" IN ('Đang chờ', 'waiting') THEN \"QueueTime\" 
                    ELSE NULL 
                END ASC
            ")
                ->orderByRaw("
                CASE 
                    WHEN \"Status\" IN ('Đã khám', 'done') THEN \"QueueTime\" 
                    ELSE NULL 
                END DESC
            ")
                ->get()
                ->map(function ($queue) {
                    $user = $queue->patient?->user;
                    $appointment = $queue->appointment;
                    $statusRaw = $queue->Status ?? 'waiting';

                    $status = match ($statusRaw) {
                        'waiting', 'Đang chờ' => 'Đang chờ',
                        'in-progress', 'Đang khám' => 'Đang khám',
                        'done', 'completed', 'Đã khám' => 'Đã khám',
                        'cancelled', 'Hủy' => 'Hủy',
                        default => ucfirst($statusRaw),
                    };

                    $time = is_string($queue->QueueTime)
                        ? substr($queue->QueueTime, 0, 5)
                        : ($appointment && is_string($appointment->AppointmentTime)
                            ? substr($appointment->AppointmentTime, 0, 5)
                            : '00:00');

                    $age = !empty($user?->DateOfBirth)
                        ? \Carbon\Carbon::parse($user->DateOfBirth)->age
                        : 0;

                    return [
                        'id' => $queue->QueueId,
                        'appointment_id' => $queue->AppointmentId,
                        'date' => $queue->QueueDate,
                        'time' => $time,
                        'name' => $user?->FullName ?? 'N/A',
                        'status' => $status,
                        'age' => $age,
                        'gender' => $user?->Gender ?? 'N/A',
                        'phone' => $user?->Phone ?? 'N/A',
                        'address' => $user->Address ?? 'N/A',
                        'patient_id' => $queue->PatientId,
                        'queue_position' => $queue->QueuePosition,
                        'ticket_number' => $queue->TicketNumber,
                        'room_id' => $queue->RoomId,
                        'notes' => $appointment->Notes ?? '',
                        'doctor_id' => $appointment->StaffId ?? null,
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Danh sách bệnh nhân hôm nay của bác sĩ được tải thành công.',
                'doctor_info' => [
                    'staff_id' => $doctor->StaffId,
                    'specialty' => $doctor->Specialty ?? 'Bác sĩ đa khoa',
                    'license_number' => $doctor->LicenseNumber ?? 'N/A',
                ],
                'data' => $queues,
                'total' => $queues->count(),
                'statistics' => [
                    'waiting' => $queues->where('status', 'Đang chờ')->count(),
                    'in_progress' => $queues->where('status', 'Đang khám')->count(),
                    'done' => $queues->where('status', 'Đã khám')->count(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách bệnh nhân: ' . $e->getMessage()
            ], 500);
        }
    }



    /**
     * ✅ LẤY LỊCH LÀM VIỆC CỦA BÁC SĨ ĐANG ĐĂNG NHẬP
     */
    public function getWorkSchedule(Request $request)
    {
        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            // Lấy toàn bộ lịch làm việc của bác sĩ với quan hệ room
            $schedules = StaffSchedule::with(['room'])
                ->where('StaffId', $doctorId)
                ->orderBy('WorkDate')
                ->orderBy('StartTime')
                ->get()
                ->map(function ($item) {
                    $workDate = Carbon::parse($item->WorkDate);

                    // Xác định trạng thái
                    $status = 'upcoming';
                    if ($workDate->isToday()) {
                        $status = 'active';
                    } elseif ($workDate->isPast()) {
                        $status = 'completed';
                    }

                    // XỬ LÝ THÔNG TIN PHÒNG
                    $roomInfo = $this->getRoomInfo($item);

                    // Format thời gian (bỏ giây nếu có)
                    $startTime = $item->StartTime;
                    $endTime = $item->EndTime;

                    if (strlen($startTime) > 5) {
                        $startTime = substr($startTime, 0, 5);
                    }
                    if (strlen($endTime) > 5) {
                        $endTime = substr($endTime, 0, 5);
                    }

                    return [
                        'schedule_id' => $item->ScheduleId,
                        'date' => $item->WorkDate->format('Y-m-d'),
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'time' => $startTime . ' - ' . $endTime,
                        'room_id' => $item->RoomId,
                        'room_name' => $roomInfo['name'],
                        'room_description' => $roomInfo['description'],
                        'room_is_active' => $roomInfo['is_active'],
                        'room_status' => $roomInfo['status'],
                        'type' => $item->IsAvailable ? 'Làm việc toàn thời gian' : 'Làm việc bán thời gian',
                        'status' => $status,
                        'is_available' => (bool) $item->IsAvailable,
                        'notes' => $item->Notes,
                        'work_date_formatted' => $item->WorkDate->format('d/m/Y'),
                        'day_of_week' => $this->getVietnameseDayOfWeek($item->WorkDate->dayOfWeek),
                        'is_today' => $workDate->isToday()
                    ];
                });

            $doctorInfo = [
                'staff_id' => $doctor->StaffId,
                'full_name' => $doctor->user->FullName ?? 'N/A',
                'specialization' => $doctor->Specialization ?? $doctor->Specialty ?? 'Bác sĩ đa khoa',
                'department' => $doctor->Department ?? 'Phòng Khám Đa Khoa',
                'hire_date' => $doctor->HireDate ? $doctor->HireDate->format('d/m/Y') : 'N/A',
                'phone' => $doctor->user->Phone ?? 'N/A',
                'email' => $doctor->user->Email ?? 'N/A',
                'position' => $doctor->Position ?? 'Bác sĩ',
                'license_number' => $doctor->LicenseNumber ?? 'N/A',
                'staff_type' => $doctor->StaffType ?? 'Bác sĩ'
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'doctor_info' => $doctorInfo,
                    'schedules' => $schedules,
                    'statistics' => [
                        'total_schedules' => $schedules->count(),
                        'active_schedules' => $schedules->where('status', 'active')->count(),
                        'upcoming_schedules' => $schedules->where('status', 'upcoming')->count(),
                        'completed_schedules' => $schedules->where('status', 'completed')->count(),
                        'available_schedules' => $schedules->where('is_available', true)->count(),
                        'schedules_with_room' => $schedules->where('room_id', '!=', null)->count(),
                    ]
                ],
                'message' => 'Lấy lịch làm việc thành công'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy lịch làm việc: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ LẤY LỊCH LÀM VIỆC THEO THÁNG
     */
    public function getWorkScheduleByMonth(Request $request, $year, $month)
    {
        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            $schedules = StaffSchedule::with(['room'])
                ->where('StaffId', $doctorId)
                ->whereBetween('WorkDate', [$startDate, $endDate])
                ->orderBy('WorkDate')
                ->orderBy('StartTime')
                ->get()
                ->map(function ($item) {
                    $workDate = Carbon::parse($item->WorkDate);

                    $status = 'upcoming';
                    if ($workDate->isToday()) {
                        $status = 'active';
                    } elseif ($workDate->isPast()) {
                        $status = 'completed';
                    }

                    $roomInfo = $this->getRoomInfo($item);

                    return [
                        'schedule_id' => $item->ScheduleId,
                        'date' => $item->WorkDate->format('Y-m-d'),
                        'start_time' => $item->StartTime,
                        'end_time' => $item->EndTime,
                        'time' => $item->StartTime . ' - ' . $item->EndTime,
                        'room_id' => $item->RoomId,
                        'room_name' => $roomInfo['name'],
                        'room_description' => $roomInfo['description'],
                        'room_is_active' => $roomInfo['is_active'],
                        'room_status' => $roomInfo['status'],
                        'type' => $item->IsAvailable ? 'Làm việc toàn thời gian' : 'Làm việc bán thời gian',
                        'status' => $status,
                        'is_available' => (bool) $item->IsAvailable,
                        'notes' => $item->Notes
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $schedules,
                'message' => 'Lấy lịch làm việc theo tháng thành công',
                'period' => [
                    'month' => (int) $month,
                    'year' => (int) $year,
                    'month_name' => $this->getVietnameseMonthName($month)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy lịch làm việc theo tháng: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🏥 Lấy thông tin phòng với xử lý lỗi
     */
    private function getRoomInfo($schedule)
    {
        // Trường hợp 1: Không có RoomId
        if (empty($schedule->RoomId)) {
            return [
                'name' => 'Chưa phân công phòng',
                'description' => null,
                'is_active' => false,
                'status' => 'not_assigned'
            ];
        }

        // Trường hợp 2: Có quan hệ room và room tồn tại
        if ($schedule->relationLoaded('room') && $schedule->room) {
            return [
                'name' => $schedule->room->RoomName ?? 'Phòng khám',
                'description' => $schedule->room->Description,
                'is_active' => (bool) ($schedule->room->IsActive ?? false),
                'status' => ($schedule->room->IsActive ?? false) ? 'active' : 'inactive'
            ];
        }

        // Trường hợp 3: Quan hệ không tồn tại, thử query trực tiếp
        try {
            $room = Room::find($schedule->RoomId);
            if ($room) {
                return [
                    'name' => $room->RoomName,
                    'description' => $room->Description,
                    'is_active' => (bool) $room->IsActive,
                    'status' => $room->IsActive ? 'active' : 'inactive'
                ];
            }
        } catch (\Exception $e) {
            // Log lỗi nhưng không làm crash app
            \Log::warning("Không thể lấy thông tin phòng: " . $e->getMessage());
        }

        // Trường hợp 4: RoomId không hợp lệ
        return [
            'name' => 'Phòng không tồn tại',
            'description' => 'RoomId: ' . $schedule->RoomId . ' không tìm thấy',
            'is_active' => false,
            'status' => 'not_found'
        ];
    }

    /**
     * 📅 Chuyển đổi thứ trong tuần sang tiếng Việt
     */
    private function getVietnameseDayOfWeek($dayOfWeek)
    {
        $days = [
            0 => 'Chủ Nhật',
            1 => 'Thứ Hai',
            2 => 'Thứ Ba',
            3 => 'Thứ Tư',
            4 => 'Thứ Năm',
            5 => 'Thứ Sáu',
            6 => 'Thứ Bảy'
        ];

        return $days[$dayOfWeek] ?? 'N/A';
    }

    /**
     * ✅ Hàm lấy tên tháng tiếng Việt
     */
    private function getVietnameseMonthName($month)
    {
        $months = [
            1 => 'Tháng Một',
            2 => 'Tháng Hai',
            3 => 'Tháng Ba',
            4 => 'Tháng Tư',
            5 => 'Tháng Năm',
            6 => 'Tháng Sáu',
            7 => 'Tháng Bảy',
            8 => 'Tháng Tám',
            9 => 'Tháng Chín',
            10 => 'Tháng Mười',
            11 => 'Tháng Mười Một',
            12 => 'Tháng Mười Hai'
        ];

        return $months[$month] ?? 'N/A';
    }
}