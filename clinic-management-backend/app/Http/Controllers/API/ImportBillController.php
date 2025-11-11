<?php

namespace App\Http\Controllers\API;

use App\Models\ImportBill;
use App\Models\Supplier;
use App\Models\ImportDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;

class ImportBillController extends Controller
{
    /**
     * Display a listing of the import bills.
     */
    public function index(Request $request)
{
    $perPage = $request->get('per_page', 10);

    $query = ImportBill::query()
        ->join('Suppliers', 'ImportBills.SupplierId', '=', 'Suppliers.SupplierId')
        ->with([
            'supplier',
            'user',
            'import_details' => fn($q) => $q->with('medicine')
        ])
        ->select('ImportBills.*'); // Chỉ lấy dữ liệu từ ImportBills

    // 1. TÌM KIẾM TRÊN SupplierName - KHÔNG PHÂN BIỆT HOA/THƯỜNG
    if ($search = $request->get('search')) {
        $search = trim($search);
        $query->whereRaw('LOWER("Suppliers"."SupplierName") ILIKE ?', ['%' . mb_strtolower($search) . '%']);
    }

    // 2. LỌC NGÀY
    if ($dateFrom = $request->get('date_from')) {
        $query->whereDate('ImportBills.ImportDate', '>=', $dateFrom);
    }
    if ($dateTo = $request->get('date_to')) {
        $query->whereDate('ImportBills.ImportDate', '<=', $dateTo);
    }

    // 3. LỌC NHÀ CUNG CẤP
    if ($supplierId = $request->get('supplier_id')) {
        $query->where('ImportBills.SupplierId', $supplierId);
    }

    // 4. LỌC TIỀN
    if ($minAmount = $request->get('min_amount')) {
        $query->where('ImportBills.TotalAmount', '>=', $minAmount);
    }
    if ($maxAmount = $request->get('max_amount')) {
        $query->where('ImportBills.TotalAmount', '<=', $maxAmount);
    }

    // 5. SẮP XẾP
    $sortBy = $request->get('sort_by', 'ImportBills.ImportDate');
    $sortDir = $request->get('sort_dir', 'desc');
    $query->orderBy($sortBy, $sortDir);

    // 6. PHÂN TRANG
    $importBills = $query->paginate($perPage);

    return response()->json([
        'status' => 'success',
        'data' => $importBills->items(),
        'current_page' => $importBills->currentPage(),
        'last_page' => $importBills->lastPage(),
    ], 200);
}

