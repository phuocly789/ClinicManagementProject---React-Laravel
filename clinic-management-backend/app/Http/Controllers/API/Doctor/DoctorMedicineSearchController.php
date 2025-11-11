<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DoctorMedicineSearchController extends Controller
{
    /**
     * Tìm thuốc autocomplete cho bác sĩ
     * GET /api/doctor/medicines/search?q=...
     */
    public function search(Request $request)
    {
        $q = trim($request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $medicines = DB::table('Medicines')
            ->select('MedicineId', 'MedicineName', 'MedicineType', 'Price', 'StockQuantity')
            ->where('MedicineName', 'ILIKE', "%{$q}%")
            ->orWhere('MedicineType', 'ILIKE', "%{$q}%")
            ->limit(10)
            ->get();

        return response()->json($medicines);
    }
}
