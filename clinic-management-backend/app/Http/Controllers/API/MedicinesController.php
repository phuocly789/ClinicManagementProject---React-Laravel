<?php
namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MedicinesController extends Controller
{

    public function all() {
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
    public function checkLowStock(Request $request){
        $threshold =$request->get('threshold', 100);

        $lowStock=Medicine::where('StockQuantity','<',$threshold)->orderBy('StockQuantity','asc')->get(['MedicineId','MedicineName','StockQuantity','Unit']);

        return response()->json([
            'message'=> 'Danh sách thuốc tồn kho thấp',
            'threshold'=> $threshold,
            'data'=> $lowStock
        ]);
    }
}
