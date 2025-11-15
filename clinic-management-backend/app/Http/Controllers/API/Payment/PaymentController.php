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

            // KIỂM TRA TRẠNG THÁI - THÊM ĐIỀU KIỆN ORDERId
            if ($invoice->Status !== 'Chờ thanh toán' || $invoice->OrderId) {
                Log::warning('⚠️ [CREATE_PAYMENT] Invoice cannot be processed', [
                    'currentStatus' => $invoice->Status,
                    'existingOrderId' => $invoice->OrderId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn đang trong quá trình thanh toán'
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

                // RESET KHI MOMO TRẢ LỖI
                $invoice->update([
                    'OrderId' => null,
                    'PaymentMethod' => null
                ]);

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

    // CALLBACK TỪ MOMO - IPN URL
    // CALLBACK TỪ MOMO - CŨNG PHẢI RESET KHI HỦY
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
            // VERIFY SIGNATURE
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
                'currentStatus' => $invoice->Status,
                'resultCode' => $data['resultCode']
            ]);

            if ($data['resultCode'] == 0) {
                // THANH TOÁN THÀNH CÔNG
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
                    'paymentMethod' => $paymentMethod
                ]);
            } else {
                // QUAN TRỌNG: CALLBACK CŨNG PHẢI RESET KHI HỦY
                $invoice->update([
                    'Status' => 'Chờ thanh toán',
                    'OrderId' => null,        // RESET OrderId
                    'PaymentMethod' => null,  // RESET PaymentMethod
                    'TransactionId' => null
                ]);

                Log::info("🔄 [MOMO_CALLBACK] Payment failed - RESET FOR RETRY", [
                    'invoiceId' => $invoice->InvoiceId,
                    'error' => $data['message'] ?? 'Unknown',
                    'canRetry' => true
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

    // RETURN URL SAU KHI THANH TOÁN - REDIRECT URL
    // RETURN URL SAU KHI THANH TOÁN - FIX LỖI KHÔNG CHO THANH TOÁN LẠI
    public function handleReturn(Request $request)
    {
        Log::info('🔄 [MOMO_RETURN] User returned', $request->all());

        $data = $request->all();
        $resultCode = $data['resultCode'] ?? -1;
        $orderId = $data['orderId'] ?? null;

        try {
            DB::beginTransaction();

            $invoice = $orderId ? Invoice::where('OrderId', $orderId)->first() : null;

            if (!$invoice) {
                Log::error('❌ [MOMO_RETURN] Invoice not found');
                DB::rollBack();
                return $this->redirectToFrontend('error', 'Hóa đơn không tồn tại');
            }

            Log::info("📋 [MOMO_RETURN] Processing invoice", [
                'invoiceId' => $invoice->InvoiceId,
                'currentStatus' => $invoice->Status,
                'resultCode' => $resultCode,
                'orderId' => $invoice->OrderId
            ]);

            // QUAN TRỌNG: LUÔN RESET KHI THANH TOÁN THẤT BẠI/HỦY - ĐỂ CHO PHÉP THANH TOÁN LẠI
            if ($resultCode != 0) {
                // RESET HOÀN TOÀN - QUAN TRỌNG: phải reset OrderId và PaymentMethod
                $invoice->update([
                    'Status' => 'Chờ thanh toán',
                    'OrderId' => null,        // QUAN TRỌNG: Reset OrderId
                    'PaymentMethod' => null,  // QUAN TRỌNG: Reset PaymentMethod
                    'TransactionId' => null,
                    'Paidat' => null
                ]);

                Log::info("🔄 [MOMO_RETURN] Payment cancelled - RESET COMPLETED", [
                    'invoiceId' => $invoice->InvoiceId,
                    'oldOrderId' => $orderId,
                    'reason' => $data['message'] ?? 'User cancelled',
                    'canRetry' => true
                ]);
            }
            // THANH TOÁN THÀNH CÔNG
            else if ($resultCode == 0) {
                $paymentMethod = 'momo';
                if (isset($data['payType']) && $data['payType'] === 'napas') {
                    $paymentMethod = 'napas';
                }

                $invoice->update([
                    'Status' => 'Đã thanh toán',
                    'TransactionId' => $data['transId'] ?? '',
                    'Paidat' => now('Asia/Ho_Chi_Minh'),
                    'PaymentMethod' => $paymentMethod
                    // GIỮ OrderId để tránh bị reuse
                ]);

                Log::info("✅ [MOMO_RETURN] Payment success", [
                    'invoiceId' => $invoice->InvoiceId,
                    'paymentMethod' => $paymentMethod
                ]);
            }

            DB::commit();

            // Redirect với thông báo phù hợp
            if ($resultCode == 0) {
                return $this->redirectToFrontend('success', 'Thanh toán thành công', $invoice, $data);
            } else {
                return $this->redirectToFrontend('cancelled', 'Bạn đã hủy thanh toán. Có thể thanh toán lại ngay!', $invoice, $data);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [MOMO_RETURN] Exception: ' . $e->getMessage());
            return $this->redirectToFrontend('error', 'Lỗi hệ thống');
        }
    }

    // API RESET THANH TOÁN THỦ CÔNG
    public function resetPayment(Request $request)
    {
        $request->validate([
            'invoiceId' => 'required|integer'
        ]);

        try {
            DB::beginTransaction();

            $invoice = Invoice::find($request->invoiceId);

            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn không tồn tại'
                ], 404);
            }

            $this->resetInvoicePayment($invoice);

            DB::commit();

            Log::info("🔄 [RESET_PAYMENT] Success", ['invoiceId' => $invoice->InvoiceId]);

            return response()->json([
                'success' => true,
                'message' => 'Reset thanh toán thành công'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [RESET_PAYMENT] Exception: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống'
            ], 500);
        }
    }
    // Thêm vào PaymentController.php
    public function resetStuckInvoices()
    {
        try {
            DB::beginTransaction();

            Log::info('🔄 [RESET_STUCK_INVOICES] Starting reset process');

            // Tìm các hóa đơn bị kẹt (có OrderId nhưng status vẫn là PENDING và quá 30 phút)
            $stuckInvoices = Invoice::where('Status', 'Chờ thanh toán')
                ->whereNotNull('OrderId')
                ->where('OrderId', '!=', '')
                ->where('updated_at', '<', now()->subMinutes(30))
                ->get();

            Log::info("📋 [RESET_STUCK_INVOICES] Found {$stuckInvoices->count()} stuck invoices");

            $resetCount = 0;
            foreach ($stuckInvoices as $invoice) {
                $this->resetInvoicePayment($invoice);
                $resetCount++;
                Log::info("🔄 [RESET_STUCK_INVOICES] Reset invoice: {$invoice->InvoiceId}");
            }

            DB::commit();

            Log::info("✅ [RESET_STUCK_INVOICES] Successfully reset {$resetCount} invoices");

            return response()->json([
                'success' => true,
                'message' => "Đã reset {$resetCount} hóa đơn bị kẹt",
                'resetCount' => $resetCount
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [RESET_STUCK_INVOICES] Exception: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi reset hóa đơn bị kẹt'
            ], 500);
        }
    }

    // Thêm method resetSingleInvoice nếu chưa có
    public function resetSingleInvoice($invoiceId)
    {
        try {
            DB::beginTransaction();

            Log::info('🔄 [RESET_SINGLE_INVOICE] Resetting invoice:', ['invoiceId' => $invoiceId]);

            $invoice = Invoice::find($invoiceId);

            if (!$invoice) {
                Log::error('❌ [RESET_SINGLE_INVOICE] Invoice not found');
                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn không tồn tại'
                ], 404);
            }

            $this->resetInvoicePayment($invoice);

            DB::commit();

            Log::info("✅ [RESET_SINGLE_INVOICE] Successfully reset invoice: {$invoiceId}");

            return response()->json([
                'success' => true,
                'message' => 'Reset hóa đơn thành công'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [RESET_SINGLE_INVOICE] Exception: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi reset hóa đơn'
            ], 500);
        }
    }

    /**
     * HÀM HỖ TRỢ - RESET THÔNG TIN THANH TOÁN
     */
    private function resetInvoicePayment(Invoice $invoice)
    {
        $invoice->update([
            'Status' => 'Chờ thanh toán',
            'OrderId' => null,
            'PaymentMethod' => null,
            'TransactionId' => null,
            'Paidat' => null
        ]);
    }

    /**
     * HÀM HỖ TRỢ - REDIRECT VỀ FRONTEND
     */
    private function redirectToFrontend($status, $message, $invoice = null, $data = [])
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');

        $queryParams = [
            'status' => $status,
            'message' => $message,
            'redirectUrl' => '/payment',
            'countdown' => 5
        ];

        // THÊM THÔNG TIN NẾU CÓ
        if ($invoice) {
            $queryParams['invoiceId'] = $invoice->InvoiceId;
            $queryParams['orderId'] = $invoice->OrderId;
        }

        if (isset($data['orderId']))
            $queryParams['orderId'] = $data['orderId'];
        if (isset($data['transId']))
            $queryParams['transId'] = $data['transId'];
        if (isset($data['amount']))
            $queryParams['amount'] = $data['amount'];

        $redirectUrl = $frontendUrl . "/payment/result?" . http_build_query($queryParams);

        Log::info("🔄 [REDIRECT] To: " . $redirectUrl);
        return redirect()->away($redirectUrl);
    }
}