<?php

namespace App\Exceptions;

use Exception;

class BusinessException extends Exception
{
    protected int $statusCode;
    protected ?string $errorCode;
    protected array $details;

    public function __construct(
        string $message,
        int $statusCode = 400,
        array $details = [],
        ?string $errorCode = null
    ) {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }

    public function getDetails(): array
    {
        return $this->details;
    }

    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * 🚨 Không để Laravel wrap JSON — in ra thuần gốc
     */
    public function report(): void
    {
        //
    }

    public function render()
    {
        // In ra JSON sạch, không bị Laravel gói thêm
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($this->statusCode);

        echo json_encode([
            'status' => false,
            'error' => $this->getMessage(),
            'details' => $this->details,
            'code' => $this->errorCode,
        ], JSON_UNESCAPED_UNICODE);

        exit; // Dừng hẳn — không để Laravel xử lý tiếp
    }
}
