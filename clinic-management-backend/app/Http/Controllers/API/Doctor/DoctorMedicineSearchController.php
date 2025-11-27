<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DoctorMedicineSearchController extends Controller
{
    /**
     * Tìm thuốc autocomplete cho bác sĩ
     * GET /api/doctor/medicines/search?q=...
     */
    public function search(Request $request)
    {
        try {
            $q = trim($request->query('q', ''));

            // Kiểm tra từ khóa tìm kiếm
            if (empty($q)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập tên thuốc để tìm kiếm',
                    'data' => []
                ], 400);
            }

            if (strlen($q) < 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập ít nhất 2 ký tự để tìm kiếm',
                    'data' => []
                ], 400);
            }

            // Tìm kiếm thuốc trong database - GIỐNG CODE CŨ
            $medicines = DB::table('Medicines')
                ->select(
                    'MedicineName',
                    'MedicineType',
                    'Unit',
                    'Price',
                    'StockQuantity',
                    'Description',
                    'ExpiryDate',
                    'LowStockThreshold'
                )
                ->where('MedicineName', 'ILIKE', "%{$q}%")
                ->orWhere('MedicineType', 'ILIKE', "%{$q}%")
                ->limit(10)
                ->get();

            // Xử lý kết quả tìm kiếm
            if ($medicines->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Không tìm thấy thuốc phù hợp với từ khóa "' . $q . '". Vui lòng thử lại với tên thuốc khác.',
                    'suggestions' => $this->getSearchSuggestions($q),
                    'data' => []
                ], 200);
            }

            // Format dữ liệu thuốc - SỬA LẠI PHẦN GIÁ
            $formattedMedicines = $medicines->map(function ($medicine) {
                return [
                    'MedicineName' => $medicine->MedicineName,
                    'MedicineType' => $medicine->MedicineType,
                    'Unit' => $medicine->Unit,
                    'Price' => $medicine->Price ? (float) $medicine->Price : 0, // GIỮ NGUYÊN NUMBER
                    'StockQuantity' => $medicine->StockQuantity,
                    'Description' => $medicine->Description,
                    'ExpiryDate' => $medicine->ExpiryDate,
                    'LowStockThreshold' => $medicine->LowStockThreshold,
                    'Status' => $this->getMedicineStatus($medicine),
                    // THÊM FIELD FORMATTED PRICE ĐỂ HIỂN THỊ
                    'FormattedPrice' => $medicine->Price ? number_format($medicine->Price, 0, ',', '.') : '0'
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Tìm thấy ' . $medicines->count() . ' thuốc phù hợp',
                'data' => $formattedMedicines
            ], 200);

        } catch (\Exception $e) {
            // Ghi log lỗi
            Log::error('Lỗi tìm kiếm thuốc: ' . $e->getMessage(), [
                'query' => $request->query('q'),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đã có lỗi xảy ra khi tìm kiếm thuốc. Vui lòng thử lại sau.',
                'data' => []
            ], 500);
        }
    }

    /**
     * Gợi ý tìm kiếm khi không tìm thấy thuốc
     */
    private function getSearchSuggestions($query)
    {
        $suggestions = [];
        $queryLower = strtolower($query);

        // Gợi ý tìm kiếm phổ biến
        $commonSearches = [
            'paracetamol',
            'amoxicillin',
            'vitamin c',
            'kháng sinh',
            'giảm đau',
            'hạ sốt',
            'dạ dày',
            'dị ứng',
            'ho',
            'sổ mũi',
            'panadol',
            'efferalgan',
            'omeprazole',
            'loratadine',
            'cetirizine',
            'aspirin',
            'ibuprofen'
        ];

        // Tìm gợi ý gần đúng - TƯƠNG THÍCH PHP 7.x
        foreach ($commonSearches as $search) {
            if (strpos(strtolower($search), $queryLower) !== false) {
                $suggestions[] = $search;
            }
        }

        // Gợi ý theo loại thuốc
        try {
            $medicineTypes = DB::table('Medicines')
                ->select('MedicineType')
                ->where('MedicineType', 'ILIKE', "%{$query}%")
                ->distinct()
                ->limit(3)
                ->pluck('MedicineType')
                ->toArray();

            $suggestions = array_merge($suggestions, $medicineTypes);
        } catch (\Exception $e) {
            // Log lỗi nhưng không ảnh hưởng đến kết quả chính
            Log::warning('Lỗi khi lấy gợi ý loại thuốc: ' . $e->getMessage());
        }

        // Thêm gợi ý dựa trên từ khóa
        $keywordSuggestions = $this->getKeywordBasedSuggestions($query);
        $suggestions = array_merge($suggestions, $keywordSuggestions);

        return array_slice(array_unique($suggestions), 0, 5);
    }

    /**
     * Gợi ý dựa trên từ khóa cụ thể
     */
    private function getKeywordBasedSuggestions($query)
    {
        $suggestions = [];
        $queryLower = strtolower($query);

        $keywordMap = [
            'kháng' => ['kháng sinh', 'kháng viêm', 'kháng khuẩn'],
            'giảm' => ['giảm đau', 'giảm sốt', 'giảm ho'],
            'đau' => ['giảm đau', 'đau đầu', 'đau bụng', 'đau răng'],
            'ho' => ['giảm ho', 'trị ho', 'siro ho'],
            'sốt' => ['hạ sốt', 'giảm sốt'],
            'dạ' => ['dạ dày', 'bao tử'],
            'dị' => ['dị ứng', 'chống dị ứng'],
            'vitamin' => ['vitamin c', 'vitamin b', 'vitamin tổng hợp'],
            'cảm' => ['cảm cúm', 'cảm lạnh'],
        ];

        foreach ($keywordMap as $keyword => $suggestionList) {
            if (strpos($queryLower, $keyword) !== false) {
                $suggestions = array_merge($suggestions, $suggestionList);
            }
        }

        return $suggestions;
    }

    /**
     * Xác định trạng thái thuốc
     */
    private function getMedicineStatus($medicine)
    {
        $now = now();
        $expiryDate = \Carbon\Carbon::parse($medicine->ExpiryDate);

        if ($expiryDate->lessThan($now)) {
            return 'Hết hạn';
        }

        if ($medicine->StockQuantity <= 0) {
            return 'Hết hàng';
        }

        if ($medicine->StockQuantity <= $medicine->LowStockThreshold) {
            return 'Sắp hết hàng';
        }

        return 'Còn hàng';
    }

    /**
     * Tìm kiếm nâng cao với nhiều tiêu chí
     * POST /api/doctor/medicines/advanced-search
     */
    public function advancedSearch(Request $request)
    {
        try {
            $validated = $request->validate([
                'keyword' => 'nullable|string|min:2',
                'type' => 'nullable|string',
                'min_price' => 'nullable|numeric|min:0',
                'max_price' => 'nullable|numeric|min:0',
                'in_stock' => 'nullable|boolean'
            ]);

            $query = DB::table('Medicines')
                ->select(
                    'MedicineName',
                    'MedicineType',
                    'Unit',
                    'Price',
                    'StockQuantity',
                    'Description',
                    'ExpiryDate'
                );

            // Tìm theo từ khóa
            if (!empty($validated['keyword'])) {
                $keyword = $validated['keyword'];
                $query->where(function ($q) use ($keyword) {
                    $q->where('MedicineName', 'ILIKE', "%{$keyword}%")
                        ->orWhere('MedicineType', 'ILIKE', "%{$keyword}%")
                        ->orWhere('Description', 'ILIKE', "%{$keyword}%");
                });
            }

            // Tìm theo loại thuốc
            if (!empty($validated['type'])) {
                $query->where('MedicineType', 'ILIKE', "%{$validated['type']}%");
            }

            // Tìm theo khoảng giá
            if (!empty($validated['min_price'])) {
                $query->where('Price', '>=', $validated['min_price']);
            }
            if (!empty($validated['max_price'])) {
                $query->where('Price', '<=', $validated['max_price']);
            }

            // Chỉ hiển thị thuốc còn hàng
            if ($validated['in_stock'] ?? false) {
                $query->where('StockQuantity', '>', 0)
                    ->where('ExpiryDate', '>', now());
            }

            $medicines = $query->limit(20)->get();

            if ($medicines->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Không tìm thấy thuốc nào phù hợp với tiêu chí tìm kiếm.',
                    'data' => []
                ], 200);
            }

            return response()->json([
                'success' => true,
                'message' => 'Tìm thấy ' . $medicines->count() . ' thuốc phù hợp',
                'data' => $medicines
            ], 200);

        } catch (\Exception $e) {
            Log::error('Lỗi tìm kiếm nâng cao: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Đã có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau.',
                'data' => []
            ], 500);
        }
    }
}