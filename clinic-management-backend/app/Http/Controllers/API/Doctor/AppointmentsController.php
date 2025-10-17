<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient; // Import nếu cần cho relation
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

        // 👉 Load cả Patient và User liên quan
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
     * Các method CRUD cơ bản cho Appointment.
     * Chỉ bác sĩ (StaffId) mới được thao tác với lịch hẹn của mình.
     */

    // Các method CRUD cơ bản (từ --api flag), customize nếu cần
    public function index(Request $request)
    {
        $query = Appointment::with('patient', 'staff_schedule', 'medical_record')
            ->where('StaffId', Auth::id());

        // Filter theo ngày nếu có (cho Schedule Section)
        if ($request->has('date')) {
            $query->whereDate('AppointmentDate', $request->date);
        }

        $appointments = $query->paginate(10);
        return response()->json($appointments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'PatientId' => 'required|exists:patients,id',
            'AppointmentDate' => 'required|date',
            'AppointmentTime' => 'required',
            'Status' => 'nullable|string|in:waiting,in-progress,done',
        ]);

        // Set thủ công AppointmentId (vì không auto-increment)
        $validated['AppointmentId'] = 'APT' . time() . rand(100, 999); // Ví dụ mã unique
        $validated['StaffId'] = Auth::id();
        $validated['CreatedAt'] = now();
        $validated['CreatedBy'] = Auth::id();

        $appointment = Appointment::create($validated);
        return response()->json(['message' => 'Tạo lịch hẹn thành công', 'appointment' => $appointment], 201);
    }

    public function show($id)
    {
        $appointment = Appointment::with('patient', 'prescriptions.details', 'diagnoses')->findOrFail($id);
        if ($appointment->StaffId !== Auth::id()) {
            return response()->json(['message' => 'Không có quyền'], 403);
        }
        return response()->json($appointment);
    }

    public function update(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);
        if ($appointment->StaffId !== Auth::id()) {
            return response()->json(['message' => 'Không có quyền'], 403);
        }

        $validated = $request->validate([
            'Status' => 'sometimes|in:waiting,in-progress,done',
            'RecordId' => 'sometimes|exists:medical_records,id', // Khi hoàn tất khám
        ]);

        $appointment->update($validated);
        return response()->json(['message' => 'Cập nhật lịch hẹn thành công', 'appointment' => $appointment]);
    }

    public function destroy($id)
    {
        $appointment = Appointment::findOrFail($id);
        if ($appointment->StaffId !== Auth::id()) {
            return response()->json(['message' => 'Không có quyền'], 403);
        }

        $appointment->delete();
        return response()->json(['message' => 'Xóa lịch hẹn thành công']);
    }
}