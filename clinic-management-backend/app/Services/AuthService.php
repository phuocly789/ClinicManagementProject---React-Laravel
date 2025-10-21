<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Đăng ký người dùng mới
     */
    public function register(array $data)
    {
        // Validate dữ liệu
        $validated = validator($data, [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6|confirmed',
        ])->validate();

        // Tạo user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Tạo access token bằng Passport
        $token = $user->createToken('auth_token')->accessToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
    public function handleCreateUser(array $data)
    {
        // Validate dữ liệu
        $validated = validator($data, [
            'name' => 'required|string|max:255',
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

            // Kiểm tra email có tồn tại không
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
