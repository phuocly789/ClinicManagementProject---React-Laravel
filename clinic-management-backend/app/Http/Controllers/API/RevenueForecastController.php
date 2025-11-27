<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Phpml\Regression\LeastSquares;

class RevenueForecastController extends Controller
{
    public function forecast()
    {
        try {
            // Lấy doanh thu 6 tháng gần nhất (dựa trên ngày thanh toán)
            $revenues = Invoice::select(
                DB::raw('EXTRACT(MONTH FROM COALESCE("Paidat", "InvoiceDate")) AS month'),
                DB::raw('EXTRACT(YEAR  FROM COALESCE("Paidat", "InvoiceDate")) AS year'),
                DB::raw('SUM("TotalAmount") AS revenue')
            )
                ->where('Status', 'Đã thanh toán') // đúng với DB của bạn
                ->whereRaw('COALESCE("Paidat", "InvoiceDate") >= ?', [now()->subMonths(6)])
                ->groupBy('year', 'month')
                ->orderBy('year', 'asc')
                ->orderBy('month', 'asc')
                ->get();

            // Nếu không đủ dữ liệu để dự đoán
            if ($revenues->count() < 3) {
                return response()->json([
                    'historical' => $revenues,
                    'forecast' => [
                        'predicted_revenue' => 0,
                        'confidence' => 0
                    ]
                ]);
            }

            // Chuẩn bị dữ liệu cho Linear Regression
            $samples = [];
            $targets = [];

            foreach ($revenues as $index => $row) {
                $samples[] = [$index + 1];   // x = tháng thứ n
                $targets[] = $row->revenue;  // y = doanh thu
            }

            // Train mô hình
            $regression = new LeastSquares();
            $regression->train($samples, $targets);

            // Dự đoán doanh thu tháng tiếp theo
            $next = count($samples) + 1;
            $prediction = $regression->predict([$next]);

            return response()->json([
                'historical' => $revenues,
                'forecast' => [
                    'predicted_revenue' => round(max(0, $prediction)),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Forecast failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
