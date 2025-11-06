<?php

namespace App\Http\Services;

use App\Exceptions\AppErrors;
use App\Mail\AccountActivationMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
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
}
