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

    // API TẠO THANH TOÁN
    public function createPayment(Request $request)
    {
        Log::info('📱 [CREATE_PAYMENT] Request received:', $request->all());

        $request->validate([
            'invoiceId' => 'required|integer',
            'orderId' => 'required|string',
            'amount' => 'required|numeric|min:1000',
            'orderInfo' => 'required|string',
            'paymentMethod' => 'required|in:momo,napas'
        ]);

        Log::info('🎯 [CREATE_PAYMENT] Validated data:', [
            'invoiceId' => $request->invoiceId,
            'orderId' => $request->orderId,
            'amount' => $request->amount,
            'paymentMethod' => $request->paymentMethod,
            'is_napas' => $request->paymentMethod === 'napas'
        ]);

        try {
            DB::beginTransaction();

            // TÌM INVOICE
            $invoice = Invoice::find($request->invoiceId);
            if (!$invoice) {
                Log::error('❌ [CREATE_PAYMENT] Invoice not found');
                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn không tồn tại'
                ], 404);
            }

            if ($invoice->Status !== 'Chờ thanh toán') {
                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn không thể thanh toán'
                ], 400);
            }

            // LƯU THÔNG TIN PAYMENT
            $invoice->update([
                'OrderId' => $request->orderId,
                'PaymentMethod' => $request->paymentMethod
            ]);

            Log::info('💾 [CREATE_PAYMENT] Invoice updated', [
                'invoiceId' => $invoice->InvoiceId,
                'orderId' => $request->orderId,
                'paymentMethod' => $request->paymentMethod
            ]);

            // GỌI MOMO API
            $result = $this->paymentService->createPayment(
                $request->orderId,
                $request->amount,
                $request->orderInfo,
                $request->paymentMethod
            );

            if ($result['resultCode'] == 0) {
                DB::commit();
                Log::info('✅ [CREATE_PAYMENT] Payment created successfully');

                return response()->json([
                    'success' => true,
                    'payUrl' => $result['payUrl'],
                    'deeplink' => $result['deeplink'] ?? '',
                    'qrCodeUrl' => $result['qrCodeUrl'] ?? '',
                    'paymentMethod' => $request->paymentMethod,
                    'message' => 'Tạo thanh toán thành công'
                ]);
            } else {
                DB::rollBack();
                Log::error('❌ [CREATE_PAYMENT] MoMo error', $result);

                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Lỗi từ MoMo'
                ], 400);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [CREATE_PAYMENT] Exception: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống: ' . $e->getMessage()
            ], 500);
        }
    }

    // CALLBACK TỪ MOMO
    public function handleCallback(Request $request)
    {
        Log::info('🔔 [MOMO_CALLBACK] Received', $request->all());

        $data = $request->all();
        $signature = $request->signature ?? '';

        if (!isset($data['orderId'])) {
            Log::error('❌ [MOMO_CALLBACK] Missing orderId');
            return response()->json(['resultCode' => -1], 400);
        }

        try {
            // VERIFY SIGNATURE (tạm bỏ qua cho test)
            if (!isset($data['test'])) {
                $isValid = $this->paymentService->verifySignature($data, $signature);
                if (!$isValid) {
                    Log::error('❌ [MOMO_CALLBACK] Invalid signature');
                    return response()->json(['resultCode' => -1], 400);
                }
            }

            DB::beginTransaction();

            $orderId = $data['orderId'];
            $invoice = Invoice::where('OrderId', $orderId)->first();

            if (!$invoice) {
                Log::error("❌ [MOMO_CALLBACK] Invoice not found: {$orderId}");
                DB::rollBack();
                return response()->json(['resultCode' => -1], 404);
            }

            Log::info("📋 [MOMO_CALLBACK] Processing invoice", [
                'invoiceId' => $invoice->InvoiceId,
                'currentStatus' => $invoice->Status
            ]);

            if ($data['resultCode'] == 0) {
                // XÁC ĐỊNH PHƯƠNG THỨC THANH TOÁN
                $paymentMethod = 'momo';
                if (isset($data['payType']) && $data['payType'] === 'napas') {
                    $paymentMethod = 'napas';
                }

                $invoice->update([
                    'Status' => 'Đã thanh toán',
                    'TransactionId' => $data['transId'] ?? '',
                    'Paidat' => now('Asia/Ho_Chi_Minh'),
                    'PaymentMethod' => $paymentMethod
                ]);

                Log::info("✅ [MOMO_CALLBACK] Payment success", [
                    'invoiceId' => $invoice->InvoiceId,
                    'paymentMethod' => $paymentMethod,
                    'transId' => $data['transId'] ?? ''
                ]);
            } else {
                $invoice->update([
                    'Status' => 'Chờ thanh toán',
                    'OrderId' => null,
                    'PaymentMethod' => null,
                    'TransactionId' => null
                ]);

                Log::error("❌ [MOMO_CALLBACK] Payment failed", [
                    'invoiceId' => $invoice->InvoiceId,
                    'error' => $data['message'] ?? 'Unknown'
                ]);
            }

            DB::commit();
            return response()->json(['resultCode' => 0]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [MOMO_CALLBACK] Exception: ' . $e->getMessage());
            return response()->json(['resultCode' => -1], 500);
        }
    }

    // RETURN URL SAU KHI THANH TOÁN
    public function handleReturn(Request $request)
    {
        Log::info('🔄 [MOMO_RETURN] User returned', $request->all());

        $data = $request->all();
        $resultCode = $data['resultCode'] ?? -1;

        try {
            DB::beginTransaction();

            $orderId = $data['orderId'] ?? null;
            $invoice = $orderId ? Invoice::where('OrderId', $orderId)->first() : null;

            // UPDATE MANUAL NẾU CALLBACK CHƯA ĐƯỢC GỌI
            if ($resultCode == 0 && $invoice && $invoice->Status === 'Chờ thanh toán') {
                Log::info('🔄 [MOMO_RETURN] Manual update needed');

                $paymentMethod = 'momo';
                if (isset($data['payType']) && $data['payType'] === 'napas') {
                    $paymentMethod = 'napas';
                }

                $invoice->update([
                    'Status' => 'Đã thanh toán',
                    'TransactionId' => $data['transId'] ?? '',
                    'Paidat' => now('Asia/Ho_Chi_Minh'),
                    'PaymentMethod' => $paymentMethod
                ]);

                Log::info("✅ [MOMO_RETURN] Manual update success", [
                    'invoiceId' => $invoice->InvoiceId,
                    'paymentMethod' => $paymentMethod
                ]);
            }

            DB::commit();

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
                        'status' => $invoice->Status,
                        'paymentMethod' => $invoice->PaymentMethod,
                        'patientName' => $invoice->patient ? $invoice->patient->Name : 'N/A'
                    ] : null
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $data['message'] ?? 'Thanh toán thất bại!',
                    'invoice' => $invoice ? [
                        'id' => $invoice->InvoiceId,
                        'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
                        'status' => $invoice->Status
                    ] : null
                ], 400);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [MOMO_RETURN] Exception: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống'
            ], 500);
        }
    }
}