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

class ImportBillController extends Controller
{
    /**
     * Display a listing of the import bills.
     */
    public function index(Request $request)
    {
        $perPage = 10; // 10 phiếu nhập mỗi trang
        $importBills = ImportBill::with(['supplier', 'user', 'import_details'])
            ->orderBy('ImportDate', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $importBills->items(),
            'current_page' => $importBills->currentPage(),
            'last_page' => $importBills->lastPage(),
            'per_page' => $importBills->perPage(),
            'total' => $importBills->total(),
        ], 200);
    }

    /**
     * Store a newly created import bill with details in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'SupplierId' => 'nullable|exists:suppliers,SupplierId',
            'ImportDate' => 'nullable|date',
            'TotalAmount' => 'required|numeric|min:0',
            'Notes' => 'nullable|string|max:255',
            'import_details' => 'required|array|min:1',
            'import_details.*.MedicineId' => 'required|exists:medicines,MedicineId',
            'import_details.*.Quantity' => 'required|integer|min:1',
            'import_details.*.ImportPrice' => 'required|numeric|min:0',
            'import_details.*.SubTotal' => 'required|numeric|min:0',
        ], [
            'SupplierId.exists' => 'Nhà cung cấp không tồn tại.',
            'ImportDate.date' => 'Ngày nhập không hợp lệ.',
            'TotalAmount.required' => 'Tổng tiền là bắt buộc.',
            'TotalAmount.numeric' => 'Tổng tiền phải là số.',
            'TotalAmount.min' => 'Tổng tiền không được nhỏ hơn 0.',
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
            'import_details.*.SubTotal.required' => 'Thành tiền là bắt buộc ở mục #{index}.',
            'import_details.*.SubTotal.numeric' => 'Thành tiền phải là số ở mục #{index}.',
            'import_details.*.SubTotal.min' => 'Thành tiền không được nhỏ hơn 0 ở mục #{index}.',
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

        $totalAmount = array_sum(array_column($request->import_details, 'SubTotal'));
        if (abs($totalAmount - $request->TotalAmount) > 0.01) {
            return response()->json([
                'status' => 'error',
                'errors' => ['TotalAmount' => 'Tổng tiền không khớp với tổng thành tiền của các mục.']
            ], 422);
        }

        try {
            $importBill = DB::transaction(function () use ($request) {
                $importBill = ImportBill::create([
                    'SupplierId' => $request->SupplierId,
                    'ImportDate' => $request->ImportDate ?? Carbon::now()->toDateString(),
                    'TotalAmount' => $request->TotalAmount,
                    'Notes' => $request->Notes,
                    'CreatedBy' => Auth::check() ? Auth::user()->id : 1,
                ]);

                foreach ($request->import_details as $detail) {
                    ImportDetail::create([
                        'ImportId' => $importBill->ImportId,
                        'MedicineId' => $detail['MedicineId'],
                        'Quantity' => $detail['Quantity'],
                        'ImportPrice' => $detail['ImportPrice'],
                        'SubTotal' => $detail['SubTotal'],
                    ]);
                }

                return $importBill;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Thêm phiếu nhập thành công',
                'data' => $importBill->load(['supplier', 'user', 'import_details'])
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
    }

    /**
     * Update the specified import bill in storage.
     */
    public function update(Request $request, $id)
    {
        $importBill = ImportBill::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'SupplierId' => 'nullable|exists:suppliers,SupplierId',
            'ImportDate' => 'nullable|date',
            'TotalAmount' => 'required|numeric|min:0',
            'Notes' => 'nullable|string|max:255',
            'import_details' => 'required|array|min:1',
            'import_details.*.MedicineId' => 'required|exists:medicines,MedicineId',
            'import_details.*.Quantity' => 'required|integer|min:1',
            'import_details.*.ImportPrice' => 'required|numeric|min:0',
            'import_details.*.SubTotal' => 'required|numeric|min:0',
        ], [
            'SupplierId.exists' => 'Nhà cung cấp không tồn tại.',
            'ImportDate.date' => 'Ngày nhập không hợp lệ.',
            'TotalAmount.required' => 'Tổng tiền là bắt buộc.',
            'TotalAmount.numeric' => 'Tổng tiền phải là số.',
            'TotalAmount.min' => 'Tổng tiền không được nhỏ hơn 0.',
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
            'import_details.*.SubTotal.required' => 'Thành tiền là bắt buộc ở mục #{index}.',
            'import_details.*.SubTotal.numeric' => 'Thành tiền phải là số ở mục #{index}.',
            'import_details.*.SubTotal.min' => 'Thành tiền không được nhỏ hơn 0 ở mục #{index}.',
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

        $totalAmount = array_sum(array_column($request->import_details, 'SubTotal'));
        if (abs($totalAmount - $request->TotalAmount) > 0.01) {
            return response()->json([
                'status' => 'error',
                'errors' => ['TotalAmount' => 'Tổng tiền không khớp với tổng thành tiền của các mục.']
            ], 422);
        }

        try {
            $importBill = DB::transaction(function () use ($request, $importBill) {
                $importBill->update([
                    'SupplierId' => $request->SupplierId ?? $importBill->SupplierId,
                    'ImportDate' => $request->ImportDate ?? $importBill->ImportDate,
                    'TotalAmount' => $request->TotalAmount,
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
                        'SubTotal' => $detail['SubTotal'],
                    ]);
                }

                return $importBill;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Cập nhật phiếu nhập thành công',
                'data' => $importBill->load(['supplier', 'user', 'import_details'])
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
        $importBill = ImportBill::findOrFail($id);
        $importBill->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Xóa phiếu nhập thành công'
        ], 200);
    }
}