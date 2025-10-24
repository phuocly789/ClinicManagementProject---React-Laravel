<?php

namespace App\Constants\Errors;

class AuthMessages
{
    public const AUTH = [
        'USER_NOT_FOUND' => [
            'message' => 'Tài khoản không tồn tại trong hệ thống',
            'code'    => 'AUTH_001',
            'status'  => 404,
        ],
        'WRONG_PASSWORD' => [
            'message' => 'Mật khẩu không đúng',
            'code'    => 'AUTH_002',
            'status'  => 401,
        ],
        'ACCOUNT_INACTIVE' => [
            'message' => 'Tài khoản của bạn chưa được kích hoạt. Vui lòng nhập mã xác thực để kích hoạt tài khoản',
            'code'    => 'AUTH_003',
            'status'  => 403,
        ],
        'LOGIN_SUCCESS' => 'Đăng nhập thành công',
        'SERVER_ERROR' => [
            'message' => 'Đã xảy ra lỗi ở phía server. Vui lòng đăng nhập lại',
            'code'    => 'SERVER_001',
            'status'  => 500,
        ],
    ];

    public const VALIDATION = [
        'USERNAME_REQUIRED' => 'Tên đăng nhập không được để trống',
        'USERNAME_MIN' => 'Tài khoản không được nhỏ hơn 6 ký tự',
        'USERNAME_MAX' => 'Tài khoản không được lớn hơn 255 ký tự',
        'USERNAME_HTML' => 'Tài khoản không được chứa mã HTML',

        'PASSWORD_REQUIRED' => 'Mật khẩu không được để trống',
        'PASSWORD_MIN' => 'Mật khẩu không được nhỏ hơn 6 ký tự',
        'PASSWORD_MAX' => 'Mật khẩu không được lớn hơn 255 ký tự',
        'PASSWORD_HTML' => 'Mật khẩu không được chứa mã HTML',
    ];
}