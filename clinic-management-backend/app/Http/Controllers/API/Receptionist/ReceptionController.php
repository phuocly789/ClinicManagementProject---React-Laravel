<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Exceptions\AppErrors;
use App\Http\Controllers\Controller;
use App\Http\Services\ReceptionistService;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ReceptionController extends Controller
{
    protected $receptionistService;
    public function __construct(ReceptionistService $receptionistService)
    {
        $this->receptionistService = $receptionistService;
    }
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
    public function getNotifications(Request $request)
    {
        $current = $request->query('current', 1);
        $pageSize = $request->query('pageSize', 10);

        try {
            $offset = ($current - 1) * $pageSize;

            // Lấy danh sách lịch hẹn có thể tạo thông báo
            $appointments = Appointment::with(['patient.user', 'staff.user'])
                ->where('Status', 'Đang chờ')
                ->whereDate('AppointmentDate', '>=', now()->toDateString())
                ->orderBy('AppointmentDate', 'asc')
                ->orderBy('AppointmentTime', 'asc')
                ->offset($offset)
                ->limit($pageSize)
                ->get();

            $total = Appointment::where('Status', 'Đang chờ')
                ->whereDate('AppointmentDate', '>=', now()->toDateString())
                ->count();

            $formattedAppointments = $appointments->map(function ($appointment) {
                // Kiểm tra xem đã có thông báo cho lịch hẹn này chưa
                $existingNotification = Notification::where('AppointmentId', $appointment->AppointmentId)
                    ->first();

                return [
                    'id' => $appointment->AppointmentId,
                    'appointment_id' => $appointment->AppointmentId,
                    'full_name' => $appointment->patient->user->FullName ?? 'N/A',
                    'phone' => $appointment->patient->user->Phone ?? 'N/A',
                    'email' => $appointment->patient->user->Email ?? 'N/A',
                    'date' => $appointment->AppointmentDate,
                    'time' => $appointment->AppointmentTime,
                    'doctor_name' => $appointment->staff->user->FullName ?? 'N/A',
                    'service_type' => $appointment->ServiceType ?? 'Khám bệnh',
                    'has_notification' => !is_null($existingNotification),
                    'notification_id' => $existingNotification ? $existingNotification->NotificationId : null,
                    'notification_message' => $existingNotification ? $existingNotification->Message : null,
                    'notification_status' => $existingNotification ? $existingNotification->Status : null,
                ];
            });

            $data = [
                'data' => $formattedAppointments,
                'total' => $total,
                'totalPages' => ceil($total / $pageSize),
                'current' => $current
            ];

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách lịch hẹn thành công.',
                'data' => $data,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    public function createNotification(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'appointment_id' => 'required|integer|exists:Appointments,AppointmentId',
            'message' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Kiểm tra xem đã có thông báo cho lịch hẹn này chưa
            $existingNotification = Notification::where('AppointmentId', $request->appointment_id)->first();
            if ($existingNotification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Đã tồn tại thông báo cho lịch hẹn này'
                ], 400);
            }

            // Lấy thông tin lịch hẹn
            $appointment = Appointment::find($request->appointment_id);

            // Tính toán thời gian gửi (trước 2 ngày)
            $sendAt = \Carbon\Carbon::parse($appointment->AppointmentDate)
                ->subDays(2)
                ->setTime(9, 0, 0); // Gửi lúc 9h sáng

            $notification = Notification::create([
                'UserId' => auth()->id(),
                'AppointmentId' => $request->appointment_id,
                'Message' => $request->message,
                'Type' => 'Appointment Reminder',
                'SentAt' => $sendAt,
                'Status' => 'Scheduled'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tạo thông báo thành công',
                'data' => $notification
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo thông báo: ' . $e->getMessage()
            ], 500);
        }
    }

    public function updateNotification(Request $request, $notificationId)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:500',
            'status' => 'nullable|string|in:Scheduled,Sent,Failed'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $notification = Notification::find($notificationId);
            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Thông báo không tồn tại'
                ], 404);
            }

            $notification->update([
                'Message' => $request->message,
                'Status' => $request->status ?? $notification->Status
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật thông báo thành công',
                'data' => $notification
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi cập nhật thông báo: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteNotification($notificationId)
    {
        try {
            $notification = Notification::find($notificationId);
            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Thông báo không tồn tại'
                ], 404);
            }

            $notification->delete();

            return response()->json([
                'success' => true,
                'message' => 'Xóa thông báo thành công'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi xóa thông báo: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAppointmentDetail($appointmentId)
    {
        try {
            $appointment = Appointment::with(['patient.user', 'staff.user', 'room'])
                ->find($appointmentId);

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lịch hẹn không tồn tại'
                ], 404);
            }

            $data = [
                'id' => $appointment->AppointmentId,
                'full_name' => $appointment->patient->user->FullName,
                'phone' => $appointment->patient->user->Phone,
                'email' => $appointment->patient->user->Email,
                'date' => $appointment->AppointmentDate,
                'time' => $appointment->AppointmentTime,
                'doctor_name' => $appointment->staff->user->FullName,
                'service_type' => $appointment->ServiceType,
                'notes' => $appointment->Notes,
                'room_name' => $appointment->room->RoomName ?? 'N/A'
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thông tin lịch hẹn: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getNotificationDetail($notificationId)
    {
        try {
            $notification = Notification::with(['appointment.patient.user', 'appointment.staff.user'])
                ->find($notificationId);

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Thông báo không tồn tại'
                ], 404);
            }

            $data = [
                'id' => $notification->NotificationId,
                'message' => $notification->Message,
                'status' => $notification->Status,
                'sent_at' => $notification->SentAt,
                'type' => $notification->Type,
                'appointment' => [
                    'id' => $notification->appointment->AppointmentId,
                    'full_name' => $notification->appointment->patient->user->FullName,
                    'date' => $notification->appointment->AppointmentDate,
                    'time' => $notification->appointment->AppointmentTime,
                    'doctor_name' => $notification->appointment->staff->user->FullName,
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thông tin thông báo: ' . $e->getMessage()
            ], 500);
        }
    }
}
