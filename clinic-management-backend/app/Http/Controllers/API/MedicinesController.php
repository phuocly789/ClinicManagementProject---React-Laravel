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
        $perPage = $request->get('per_page', 10); // Mặc định 10 items/page, có thể override qua query param
        $medicines = Medicine::orderBy('MedicineId', 'asc')->paginate($perPage);

        return response()->json($medicines); // Trả về paginator: { data: [...], current_page: 1, last_page: X, ... }
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
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // Tăng lên 10MB, thêm csv
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'File không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            Excel::import(new MedicinesImport, $request->file('file'));
            return response()->json(['message' => 'Import thành công'], 200);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            // Xử lý lỗi validation chi tiết
            $failures = $e->failures();
            return response()->json([
                'message' => 'Import có lỗi validation',
                'errors' => collect($failures)->map(function ($failure) {
                    return [
                        'row' => $failure->row(),
                        'attribute' => $failure->attribute(),
                        'errors' => $failure->errors(),
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
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240' // 10MB
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        try {
            $file = $request->file('file');

            // Bước 1: Đọc headings để xác nhận header (optional)
            HeadingRowFormatter::default('none'); // Không format header tự động
            $headings = (new HeadingRowImport)->toArray($file)[0][0] ?? [];

            // Bước 2: Sử dụng MedicinesImport nhưng override model() để KHÔNG save (dry-run)
            $import = new class extends MedicinesImport {
                public function model(array $row)
                {
                    return null; // Dry-run: Không create/update model
                }
            };

            // Bước 3: Import để trigger validation + collect failures
            Excel::import($import, $file);

            // Bước 4: Tính total rows (header + data rows)
            $sheet = Excel::load($file)->getSheet(0);
            $totalRows = $sheet->getHighestDataRow() - 1; // Trừ header row

            // Bước 5: Failures từ import
            $failures = $import->failures(); // Method, không phải property
            $errorCount = count($failures);
            $successCount = $totalRows - $errorCount;

            // Bước 6: Format errors cho frontend (row-level)
            $formattedErrors = collect($failures)->map(function ($failure) {
                return [
                    'row' => $failure->row(), // Row số (bắt đầu từ 2 vì header=1)
                    'attribute' => $failure->attribute(),
                    'errors' => $failure->errors(),
                    'values' => $failure->values(),
                ];
            })->toArray();

            if ($successCount === 0) {
                return response()->json([
                    'message' => 'Không có bản ghi nào hợp lệ để import. Vui lòng kiểm tra lại file.',
                    'success_count' => 0,
                    'error_count' => $errorCount,
                    'errors' => $formattedErrors
                ], 422);
            }

            return response()->json([
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'errors' => $formattedErrors,
                'total_rows' => $totalRows,
                'headings' => $headings // Gửi header để frontend mapping/preview
            ]);
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            // Validation failures
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
            return response()->json(['message' => 'Không thể xử lý file do lỗi hệ thống: ' . $e->getMessage()], 500);
        }
    }

    // Download template
    public function downloadTemplate()
    {
        $path = 'templates/medicines_template.xlsx';
        if (!Storage::exists('public/' . $path)) {
            return response()->json(['message' => 'Không tìm thấy file template. Vui lòng liên hệ quản trị viên.'], 404);
        }
        return Storage::download('public/' . $path, 'medicines_template.xlsx');
    }
}
