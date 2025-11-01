<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PassportCookieAuth
{
    public function handle(Request $request, Closure $next)
    {
        Log::info('✅ PassportCookieAuth running...');
        $token = $request->cookie('token'); // lấy từ cookie

        Log::info('PassportCookieAuth - cookie token raw', ['token' => $token]);
        Log::info('PassportCookieAuth - has bearer before', ['bearer' => $request->bearerToken()]);

        if ($token) {
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        Log::info('PassportCookieAuth - authorization header set', [
            'authorization' => $request->headers->get('Authorization')
        ]);

        return $next($request);
    }
}
