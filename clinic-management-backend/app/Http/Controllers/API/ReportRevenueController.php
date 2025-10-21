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
    public function getDetailRevenueReport(Request $request)
    {
        try {
            $page = (int)$request->input('page', 1);
            $pageSize = (int)$request->input('pageSize', 10);
            $search = $request->input('search', null);
            $startDate = $request->input('startDate', null);
            $endDate = $request->input('endDate', null);


            //valid ngày
            if ($startDate && $endDate && $startDate > $endDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
                    'data' => null,
                ], 400);
            }

            // defaut range
            $fromDate = $startDate ?? now()->subMonth()->toDateString();
            $toDate = $endDate ?? now()->subDay()->toDateString();

            //nếu search id là số thì theo id:
            $searchId   = is_numeric($search) ? (int)$search : null;

            //query chính
            $query = DB::table(DB::raw('"Invoices" as i'))
                ->join(DB::raw('"InvoiceDetails" as id'), 'i."InvoiceId"', '=', 'id."InvoiceId"')
                ->leftJoin(DB::raw('"Users" as u'), 'i."PatientId"', '=', 'u."UserId"')
                ->leftJoin(DB::raw('"Appointments" as a'), 'i."AppointmentId"', '=', 'a."AppointmentId"')
                ->leftJoin(DB::raw('"Services" as s'), 'id."ServiceId"', '=', 's."ServiceId"')
                ->leftJoin(DB::raw('"Medicines" as m'), 'id."MedicineId"', '=', 'm."MedicineId"')
                ->whereBetween('i."InvoiceDate"', [$fromDate, $toDate])
                ->when($search, function ($q) use ($search, $searchId) {
                    $q->where(function ($sub) use ($search, $searchId) {
                        // PostgreSQL dùng ILIKE để tìm kiếm không phân biệt hoa thường
                        $sub->where('u."FullName"', 'ILIKE', "%{$search}%");
                        if ($searchId) {
                            $sub->orWhere('i."InvoiceId"', '=', $searchId);
                        }
                    });
                })
                ->select([
                    'i."InvoiceId"',
                    'i."InvoiceDate"',
                    'i."TotalAmount"',
                    'u."FullName" as PatientName',
                    'a."AppointmentDate"',
                    'id."ServiceId"',
                    's."ServiceName"',
                    'id."MedicineId"',
                    'm."MedicineName"',
                    'id."Quantity"',
                    'id."UnitPrice"',
                    'id."SubTotal"',
                    'i."Status"',
                ]);

            $rawResults = $query->orderByDesc('i."InvoiceDate"')->get();

            if ($rawResults->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Không có dữ liệu trong khoản thời gian này. ',
                    'data' => [
                        'items' => [],
                        'totalItems' => 0,
                        'page' => $page,
                        'pageSize' => $pageSize
                    ]
                ]);
            }

            //nhóm theo invoice ID
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

            //tổng số hóa đơn
            $totalItems = $grouped->count();

            //áp dụng phân trang
            $pagedInvoices = $grouped->forPage($page, $pageSize)->values();

            //response
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
                'success' => 'false',
                'message' => 'Lỗi khi lấy thống kê chi tiết: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }
}
