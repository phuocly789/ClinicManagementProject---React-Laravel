<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
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
            'data' => $result,
        ]);
    }
    // public function logout(Request $request)
    // {
    // $result = $this->authService->logout();
    // return response()->json($result);
    // }
}
