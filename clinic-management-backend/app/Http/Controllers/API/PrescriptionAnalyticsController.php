<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrescriptionAnalyticsController extends Controller
{
    public function analytics()
    {
        try {

            // ================================
            // 1. Top 10 thuốc kê nhiều nhất
            // ================================
            $topMedicines = DB::table('PrescriptionDetails')
                ->join('Medicines', 'PrescriptionDetails.MedicineId', '=', 'Medicines.MedicineId')
                ->select(
                    'Medicines.MedicineId',
                    'Medicines.MedicineName',
                    DB::raw('SUM("Quantity") as total_quantity')
                )
                ->groupBy('Medicines.MedicineId', 'Medicines.MedicineName')
                ->orderBy('total_quantity', 'DESC')
                ->limit(10)
                ->get();

            // ================================
            // 2. Bác sĩ kê nhiều đơn nhất
            // ================================
            $topDoctors = DB::table('Prescriptions')
                ->join('MedicalStaff', 'Prescriptions.StaffId', '=', 'MedicalStaff.StaffId')
                ->select(
                    'MedicalStaff.StaffId',
                    'MedicalStaff.FullName',
                    'MedicalStaff.Specialty',
                    DB::raw('COUNT(Prescriptions.PrescriptionId) as prescription_count')
                )
                ->groupBy('MedicalStaff.StaffId', 'MedicalStaff.FullName', 'MedicalStaff.Specialty')
                ->orderBy('prescription_count', 'DESC')
                ->limit(10)
                ->get();

            // ================================
            // 3. Thuốc bán chạy (không tính profit vì không có cột import_price)
            // ================================
            $bestSellingMedicines = DB::table('PrescriptionDetails')
                ->join('Medicines', 'PrescriptionDetails.MedicineId', '=', 'Medicines.MedicineId')
                ->select(
                    'Medicines.MedicineId',
                    'Medicines.MedicineName',
                    DB::raw('SUM("Quantity") as total_sold')
                )
                ->groupBy('Medicines.MedicineId', 'Medicines.MedicineName')
                ->orderBy('total_sold', 'DESC')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'topMedicines' => $topMedicines,
                'topDoctors' => $topDoctors,
                'bestSellingMedicines' => $bestSellingMedicines
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Analytics failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
