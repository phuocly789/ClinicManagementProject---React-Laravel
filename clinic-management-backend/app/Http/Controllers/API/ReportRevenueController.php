<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use function Termwind\parse;

class ReportRevenueController extends Controller
{
    public function getCombinedStatistics(Request $request)
    {
        try {
            $startDate = $request->query('startDate');
            $endDate = $request->query('endDate');

            if ($startDate && $endDate && Carbon::parse($startDate)->gt(Carbon::parse($endDate))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
                    'data' => null,
                ], 400);
            }

            $fromDate = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(6)->startOfDay();
            $toDate = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();
            $today = Carbon::today();

            $totalAppointments = Appointment::whereDate('AppointmentDate', $today)->count();
            $completedAppointments = Appointment::whereBetween('AppointmentDate', [$fromDate, $toDate])
                ->where('Status', 'Đã khám')
                ->count();
            $pendingInvoiceCount = Invoice::where('Status', 'Chờ thanh toán')
                ->whereNotNull('InvoiceDate')
                ->count();

            $totalRevenue = Invoice::where('Status', 'Đã thanh toán')
                ->whereDate('InvoiceDate', '>=', $fromDate)
                ->whereDate('InvoiceDate', '<=', $toDate)
                ->sum('TotalAmount');

            $revenueDate = Invoice::where('Status', 'Đã thanh toán')
                ->whereDate('InvoiceDate', '>=', $fromDate)
                ->whereDate('InvoiceDate', '<=', $toDate)
                ->groupBy(DB::raw('DATE("InvoiceDate")'))
                ->orderBy(DB::raw('DATE("InvoiceDate")'))
                ->select(DB::raw('DATE("InvoiceDate") as date, SUM("TotalAmount") as revenue'))
                ->get()
                ->map(fn($item) => [
                    'date' => $item->date,
                    'revenue' => (float) $item->revenue,
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Lấy thống kê kết hợp thành công.',
                'data' => [
                    'totalAppointmentsToday' => $totalAppointments,
                    'completedAppointmentsToday' => $completedAppointments,
                    'pendingInvoicesCount' => $pendingInvoiceCount,
                    'totalRevenue' => (float) $totalRevenue,
                    'revenueByDate' => $revenueDate,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thống kê: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
