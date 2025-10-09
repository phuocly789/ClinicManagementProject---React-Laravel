<?php

namespace App\Http\Controllers;

use App\Models\ImportBill;
use App\Models\Supplier;
use App\Models\ImportDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class ImportBillController extends Controller
{
    /**
     * Display a listing of the import bills.
     */
    public function index()
    {
        $importBills = ImportBill::with(['supplier', 'user', 'import_details'])
            ->orderBy('ImportDate', 'desc')
            ->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $importBills
        ], 200);
    }

    /**
     * Store a newly created import bill in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'SupplierId' => 'nullable|exists:suppliers,SupplierId',
            'ImportDate' => 'nullable|date',
            'TotalAmount' => 'required|numeric|min:0',
            'Notes' => 'nullable|string|max:255',
            'CreatedBy' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $importBill = ImportBill::create([
            'SupplierId' => $request->SupplierId,
            'ImportDate' => $request->ImportDate ?? Carbon::now(),
            'TotalAmount' => $request->TotalAmount,
            'Notes' => $request->Notes,
            'CreatedBy' => $request->CreatedBy ?? (Auth::user() ? Auth::user()->id : null)
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $importBill->load(['supplier', 'user', 'import_details'])
        ], 201);
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
            'CreatedBy' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $importBill->update([
            'SupplierId' => $request->SupplierId ?? $importBill->SupplierId,
            'ImportDate' => $request->ImportDate ?? $importBill->ImportDate,
            'TotalAmount' => $request->TotalAmount,
            'Notes' => $request->Notes ?? $importBill->Notes,
            'CreatedBy' => $request->CreatedBy ?? $importBill->CreatedBy
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $importBill->load(['supplier', 'user', 'import_details'])
        ], 200);
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
            'message' => 'Import bill deleted successfully'
        ], 200);
    }
}