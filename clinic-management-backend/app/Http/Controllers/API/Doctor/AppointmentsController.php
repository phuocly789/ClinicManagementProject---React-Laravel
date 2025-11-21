<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient; // Import nếu cần cho relation
use App\Models\StaffSchedule;
use App\Models\MedicalStaff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AppointmentsController extends Controller
{
    /**
     * Lấy danh sách bệnh nhân hôm nay (Today Section).
     * Filter theo ngày hiện tại, StaffId của bác sĩ đăng nhập.
     */
    public function todayPatients()
    {
        $today = now()->format('Y-m-d');

        // Load cả Patient và User liên quan
        $appointments = Appointment::with(['patient.user'])
            ->whereDate('AppointmentDate', $today)
            ->get()
            ->map(function ($appointment) {
                $user = $appointment->patient?->user; // thông tin người bệnh (User)
                $statusRaw = $appointment->Status ?? 'waiting';

                // Mapping trạng thái
                $status = match ($statusRaw) {
                    'waiting' => 'Đang chờ',
                    'in-progress' => 'Đang khám',
                    'done' => 'Đã khám',
                    default => ucfirst($statusRaw),
                };

                // Giờ hẹn
                $time = is_string($appointment->AppointmentTime)
                    ? substr($appointment->AppointmentTime, 0, 5)
                    : '00:00';

                // Tuổi
                $age = !empty($user?->DateOfBirth)
                    ? \Carbon\Carbon::parse($user->DateOfBirth)->age
                    : 0;

                return [
                    'id' => $appointment->AppointmentId,
                    'date' => $appointment->AppointmentDate,
                    'time' => $time,
                    'name' => $user?->FullName ?? 'N/A',
                    'status' => $status,
                    'age' => $age,
                    'gender' => $user?->Gender ?? 'N/A',
                    'phone' => $user?->Phone ?? 'N/A',
                    'address' => $user->Address ?? 'N/A',
                    'patient_id' => $appointment->PatientId,
                    'notes' => $appointment->notes ?? '',
                ];
            })
            // Lọc 3 trạng thái hợp lệ
            ->filter(fn($a) => in_array($a['status'], ['Đang chờ', 'Đang khám', 'Đã khám']))
            // Sắp xếp: trạng thái ưu tiên → theo giờ tăng dần
            ->sort(function ($a, $b) {
                $priority = ['Đang chờ' => 1, 'Đang khám' => 2, 'Đã khám' => 3];
                $pa = $priority[$a['status']] ?? 99;
                $pb = $priority[$b['status']] ?? 99;
                if ($pa !== $pb)
                    return $pa <=> $pb;
                return strtotime($a['time']) <=> strtotime($b['time']);
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Danh sách lịch hẹn hôm nay được tải thành công.',
            'data' => $appointments,
        ]);
    }

    /**
     * 🩺 Lấy lịch làm việc của bác sĩ theo ID (đầy đủ thông tin)
     */
    public function getStaffScheduleById($doctorId)
    {
        try {

            // Lấy toàn bộ lịch làm việc của bác sĩ
            $schedules = StaffSchedule::where('StaffId', $doctorId)
                ->orderBy('WorkDate')
                ->orderBy('StartTime')
                ->get()
                ->map(function ($item) {
                    $workDate = Carbon::parse($item->WorkDate);
                    $now = Carbon::now();

                    // Xác định trạng thái
                    $status = 'upcoming';
                    if ($workDate->isToday()) {
                        $status = 'active';
                    } elseif ($workDate->isPast()) {
                        $status = 'completed';
                    }

                    return [
                        'schedule_id' => $item->ScheduleId,
                        'date' => $item->WorkDate->format('Y-m-d'),
                        'start_time' => $item->StartTime,
                        'end_time' => $item->EndTime,
                        'time' => $item->StartTime . ' - ' . $item->EndTime,
                        'location' => $item->Location ?? 'Phòng Khám Đa Khoa',
                        'type' => $item->IsAvailable ? 'Làm việc toàn thời gian' : 'Làm việc bán thời gian',
                        'status' => $status,
                        'is_available' => (bool) $item->IsAvailable,
                        'notes' => $item->Notes,
                        'work_date_formatted' => $item->WorkDate->format('d/m/Y'),
                        'day_of_week' => $this->getVietnameseDayOfWeek($item->WorkDate->dayOfWeek)
                    ];
                });

            // Lấy thông tin bác sĩ
            $doctor = MedicalStaff::with('user')
                ->where('StaffId', $doctorId)
                ->first();

            $doctorInfo = null;
            if ($doctor) {
                $doctorInfo = [
                    'staff_id' => $doctor->StaffId,
                    'full_name' => $doctor->user->FullName ?? 'N/A',
                    'specialization' => $doctor->Specialization ?? 'Bác sĩ đa khoa',
                    'clinic' => $doctor->Department ?? 'Phòng Khám Đa Khoa',
                    'hire_date' => $doctor->HireDate ? $doctor->HireDate->format('d/m/Y') : 'N/A',
                    'phone' => $doctor->user->Phone ?? 'N/A',
                    'email' => $doctor->user->Email ?? 'N/A',
                    'position' => $doctor->Position ?? 'Bác sĩ'
                ];
            }

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
     * ✅ Hàm lấy tên thứ tiếng Việt
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