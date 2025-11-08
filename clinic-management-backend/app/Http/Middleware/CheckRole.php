<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        // Nếu chưa đăng nhập
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401, [], JSON_UNESCAPED_UNICODE);
        }
        $roles = array_map('trim', explode(',', $roles[0]));
        // Lấy danh sách role của user
        $userRoles = $user->roles()->pluck('RoleName')->toArray();

        // Kiểm tra user có nằm trong role được phép không
        $hasRole = false;
        foreach ($roles as $role) {
            if (in_array($role, $userRoles)) {
                $hasRole = true;
                break;
            }
        }

        if (!$hasRole) {
            return response()->json([
                'message' => 'Bạn không có quyền truy cập API này.'
            ], 403, [], JSON_UNESCAPED_UNICODE);
        }

        return $next($request);
    }
}
