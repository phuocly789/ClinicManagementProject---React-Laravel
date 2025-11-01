<?php

namespace App\Http\Controllers\API;

use App\Exceptions\AppErrors;
use App\Http\Controllers\Controller;
use App\Http\Services\AuthService;
use Illuminate\Container\Attributes\Log;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    protected $authService;
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }
    public function createUser(Request $request)
    {
        $result = $this->authService->handleCreateUser($request->all());
        return response()->json($result, 201);
    }
    public function register(Request $request)
    {
        $result = $this->authService->register($request->all());
        return response()->json($result, 201);
    }
    public function login(Request $request)
    {
        $result = $this->authService->handleLogin($request->all());
        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công',
            'user' => $result['user'],
            'token' => $result['token'], // ← THÊM DÒNG NÀY
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }
    public function logout(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Người dùng chưa xác thực'], 401);
        }

        $token = $user->token();

        if (!$token) {
            return response()->json(['message' => 'Không tìm thấy token'], 400);
        }

        $token->revoke();

        return response()->json(['message' => 'Đăng xuất thành công']);
    }

    public function verificationEmail(Request $request)
    {
        try {
            $result = $this->authService->handleVerifyEmail($request->all());
            return response()->json($result, 200);
        } catch (AppErrors $e) {
            return response()->json([
                "success" => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], $e->getStatusCode());
        }
    }
    public function resendVerificationEmail(Request $request)
    {
        try {
            $result = $this->authService->handleResendEmail($request->all());
            return response()->json($result, 200);
        } catch (AppErrors $e) {
            return response()->json([
                "success" => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], $e->getStatusCode());
        }
    }

    // public function logout(Request $request)
    // {
    // $result = $this->authService->logout();
    // return response()->json($result);
    // }
}