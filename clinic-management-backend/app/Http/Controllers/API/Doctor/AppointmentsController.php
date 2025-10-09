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
        $today = now()->format('Y-m-d'); // Ngày hôm nay: 2025-10-09
        $staffId = Auth::id(); // ID bác sĩ hiện tại (từ Sanctum token)

        $appointments = Appointment::where('StaffId', $staffId)
            ->whereDate('AppointmentDate', $today)
            ->with('patient') // Load relation patient để lấy name, age, etc.
            ->orderBy('AppointmentTime') // Sắp xếp theo giờ
            ->get()
            ->map(function ($appointment) {
                $patient = $appointment->patient;
                $status = $appointment->Status ?? 'waiting'; // Đảm bảo có status

                return [
                    'id' => $appointment->AppointmentId, // PK của Appointment
                    'time' => $appointment->AppointmentTime->format('H:i'), // Format '09:30'
                    'name' => $patient?->name ?? 'N/A', // Tên bệnh nhân
                    'status' => $status, // waiting, in-progress, done
                    'age' => $patient?->age ?? 0,
                    'gender' => $patient?->gender ?? 'N/A',
                    'phone' => $patient?->phone ?? 'N/A',
                    'patient_id' => $patient?->id ?? null, // ID bệnh nhân cho prescriptions/history
                    'notes' => $appointment->notes ?? '', // Nếu model có field notes
                ];
            });

        return response()->json($appointments); // Trả JSON cho React
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