<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\MedicinesExport;
use App\Imports\MedicinesImport;
use Maatwebsite\Excel\Imports\HeadingRowFormatter;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class MedicinesController extends Controller
{

    public function test_simple_addition()
    {
        $a = 5; // Đặt breakpoint ở đây
        $b = 10;
        $sum = $a + $b;

        $this->assertEquals(15, $sum); // Kiểm tra kết quả
    }

    public function all()
    {
        $medicines = Medicine::all();
        return response()->json($medicines);
    }

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $query = Medicine::query();

        // 1. TÌM KIẾM KHÔNG DẤU + KHÔNG PHÂN BIỆT HOA THƯỜNG
        if ($search = $request->get('search')) {
            $search = trim($search);
            $like = "%" . mb_strtolower($search) . "%";

            $query->whereRaw("search_text ILIKE ?", [$like]);
        }

        // 2. LỌC LOẠI THUỐC
        if ($type = $request->get('type')) {
            $query->where('MedicineType', $type);
        }

        // 3. LỌC ĐƠN VỊ
        if ($unit = $request->get('unit')) {
            $query->where('Unit', $unit);
        }

        // 4. KHOẢNG GIÁ
        if ($minPrice = $request->get('min_price')) {
            $query->where('Price', '>=', $minPrice);
        }
        if ($maxPrice = $request->get('max_price')) {
            $query->where('Price', '<=', $maxPrice);
        }

        // 5. TỒN KHO THẤP
        if ($request->get('low_stock') === '1') {
            $query->whereRaw('StockQuantity < LowStockThreshold');
        }

        // THÊM SAU CÁC FILTER KHÁC
        if ($expiryStatus = $request->get('expiry_status')) {
            $today = Carbon::today();
            if ($expiryStatus === 'expired') {
                $query->where('ExpiryDate', '<', $today);
            } elseif ($expiryStatus === 'soon') {
                $query->whereBetween('ExpiryDate', [$today, $today->copy()->addDays(30)]);
            }
        }

        $query->orderBy('MedicineId', 'asc');
        $medicines = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $medicines->items(),
            'current_page' => $medicines->currentPage(),
            'last_page' => $medicines->lastPage(),
            'per_page' => $medicines->perPage(),
            'total' => $medicines->total(),
            'filters' => $request->only(['search', 'type', 'unit', 'min_price', 'max_price', 'low_stock', 'threshold'])
        ]);
    }

    public function ping()
    {
        return response()->json(['message' => 'pong']);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'MedicineName' => 'required|string|max:100',
            'MedicineType' => 'required|string|max:50',
            'Unit' => 'required|string|max:20',
            'Price' => 'required|numeric|min:0|max:9999999999999999.99',
            'StockQuantity' => 'required|integer|min:0',
            'Description' => 'nullable|string|max:500',
            'ExpiryDate' => 'required|date',
            'LowStockThreshold' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu đầu vào không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        $medicine = Medicine::create($request->only([
            'MedicineName',
            'MedicineType',
            'Unit',
            'Price',
            'StockQuantity',
            'Description',
            'ExpiryDate',
            'LowStockThreshold'
        ]));

        return response()->json([
            'message' => 'Thêm thuốc thành công',
            'data' => $medicine
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $medicine = Medicine::find($id);

        if (!$medicine) {
            return response()->json([
                'message' => 'Không tìm thấy thuốc'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'MedicineName' => 'required|string|max:100',
            'MedicineType' => 'required|string|max:50',
            'Unit' => 'required|string|max:20',
            'Price' => 'required|numeric|min:0|max:9999999999999999.99',
            'StockQuantity' => 'required|integer|min:0',
            'Description' => 'nullable|string|max:500',
            'ExpiryDate' => 'required|date',
            'LowStockThreshold' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu đầu vào không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        $medicine->update($request->only([
            'MedicineName',
            'MedicineType',
            'Unit',
            'Price',
            'StockQuantity',
            'Description',
            'ExpiryDate',
            'LowStockThreshold'
        ]));

        return response()->json([
            'message' => 'Cập nhật thuốc thành công',
            'data' => $medicine
        ]);
    }

    public function destroy($id)
    {
        $medicine = Medicine::find($id);

        if (!$medicine) {
            return response()->json([
                'message' => 'Không tìm thấy thuốc'
            ], 404);
        }

        $medicine->delete();

        return response()->json([
            'message' => 'Xóa thuốc thành công'
        ]);
    }
    //check tồn kho
    public function checkLowStock(Request $request)
    {
        $threshold = $request->get('threshold', 100);

        $lowStock = Medicine::where('StockQuantity', '<', $threshold)->orderBy('StockQuantity', 'asc')->get(['MedicineId', 'MedicineName', 'StockQuantity', 'Unit']);

        return response()->json([
            'message' => 'Danh sách thuốc tồn kho thấp',
            'threshold' => $threshold,
            'data' => $lowStock
        ]);
    }

    // Export nâng cao (ĐÃ OK, chỉ thêm parse filters nếu cần)
    public function export(Request $request)
    {
        try {
            $filters = $request->input('filters', '{}');
            $filters = is_string($filters) ? json_decode($filters, true) : $filters;
            $filters = is_array($filters) ? $filters : [];

            $columns = $request->input('columns', '');
            $columns = $columns ? array_filter(explode(',', $columns)) : [];

            if (empty($columns)) {
                $columns = [
                    'MedicineId',
                    'MedicineName',
                    'MedicineType',
                    'Unit',
                    'Price',
                    'StockQuantity',
                    'ExpiryDate',
                    'LowStockThreshold',
                    'Description'
                ];
            }

            // Xây dựng query
            $query = Medicine::query();

            // Áp dụng bộ lọc
            if (!empty($filters['search'])) {
                $query->where('MedicineName', 'like', '%' . $filters['search'] . '%');
            }
            if (!empty($filters['type'])) {
                $query->where('MedicineType', $filters['type']);
            }
            if (!empty($filters['unit'])) {
                $query->where('Unit', $filters['unit']);
            }
            if (!empty($filters['min_price'])) {
                $query->where('Price', '>=', $filters['min_price']);
            }
            if (!empty($filters['max_price'])) {
                $query->where('Price', '<=', $filters['max_price']);
            }
            if (isset($filters['low_stock']) && $filters['low_stock'] !== '') {
                if ($filters['low_stock'] == '1') {
                    $query->whereColumn('StockQuantity', '<', 'LowStockThreshold');
                } else {
                    $query->whereColumn('StockQuantity', '>=', 'LowStockThreshold');
                }
            }

            // Lọc hạn sử dụng
            if (!empty($filters['expiry_status'])) {
                $today = Carbon::today();
                if ($filters['expiry_status'] === 'expired') {
                    $query->where('ExpiryDate', '<', $today);
                } elseif ($filters['expiry_status'] === 'soon') {
                    $query->whereBetween('ExpiryDate', [$today, $today->copy()->addDays(30)]);
                } elseif ($filters['expiry_status'] === 'valid') {
                    $query->where('ExpiryDate', '>=', $today->copy()->addDays(31));
                }
            }

            $data = $query->select($columns)->get();

            if ($data->isEmpty()) {
                // TRẢ VỀ FILE RỖNG + HEADER ĐÚNG, KHÔNG ĐƯỢC TRẢ JSON!
                return Excel::download(new MedicinesExport(collect([]), $columns), 'danh_sach_thuoc_trong.xlsx');
            }

            $filename = 'danh_sach_thuoc_' . now()->format('Y-m-d') . '.xlsx';

            return Excel::download(new MedicinesExport($data, $columns), $filename);
        } catch (\Exception $e) {
            \Log::error('Export Excel Error: ' . $e->getMessage());

            // Nếu có lỗi → vẫn trả file Excel lỗi để frontend không bị blob JSON
            return response('Lỗi xuất file Excel: ' . $e->getMessage(), 500)
                ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                ->header('Content-Disposition', 'attachment; filename="error.xlsx"');
        }
    }
    // Import thật (ĐÃ OK)
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'File không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $mapping = json_decode($request->input('mapping', '{}'), true);  // THÊM: Lấy mapping
            // CHỈ import sheet đầu tiên (DanhSachThuoc)
            $data = Excel::toArray([], $request->file('file'))[0];

            if (count($data) <= 1) {
                return response()->json(['message' => 'File không có dữ liệu'], 422);
            }
            Excel::import(new MedicinesImport($mapping), $request->file('file'));
            return response()->json(['message' => 'Import thành công'], 200);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = $e->failures();
            return response()->json([
                'message' => 'Import có lỗi validation',
                'errors' => collect($failures)->map(function ($failure) {
                    return [
                        'row' => $failure->row(),
                        'attribute' => $failure->attribute(),
                        'errors' => $failure->errors(),
                        'values' => $failure->values(),
                    ];
                })->toArray()
            ], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi import: ' . $e->getMessage()], 500);
        }
    }

    // Dry-run import (preview validation) - ĐÃ SỬA HOÀN TOÀN: Không save DB, tính success_count chính xác
    public function dryRunImport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240'
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        try {
            $file = $request->file('file');
            $mapping = json_decode($request->input('mapping', '{}'), true);  // Lấy mapping từ request

            // Đặt format header để khớp với file Excel
            \Maatwebsite\Excel\Imports\HeadingRowFormatter::default('none');

            // CHỈ đọc sheet "DanhSachThuoc" (sheet đầu tiên)
            $data = Excel::toArray([], $file)[0]; // [0] = sheet đầu tiên

            // Kiểm tra nếu không có dữ liệu
            if (count($data) <= 1) {
                return response()->json([
                    'message' => 'File không có dữ liệu hoặc chỉ có header',
                    'success_count' => 0,
                    'error_count' => 0,
                    'errors' => [],
                    'total_rows' => 0
                ]);
            }

            $totalRows = count($data) - 1; // Trừ header row

            // Tạo import instance cho dry-run - SỬA: Truyền $mapping trực tiếp vào new class($mapping)
            $import = new class($mapping) extends MedicinesImport
            {
                public $processedRows = 0;
                public $mapping;

                public function __construct($mapping)
                {
                    $this->mapping = $mapping;
                }

                public function model(array $row)
                {
                    $this->processedRows++;
                    // Dry-run: chỉ validate, không lưu
                    return null;
                }

                public function prepareForValidation($data, $index)
                {
                    if (empty(array_filter($data))) {
                        return null;  // THÊM: Skip empty rows
                    }

                    // Remap keys dựa trên mapping
                    $remapped = [];
                    foreach ($this->mapping as $fileHeader => $systemCol) {
                        if (isset($data[$fileHeader])) {
                            $remapped[$systemCol] = $data[$fileHeader];
                        }
                    }
                    // Gọi parent để xử lý thêm (như chuyển kiểu dữ liệu)
                    return parent::prepareForValidation($remapped, $index);
                }
            };

            // Thực hiện import để validate - CHỈ sheet đầu tiên
            Excel::import($import, $file);

            $failures = $import->failures();
            $errorCount = count($failures);

            // Tính success_count chính xác hơn
            $successCount = max(0, $totalRows - $errorCount);

            $formattedErrors = collect($failures)->map(function ($failure) {
                return [
                    'row' => $failure->row(),
                    'attribute' => $failure->attribute(),
                    'errors' => $failure->errors(),
                    'values' => $failure->values(),
                ];
            })->toArray();

            if ($successCount === 0 && $errorCount > 0) {
                return response()->json([
                    'message' => 'Không có bản ghi nào hợp lệ để import. Vui lòng kiểm tra lại file.',
                    'success_count' => 0,
                    'error_count' => $errorCount,
                    'errors' => $formattedErrors
                ], 422);
            }

            return response()->json([
                'message' => $errorCount > 0 ? 'File có lỗi cần sửa' : 'Kiểm tra file thành công',
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'errors' => $formattedErrors,
                'total_rows' => $totalRows,
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = $e->failures();
            $formattedErrors = collect($failures)->map(function ($failure) {
                return [
                    'row' => $failure->row(),
                    'attribute' => $failure->attribute(),
                    'errors' => $failure->errors(),
                    'values' => $failure->values(),
                ];
            })->toArray();

            return response()->json([
                'message' => 'File có lỗi validation',
                'success_count' => 0,
                'error_count' => count($failures),
                'errors' => $formattedErrors
            ], 422);
        } catch (\Exception $e) {
            Log::error('Dry-run import error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Lỗi hệ thống khi xử lý file: ' . $e->getMessage()
            ], 500);
        }
    }

    // Download template
    public function downloadTemplate()
    {
        // Tạo template động thay vì dùng file tĩnh
        $headers = [
            'MedicineId',
            'MedicineName',
            'MedicineType',
            'Unit',
            'Price',
            'StockQuantity',
            'Description',
            'ExpiryDate',
            'LowStockThreshold',
        ];

        $exampleData = [
            ['', 'Paracetamol', 'Thuốc viên', 'Viên', 5000, 1000, 'Giảm đau, hạ sốt', '2026-12-31', 10]
        ];

        return Excel::download(new MedicinesExport([], $headers, $exampleData), 'medicines_template.xlsx');
    }

    public function getAlerts()
    {
        $today = Carbon::today();
        $soon = $today->copy()->addDays(30);

        $expiring = Medicine::whereDate('ExpiryDate', '>=', $today)
            ->whereDate('ExpiryDate', '<=', $soon)
            ->get();

        $expired = Medicine::whereDate('ExpiryDate', '<', $today)->get();

        $lowStock = Medicine::whereColumn('StockQuantity', '<=', 'LowStockThreshold')->get();

        return response()->json([
            'expiring' => $expiring,
            'expired' => $expired,
            'lowStock' => $lowStock,
        ]);
    }

    public function suggest(Request $request)
    {
        $request->validate(['name' => 'required|string|max:100']);
        $name = $request->name;

        // Cache key để tránh gọi AI nhiều lần (lưu 24h)
        $cacheKey = 'hf_suggest_' . md5(strtolower($name));

        // Trả về từ cache nếu có
        return Cache::remember($cacheKey, 3600 * 24, function () use ($name) {
            // Model AI miễn phí, mạnh, hỗ trợ tiếng Việt
            $model = 'mistralai/Mistral-7B-Instruct-v0.3';

            // Prompt chi tiết để AI trả JSON chuẩn
            $prompt = "Bạn là dược sĩ chuyên nghiệp. Dựa trên tên thuốc: \"{$name}\", trả về thông tin theo định dạng JSON chính xác sau (không thêm text thừa, chỉ JSON thuần):\n\n"
                . "{\n"
                . "  \"type\": \"Loại thuốc (chọn trong: Thuốc viên, Thuốc nước, Thuốc tiêm, Thuốc bột, Thuốc bôi, Thuốc nhỏ mắt)\",\n"
                . "  \"unit\": \"Đơn vị (chọn trong: Viên, Chai, Ống, Gói, Tuýp, Lọ)\",\n"
                . "  \"description\": \"Mô tả ngắn gọn công dụng (tiếng Việt, 1-2 câu)\",\n"
                . "  \"warnings\": \"Cảnh báo tương tác hoặc tác dụng phụ (tiếng Việt, ngắn gọn)\"\n"
                . "}\n\n"
                . "Ví dụ cho Paracetamol: {\"type\": \"Thuốc viên\", \"unit\": \"Viên\", \"description\": \"Giảm đau, hạ sốt.\", \"warnings\": \"Không dùng quá 4g/ngày, tránh với bệnh gan.\"}";

            try {
                // ENDPOINT MỚI: https://router.huggingface.co/hf-inference (thay vì api-inference.huggingface.co)
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . env('HF_TOKEN'),
                    'Content-Type' => 'application/json',
                ])->post("https://router.huggingface.co/hf-inference/models/{$model}", [  // ← Thay đổi chính ở đây
                    'inputs' => $prompt,
                    'parameters' => [
                        'max_new_tokens' => 200,  // Giới hạn output ngắn gọn
                        'temperature' => 0.3,     // Ít random, chính xác hơn
                        'return_full_text' => false,
                        'wait_for_model' => true, // Chờ model load nếu cold start
                    ],
                ]);

                // Log response để debug (xóa sau khi test OK)
                Log::info('HF Response Status: ' . $response->status() . ', Body: ' . $response->body());

                if (!$response->successful()) {
                    $error = $response->json('error') ?? 'Lỗi không xác định từ HF';
                    Log::error('Hugging Face Error: ' . $error);

                    // Fallback: Trả dữ liệu mặc định nếu AI lỗi (không để user thấy lỗi)
                    return [
                        'type' => 'Thuốc viên',
                        'unit' => 'Viên',
                        'description' => 'Thông tin đang được cập nhật từ nguồn y tế.',
                        'warnings' => 'Vui lòng tham khảo bác sĩ hoặc dược sĩ trước khi sử dụng.'
                    ];
                }

                $result = $response->json();
                $generatedText = $result[0]['generated_text'] ?? $result['generated_text'] ?? '';  // Handle cả 2 format

                // Parse JSON từ text (lấy phần {} đầu tiên)
                if (preg_match('/\{.*\}/s', $generatedText, $matches)) {
                    $jsonString = $matches[0];
                } else {
                    $jsonString = '{}';
                }

                $data = json_decode($jsonString, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    Log::warning('AI JSON parse failed: ' . $generatedText);

                    // Fallback nếu parse lỗi
                    return [
                        'type' => 'Thuốc viên',
                        'unit' => 'Viên',
                        'description' => 'Không thể phân tích dữ liệu AI lúc này.',
                        'warnings' => 'Thử lại sau hoặc nhập thủ công.'
                    ];
                }

                // Đảm bảo fields đầy đủ (nếu AI thiếu)
                return [
                    'type' => $data['type'] ?? 'Thuốc viên',
                    'unit' => $data['unit'] ?? 'Viên',
                    'description' => $data['description'] ?? 'Không có mô tả chi tiết.',
                    'warnings' => $data['warnings'] ?? 'Không có cảnh báo cụ thể.'
                ];
            } catch (\Exception $e) {
                Log::error('Hugging Face Exception: ' . $e->getMessage());

                // Fallback chung
                return [
                    'type' => 'Thuốc viên',
                    'unit' => 'Viên',
                    'description' => 'Lỗi kết nối AI tạm thời.',
                    'warnings' => 'Vui lòng kiểm tra thủ công.'
                ];
            }
        });
    }
}