    /**
     * Store a newly created import bill with details in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'SupplierId' => 'required|exists:Suppliers,SupplierId',
            'ImportDate' => 'nullable|date',
            'Notes' => 'nullable|string|max:255',
            'import_details' => 'required|array|min:1',
            'import_details.*.MedicineId' => 'required|exists:Medicines,MedicineId',
            'import_details.*.Quantity' => 'required|integer|min:1',
            'import_details.*.ImportPrice' => 'required|numeric|min:0',
        ], [
            'SupplierId.required' => 'Vui lòng chọn nhà cung cấp.',
            'SupplierId.exists' => 'Nhà cung cấp không tồn tại.',
            'ImportDate.date' => 'Ngày nhập không hợp lệ.',
            'Notes.max' => 'Ghi chú không được vượt quá 255 ký tự.',
            'import_details.required' => 'Phải có ít nhất một mục chi tiết nhập kho.',
            'import_details.*.MedicineId.required' => 'Vui lòng chọn thuốc cho mục #{index}.',
            'import_details.*.MedicineId.exists' => 'Thuốc không hợp lệ ở mục #{index}.',
            'import_details.*.Quantity.required' => 'Số lượng là bắt buộc ở mục #{index}.',
            'import_details.*.Quantity.integer' => 'Số lượng phải là số nguyên ở mục #{index}.',
            'import_details.*.Quantity.min' => 'Số lượng phải lớn hơn 0 ở mục #{index}.',
            'import_details.*.ImportPrice.required' => 'Giá nhập là bắt buộc ở mục #{index}.',
            'import_details.*.ImportPrice.numeric' => 'Giá nhập phải là số ở mục #{index}.',
            'import_details.*.ImportPrice.min' => 'Giá nhập không được nhỏ hơn 0 ở mục #{index}.',
        ]);

        if ($validator->fails()) {
            $errors = $validator->errors()->toArray();
            foreach ($errors as $key => $error) {
                if (preg_match('/import_details\.(\d+)\./', $key, $matches)) {
                    $index = $matches[1] + 1;
                    $errors[$key] = array_map(fn($msg) => str_replace('#{index}', $index, $msg), $error);
                }
            }
            return response()->json([
                'status' => 'error',
                'errors' => $errors
            ], 422);
        }

        $totalAmount = array_reduce($request->import_details, function ($carry, $detail) {
            return $carry + ($detail['Quantity'] * $detail['ImportPrice']);
        }, 0.0);

        try {
            $importBill = DB::transaction(function () use ($request, $totalAmount) {
                $importBill = ImportBill::create([
                    'SupplierId' => $request->SupplierId,
                    'ImportDate' => $request->ImportDate ?? Carbon::now()->toDateString(),
                    'TotalAmount' => $totalAmount,
                    'Notes' => $request->Notes,
                    'CreatedBy' => Auth::check() ? Auth::user()->id : 1,
                ]);
                Log::info('ImportId sau create: ' . $importBill->ImportId); // Kiểm tra trong storage/logs/laravel.log
                foreach ($request->import_details as $detail) {
                    ImportDetail::create([
                        'ImportId' => $importBill->ImportId,
                        'MedicineId' => $detail['MedicineId'],
                        'Quantity' => $detail['Quantity'],
                        'ImportPrice' => $detail['ImportPrice'],
                    ]);
                }

                return $importBill;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Thêm phiếu nhập thành công',
                'data' => $importBill->load([
                    'supplier',
                    'user',
                    'import_details' => function ($query) {
                        $query->with('medicine');
                    }
                ])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi khi thêm phiếu nhập: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified import bill with associated details.
     */
    public function show($id)
    {
        try {
            $importBill = ImportBill::with([
                'supplier',
                'user',
                'import_details' => function ($query) {
                    $query->with('medicine');
                }
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $importBill
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy phiếu nhập: ' . $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified import bill in storage.
     */
    public function update(Request $request, $id)
    {
        $importBill = ImportBill::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'SupplierId' => 'required|exists:Suppliers,SupplierId',
            'ImportDate' => 'nullable|date',
            'Notes' => 'nullable|string|max:255',
            'import_details' => 'required|array|min:1',
            'import_details.*.MedicineId' => 'required|exists:Medicines,MedicineId',
            'import_details.*.Quantity' => 'required|integer|min:1',
            'import_details.*.ImportPrice' => 'required|numeric|min:0',
        ], [
            'SupplierId.required' => 'Vui lòng chọn nhà cung cấp.',
            'SupplierId.exists' => 'Nhà cung cấp không tồn tại.',
            'ImportDate.date' => 'Ngày nhập không hợp lệ.',
            'Notes.max' => 'Ghi chú không được vượt quá 255 ký tự.',
            'import_details.required' => 'Phải có ít nhất một mục chi tiết nhập kho.',
            'import_details.*.MedicineId.required' => 'Vui lòng chọn thuốc cho mục #{index}.',
            'import_details.*.MedicineId.exists' => 'Thuốc không hợp lệ ở mục #{index}.',
            'import_details.*.Quantity.required' => 'Số lượng là bắt buộc ở mục #{index}.',
            'import_details.*.Quantity.integer' => 'Số lượng phải là số nguyên ở mục #{index}.',
            'import_details.*.Quantity.min' => 'Số lượng phải lớn hơn 0 ở mục #{index}.',
            'import_details.*.ImportPrice.required' => 'Giá nhập là bắt buộc ở mục #{index}.',
            'import_details.*.ImportPrice.numeric' => 'Giá nhập phải là số ở mục #{index}.',
            'import_details.*.ImportPrice.min' => 'Giá nhập không được nhỏ hơn 0 ở mục #{index}.',
        ]);

        if ($validator->fails()) {
            $errors = $validator->errors()->toArray();
            foreach ($errors as $key => $error) {
                if (preg_match('/import_details\.(\d+)\./', $key, $matches)) {
                    $index = $matches[1] + 1;
                    $errors[$key] = array_map(fn($msg) => str_replace('#{index}', $index, $msg), $error);
                }
            }
            return response()->json([
                'status' => 'error',
                'errors' => $errors
            ], 422);
        }

        $totalAmount = array_reduce($request->import_details, function ($carry, $detail) {
            return $carry + ($detail['Quantity'] * $detail['ImportPrice']);
        }, 0.0);

        try {
            $importBill = DB::transaction(function () use ($request, $importBill, $totalAmount) {
                $importBill->update([
                    'SupplierId' => $request->SupplierId,
                    'ImportDate' => $request->ImportDate ?? $importBill->ImportDate,
                    'TotalAmount' => $totalAmount,
                    'Notes' => $request->Notes ?? $importBill->Notes,
                    'CreatedBy' => Auth::check() ? Auth::user()->id : 1,
                ]);

                $importBill->import_details()->delete();
                foreach ($request->import_details as $detail) {
                    ImportDetail::create([
                        'ImportId' => $importBill->ImportId,
                        'MedicineId' => $detail['MedicineId'],
                        'Quantity' => $detail['Quantity'],
                        'ImportPrice' => $detail['ImportPrice'],
                    ]);
                }

                return $importBill;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Cập nhật phiếu nhập thành công',
                'data' => $importBill->load([
                    'supplier',
                    'user',
                    'import_details' => function ($query) {
                        $query->with('medicine');
                    }
                ])
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi khi cập nhật phiếu nhập: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified import bill from storage.
     */
    public function destroy($id)
    {
        try {
            $importBill = ImportBill::findOrFail($id);
            $importBill->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Xóa phiếu nhập thành công'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi khi xóa phiếu nhập: ' . $e->getMessage()
            ], 500);
        }
    }
}