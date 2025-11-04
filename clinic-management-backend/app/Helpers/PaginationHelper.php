<?php
// app/Helpers/PaginationHelper.php

namespace App\Helpers;

use Illuminate\Pagination\LengthAwarePaginator;

class PaginationHelper
{
    /**
     * Format phân trang chuẩn cho API
     */
    public static function formatPagination(LengthAwarePaginator $paginator)
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
            'has_more_pages' => $paginator->hasMorePages(),
            'next_page_url' => $paginator->nextPageUrl(),
            'prev_page_url' => $paginator->previousPageUrl()
        ];
    }

    /**
     * Tạo response API với phân trang
     */
    public static function createPaginatedResponse($data, LengthAwarePaginator $paginator, $message = 'Success')
    {
        return [
            'success' => true,
            'data' => $data,
            'pagination' => self::formatPagination($paginator),
            'message' => $message
        ];
    }
}