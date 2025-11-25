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

            // ======================================================
            // 1. Top 10 thuốc được kê nhiều nhất
            // ======================================================
            $topMedicines = DB::table('PrescriptionDetails')
                ->join('Medicines', 'PrescriptionDetails.MedicineId', '=', 'Medicines.MedicineId')
                ->select(
                    'Medicines.MedicineId',
                    'Medicines.MedicineName',
                    DB::raw('SUM("PrescriptionDetails"."Quantity") AS total_quantity')
                )
                ->groupBy('Medicines.MedicineId', 'Medicines.MedicineName')
                ->orderByDesc('total_quantity')
                ->limit(10)
                ->get();


            // ======================================================
            // 2. Bác sĩ kê nhiều đơn nhất
            // ======================================================
            $topDoctors = DB::table('Prescriptions')
                ->join('MedicalStaff', 'Prescriptions.StaffId', '=', 'MedicalStaff.StaffId')
                ->join('Users', 'MedicalStaff.StaffId', '=', 'Users.UserId')
                ->select(
                    'MedicalStaff.StaffId',
                    'Users.FullName AS FullName',
                    'MedicalStaff.Specialty',
                    DB::raw('COUNT("Prescriptions"."PrescriptionId") AS prescription_count')
                )
                ->groupBy('MedicalStaff.StaffId', 'Users.FullName', 'MedicalStaff.Specialty')
                ->orderByDesc('prescription_count')
                ->limit(10)
                ->get();


            // ======================================================
            // 3. Thuốc bán chạy nhất
            // ======================================================
            $bestSellingMedicines = DB::table('PrescriptionDetails')
                ->join('Medicines', 'PrescriptionDetails.MedicineId', '=', 'Medicines.MedicineId')
                ->select(
                    'Medicines.MedicineId',
                    'Medicines.MedicineName',
                    DB::raw('SUM("PrescriptionDetails"."Quantity") AS total_sold')
                )
                ->groupBy('Medicines.MedicineId', 'Medicines.MedicineName')
                ->orderByDesc('total_sold')
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
