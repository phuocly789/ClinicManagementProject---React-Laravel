<?php

namespace App\Http\Controllers\API\Payment;

use App\Http\Controllers\Controller;
use App\Http\Services\PaymentService;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    protected $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    // API tạo thanh toán - React sẽ gọi API này
    public function createPayment(Request $request)
    {
        $request->validate([
            'invoiceId' => 'required|integer', // THÊM: ID hóa đơn từ database
            'orderId' => 'required|string',
            'amount' => 'required|numeric|min:1000',
            'orderInfo' => 'required|string',
            'paymentMethod' => 'required|in:momo,napas'
        ]);

        try {
            DB::beginTransaction();

            // 1. TÌM INVOICE TRONG DATABASE
            $invoice = Invoice::find($request->invoiceId);
            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn không tồn tại'
                ], 404);
            }

            // 2. KIỂM TRA TRẠNG THÁI
            if ($invoice->Status !== 'Chờ thanh toán') {
                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn không thể thanh toán'
                ], 400);
            }

            $orderId = $request->orderId;
            $amount = $request->amount;
            $orderInfo = $request->orderInfo;
            $paymentMethod = $request->paymentMethod;

            // 3. LƯU ORDER_ID VÀ PAYMENT METHOD VÀO DATABASE
            $invoice->update([
                'OrderId' => $orderId,
                'PaymentMethod' => $paymentMethod
            ]);

            // 4. GỌI MOMO API
            $result = $this->paymentService->createPayment($orderId, $amount, $orderInfo, $paymentMethod);

            if ($result['resultCode'] == 0) {
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'payUrl' => $result['payUrl'],
                    'deeplink' => $result['deeplink'] ?? '',
                    'qrCodeUrl' => $result['qrCodeUrl'] ?? '',
                    'paymentMethod' => $paymentMethod,
                    'message' => 'Tạo thanh toán thành công'
                ]);
            } else {
                DB::rollBack();
                
                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Lỗi không xác định từ MoMo'
                ], 400);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Create payment error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống: ' . $e->getMessage()
            ], 500);
        }
    }

    // URL callback từ MoMo (webhook)
    public function handleCallback(Request $request)
    {
        Log::info('MoMo Callback Data:', $request->all());

        $data = $request->all();
        $signature = $request->signature;

        try {
            DB::beginTransaction();

            // 1. TÌM INVOICE THEO ORDER_ID
            $orderId = $data['orderId'];
            $invoice = Invoice::where('OrderId', $orderId)->first();

            if (!$invoice) {
                Log::error("❌ Invoice not found for order: $orderId");
                DB::rollBack();
                return response()->json(['resultCode' => -1], 404);
            }

            // 2. XỬ LÝ KẾT QUẢ THANH TOÁN
            if ($data['resultCode'] == 0) {
                $transId = $data['transId'];

                // CẬP NHẬT THÀNH CÔNG
                $invoice->update([
                    'Status' => 'Đã thanh toán',
                    'TransactionId' => $transId,
                    'Paidat' => now(),
                    'PaymentMethod' => 'momo' // Xác nhận phương thức
                ]);

                Log::info("✅ Payment successful - Invoice ID: {$invoice->InvoiceId}, TransId: $transId");

            } else {
                // THANH TOÁN THẤT BẠI - RESET TRẠNG THÁI
                $invoice->update([
                    'Status' => 'Chờ thanh toán',
                    'OrderId' => null, // Reset orderId để có thể thử lại
                    'PaymentMethod' => null
                ]);

                Log::error("❌ Payment failed - Invoice ID: {$invoice->InvoiceId}, Error: " . $data['message']);
            }

            DB::commit();
            return response()->json(['resultCode' => 0]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Callback error: ' . $e->getMessage());
            return response()->json(['resultCode' => -1], 500);
        }
    }

    // URL return sau khi thanh toán (user redirect về)
    public function handleReturn(Request $request)
    {
        Log::info('MoMo Return Data:', $request->all());

        $data = $request->all();
        $resultCode = $data['resultCode'] ?? -1;

        try {
            // TÌM INVOICE ĐỂ HIỂN THỊ THÔNG TIN
            $orderId = $data['orderId'] ?? null;
            $invoice = null;

            if ($orderId) {
                $invoice = Invoice::where('OrderId', $orderId)->first();
            }

            if ($resultCode == 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Thanh toán thành công!',
                    'orderId' => $data['orderId'] ?? '',
                    'transId' => $data['transId'] ?? '',
                    'invoice' => $invoice ? [
                        'id' => $invoice->InvoiceId,
                        'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
                        'amount' => $invoice->TotalAmount,
                        'patientName' => $invoice->patient ? $invoice->patient->Name : 'N/A'
                    ] : null
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $data['message'] ?? 'Thanh toán thất bại!',
                    'invoice' => $invoice ? [
                        'id' => $invoice->InvoiceId,
                        'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT)
                    ] : null
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Return handler error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống'
            ], 500);
        }
    }
}