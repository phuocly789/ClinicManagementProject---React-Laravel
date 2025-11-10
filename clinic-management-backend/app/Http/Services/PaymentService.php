<?php

namespace App\Http\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    protected $partnerCode;
    protected $accessKey;
    protected $secretKey;
    protected $endpoint;

    public function __construct()
    {
        $this->partnerCode = env('MOMO_PARTNER_CODE');
        $this->accessKey = env('MOMO_ACCESS_KEY');
        $this->secretKey = env('MOMO_SECRET_KEY');
        $this->endpoint = env('MOMO_ENDPOINT');
    }

    public function createPayment($orderId, $amount, $orderInfo, $paymentMethod = 'momo', $returnUrl = null, $notifyUrl = null)
    {
        $requestId = time() . '';
        $extraData = '';
        
        // LINH HOẠT REQUEST TYPE THEO PHƯƠNG THỨC
        if ($paymentMethod === 'napas') {
            $requestType = "payWithATM";
            $extraData = base64_encode(json_encode(['bankCode' => 'NB']));
        } else {
            $requestType = "captureWallet"; // Mặc định Momo QR
            $extraData = base64_encode(json_encode([]));
        }

        // Set default URLs if not provided
        $returnUrl = $returnUrl ?? route('payment.return');
        $notifyUrl = $notifyUrl ?? route('payment.callback');

        // Tạo raw signature
        $rawHash = "accessKey=" . $this->accessKey .
                   "&amount=" . $amount .
                   "&extraData=" . $extraData .
                   "&ipnUrl=" . $notifyUrl .
                   "&orderId=" . $orderId .
                   "&orderInfo=" . $orderInfo .
                   "&partnerCode=" . $this->partnerCode .
                   "&redirectUrl=" . $returnUrl .
                   "&requestId=" . $requestId .
                   "&requestType=" . $requestType;
        
        $signature = hash_hmac('sha256', $rawHash, $this->secretKey);

        $data = [
            'partnerCode' => $this->partnerCode,
            'partnerName' => "Clinic System",
            'storeId' => $this->partnerCode,
            'requestId' => $requestId,
            'amount' => $amount,
            'orderId' => $orderId,
            'orderInfo' => $orderInfo,
            'redirectUrl' => $returnUrl,
            'ipnUrl' => $notifyUrl,
            'lang' => 'vi',
            'extraData' => $extraData,
            'requestType' => $requestType,
            'signature' => $signature
        ];

        try {
            Log::info('MoMo Request Data:', $data);
            $response = Http::timeout(30)->post($this->endpoint, $data);
            $result = $response->json();
            Log::info('MoMo Response:', $result);
            
            return $result;
        } catch (\Exception $e) {
            Log::error('MoMo API Error: ' . $e->getMessage());
            return [
                'resultCode' => -1,
                'message' => 'Lỗi kết nối MoMo: ' . $e->getMessage()
            ];
        }
    }

    public function verifySignature($data, $signature)
    {
        $rawHash = "accessKey=" . $this->accessKey .
                   "&amount=" . $data['amount'] .
                   "&extraData=" . $data['extraData'] .
                   "&message=" . $data['message'] .
                   "&orderId=" . $data['orderId'] .
                   "&orderInfo=" . $data['orderInfo'] .
                   "&orderType=" . $data['orderType'] .
                   "&partnerCode=" . $data['partnerCode'] .
                   "&payType=" . $data['payType'] .
                   "&requestId=" . $data['requestId'] .
                   "&responseTime=" . $data['responseTime'] .
                   "&resultCode=" . $data['resultCode'] .
                   "&transId=" . $data['transId'];
        
        $computedSignature = hash_hmac('sha256', $rawHash, $this->secretKey);
        return hash_equals($signature, $computedSignature);
    }
}