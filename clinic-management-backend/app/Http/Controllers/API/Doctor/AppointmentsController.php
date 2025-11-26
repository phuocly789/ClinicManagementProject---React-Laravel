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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AppointmentsController extends Controller
{
    /**
     * Kiểm tra kết nối database
     */
    private function checkDatabaseConnection()
    {
        try {
            DB::connection()->getPdo();
            return true;
        } catch (\Exception $e) {
            Log::error('Lỗi kết nối database: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Xử lý response lỗi mạng
     */
    private function handleNetworkError($context = '')
    {
        $message = 'Lỗi mất kết nối. Vui lòng kiểm tra internet và thử lại.';
        if (!empty($context)) {
            $message .= ' (' . $context . ')';
        }

        Log::error('Lỗi mạng: ' . $context);

        return response()->json([
            'success' => false,
            'message' => $message,
            'error_code' => 'NETWORK_ERROR',
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], 503);
    }

    /**
     * ✅ METHOD TRUNG TÂM: Lấy thông tin doctor từ Auth
     */
    private function getAuthenticatedDoctor()
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            throw new \Exception('Mất kết nối database. Vui lòng kiểm tra internet.');
        }

        $doctor = MedicalStaff::where('StaffId', Auth::id())->first();

        if (!$doctor) {
            throw new \Exception('Không tìm thấy thông tin bác sĩ. Vui lòng kiểm tra tài khoản của bạn.');
        }

        return $doctor;
    }

    /**
     * Lấy danh sách bệnh nhân hôm nay (Today Section).
     */
    public function todayPatients()
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Lấy danh sách bệnh nhân');
        }

        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            // Lấy danh sách appointment của bác sĩ đang đăng nhập
            $appointmentIds = Appointment::where('StaffId', $doctorId)
                ->whereDate('AppointmentDate', now('Asia/Ho_Chi_Minh'))
                ->pluck('AppointmentId');

            // Nếu không có appointment nào, trả về mảng rỗng
            if ($appointmentIds->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Hôm nay không có lịch hẹn nào với bệnh nhân.',
                    'doctor_info' => [
                        'staff_id' => $doctor->StaffId,
                        'specialty' => $doctor->Specialty ?? 'Bác sĩ đa khoa',
                        'license_number' => $doctor->LicenseNumber ?? 'Chưa có',
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
                ->whereDate('QueueDate', now('Asia/Ho_Chi_Minh'))
                ->whereIn('AppointmentId', $appointmentIds)
                ->whereIn('Status', ['Đang khám'])
                ->orderByRaw("
                CASE
                    WHEN \"Status\" IN ('Đang khám', 'in-progress') THEN 1
                    WHEN \"Status\" IN ('Đang chờ', 'waiting') THEN 2
                    WHEN \"Status\" IN ('Đã khám', 'done') THEN 3
                    ELSE 4
                END
            ")
                // ✅ THÊM SẮP XẾP THEO SỐ THỨ TỰ - ƯU TIÊN HÀNG ĐẦU
                ->orderBy('QueuePosition', 'asc')
                ->orderBy('TicketNumber', 'asc')
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
                        'cancelled', 'Hủy' => 'Đã hủy',
                        default => 'Không xác định',
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
                        'name' => $user?->FullName ?? 'Không có tên',
                        'status' => $status,
                        'age' => $age,
                        'gender' => $user?->Gender ?? 'Không xác định',
                        'phone' => $user?->Phone ?? 'Không có số',
                        'address' => $user->Address ?? 'Không có địa chỉ',
                        'queue_id' => $queue->QueueId,
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
                'message' => 'Danh sách bệnh nhân hôm nay đã được tải thành công.',
                'doctor_info' => [
                    'staff_id' => $doctor->StaffId,
                    'doctor_Name' => $doctor->user->FullName ?? 'Không có tên',
                    'specialty' => $doctor->Specialty ?? 'Bác sĩ đa khoa',
                    'license_number' => $doctor->LicenseNumber ?? 'Chưa có',
                ],
                'data' => $queues,
                'total' => $queues->count(),
                'statistics' => [
                    'waiting' => $queues->where('status', 'Đang chờ')->count(),
                    'in_progress' => $queues->where('status', 'Đang khám')->count(),
                    'done' => $queues->where('status', 'Đã khám')->count(),
                ]
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Lỗi database khi lấy danh sách bệnh nhân: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.'
            ], 500);
        } catch (\Exception $e) {
            Log::error('Lỗi khi lấy danh sách bệnh nhân hôm nay: ' . $e->getMessage());

            // Kiểm tra nếu là lỗi mạng
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'network') ||
                str_contains($e->getMessage(), 'timed out')
            ) {
                return $this->handleNetworkError('Lấy danh sách bệnh nhân');
            }

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải danh sách bệnh nhân. Vui lòng thử lại sau.'
            ], 500);
        }
    }

    /**
     * ✅ LẤY LỊCH LÀM VIỆC CỦA BÁC SĨ ĐANG ĐĂNG NHẬP
     */
    public function getWorkSchedule(Request $request)
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Lấy lịch làm việc');
        }

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
                    $status = 'sắp tới';
                    if ($workDate->isToday()) {
                        $status = 'đang hoạt động';
                    } elseif ($workDate->isPast()) {
                        $status = 'đã hoàn thành';
                    }

                    // XỬ LÝ THÔNG TIN PHÒNG
                    $roomInfo = $this->getRoomInfo2($item);

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
                'full_name' => $doctor->user->FullName ?? 'Không có tên',
                'specialization' => $doctor->Specialization ?? $doctor->Specialty ?? 'Bác sĩ đa khoa',
                'department' => $doctor->Department ?? 'Phòng Khám Đa Khoa',
                'hire_date' => $doctor->HireDate ? $doctor->HireDate->format('d/m/Y') : 'Chưa có',
                'phone' => $doctor->user->Phone ?? 'Không có số',
                'email' => $doctor->user->Email ?? 'Không có email',
                'position' => $doctor->Position ?? 'Bác sĩ',
                'license_number' => $doctor->LicenseNumber ?? 'Chưa có',
                'staff_type' => $doctor->StaffType ?? 'Bác sĩ'
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'doctor_info' => $doctorInfo,
                    'schedules' => $schedules,
                    'statistics' => [
                        'total_schedules' => $schedules->count(),
                        'active_schedules' => $schedules->where('status', 'đang hoạt động')->count(),
                        'upcoming_schedules' => $schedules->where('status', 'sắp tới')->count(),
                        'completed_schedules' => $schedules->where('status', 'đã hoàn thành')->count(),
                        'available_schedules' => $schedules->where('is_available', true)->count(),
                        'schedules_with_room' => $schedules->where('room_id', '!=', null)->count(),
                    ]
                ],
                'message' => 'Lịch làm việc đã được tải thành công'
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Lỗi database khi lấy lịch làm việc: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.'
            ], 500);
        } catch (\Exception $e) {
            Log::error('Lỗi khi lấy lịch làm việc: ' . $e->getMessage());

            // Kiểm tra nếu là lỗi mạng
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'network') ||
                str_contains($e->getMessage(), 'timed out')
            ) {
                return $this->handleNetworkError('Lấy lịch làm việc');
            }

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải lịch làm việc. Vui lòng thử lại sau.'
            ], 500);
        }
    }

    /**
     * ✅ LẤY LỊCH LÀM VIỆC THEO THÁNG
     */
    public function getWorkScheduleByMonth(Request $request, $year, $month)
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Lấy lịch làm việc theo tháng');
        }

        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            // Validate năm và tháng
            if (!is_numeric($year) || !is_numeric($month) || $month < 1 || $month > 12) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tháng hoặc năm không hợp lệ. Vui lòng kiểm tra lại.'
                ], 400);
            }

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

                    $status = 'sắp tới';
                    if ($workDate->isToday()) {
                        $status = 'đang hoạt động';
                    } elseif ($workDate->isPast()) {
                        $status = 'đã hoàn thành';
                    }

                    $roomInfo = $this->getRoomInfo2($item);

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
                'message' => 'Lịch làm việc theo tháng đã được tải thành công',
                'period' => [
                    'month' => (int) $month,
                    'year' => (int) $year,
                    'month_name' => $this->getVietnameseMonthName($month)
                ]
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Lỗi database khi lấy lịch làm việc theo tháng: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.'
            ], 500);
        } catch (\Exception $e) {
            Log::error('Lỗi khi lấy lịch làm việc theo tháng: ' . $e->getMessage());

            // Kiểm tra nếu là lỗi mạng
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'network') ||
                str_contains($e->getMessage(), 'timed out')
            ) {
                return $this->handleNetworkError('Lấy lịch làm việc theo tháng');
            }

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải lịch làm việc theo tháng. Vui lòng thử lại sau.'
            ], 500);
        }
    }

    /**
     * 🏥 Lấy thông tin phòng với xử lý lỗi
     */
    public function getRoomInfo(Request $request)
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Lấy thông tin phòng');
        }

        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn cần đăng nhập để truy cập thông tin này.'
                ], 401);
            }

            // Lấy StaffId từ MedicalStaff
            $staff = \App\Models\MedicalStaff::where('StaffId', $user->UserId)->first();

            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy thông tin bác sĩ. Vui lòng kiểm tra tài khoản của bạn.'
                ], 404);
            }

            // Lấy phòng từ StaffSchedules liên quan hôm nay
            $today = Carbon::today()->toDateString();

            $schedule = \App\Models\StaffSchedule::where('StaffId', $staff->StaffId)
                ->whereDate('WorkDate', $today)
                ->with('room')
                ->first();

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hôm nay bạn không có lịch làm việc.'
                ], 404);
            }

            if (!$schedule->room) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chưa có thông tin phòng làm việc cho lịch hôm nay.'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Thông tin phòng làm việc đã được tải thành công.',
                'data' => [
                    'room_id' => $schedule->room->RoomId,
                    'room_name' => $schedule->room->RoomName,
                    'schedule_date' => $today
                ]
            ], 200);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Lỗi database khi lấy thông tin phòng: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.'
            ], 500);
        } catch (\Exception $e) {
            Log::error('Lỗi khi lấy thông tin phòng: ' . $e->getMessage());

            // Kiểm tra nếu là lỗi mạng
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'network') ||
                str_contains($e->getMessage(), 'timed out')
            ) {
                return $this->handleNetworkError('Lấy thông tin phòng');
            }

            return response()->json([
                'success' => false,
                'message' => 'Không thể tải thông tin phòng. Vui lòng thử lại sau.'
            ], 500);
        }
    }

    // THÊM PRIVATE HELPER (CODE 2)
    /**
     * 🏥 Lấy thông tin phòng từ schedule (HELPER NỘI BỘ)
     */
    private function getRoomInfo2($schedule)
    {
        // Trường hợp 1: Không có RoomId
        if (empty($schedule->RoomId)) {
            return [
                'name' => 'Chưa phân công phòng',
                'description' => null,
                'is_active' => false,
                'status' => 'chưa phân công'
            ];
        }

        // Trường hợp 2: Có quan hệ room và room tồn tại
        if ($schedule->relationLoaded('room') && $schedule->room) {
            return [
                'name' => $schedule->room->RoomName ?? 'Phòng khám',
                'description' => $schedule->room->Description,
                'is_active' => (bool) ($schedule->room->IsActive ?? false),
                'status' => ($schedule->room->IsActive ?? false) ? 'hoạt động' : 'ngừng hoạt động'
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
                    'status' => $room->IsActive ? 'hoạt động' : 'ngừng hoạt động'
                ];
            }
        } catch (\Exception $e) {
            // Log lỗi nhưng không làm crash app
            Log::warning("Không thể lấy thông tin phòng: " . $e->getMessage());
        }

        // Trường hợp 4: RoomId không hợp lệ
        return [
            'name' => 'Phòng không tồn tại',
            'description' => 'RoomId: ' . $schedule->RoomId . ' không tìm thấy',
            'is_active' => false,
            'status' => 'không tìm thấy'
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

        return $days[$dayOfWeek] ?? 'Không xác định';
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

        return $months[$month] ?? 'Không xác định';
    }
}