<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient; // Import nếu cần cho relation
use App\Models\StaffSchedule;
use App\Models\MedicalStaff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
     * 🩺 Lấy lịch làm việc của bác sĩ theo ID (không cần đăng nhập)
     */
    public function getStaffScheduleById($doctorId)
    {
        // Lấy toàn bộ lịch làm việc của bác sĩ
        $schedules = StaffSchedule::where('StaffId', $doctorId)
            ->orderBy('WorkDate')
            ->orderBy('StartTime')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->ScheduleId,
                    'date' => $item->WorkDate->format('Y-m-d'),
                    'time' => $item->StartTime . ' - ' . $item->EndTime,
                    'title' => 'Lịch làm việc của bác sĩ',
                    'description' => $item->IsAvailable ? 'Có mặt làm việc' : 'Nghỉ',
                    'type' => $item->IsAvailable ? 'work' : 'off',
                ];
            });

        return response()->json([
            'data' => $schedules,
        ]);
    }


}