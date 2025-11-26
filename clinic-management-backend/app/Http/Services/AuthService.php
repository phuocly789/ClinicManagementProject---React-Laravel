<?php

namespace App\Http\Services;

use App\Constants\Errors\AuthMessages;
use App\Exceptions\AppErrors;
use App\Mail\AccountActivationMail;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class AuthService
{
    /**
     * Đăng ký người dùng mới
     */
    public function register(array $data)
    {
        // Validate dữ liệu đầu vào
        $validated = validator($data, [
            'fullName'        => 'required|string|max:255',
            'username'        => 'required|string|max:255|unique:Users,Username',
            'email'           => 'required|email|unique:Users,Email',
            'password'        => 'required|string|min:6|same:confirmPassword',
            'confirmPassword' => 'required|string|min:6',
            'phone'           => 'required|string|regex:/^0\d{9}$/|unique:Users,Phone',
            'birthday'        => 'required|date|before:today',
            'gender'          => 'required|in:male,female,other',
        ], [
            // Thông báo lỗi tiếng Việt
            'fullName.required' => 'Họ tên không được để trống.',
            'email.unique' => 'Email đã tồn tại.',
            'username.unique' => 'Tên đăng nhập đã tồn tại.',
            'password.same' => 'Mật khẩu xác nhận không khớp.',
            'birthday.before' => 'Ngày sinh phải nhỏ hơn ngày hiện tại.',
            'gender.in' => 'Giới tính không hợp lệ.',
            'phone.regex' => 'Số điện thoại không hợp lệ.',
            'phone.unique' => 'Số điện thoại đã tồn tại.',
        ])->validate();

        $code = rand(100000, 999999);
        $now = Carbon::now('Asia/Ho_Chi_Minh');
        $expiredAt = $now->copy()->addMinutes(5);
        $userExitst = \App\Models\User::where('Username', $validated['username'])->first();

        if ($userExitst) {
            throw ValidationException::withMessages([
                'username' => ['User tồn tại.'],
            ]);
        }
        $emailExists = \App\Models\User::where('Email', $validated['email'])->first();
        if ($emailExists) {
            throw ValidationException::withMessages([
                'email' => ['Email tồn tại.'],
            ]);
        }
        $phoneExists = \App\Models\User::where('Phone', $validated['phone'])->first();
        if ($phoneExists) {
            throw ValidationException::withMessages([
                'phone' => ['Số điện thoại tồn tại.'],
            ]);
        }
        // Tạo user
        $user = User::create([
            'FullName' => $validated['fullName'],
            'Username' => $validated['username'],
            'Email' => $validated['email'],
            'PasswordHash' => Hash::make($validated['password']),
            'Phone' => $validated['phone'],
            'DateOfBirth' => $validated['birthday'],
            'Gender' => match (Str::lower($validated['gender'])) {
                'male' => 'Nam',
                'female' => 'Nữ',
                'other' => 'Khác',
                default => 'Khác',
            },
            'MustChangePassword' => false,
            'IsActive' => false,
            'CodeId' => $code,
            'CodeExpired' => Carbon::now('Asia/Ho_Chi_Minh')->addMinutes(5),
        ]);
        $user->roles()->attach(2);
        // Tạo History
        $patient = Patient::firstOrCreate(
            ['PatientId' => $user->UserId],
            ['MedicalHistory' => null]
        );
        try {
            Mail::to($user->Email)->send(
                new AccountActivationMail($user->FullName, $user->CodeId, $user->CodeExpired)
            );
        } catch (\Exception $e) {
            // Nếu gửi mail lỗi => rollback user và thông báo
            $user->delete();
            return response()->json([
                'status' => false,
                'error' => 'Không thể gửi email xác thực. Vui lòng thử lại sau.',
                'details' => $e->getMessage()
            ], 500);
        }
        // Tạo access token (Passport)
        $token = $user->createToken('auth_token')->accessToken;

        return [
            'status' => true,
            'user' => [
                "id" => $user->UserId,
                "email" => $user->Email,
                "is_active" => $user->IsActive,
                "expired" => $expiredAt->toIso8601String(),
            ],
            'token' => $token,
        ];
    }

    public function handleCreateUser(array $data)
    {
        // Validate dữ liệu
        $validated = validator($data, [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:10',
            'username' => 'required|string|max:255',
            'email' => 'required|email|unique:Users,Email',
            'password' => 'required|min:6',
        ])->validate();

        // Tạo user
        $user = User::create([
            'FullName' => $validated['name'],
            'Username' => $validated['username'],
            'Email' => $validated['email'],
            'PasswordHash' => Hash::make($validated['password']),
        ]);

        // Tạo access token bằng Passport
        $token = $user->createToken('auth_token')->accessToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Đăng nhập
     */
    public function handleLogin(array $data)
    {
        // Validate dữ liệu đầu vào
        $validated = validator($data, [
            'username' => 'required|string|min:6|max:255|not_regex:/<[^>]*>/',
            'password' => 'required|string|min:6|max:255|not_regex:/<[^>]*>/',
        ], [
            'username.required' => AuthMessages::VALIDATION['USERNAME_REQUIRED'],
            'username.min' => AuthMessages::VALIDATION['USERNAME_MIN'],
            'username.max' => AuthMessages::VALIDATION['USERNAME_MAX'],
            'username.not_regex' => AuthMessages::VALIDATION['USERNAME_HTML'],

            'password.required' => AuthMessages::VALIDATION['PASSWORD_REQUIRED'],
            'password.min' => AuthMessages::VALIDATION['PASSWORD_MIN'],
            'password.max' => AuthMessages::VALIDATION['PASSWORD_MAX'],
            'password.not_regex' => AuthMessages::VALIDATION['PASSWORD_HTML'],
        ])->validate();

        // Kiểm tra user
        $user = User::where('Username', $validated['username'])->first();
        if (!$user) {
            $msg = AuthMessages::AUTH['USER_NOT_FOUND'];
            throw new AppErrors($msg['message'], $msg['status'], 1);
        }

        // Kiểm tra mật khẩu
        if (!Hash::check($validated['password'], $user->PasswordHash)) {
            $msg = AuthMessages::AUTH['WRONG_PASSWORD'];
            throw new AppErrors($msg['message'], $msg['status'], 2);
        }

        // Kiểm tra kích hoạt
        if (!$user->IsActive) {
            $msg = AuthMessages::AUTH['ACCOUNT_INACTIVE'];
            throw new AppErrors($msg['message'], $msg['status'], 3);
        }

        // Đăng nhập thành công
        Auth::login($user);
        $token = $user->createToken('auth_token')->accessToken;

        $userData = [
            'full_name' => $user->FullName,
            'email' => $user->Email,
            'username' => $user->Username,
            'must_change_password' => $user->MustChangePassword,
            'is_active' => $user->IsActive,
            'roles' => $user->roles()->pluck('RoleName'),
        ];

        // Trả dữ liệu thành công, middleware chỉ xử lý lỗi
        return [
            'user' => $userData,
            'token' => $token,
        ];
    }
    public function handleVerifyEmail(array $data)
    {
        if (empty($data['email']) || empty($data['code'])) {
            throw new AppErrors("Vui lòng nhập đầy đủ thông tin.", 400, 1);
        }

        $user = User::where('Email', $data['email'])
            ->orWhere('Username', $data['email'])
            ->first();

        if (!$user) {
            throw new AppErrors("Email không tồn tại.", 404, 2);
        }

        if ($user->IsActive === true) {
            throw new AppErrors("Tài khoản đã được kích hoạt.", 409, 3);
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


        $user->IsActive = true;
        $user->CodeExpired = null;
        $user->CodeId = null;
        $user->save();

        // ✅ Trả data thuần, không dùng response()
        return [
            'success' => true,
            'message' => 'Xác thực tài khoản thành công. Vui lòng đăng nhập lại',
        ];
    }
    public function handleResendEmail(array $data)
    {
        if (empty($data['email'])) {
            throw new AppErrors("Vui lòng nhập ít nhất email hoặc tên đăng nhập.", 400, 1);
        }

        $user = User::where('Email', $data['email'])
            ->orWhere('Username', $data['email'])
            ->first();

        if (!$user) {
            throw new AppErrors("Người dùng không tồn tại.", 404, 2);
        }

        if ($user->IsActive === true) {
            throw new AppErrors("Tài khoản đã được kích hoạt.", 409, 3);
        }
        $code = rand(100000, 999999);

        $user->IsActive = false;
        $CodeExpired = Carbon::now('Asia/Ho_Chi_Minh')->addMinutes(5);
        $user->CodeExpired = $CodeExpired->toIso8601String();
        $user->CodeId = $code;
        $user->save();

        try {
            Mail::to($user->Email)->send(
                new AccountActivationMail($user->FullName, $user->CodeId, $user->CodeExpired)
            );
        } catch (\Exception $e) {
            // Nếu gửi mail lỗi => rollback user và thông báo
            $user->delete();
            return response()->json([
                'status' => false,
                'error' => 'Không thể gửi email xác thực. Vui lòng thử lại sau.',
                'details' => $e->getMessage()
            ], 500);
        }
        // Tạo access token (Passport)

        return [
            'success' => true,
            'message' => 'Gửi lại email xác thực thành công.',
            'user' => [
                "id" => $user->UserId,
                "email" => $user->Email,
                "is_active" => $user->IsActive,
                "expired" => $user->CodeExpired
            ],
        ];
    }
    /**
     * Đăng xuất (revoke token hiện tại)
     */
    // public function logout()
    // {
    //     $user = Auth::user();

    //     if ($user && $user->token()) {
    //         $user->token()->revoke();
    //     }

    //     return ['message' => 'Đăng xuất thành công'];
    // }
}
