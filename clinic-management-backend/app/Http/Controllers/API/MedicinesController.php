<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\MedicinesExport;
use App\Imports\MedicinesImport;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\HeadingRowImport;
use Maatwebsite\Excel\Imports\HeadingRowFormatter;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

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
            $threshold = $request->get('threshold', 100);
            $query->where('StockQuantity', '<', $threshold);
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
            'Description'
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
            'Description'
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
        $filtersStr = $request->input('filters', '{}');
        $filters = json_decode($filtersStr, true) ?? []; // Parse JSON string to array

        $columnsStr = $request->input('columns', '');
        $columns = array_filter(array_map('trim', explode(',', $columnsStr))); // Parse comma-separated string to array, trim, remove empty

        if (empty($columns)) {
            $columns = ['MedicineId', 'MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity', 'Description']; // Default
        }

        if (count($columns) > 20) {
            return response()->json(['message' => 'Bạn đã chọn quá nhiều cột. Tối đa 20 cột/lần xuất.'], 422);
        }

        $query = Medicine::query();
        foreach ($filters as $key => $value) {
            if ($value !== null && $value !== '') {
                $query->where($key, $value);
            }
        }

        $data = $query->select($columns)->get();

        if ($data->isEmpty()) {
            return response()->json(['message' => 'Không có dữ liệu phù hợp với bộ lọc.'], 404);
        }

        return Excel::download(new MedicinesExport($filters, $columns), 'medicines.xlsx');
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
            'Description'
        ];

        $exampleData = [
            ['', 'Paracetamol', 'Giảm đau, hạ sốt', 'Viên', 500, 1000, 'Thuốc giảm đau, hạ sốt thông dụng']
        ];

        return Excel::download(new MedicinesExport([], $headers, $exampleData), 'medicines_template.xlsx');
    }
}
