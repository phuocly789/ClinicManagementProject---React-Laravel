<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SuppliersController extends Controller
{
    /**
     * Display a listing of the suppliers.
     */
    public function all()
    {
        $suppliers = Supplier::orderBy('SupplierId', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $suppliers
        ], 200);
    }

    /**
     * Display a paginated listing of the suppliers.
     */
    public function index(Request $request)
    {
        $perPage = $request->query('per_page', 10);

        $query = Supplier::query();

        // 1. TÌM KIẾM THEO TÊN
        if ($search = $request->get('search')) {
            $query->where('SupplierName', 'like', "%{$search}%");
        }

        // 2. LỌC THEO EMAIL
        if ($email = $request->get('email')) {
            $query->where('ContactEmail', 'like', "%{$email}%");
        }

        // 3. LỌC THEO SỐ ĐIỆN THOẠI
        if ($phone = $request->get('phone')) {
            $query->where('ContactPhone', 'like', "%{$phone}%");
        }

        // SẮP XẾP
        $query->orderBy('SupplierId', 'asc');

        $suppliers = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $suppliers->items(),
            'current_page' => $suppliers->currentPage(),
            'last_page' => $suppliers->lastPage(),
            'per_page' => $suppliers->perPage(),
            'total' => $suppliers->total(),
            'filters' => $request->only(['search', 'email', 'phone']) // Trả về để frontend giữ filter
        ], 200);
    }

    /**
     * Store a newly created supplier in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'SupplierName' => 'required|string|max:255',
            'ContactEmail' => 'nullable|email|max:255',
            'ContactPhone' => 'nullable|string|max:20',
            'Address' => 'nullable|string|max:255',
            'Description' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $supplier = Supplier::create([
            'SupplierName' => $request->SupplierName,
            'ContactEmail' => $request->ContactEmail,
            'ContactPhone' => $request->ContactPhone,
            'Address' => $request->Address,
            'Description' => $request->Description
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $supplier->load('import_bills')
        ], 201);
    }

    /**
     * Display the specified supplier.
     */
    public function show($id)
    {
        $supplier = Supplier::with(['import_bills'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $supplier
        ], 200);
    }

    /**
     * Update the specified supplier in storage.
     */
    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'SupplierName' => 'required|string|max:255',
            'ContactEmail' => 'nullable|email|max:255',
            'ContactPhone' => 'nullable|string|max:20',
            'Address' => 'nullable|string|max:255',
            'Description' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $supplier->update([
            'SupplierName' => $request->SupplierName ?? $supplier->SupplierName,
            'ContactEmail' => $request->ContactEmail ?? $supplier->ContactEmail,
            'ContactPhone' => $request->ContactPhone ?? $supplier->ContactPhone,
            'Address' => $request->Address ?? $supplier->Address,
            'Description' => $request->Description ?? $supplier->Description
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $supplier->load('import_bills')
        ], 200);
    }

    /**
     * Remove the specified supplier from storage.
     */
    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);

        // Kiểm tra xem nhà cung cấp có liên quan đến phiếu nhập kho hay không
        if ($supplier->import_bills()->count() > 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể xóa nhà cung cấp vì đã có phiếu nhập kho liên quan.'
            ], 422);
        }

        $supplier->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Nhà cung cấp đã được xóa thành công.'
        ], 200);
    }
}
