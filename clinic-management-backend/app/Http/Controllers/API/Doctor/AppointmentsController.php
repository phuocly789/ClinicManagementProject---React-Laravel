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

        $appointments = Appointment::with('patient')
            ->whereDate('AppointmentDate', $today)
            ->get()
            ->map(function ($appointment) {
                $patient = $appointment->patient;

                // Mapping trạng thái
                $statusRaw = $appointment->Status ?? 'waiting';
                switch ($statusRaw) {
                    case 'waiting':
                        $status = 'Đang chờ';
                        break;
                    case 'in-progress':
                        $status = 'Đang khám';
                        break;
                    case 'done':
                        $status = 'Đã khám';
                        break;
                    default:
                        $status = ucfirst($statusRaw);
                        break;
                }

                // Format giờ
                $time = $appointment->AppointmentTime instanceof \Carbon\Carbon
                    ? $appointment->AppointmentTime->format('H:i')
                    : (is_string($appointment->AppointmentTime) ? substr($appointment->AppointmentTime, 0, 5) : '00:00');

                // Tính tuổi
                $age = !empty($patient?->DateOfBirth) ? \Carbon\Carbon::parse($patient->DateOfBirth)->age : 0;

                return [
                    'id' => $appointment->AppointmentId,
                    'date' => $appointment->AppointmentDate,
                    'time' => $time,
                    'name' => $patient?->FullName ?? 'N/A',
                    'status' => $status,
                    'age' => $age,
                    'gender' => $patient?->Gender ?? 'N/A',
                    'phone' => $patient?->Phone ?? 'N/A',
                    'patient_id' => $patient?->UserId ?? null,
                    'notes' => $appointment->notes ?? '',
                ];
            })
            // Lọc chỉ 3 trạng thái
            ->filter(function ($appointment) {
                return in_array($appointment['status'], ['Đang chờ', 'Đang khám', 'Đã khám']);
            })
            // Sắp xếp theo priority status và giờ
            ->sort(function ($a, $b) {
                $priority = ['Đang chờ' => 1, 'Đang khám' => 2, 'Đã khám' => 3];

                $pa = $priority[$a['status']] ?? 99;
                $pb = $priority[$b['status']] ?? 99;

                if ($pa !== $pb) {  
                    return $pa <=> $pb; // Status ưu tiên trước
                }

                // Cùng status → so giờ tăng dần
                return strtotime($a['time']) <=> strtotime($b['time']);
            })
            ->values(); // Reset index

        return response()->json($appointments);
    }





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