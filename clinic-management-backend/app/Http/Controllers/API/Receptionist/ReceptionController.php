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
            'patient' => 'nullable|array',
            'patient.FullName' => 'required_with:patient|string|max:100',
            'patient.Phone' => 'required_with:patient|string|max:15',
            'appointment.StaffId' => 'required|integer',
            'appointment.RoomId' => 'required|integer',
            'appointment.AppointmentDate' => 'required|date',
            'appointment.AppointmentTime' => 'required|date_format:H:i',
            'receptionType' => 'required|string|in:online,direct',
        ]);

        try {
            DB::beginTransaction();

            $createdBy = auth()->id();
            $today = now('Asia/Ho_Chi_Minh')->toDateString();

            // 1: CHECK CHỖ TRỐNG & LOCK KHUNG GIỜ
            // Đếm số lượng appointment đang active trong khung giờ này
            // lockForUpdate() sẽ ngăn các request khác chen ngang khi đang đếm
            $currentCount = Appointment::where('AppointmentDate', $request->appointment['AppointmentDate'])
                ->where('AppointmentTime', $request->appointment['AppointmentTime'])
                ->whereIn('Status', ['Đã đặt', 'Đang chờ', 'Đang khám'])
                ->count();

            if ($currentCount >= 10) {
                throw new \Exception('Khung giờ này vừa đầy. Vui lòng chọn giờ khác.');
            }

            // 2: XỬ LÝ BỆNH NHÂN
            $patientId = $request->existingPatientId;

            // Nếu chưa có ID nhưng có thông tin form -> Tạo mới hoặc tìm theo SĐT
            if (!$patientId && $request->has('patient')) {
                $phone = $request->patient['Phone'];

                // Check xem SĐT đã tồn tại chưa để tránh tạo trùng User
                $existingUser = User::where('Phone', $phone)->first();

                if ($existingUser) {
                    $patientId = $existingUser->UserId;
                    // Có thể update thông tin user tại đây nếu cần
                } else {
                    // Tạo User & Patient mới
                    $user = User::create([
                        'Username' => $phone,
                        'PasswordHash' => bcrypt($phone),
                        'FullName' => $request->patient['FullName'],
                        'Phone' => $phone,
                        'Email' => $request->patient['Email'] ?? null,
                        'Gender' => $request->patient['Gender'] ?? null,
                        'Address' => $request->patient['Address'] ?? null,
                        'DateOfBirth' => $request->patient['DateOfBirth'] ?? null,
                        'MustChangePassword' => true,
                        'IsActive' => true
                    ]);

                    Patient::create([
                        'PatientId' => $user->UserId,
                        'MedicalHistory' => $request->patient['MedicalHistory'] ?? null
                    ]);
                    $patientId = $user->UserId;
                }
            }

            if (!$patientId) throw new \Exception('Thiếu thông tin bệnh nhân');

            // 3: XỬ LÝ HỒ SƠ BỆNH ÁN
            $record = MedicalRecord::firstOrCreate(
                ['PatientId' => $patientId, 'Status' => 'Hoạt động'],
                [
                    'RecordNumber' => 'MR-' . date('YmdHis') . '-' . $patientId,
                    'IssuedDate' => $today,
                    'Notes' => 'Hồ sơ được tạo khi tiếp nhận',
                    'CreatedBy' => $createdBy,
                ]
            );

            // 4: XỬ LÝ APPOINTMENT
            $appointment = null;

            // TRƯỜNG HỢP A: TIẾP NHẬN TỪ ONLINE
            if ($request->receptionType === 'online' && $request->has('original_appointment_id')) {

                // Tìm và KHÓA dòng appointment cũ
                $appointment = Appointment::where('AppointmentId', $request->original_appointment_id)
                    ->lockForUpdate()
                    ->first();

                if (!$appointment) {
                    throw new \Exception('Lịch hẹn gốc không tồn tại.');
                }

                // CHỐT CHẶN TRÙNG LẶP: Nếu status không phải "Đã đặt" nghĩa là đã có người khác xử lý rồi
                if ($appointment->Status !== 'Đã đặt') {
                    throw new \Exception('Lịch hẹn này đã được nhân viên khác tiếp nhận rồi!');
                }

                // Cập nhật thông tin mới vào lịch hẹn cũ
                $appointment->update([
                    'StaffId' => $request->appointment['StaffId'],
                    'RoomId' => $request->appointment['RoomId'],
                    'RecordId' => $record->RecordId,
                    'Notes' => $request->appointment['Notes'] ?? $appointment->Notes,
                    'Status' => 'Đang chờ',
                    'ServiceType' => $request->appointment['ServiceType'] ?? 'Khám bệnh'
                ]);
            }
            // TRƯỜNG HỢP B: TIẾP NHẬN TRỰC TIẾP (Tạo mới)
            else {
                // Check duplicate: Bệnh nhân này đã có lịch active hôm nay chưa?
                $duplicateCheck = Appointment::where('PatientId', $patientId)
                    ->where('AppointmentDate', $today)
                    ->whereIn('Status', ['Đã đặt', 'Đang chờ', 'Đang khám'])
                    ->exists();

                if ($duplicateCheck) {
                    throw new \Exception('Bệnh nhân này đã có lịch hẹn/đang khám trong ngày hôm nay.');
                }

                // Tạo appointment mới
                $appointment = Appointment::create([
                    'PatientId' => $patientId,
                    'StaffId' => $request->appointment['StaffId'],
                    'RoomId' => $request->appointment['RoomId'],
                    'RecordId' => $record->RecordId,
                    'AppointmentDate' => $request->appointment['AppointmentDate'],
                    'AppointmentTime' => $request->appointment['AppointmentTime'],
                    'Status' => 'Đang chờ',
                    'CreatedBy' => $createdBy,
                    'Notes' => $request->appointment['Notes'] ?? null,
                    'ServiceType' => $request->appointment['ServiceType'] ?? 'Khám bệnh'
                ]);
            }

            //  5: TẠO QUEUE
            $lastTicketEntry = Queue::where('QueueDate', $today)
                ->orderBy('TicketNumber', 'desc')
                ->lockForUpdate()
                ->first();

            // Nếu có phiếu cũ thì +1, chưa có (đầu ngày) thì là 1
            $newTicketNumber = $lastTicketEntry ? $lastTicketEntry->TicketNumber + 1 : 1;


            $lastPositionEntry = Queue::where('QueueDate', $today)
                ->orderBy('QueuePosition', 'desc')
                ->lockForUpdate()
                ->first();

            $newQueuePosition = $lastPositionEntry ? $lastPositionEntry->QueuePosition + 1 : 1;

            $queue = Queue::create([
                'PatientId' => $patientId,
                'AppointmentId' => $appointment->AppointmentId,
                'RecordId' => $record->RecordId,
                'RoomId' => $request->appointment['RoomId'],
                'TicketNumber' => $newTicketNumber,
                'QueuePosition' => $newQueuePosition,
                'QueueDate' => $today,
                'QueueTime' => $request->appointment['AppointmentTime'],
                'Status' => 'Đang chờ',
                'CreatedBy' => $createdBy
            ]);

            DB::commit();

            // Load lại info để trả về
            $patientInfo = User::find($patientId);

            return response()->json([
                'success' => true,
                'data' => [
                    'queue' => $queue,
                    'patient' => $patientInfo,
                    'ticketNumber' => $newTicketNumber
                ],
                'message' => 'Tiếp nhận thành công. Số phiếu: ' . $newTicketNumber
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error' => $e->getMessage()
            ], 400);
        }
    }
    public function getNotifications(Request $request)
    {
        $current = $request->query('current', 1);
        $pageSize = $request->query('pageSize', 10);

        try {
            $offset = ($current - 1) * $pageSize;

            // Lấy danh sách lịch hẹn có thể tạo thông báo
            $appointments = Appointment::with(['patient.user', 'medical_staff.user'])
                ->where('Status', 'Đã đặt')
                ->whereDate('AppointmentDate', '>=', now()->toDateString())
                ->orderByRaw('CASE WHEN EXISTS (
    SELECT 1 FROM "Notifications"
    WHERE "Notifications"."AppointmentId" = "Appointments"."AppointmentId"
) THEN 1 ELSE 0 END') // Đã có notification -> 1, chưa có -> 0
                ->orderBy('AppointmentDate', 'asc')
                ->orderBy('AppointmentTime', 'asc')
                ->offset($offset)
                ->limit($pageSize)
                ->get();

            $total = Appointment::where('Status', 'Đã đặt')
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
                    'doctor_name' => optional(optional($appointment->medical_staff)->user)->FullName
                        ?? "Chờ xác nhận",
                    'service_type' => $appointment->ServiceType ?? 'Khám bệnh',
                    'has_notification' => !is_null($existingNotification),
                    'notification_id' => $existingNotification ? $existingNotification->NotificationId : null,
                    'notification_message' => $existingNotification ? $existingNotification->Message : null,
                    'notification_status' => $existingNotification ? $existingNotification->Status : null,
                    'updated_at' => $existingNotification?->UpdatedAt?->toISOString(),
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
            $exists = Notification::where('AppointmentId', $request->appointment_id)->exists();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Thông báo đã được tạo bởi người khác!'
                ], 409); // 409 Conflict
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
                'Status' => 'Đã lên lịch'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tạo thông báo thành công',
                'data' => [
                    'notification_id' => $notification->NotificationId,
                    'updated_at' => $notification->UpdatedAt?->toISOString(), // thêm dòng này
                    // các field khác nếu cần
                ]
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
            'updated_at' => 'nullable|date'
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
            if ($notification->UpdatedAt && $notification->UpdatedAt->gt($request->updated_at)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Thông báo đã được sửa bởi người khác!',
                    'error_code' => 'CONFLICT'
                ], 409);
            }

            $notification->update([
                'Message' => $request->message
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
            $appointment = Appointment::with(['patient.user', 'medical_staff.user'])
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
                'doctor_name' => optional(optional($appointment->medical_staff)->user)->FullName
                    ?? "Chờ xác nhận",
                'service_type' => $appointment->ServiceType,
                'notes' => $appointment->Notes,
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
            $notification = Notification::with(['appointment.patient.user', 'appointment.medical_staff.user'])
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
                    'doctor_name' => optional(optional($notification->appointment->medical_staff)->user)->FullName
                        ?? "Chờ xác nhận",
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
