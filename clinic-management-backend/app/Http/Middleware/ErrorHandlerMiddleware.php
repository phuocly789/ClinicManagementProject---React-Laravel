<?php

namespace App\Http\Middleware;

use App\Exceptions\AppErrors;
use Closure;
use Throwable;
use Illuminate\Http\JsonResponse;

class ErrorHandlerMiddleware
{
    public function handle($request, Closure $next)
    {
        try {
            return $next($request);
        } catch (AppErrors $err) {
            return response()->json([
                'success' => false,
                'message' => $err->getMessage(),
                'code'    => $err->getCodeKey(),
            ], $err->getStatusCode(), [], JSON_UNESCAPED_UNICODE);
        } catch (Throwable $e) {
            // Catch all unexpected errors
            report($e);

            return new JsonResponse([
                'success' => false,
                'message' => 'Internal Server Error',
                'code' => 'INTERNAL_ERROR',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
}