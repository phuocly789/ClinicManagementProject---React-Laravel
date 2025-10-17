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
    public function getDashboardStatistics(Request $request)
    {
        $startDate = $request->start_date;
        $endDate = $request->end_date;

        //nếu kh truyền  vào thì mặc định là 7 ngày gần nhâts
        $fromDate = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(6)->startOfDay();
        $toDate = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();
        $today = Carbon::today();

        //tổng số lịch hẹn hôm nay
        $totalAppointments = Appointment::whereBetween('AppointmentDate', [$toDate->startOfDay(), $toDate->endOfDay()])->count();

        //số lịch khám trong khoản thời gian
        $completedAppointments = Appointment::whereBetween('AppointmentDate', [$fromDate, $toDate])->where('Status', 'Đã khám')->count();

        //số hóa đơn đang pending
        $pendingInvoiceCount = Invoice::where('Status', 'Chờ thanh toán')->whereNotNull('InvoiceDate')->count();

        return response()->json([
            'success' => true,
            'message' => 'Lấy thống kê Dashboard thành công',
            'data' => [
                'totalAppointmentsToday' => $totalAppointments,
                'completedAppointmentsToday' => $completedAppointments,
                'pendingInvoicesCount' => $pendingInvoiceCount
            ]
        ]);
    }
    public function getRevenueStatistics(Request $request)
    {
        try {
            $startDate = $request->query('startDate');
            $endDate = $request->query('endDate');

            //kiểm tra hợp lệ
            if ($startDate && $endDate && Carbon::parse($startDate)->gt(Carbon::parse($endDate)))
                return response()->json([
                    'success' => false,
                    'message' => 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
                    'data' => null
                ]);

            //mặc định lấy 7 ngày gần nhất
            $fromDate = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(6)->startOfDay();
            $toDate = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();

            $query = Invoice::where('Status', 'Đã thanh toán')->whereBetween('InvoiceDate', [$fromDate, $toDate]);

            //tổng doanh thu
            $totalRevenue = Invoice::whereRaw('"Status" = ?', ['Đã thanh toán'])
                ->whereBetween('InvoiceDate', [$fromDate, $toDate])
                ->sum('TotalAmount');

            $revenueDate = Invoice::whereRaw('"Status" = ?', ['Đã thanh toán'])
                ->whereBetween('InvoiceDate', [$fromDate, $toDate])
                ->selectRaw('DATE("InvoiceDate") as date, SUM("TotalAmount") as revenue')
                ->groupByRaw('DATE("InvoiceDate")')
                ->orderByRaw('DATE("InvoiceDate")')
                ->get()
                ->map(fn($item) => [
                    'date' => $item->date,
                    'revenue' => (float) $item->revenue,
                ]);


            return response()->json(
                [
                    'success' => true,
                    'message' => 'Lấy thống kê doanh thu thành công.',
                    'data' => [
                        'totalRevenue' => (float) $totalRevenue,
                        'byDate' => $revenueDate
                    ]
                ]
            );
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thống kê doanh thu: ' . $e->getMessage(),
                'data' => null
            ],500);
        }
    }
}
