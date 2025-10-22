<?php

namespace App\Services;

use App\Mail\AccountActivationMail;
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
            'Birthday' => $validated['birthday'],
            'Gender' => match (Str::lower($validated['gender'])) {
                'male' => 'Nam',
                'female' => 'Nữ',
                'other' => 'Khác',
                default => 'Khác',
            },
            'MustChangePassword' => false,
            'IsActive' => true,
            'CodeId' => $code,
            'CodeExpired' =>  Carbon::now('Asia/Ho_Chi_Minh')->addMinutes(5),
        ]);
        $user->roles()->attach(2);
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
            'user' => $user,
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
    public function login(array $data)
    {
        try {
            $validated = validator($data, [
                'username' => 'required|string',
                'password' => 'required|string',
            ])->validate();

            // Kiểm tra user có tồn tại không
            $user = \App\Models\User::where('Username', $validated['username'])->first();

            if (!$user) {
                throw ValidationException::withMessages([
                    'username' => ['User không tồn tại trong hệ thống.'],
                ]);
            }

            // Kiểm tra mật khẩu đúng không
            if (!Hash::check($validated['password'], $user->PasswordHash)) {
                throw ValidationException::withMessages([
                    'password' => ['Mật khẩu không chính xác.'],
                ]);
            }

            Auth::login($user);

            // Tạo token Passport
            $token = $user->createToken('auth_token')->accessToken;
            $user_role = User::find($user->UserId);

            $roles = $user_role->roles;

            // Chỉ lấy RoleName
            $roleNames = $roles->pluck('RoleName');
            // Tạo mảng user mới giữ những field bạn muốn + roles đầy đủ
            $userData = [
                'full_name' => $user->FullName,
                'email' => $user->Email,
                'username' => $user->Username,
                'must_change_password' => $user->MustChangePassword,
                'is_active' => $user->IsActive,
                'roles' => $roleNames
            ];

            return [
                'success' => true,
                'message' => 'Đăng nhập thành công.',
                'user' => $userData,
                'token' => $token,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => "Đã xảy ra lỗi ở phía server. Vui lòng đăng nhập lại",
            ];
        }
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
