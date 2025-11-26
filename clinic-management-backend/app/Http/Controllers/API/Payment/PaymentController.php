<?php

namespace App\Http\Controllers\API\Payment;

use App\Http\Controllers\Controller;
use App\Http\Services\PaymentService;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    protected $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * Kiểm tra kết nối database
     */
    private function checkDatabaseConnection()
    {
        try {
            DB::connection()->getPdo();
            return true;
        } catch (\Exception $e) {
            Log::error('❌ [DATABASE_CONNECTION] Lỗi kết nối database: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Xử lý response lỗi
     */
    private function handleError($message, $errorCode = 'SYSTEM_ERROR', $statusCode = 500, $context = '')
    {
        if (!empty($context)) {
            $message .= ' (' . $context . ')';
        }

        Log::error("❌ [{$errorCode}] {$message}");

        return response()->json([
            'success' => false,
            'message' => $message,
            'error_code' => $errorCode,
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], $statusCode);
    }

    /**
     * Validate invoice có thể thanh toán
     */
    private function validateInvoiceForPayment(Invoice $invoice, $orderId = null)
    {
        // Kiểm tra invoice tồn tại
        if (!$invoice) {
            return ['success' => false, 'message' => 'Hóa đơn không tồn tại', 'code' => 'INVOICE_NOT_FOUND'];
        }

        // Kiểm tra trạng thái
        if ($invoice->Status !== 'Chờ thanh toán') {
            $currentStatus = $invoice->Status;
            $statusMessages = [
                'Đã thanh toán' => 'Hóa đơn đã được thanh toán trước đó',
                'Đã hủy' => 'Hóa đơn đã bị hủy',
            ];

            return [
                'success' => false,
                'message' => $statusMessages[$currentStatus] ?? "Hóa đơn không thể thanh toán (trạng thái: {$currentStatus})",
                'code' => 'INVALID_INVOICE_STATUS'
            ];
        }

        // Kiểm tra OrderId trùng (tránh thanh toán trùng)
        if ($invoice->OrderId && $invoice->OrderId !== $orderId) {
            return [
                'success' => false,
                'message' => 'Hóa đơn đang trong quá trình thanh toán khác. Vui lòng tải lại trang',
                'code' => 'DUPLICATE_PAYMENT_ATTEMPT'
            ];
        }

        // Kiểm tra số tiền
        if ($invoice->TotalAmount <= 0) {
            return [
                'success' => false,
                'message' => 'Số tiền thanh toán không hợp lệ',
                'code' => 'INVALID_AMOUNT'
            ];
        }

        return ['success' => true];
    }

    // API TẠO THANH TOÁN
    public function createPayment(Request $request)
    {
        Log::info('📱 [CREATE_PAYMENT] Request received:', $request->all());

        // Kiểm tra kết nối database
        if (!$this->checkDatabaseConnection()) {
            return $this->handleError('Lỗi mất kết nối database', 'DATABASE_CONNECTION_ERROR', 503, 'Tạo thanh toán');
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'invoiceId' => 'required|integer|min:1',
            'orderId' => 'required|string|max:50',
            'amount' => 'required|numeric|min:1000|max:1000000000',
            'orderInfo' => 'required|string|max:255',
            'paymentMethod' => 'required|in:momo,napas'
        ], [
            'invoiceId.required' => 'Thiếu ID hóa đơn',
            'invoiceId.integer' => 'ID hóa đơn không hợp lệ',
            'invoiceId.min' => 'ID hóa đơn phải lớn hơn 0',
            'orderId.required' => 'Thiếu mã đơn hàng',
            'orderId.string' => 'Mã đơn hàng không hợp lệ',
            'orderId.max' => 'Mã đơn hàng quá dài',
            'amount.required' => 'Thiếu số tiền thanh toán',
            'amount.numeric' => 'Số tiền phải là số',
            'amount.min' => 'Số tiền tối thiểu là 1,000 VND',
            'amount.max' => 'Số tiền tối đa là 1,000,000,000 VND',
            'orderInfo.required' => 'Thiếu thông tin đơn hàng',
            'orderInfo.string' => 'Thông tin đơn hàng không hợp lệ',
            'orderInfo.max' => 'Thông tin đơn hàng quá dài',
            'paymentMethod.required' => 'Thiếu phương thức thanh toán',
            'paymentMethod.in' => 'Phương thức thanh toán không hợp lệ'
        ]);

        if ($validator->fails()) {
            Log::warning('⚠️ [CREATE_PAYMENT] Validation failed', ['errors' => $validator->errors()->toArray()]);

            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
                'error_code' => 'VALIDATION_ERROR',
                'timestamp' => now()->format('Y-m-d H:i:s')
            ], 422);
        }

        DB::beginTransaction();

        try {
            // TÌM INVOICE
            $invoice = Invoice::find($request->invoiceId);

            // Validate invoice
            $validationResult = $this->validateInvoiceForPayment($invoice, $request->orderId);
            if (!$validationResult['success']) {
                DB::rollBack();
                return $this->handleError(
                    $validationResult['message'],
                    $validationResult['code'],
                    400,
                    'Tạo thanh toán'
                );
            }

            // Kiểm tra số tiền khớp với hóa đơn
            $invoiceAmount = (float) $invoice->TotalAmount;
            $requestAmount = (float) $request->amount;

            if (abs($invoiceAmount - $requestAmount) > 1000) { // Cho phép sai số 1000 VND
                DB::rollBack();
                return $this->handleError(
                    "Số tiền thanh toán không khớp với hóa đơn. Hóa đơn: {$invoiceAmount}, Thanh toán: {$requestAmount}",
                    'AMOUNT_MISMATCH',
                    400,
                    'Tạo thanh toán'
                );
            }

            // LƯU THÔNG TIN PAYMENT
            $invoice->update([
                'OrderId' => $request->orderId,
                'PaymentMethod' => $request->paymentMethod,
                'updated_at' => now()
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

            if (!$result || !isset($result['resultCode'])) {
                DB::rollBack();
                $this->resetInvoicePayment($invoice);

                return $this->handleError(
                    'Lỗi kết nối đến cổng thanh toán',
                    'PAYMENT_GATEWAY_ERROR',
                    502,
                    'Tạo thanh toán'
                );
            }

            if ($result['resultCode'] == 0) {
                DB::commit();
                Log::info('✅ [CREATE_PAYMENT] Payment created successfully', [
                    'invoiceId' => $invoice->InvoiceId,
                    'orderId' => $request->orderId
                ]);

                return response()->json([
                    'success' => true,
                    'payUrl' => $result['payUrl'],
                    'deeplink' => $result['deeplink'] ?? '',
                    'qrCodeUrl' => $result['qrCodeUrl'] ?? '',
                    'paymentMethod' => $request->paymentMethod,
                    'message' => 'Tạo thanh toán thành công',
                    'invoice_id' => $invoice->InvoiceId,
                    'order_id' => $request->orderId,
                    'timestamp' => now()->format('Y-m-d H:i:s')
                ], 200);
            } else {
                DB::rollBack();
                $this->resetInvoicePayment($invoice);

                $errorMessage = $result['message'] ?? 'Lỗi từ cổng thanh toán';
                $errorCode = 'PAYMENT_GATEWAY_ERROR';

                // Phân loại lỗi từ MoMo
                if (isset($result['resultCode'])) {
                    switch ($result['resultCode']) {
                        case 1001:
                            $errorMessage = 'Số tiền không hợp lệ';
                            $errorCode = 'INVALID_AMOUNT';
                            break;
                        case 1002:
                            $errorMessage = 'Đơn hàng đã tồn tại';
                            $errorCode = 'DUPLICATE_ORDER';
                            break;
                        case 1003:
                            $errorMessage = 'Thông tin đơn hàng không hợp lệ';
                            $errorCode = 'INVALID_ORDER_INFO';
                            break;
                        case 1006:
                            $errorMessage = 'Hệ thống cổng thanh toán đang bận';
                            $errorCode = 'PAYMENT_GATEWAY_BUSY';
                            break;
                    }
                }

                Log::error('❌ [CREATE_PAYMENT] Payment gateway error', [
                    'result' => $result,
                    'invoiceId' => $invoice->InvoiceId
                ]);

                return $this->handleError($errorMessage, $errorCode, 400, 'Tạo thanh toán');
            }
        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            Log::error('💥 [CREATE_PAYMENT] Database exception: ' . $e->getMessage());
            return $this->handleError('Lỗi cơ sở dữ liệu', 'DATABASE_ERROR', 500, 'Tạo thanh toán');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [CREATE_PAYMENT] System exception: ' . $e->getMessage());
            return $this->handleError('Lỗi hệ thống', 'SYSTEM_ERROR', 500, 'Tạo thanh toán');
        }
    }

    // CALLBACK TỪ MOMO - IPN URL
    public function handleCallback(Request $request)
    {
        Log::info('🔔 [MOMO_CALLBACK] Received', $request->all());

        // Kiểm tra kết nối database
        if (!$this->checkDatabaseConnection()) {
            Log::error('❌ [MOMO_CALLBACK] Database connection failed');
            return response()->json(['resultCode' => -1], 503);
        }

        $data = $request->all();
        $signature = $request->signature ?? '';

        if (!isset($data['orderId'])) {
            Log::error('❌ [MOMO_CALLBACK] Missing orderId');
            return response()->json(['resultCode' => -1], 400);
        }

        DB::beginTransaction();

        try {
            // VERIFY SIGNATURE (bỏ qua trong môi trường test)
            if (!isset($data['test'])) {
                $isValid = $this->paymentService->verifySignature($data, $signature);
                if (!$isValid) {
                    Log::error('❌ [MOMO_CALLBACK] Invalid signature', ['data' => $data]);
                    DB::rollBack();
                    return response()->json(['resultCode' => -1], 400);
                }
            }

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

            // Xử lý kết quả thanh toán
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
                    'PaymentMethod' => $paymentMethod,
                    'updated_at' => now()
                ]);

                Log::info("✅ [MOMO_CALLBACK] Payment success", [
                    'invoiceId' => $invoice->InvoiceId,
                    'paymentMethod' => $paymentMethod,
                    'transactionId' => $data['transId'] ?? ''
                ]);
            } else {
                // THANH TOÁN THẤT BẠI - RESET để cho phép thanh toán lại
                $this->resetInvoicePayment($invoice);

                Log::info("🔄 [MOMO_CALLBACK] Payment failed - Reset for retry", [
                    'invoiceId' => $invoice->InvoiceId,
                    'error' => $data['message'] ?? 'Unknown error',
                    'resultCode' => $data['resultCode']
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
        $orderId = $data['orderId'] ?? null;

        if (!$orderId) {
            Log::error('❌ [MOMO_RETURN] Missing orderId');
            return $this->redirectToFrontend('error', 'Thiếu thông tin đơn hàng');
        }

        DB::beginTransaction();

        try {
            $invoice = Invoice::where('OrderId', $orderId)->first();

            if (!$invoice) {
                Log::error('❌ [MOMO_RETURN] Invoice not found', ['orderId' => $orderId]);
                DB::rollBack();
                return $this->redirectToFrontend('error', 'Không tìm thấy hóa đơn');
            }

            Log::info("📋 [MOMO_RETURN] Processing invoice", [
                'invoiceId' => $invoice->InvoiceId,
                'currentStatus' => $invoice->Status,
                'resultCode' => $resultCode
            ]);

            if ($resultCode == 0) {
                // THANH TOÁN THÀNH CÔNG
                $paymentMethod = 'momo';
                if (isset($data['payType']) && $data['payType'] === 'napas') {
                    $paymentMethod = 'napas';
                }

                $invoice->update([
                    'Status' => 'Đã thanh toán',
                    'TransactionId' => $data['transId'] ?? '',
                    'Paidat' => now('Asia/Ho_Chi_Minh'),
                    'PaymentMethod' => $paymentMethod,
                    'updated_at' => now()
                ]);

                Log::info("✅ [MOMO_RETURN] Payment success", [
                    'invoiceId' => $invoice->InvoiceId,
                    'paymentMethod' => $paymentMethod
                ]);

                DB::commit();
                return $this->redirectToFrontend('success', 'Thanh toán thành công', $invoice, $data);
            } else {
                // THANH TOÁN THẤT BẠI/HỦY - RESET
                $this->resetInvoicePayment($invoice);

                $errorMessage = $this->getPaymentErrorMessage($resultCode, $data['message'] ?? '');

                Log::info("🔄 [MOMO_RETURN] Payment failed - Reset completed", [
                    'invoiceId' => $invoice->InvoiceId,
                    'reason' => $errorMessage
                ]);

                DB::commit();
                return $this->redirectToFrontend('cancelled', $errorMessage, $invoice, $data);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [MOMO_RETURN] Exception: ' . $e->getMessage());
            return $this->redirectToFrontend('error', 'Lỗi hệ thống xử lý thanh toán');
        }
    }

    /**
     * Lấy thông báo lỗi thanh toán
     */
    private function getPaymentErrorMessage($resultCode, $defaultMessage = '')
    {
        $errorMessages = [
            -1 => 'Giao dịch bị lỗi',
            1001 => 'Bạn đã hủy thanh toán',
            1002 => 'Giao dịch hết thời gian chờ',
            1003 => 'Số tiền không hợp lệ',
            1004 => 'Thông tin thẻ không hợp lệ',
            1005 => 'Số dư không đủ',
            1006 => 'Lỗi hệ thống ngân hàng',
        ];

        return $errorMessages[$resultCode] ?? ($defaultMessage ?: 'Thanh toán không thành công');
    }

    // API RESET THANH TOÁN THỦ CÔNG
    public function resetPayment(Request $request)
    {
        Log::info('🔄 [RESET_PAYMENT] Manual reset requested', $request->all());

        // Kiểm tra kết nối database
        if (!$this->checkDatabaseConnection()) {
            return $this->handleError('Lỗi kết nối database', 'DATABASE_CONNECTION_ERROR', 503, 'Reset thanh toán');
        }

        $validator = Validator::make($request->all(), [
            'invoiceId' => 'required|integer|min:1'
        ], [
            'invoiceId.required' => 'Thiếu ID hóa đơn',
            'invoiceId.integer' => 'ID hóa đơn không hợp lệ',
            'invoiceId.min' => 'ID hóa đơn phải lớn hơn 0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors(),
                'error_code' => 'VALIDATION_ERROR'
            ], 422);
        }

        DB::beginTransaction();

        try {
            $invoice = Invoice::find($request->invoiceId);

            if (!$invoice) {
                DB::rollBack();
                return $this->handleError('Hóa đơn không tồn tại', 'INVOICE_NOT_FOUND', 404, 'Reset thanh toán');
            }

            // Chỉ cho reset nếu đang ở trạng thái chờ thanh toán
            if ($invoice->Status !== 'Chờ thanh toán') {
                DB::rollBack();
                return $this->handleError(
                    'Không thể reset hóa đơn đã được xử lý',
                    'INVALID_RESET_ATTEMPT',
                    400,
                    'Reset thanh toán'
                );
            }

            $this->resetInvoicePayment($invoice);

            DB::commit();

            Log::info("✅ [RESET_PAYMENT] Manual reset successful", ['invoiceId' => $invoice->InvoiceId]);

            return response()->json([
                'success' => true,
                'message' => 'Reset thanh toán thành công',
                'invoice_id' => $invoice->InvoiceId,
                'timestamp' => now()->format('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('💥 [RESET_PAYMENT] Exception: ' . $e->getMessage());
            return $this->handleError('Lỗi hệ thống', 'SYSTEM_ERROR', 500, 'Reset thanh toán');
        }
    }

    // Reset các invoice bị kẹt
    public function resetStuckInvoices()
    {
        Log::info('🔄 [RESET_STUCK_INVOICES] Starting automated reset');

        if (!$this->checkDatabaseConnection()) {
            Log::error('❌ [RESET_STUCK_INVOICES] Database connection failed');
            return response()->json([
                'success' => false,
                'message' => 'Lỗi kết nối database'
            ], 503);
        }

        DB::beginTransaction();

        try {
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
                'reset_count' => $resetCount,
                'timestamp' => now()->format('Y-m-d H:i:s')
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
            'Paidat' => null,
            'updated_at' => now()
        ]);

        Log::info("🔄 [RESET_INVOICE] Reset payment info", ['invoiceId' => $invoice->InvoiceId]);
    }

    /**
     * HÀM HỖ TRỢ - REDIRECT VỀ FRONTEND
     */
    private function redirectToFrontend($status, $message, $invoice = null, $data = [])
    {
        $frontendUrl = config('app.frontend_url', 'http://125.212.218.44:3000');

        $queryParams = [
            'status' => $status,
            'message' => $message,
            'redirectUrl' => '/payment',
            'countdown' => 5
        ];

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
        if (isset($data['resultCode']))
            $queryParams['resultCode'] = $data['resultCode'];

        $redirectUrl = $frontendUrl . "/payment/result?" . http_build_query($queryParams);

        Log::info("🔀 [REDIRECT] Redirecting to frontend: " . $redirectUrl);
        return redirect()->away($redirectUrl);
    }
}
