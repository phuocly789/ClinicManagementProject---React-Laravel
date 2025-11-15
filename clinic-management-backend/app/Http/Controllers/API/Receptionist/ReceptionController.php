<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceptionController extends Controller
{
    public function completeReception(Request $request)
    {
        $request->validate([
            // Patient data (nếu là bệnh nhân mới)
            'patient' => 'nullable|array',
            'patient.FullName' => 'required_with:patient|string|max:100',
            'patient.Phone' => 'required_with:patient|string|max:15|unique:Users,Phone',
            'patient.Email' => 'nullable|email|unique:Users,Email',
            'patient.DateOfBirth' => 'nullable|date',
            'patient.Gender' => 'nullable|string|in:Nam,Nữ',
            'patient.Address' => 'nullable|string|max:200',
            'patient.MedicalHistory' => 'nullable|string',

            // Appointment data
            'appointment.StaffId' => 'required|integer|exists:MedicalStaff,StaffId',
            'appointment.RoomId' => 'required|integer|exists:Rooms,RoomId',
            'appointment.AppointmentDate' => 'required|date',
            'appointment.AppointmentTime' => 'required|date_format:H:i',
            'appointment.Notes' => 'nullable|string',
            'appointment.ServiceType' => 'nullable|string',

            // Loại tiếp nhận
            'receptionType' => 'required|string|in:online,direct',
            'existingPatientId' => 'nullable|integer|exists:Patients,PatientId'
        ]);

        try {
            DB::beginTransaction();

            $createdBy = auth()->id();
            $today = now('Asia/Ho_Chi_Minh')->toDateString();
            $currentTime = now('Asia/Ho_Chi_Minh')->format('H:i:s');

            // 1. Xử lý Patient
            $patientId = $request->existingPatientId;

            if (!$patientId && $request->has('patient')) {
                // Tạo patient mới
                $user = User::create([
                    'Username' => $request->patient['Phone'], // Sử dụng số điện thoại làm username
                    'PasswordHash' => bcrypt($request->patient['Phone']),
                    'FullName' => $request->patient['FullName'],
                    'Email' => $request->patient['Email'] ?? null,
                    'Phone' => $request->patient['Phone'],
                    'Gender' => $request->patient['Gender'] ?? null,
                    'Address' => $request->patient['Address'] ?? null,
                    'DateOfBirth' => $request->patient['DateOfBirth'] ?? null,
                    'MustChangePassword' => true,
                    'IsActive' => true
                ]);

                $patient = Patient::create([
                    'PatientId' => $user->UserId,
                    'MedicalHistory' => $request->patient['MedicalHistory'] ?? null
                ]);

                $patientId = $patient->PatientId;
            }

            if (!$patientId) {
                throw new \Exception('Thiếu thông tin bệnh nhân');
            }

            // 2. Xử lý Medical Record - CHỈ tạo mới nếu chưa có
            $record = MedicalRecord::where('PatientId', $patientId)
                ->where('Status', 'Hoạt động')
                ->first();

            if (!$record) {
                $record = MedicalRecord::create([
                    'PatientId' => $patientId,
                    'RecordNumber' => 'MR-' . date('YmdHis') . '-' . $patientId, // Thêm timestamp để unique
                    'IssuedDate' => $today,
                    'Status' => 'Hoạt động',
                    'Notes' => 'Hồ sơ được tạo khi tiếp nhận',
                    'CreatedBy' => $createdBy,
                ]);
            }

            // 3. Tạo Appointment
            $appointmentData = [
                'PatientId' => $patientId,
                'StaffId' => $request->appointment['StaffId'],
                'RecordId' => $record->RecordId,
                'ScheduleId' => null,
                'AppointmentDate' => $request->appointment['AppointmentDate'],
                'AppointmentTime' => $request->appointment['AppointmentTime'],
                'Status' => 'Đang chờ',
                'CreatedBy' => $createdBy,
                'Notes' => $request->appointment['Notes'] ?? null,
                'ServiceType' => $request->appointment['ServiceType'] ?? 'Khám bệnh'
            ];

            $appointment = Appointment::create($appointmentData);

            // 4. Tạo Queue
            $lastTicket = Queue::where('QueueDate', $today)->max('TicketNumber');
            $newTicketNumber = $lastTicket ? $lastTicket + 1 : 1;

            $lastQueue = Queue::where('QueueDate', $today)->max('QueuePosition');
            $newQueuePosition = $lastQueue ? $lastQueue + 1 : 1;

            $queue = Queue::create([
                'PatientId' => $patientId,
                'AppointmentId' => $appointment->AppointmentId,
                'RecordId' => $record->RecordId,
                'RoomId' => $request->appointment['RoomId'],
                'TicketNumber' => $newTicketNumber,
                'QueuePosition' => $newQueuePosition,
                'QueueDate' => $today,
                'QueueTime' => $currentTime,
                'Status' => 'Đang chờ',
                'CreatedBy' => $createdBy
            ]);

            // 5. Nếu là online appointment, cập nhật status của appointment gốc
            if ($request->receptionType === 'online' && $request->has('original_appointment_id')) {
                $originalAppointment = Appointment::find($request->original_appointment_id);
                if ($originalAppointment) {
                    $originalAppointment->update(['Status' => 'Đang chờ']);
                }
            }

            DB::commit();

            // Load thông tin đầy đủ để trả về
            $patientInfo = User::find($patientId);

            return response()->json([
                'success' => true,
                'data' => [
                    'patient' => [
                        'PatientId' => $patientId,
                        'FullName' => $patientInfo->FullName,
                        'Phone' => $patientInfo->Phone
                    ],
                    'appointment' => $appointment,
                    'queue' => $queue,
                    'medicalRecord' => $record
                ],
                'message' => 'Tiếp nhận bệnh nhân thành công. Số thứ tự: ' . $newTicketNumber
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tiếp nhận bệnh nhân: ' . $e->getMessage()
            ], 500);
        }
    }
}
