<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401, [], JSON_UNESCAPED_UNICODE);
        }

        $roles = array_map('trim', $roles);

        $userRoles = $user->roles()->pluck('RoleName')->toArray();

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
