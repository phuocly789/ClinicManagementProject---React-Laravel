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
    // public function getCombinedStatistics(Request $request)
    // {
    //     try {
    //         $startDate = $request->query('startDate');
    //         $endDate = $request->query('endDate');

    //         if ($startDate && $endDate && Carbon::parse($startDate)->gt(Carbon::parse($endDate))) {
    //             return response()->json([
    //                 'success' => false,
    //                 'message' => 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
    //                 'data' => null,
    //             ], 400);
    //         }

    //         $fromDate = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(6)->startOfDay();
    //         $toDate = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();
    //         $today = Carbon::today();

    //         $totalAppointments = Appointment::whereBetween('AppointmentDate', [
    //             Carbon::today()->startOfDay(),
    //             Carbon::today()->endOfDay()
    //         ])->count();

    //         $completedAppointments = Appointment::whereBetween('AppointmentDate', [$fromDate, $toDate])
    //             ->where('Status', 'Đã khám')
    //             ->count();
    //         $pendingInvoiceCount = Invoice::where('Status', 'Chờ thanh toán')
    //             ->whereNotNull('InvoiceDate')
    //             ->count();

    //         $totalRevenue = Invoice::where('Status', 'Đã thanh toán')
    //             ->whereBetween('InvoiceDate', [$fromDate, $toDate])
    //             ->sum('TotalAmount');


    //         $revenueDate = Invoice::where('Status', 'Đã thanh toán')
    //             ->whereBetween('InvoiceDate', [$fromDate, $toDate])
    //             ->groupBy(DB::raw("DATE_TRUNC('day', \"InvoiceDate\")"))
    //             ->orderBy(DB::raw("DATE_TRUNC('day', \"InvoiceDate\")"))
    //             ->select(DB::raw("DATE_TRUNC('day', \"InvoiceDate\") as date, SUM(\"TotalAmount\") as revenue"))
    //             ->get()
    //             ->map(fn($item) => [
    //                 'date' => Carbon::parse($item->date)->toDateString(),
    //                 'revenue' => (float)$item->revenue,
    //             ]);


    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Lấy thống kê kết hợp thành công.',
    //             'data' => [
    //                 'totalAppointmentsToday' => $totalAppointments,
    //                 'completedAppointmentsToday' => $completedAppointments,
    //                 'pendingInvoicesCount' => $pendingInvoiceCount,
    //                 'totalRevenue' => (float) $totalRevenue,
    //                 'revenueByDate' => $revenueDate,
    //             ],
    //         ]);
    //     } catch (\Exception $e) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Lỗi khi lấy thống kê: ' . $e->getMessage(),
    //             'data' => null,
    //         ], 500);
    //     }
    // }

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

            // Combined query using CTEs
            $results = DB::select("
            WITH appointment_counts AS (
                SELECT
                    COUNT(*) FILTER (WHERE \"AppointmentDate\" BETWEEN ? AND ?) AS total_appointments,
                    COUNT(*) FILTER (WHERE \"AppointmentDate\" BETWEEN ? AND ? AND \"Status\" = 'Đã khám') AS completed_appointments
                FROM \"Appointments\"
            ),
            invoice_counts AS (
                SELECT
                    COUNT(*) FILTER (WHERE \"Status\" = 'Chờ thanh toán' AND \"InvoiceDate\" IS NOT NULL) AS pending_invoice_count,
                    SUM(\"TotalAmount\") FILTER (WHERE \"Status\" = 'Đã thanh toán' AND \"InvoiceDate\" BETWEEN ? AND ?) AS total_revenue
                FROM \"Invoices\"
            ),
            revenue_by_date AS (
                SELECT
                    DATE_TRUNC('day', \"InvoiceDate\") as date,
                    SUM(\"TotalAmount\") as revenue
                FROM \"Invoices\"
                WHERE \"Status\" = 'Đã thanh toán'
                AND \"InvoiceDate\" BETWEEN ? AND ?
                GROUP BY DATE_TRUNC('day', \"InvoiceDate\")
                ORDER BY DATE_TRUNC('day', \"InvoiceDate\")
            )
            SELECT
                ac.total_appointments as total_appointments_today,
                ac.completed_appointments as completed_appointments,
                ic.pending_invoice_count as pending_invoices_count,
                ic.total_revenue as total_revenue,
                rbd.date,
                rbd.revenue
            FROM appointment_counts ac
            CROSS JOIN invoice_counts ic
            LEFT JOIN revenue_by_date rbd ON true
        ", [
                $today->startOfDay(),
                $today->endOfDay(),
                $fromDate,
                $toDate,
                $fromDate,
                $toDate,
                $fromDate,
                $toDate
            ]);

            // Process results
            $totalAppointments = 0;
            $completedAppointments = 0;
            $pendingInvoiceCount = 0;
            $totalRevenue = 0;
            $revenueByDate = [];

            foreach ($results as $row) {
                $totalAppointments = (int)$row->total_appointments_today;
                $completedAppointments = (int)$row->completed_appointments;
                $pendingInvoiceCount = (int)$row->pending_invoices_count;
                $totalRevenue = (float)$row->total_revenue;

                if ($row->date && $row->revenue) {
                    $revenueByDate[] = [
                        'date' => Carbon::parse($row->date)->toDateString(),
                        'revenue' => (float)$row->revenue
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Lấy thống kê kết hợp thành công.',
                'data' => [
                    'totalAppointmentsToday' => $totalAppointments,
                    'completedAppointmentsToday' => $completedAppointments,
                    'pendingInvoicesCount' => $pendingInvoiceCount,
                    'totalRevenue' => $totalRevenue,
                    'revenueByDate' => $revenueByDate,
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

    public function getDetailRevenueReport(Request $request)
    {
        try {
            $page = (int)$request->input('page', 1);
            $pageSize = (int)$request->input('pageSize', 10);
            $search = $request->input('search', null);
            $startDate = $request->input('startDate', null);
            $endDate = $request->input('endDate', Carbon::today()->endOfDay());

            // Validate date range
            if ($startDate && $endDate && Carbon::parse($startDate)->gt(Carbon::parse($endDate))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
                    'data' => null,
                ], 400);
            }

            // Default date range
            $fromDate = $startDate ? Carbon::parse($startDate)->startOfDay() : now()->subDays(6)->startOfDay(); // 7 days ago
            $toDate = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::today()->endOfDay();

            // Search by ID if numeric
            $searchId = is_numeric($search) ? (int)$search : null;

            // Main query
            $query = DB::table('Invoices as i')
                ->join('InvoiceDetails as id', 'i.InvoiceId', '=', 'id.InvoiceId')
                ->leftJoin('Users as u', 'i.PatientId', '=', 'u.UserId')
                ->leftJoin('Appointments as a', 'i.AppointmentId', '=', 'a.AppointmentId')
                ->leftJoin('Services as s', 'id.ServiceId', '=', 's.ServiceId')
                ->leftJoin('Medicines as m', 'id.MedicineId', '=', 'm.MedicineId')
                ->whereBetween('i.InvoiceDate', [$fromDate, $toDate])
                ->when($search, function ($q) use ($search, $searchId) {
                    $q->where(function ($sub) use ($search, $searchId) {
                        $sub->where('u.FullName', 'ILIKE', "%{$search}%");
                        if ($searchId) {
                            $sub->orWhere('i.InvoiceId', '=', $searchId);
                        }
                    });
                })
                ->select([
                    'i.InvoiceId',
                    'i.InvoiceDate',
                    'i.TotalAmount',
                    'u.FullName as PatientName',
                    'a.AppointmentDate',
                    'id.ServiceId',
                    's.ServiceName',
                    'id.MedicineId',
                    'm.MedicineName',
                    'id.Quantity',
                    'id.UnitPrice',
                    'id.SubTotal',
                    'i.Status',
                ]);

            $rawResults = $query->orderByDesc('i.InvoiceDate')->get();

            if ($rawResults->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Không có dữ liệu trong khoảng thời gian này.',
                    'data' => [
                        'items' => [],
                        'totalItems' => 0,
                        'page' => $page,
                        'pageSize' => $pageSize
                    ]
                ]);
            }

            // Group by InvoiceId
            $grouped = $rawResults->groupBy('InvoiceId')->map(function ($items) {
                $first = $items->first();
                return [
                    'InvoiceId' => $first->InvoiceId,
                    'InvoiceDate' => $first->InvoiceDate,
                    'TotalAmount' => $first->TotalAmount,
                    'PatientName' => $first->PatientName,
                    'AppointmentDate' => $first->AppointmentDate,
                    'Status' => $first->Status,
                    'Details' => $items->map(function ($item) {
                        return [
                            'ServiceId' => $item->ServiceId,
                            'ServiceName' => $item->ServiceName,
                            'MedicineId' => $item->MedicineId,
                            'MedicineName' => $item->MedicineName,
                            'Quantity' => $item->Quantity,
                            'UnitPrice' => $item->UnitPrice,
                            'SubTotal' => $item->SubTotal,
                        ];
                    })->values()
                ];
            })->values();

            // Total items
            $totalItems = $grouped->count();

            // Apply pagination
            $pagedInvoices = $grouped->forPage($page, $pageSize)->values();

            // Response
            $pageResult = [
                'items' => $pagedInvoices,
                'totalItems' => $totalItems,
                'page' => $page,
                'pageSize' => $pageSize
            ];

            return response()->json([
                'success' => true,
                'message' => 'Lấy thống kê chi tiết thành công.',
                'data' => $pageResult
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thống kê chi tiết: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
