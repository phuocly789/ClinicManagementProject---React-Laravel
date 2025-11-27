<?php

namespace App\Http\Services;

use App\Exceptions\AppErrors;
use App\Mail\AccountActivationMail;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class PatientService
{
    public function hanldeUpdateProfile($id, $data)
    {
        $patient = User::where('UserId', $id)->first();

        if (!$patient) {
            throw new AppErrors("Không tìm thấy bệnh nhân", 404);
        }
        if (!$data['full_name'] || !$data['address'] || !$data['date_of_birth'] || !$data['email'] || !$data['phone']) {
            throw new AppErrors("Vui lòng điền đầy đủ thông tin", 400);
        }

        // Cập nhật thông tin bệnh nhân
        $patient->FullName = $data['full_name'] ?? $patient->FullName;
        $patient->Address = $data['address'] ?? $patient->Address;
        $patient->DateOfBirth = $data['date_of_birth'] ?? $patient->DateOfBirth;

        $patient->save();

        return $patient;
    }
    public function handleSendEmail($data)
    {
        if (!$data['password'] || !$data['email']) {
            throw new AppErrors("Vui lòng điền đầy đủ thông tin", 400);
        }
        $patient = User::where('Email', $data['email'])->first();

        if (!$patient) {
            throw new AppErrors("Không tìm thấy bệnh nhân", 404);
        }
        $passwordValid = Hash::check($data['password'], $patient->PasswordHash);
        if (!$passwordValid) {
            throw new AppErrors("Mật khẩu không chính xác", 404, 1);
        }
        // Tạo thời hạn mã OTP
        $code = rand(100000, 999999);
        $CodeExpired = Carbon::now('Asia/Ho_Chi_Minh')->addMinutes(5);
        // Cập nhật 
        $patient->CodeExpired = $CodeExpired->toIso8601String();
        $patient->CodeId = $code;
        $patient->save();
        try {
            Mail::to($patient->Email)->send(
                new AccountActivationMail($patient->FullName, $patient->CodeId, $patient->CodeExpired)
            );
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'error' => 'Không thể gửi email xác thực. Vui lòng thử lại sau.',
                'details' => $e->getMessage()
            ], 500);
        }
        return $patient;
    }
    public function handleChangePassword(array $data)
    {
        if (empty($data['email']) || empty($data['code'] || !empty($data['new_password']))) {
            throw new AppErrors("Vui lòng nhập đầy đủ thông tin.", 400, 1);
        }
        if ($data['new_password'] !== $data['confirm_password']) {
            throw new AppErrors("Mật khẩu xác nhận không khớp.", 400, 3);
        }

        $user = User::where('Email', $data['email'])
            ->first();

        if (!$user) {
            throw new AppErrors("Email không tồn tại.", 404, 2);
        }

        if ($user->CodeId !== $data['code']) {
            throw new AppErrors("Mã xác thực không chính xác.", 400, 4);
        }

        if ($user->CodeExpired) {
            $expiredHcm = Carbon::parse($user->CodeExpired, 'Asia/Ho_Chi_Minh');
            $nowHcm = Carbon::now('Asia/Ho_Chi_Minh');

            if ($nowHcm->greaterThan($expiredHcm)) {
                throw new AppErrors("Mã xác thực đã hết hạn.", 410, 5);
            }
        }


        $user->CodeExpired = null;
        $user->PasswordHash = Hash::make($data['new_password']);
        $user->CodeId = null;
        $user->save();

        // ✅ Trả data thuần, không dùng response()
        return $user;
    }
    public function handleGetAllServices()
    {

        $services = Service::select('ServiceId', 'ServiceName', 'ServiceType', 'Description')->get();

        if (!$services) {
            throw new AppErrors("Không tồn tại dịch vụ.", 404, 2);
        }
        return $services;
    }
    public function handleBookingAppointment($data)
    {
        $user = Auth::user();

        // Kiểm tra dữ liệu bắt buộc
        if (!$data['date'] || !$data['time'] || !$data['symptoms'] || !$data['userId']) {
            throw new AppErrors("Vui lòng điền đầy đủ thông tin", 400);
        }

        $now = Carbon::now('Asia/Ho_Chi_Minh');
        $today = $now->toDateString();
        $selectedDate = Carbon::parse($data['date']);
        $selectedTime = Carbon::parse($data['date'] . ' ' . $data['time']);

        //  Không cho đặt ngày trong quá khứ
        if ($selectedDate->isBefore($today)) {
            throw new AppErrors("Ngày đặt lịch không được trước ngày hiện tại", 400, 1);
        }

        //  Không cho đặt giờ trong quá khứ (trong cùng ngày)
        if ($selectedDate->isSameDay($today) && $selectedTime->lessThan($now)) {
            throw new AppErrors("Không được chọn thời gian trong quá khứ", 400, 2);
        }

        // Validate giờ khám
        [$hour, $minute] = explode(":", $data['time']);
        $hour = (int) $hour;
        $minute = (int) $minute;

        if ($minute !== 0 && $minute !== 30) {
            throw new AppErrors("Giờ khám chỉ được chọn phút 00 hoặc 30", 400, 3);
        }

        if ($hour < 8 || $hour > 17 || ($hour === 17 && $minute > 0)) {
            throw new AppErrors("Chỉ được đặt lịch trong giờ hành chính (08:00 - 17:00)", 400, 3);
        }

        $user = User::where('UserId', $data['userId'])->first();
        if (!$user) {
            throw new AppErrors("Người dùng không tồn tại", 404);
        }


        // ✅ Transaction đảm bảo an toàn dữ liệu
        return DB::transaction(function () use ($user, $data) {
            // Giới hạn 15 người / khung giờ
            $count = Appointment::where('AppointmentDate', $data['date'])
                ->where('AppointmentTime', $data['time'])
                ->count();

            if ($count >= 15) {
                throw new AppErrors("Khung giờ này đã đầy (tối đa 15 người). Vui lòng chọn khung giờ khác.", 400);
            }

            // Tạo hoặc lấy thông tin Patient
            $patient = Patient::firstOrCreate(
                ['PatientId' => $user['UserId']],
                ['MedicalHistory' => null]
            );
            $checkExistsAppointment = Appointment::where('PatientId', $user['UserId'])
                ->where('AppointmentDate', $data['date'])
                ->first();
            if ($checkExistsAppointment) {
                throw new AppErrors("Bệnh nhân chỉ được đặt 1 lịch trong 1 ngày.", 400);
            }
            // Tạo hoặc lấy hồ sơ bệnh án
            $record = MedicalRecord::firstOrCreate(
                ['PatientId' => $patient->PatientId],
                [
                    'IssuedDate'   => Carbon::now('Asia/Ho_Chi_Minh'),
                    'Status'       => 'Lưu trữ',
                    'Notes'        => "Ghi chú hồ sơ bệnh nhân " . $user['FullName'],
                    'RecordNumber' => $user['Gender'] === "Nam"
                        ? "Mr000" . $patient->PatientId
                        : "Ms000" . $patient->PatientId,
                ]
            );

            // Tạo lịch hẹn
            $appointment = Appointment::create([
                'PatientId'       => $patient->PatientId,
                'AppointmentDate' => $data['date'],
                'AppointmentTime' => $data['time'],
                'Notes'        => $data['symptoms'] ?? null,
                'Status'          => 'Đã đặt',
                'RecordId'        => $record->RecordId,
            ]);

            return $appointment;
        });
    }
    public function handleGetAppointments(int $current = 1, int $pageSize = 5)
    {
        $user = Auth::user();
        if (!$user) {
            throw new AppErrors("Không tìm thấy người dùng", 404);
        }

        $patient = Patient::where('PatientId', $user->UserId)->first();

        if (!$patient) {
            throw new AppErrors("Không tìm thấy bệnh nhân", 404);
        }

        $current = max(1, $current);
        $pageSize = max(1, $pageSize);
        $query = Appointment::with([
            'medical_staff.user:UserId,FullName,Email,Phone'
        ])
            ->where('PatientId', $patient->PatientId)
            ->orderByDesc('CreatedAt');

        $totalItems = $query->count();

        $appointments = $query->skip(($current - 1) * $pageSize)
            ->take($pageSize)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->AppointmentId,
                    'date' => $item->AppointmentDate,
                    'time' => $item->AppointmentTime,
                    'status'          => $item->Status,
                    'doctor'  => optional(optional($item->medical_staff)->user)->FullName ?? null,
                    'service' => optional($item->medical_staff)->Specialty ?? null,
                ];
            });

        return [
            'totalItems'  => $totalItems,
            'totalPages'  => ceil($totalItems / $pageSize),
            'current'     => $current,
            'data'        => $appointments
        ];
    }
    public function handleCancelAppointment($appointment_id)
    {
        $user = Auth::user();

        if (!$user) {
            throw new AppErrors("Không tìm thấy người dùng", 404);
        }

        $patient = Patient::where('PatientId', $user->UserId)->first();

        if (!$patient) {
            throw new AppErrors("Không tìm thấy bệnh nhân", 404);
        }

        $appointment = Appointment::where('AppointmentId', $appointment_id)
            ->where('PatientId', $patient->PatientId)
            ->first();
        if (!$appointment) {
            throw new  AppErrors("Không tìm thấy lịch hẹn", 400);
        }

        if ($appointment->Status === 'Hủy') {
            throw new AppErrors("Lịch hẹn đã bị hủy trước đó", 400);
        }
        if ($appointment->Status === Appointment::STATUS_IN_PROGRESS || $appointment->Status === Appointment::STATUS_COMPLETED) {
            throw new AppErrors("Lịch hẹn đã được xử lý", 400);
        }

        $appointment->Status = Appointment::STATUS_CANCELLED;
        $appointment->save();

        return $appointment;
    }
    public function handleGetDetailAppointment(int $appointment_id)
    {
        $user = Auth::user();
        if (!$user) {
            throw new AppErrors("Không tìm thấy người dùng", 404);
        }

        $patient = Patient::where('PatientId', $user->UserId)->first();
        if (!$patient) {
            throw new AppErrors("Không tìm thấy bệnh nhân", 404);
        }

        // Lấy appointment kèm quan hệ
        $appointment = Appointment::with([
            'medical_staff.user:UserId,FullName,Email,Phone'
        ])
            ->where('AppointmentId', $appointment_id)
            ->where('PatientId', $patient->PatientId)
            ->first();

        if (!$appointment) {
            throw new AppErrors("Không tìm thấy lịch hẹn", 400);
        }

        return [
            'id' => $appointment->AppointmentId,
            'full_name' => $user->FullName,
            'date' => $appointment->AppointmentDate,
            'time' => $appointment->AppointmentTime,
            'status' => $appointment->Status,
            'doctor' => optional(optional($appointment->medical_staff)->user)->FullName ?? null,
            'specialty' => optional($appointment->medical_staff)->Specialty ?? null,
            'notes' => $appointment->Notes
        ];
    }
}
