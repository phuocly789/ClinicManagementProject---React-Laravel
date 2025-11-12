<?php

namespace App\Exceptions;

use Exception;

class AppErrors extends Exception
{
    protected int $statusCode;
    protected string $codeKey;
    protected bool $isOperational;

    public function __construct(
        string $message,
        int $statusCode = 500,
        int $code = 0,
        string $codeKey = 'INTERNAL_ERROR',
        bool $isOperational = true
    ) {
        parent::__construct($message, $code);

        $this->statusCode = $statusCode;
        $this->codeKey = $codeKey;
        $this->isOperational = $isOperational;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getCodeKey(): string
    {
        return $this->codeKey;
    }

    public function isOperational(): bool
    {
        return $this->isOperational;
    }

    public function render($request)
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'error_code' => $this->getCode(),
            'error_key' => $this->getCodeKey(),
        ], $this->getStatusCode(), [], JSON_UNESCAPED_UNICODE);
    }
}
