<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Service;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardStatsService
{
    public function getRealtimeStats()
    {
        $today = Carbon::today();

        try {
            $results = DB::select("
                WITH today_appointments AS (
                    SELECT
                        COUNT(*) FILTER (WHERE DATE(\"AppointmentDate\") = ?) AS total_today,
                        COUNT(*) FILTER (WHERE DATE(\"AppointmentDate\") = ? AND \"Status\" = 'Đang chờ') AS waiting_today,
                        COUNT(*) FILTER (WHERE DATE(\"AppointmentDate\") = ? AND \"Status\" = 'Đã khám') AS completed_today
                    FROM \"Appointments\"
                ),
                today_invoices AS (
                    SELECT
                        COUNT(*) FILTER (WHERE \"Status\" = 'Chờ thanh toán') AS pending_today,
                        COALESCE(SUM(\"TotalAmount\") FILTER (WHERE \"Status\" = 'Đã thanh toán' AND DATE(\"InvoiceDate\") = ?), 0) AS revenue_today
                    FROM \"Invoices\"
                ),
                today_services AS (
                    SELECT COUNT(*) as processing_today
                    FROM \"ServiceOrders\"
                    WHERE \"Status\" = 'Đã chỉ định'
                )
                SELECT
                    ta.total_today as appointments_today,
                    ta.waiting_today as waiting_patients,
                    ta.completed_today as completed_appointments,
                    ti.pending_today as pending_invoices,
                    ti.revenue_today as revenue_today,
                    ts.processing_today as processing_services
                FROM today_appointments ta
                CROSS JOIN today_invoices ti
                CROSS JOIN today_services ts
            ", [
                $today->toDateString(),
                $today->toDateString(),
                $today->toDateString(),
                $today->toDateString()
            ]);

            $row = $results[0];

            return [
                // Tất cả đều là số liệu HÔM NAY
                'todayAppointments' => (int)$row->appointments_today,
                'waitingPatients' => (int)$row->waiting_patients,
                'completedAppointments' => (int)$row->completed_appointments,
                'pendingInvoices' => (int)$row->pending_invoices,
                'todayRevenue' => (float)$row->revenue_today,
                'processingServices' => (int)$row->processing_services,

                'updated_at' => now('Asia/Ho_Chi_Minh')->toDateTimeString()
            ];
        } catch (\Exception $e) {
            return [
                'todayAppointments' => 0,
                'waitingPatients' => 0,
                'completedAppointments' => 0,
                'pendingInvoices' => 0,
                'todayRevenue' => 0,
                'processingServices' => 0,
                'updated_at' => now()->toDateTimeString()
            ];
        }
    }
}
