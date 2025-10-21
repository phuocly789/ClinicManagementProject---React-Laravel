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
        $result = $this->authService->login($request->all());
        return response()->json($result, 200);
    }
    // public function logout(Request $request)
    // {
    // $result = $this->authService->logout();
    // return response()->json($result);
    // }
}
