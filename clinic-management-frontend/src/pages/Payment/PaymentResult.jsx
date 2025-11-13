// PaymentResult.jsx - Thêm điều kiện để không dùng layout chung
import { useSearchParams, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentResult = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);

    const status = searchParams.get('status');
    const orderId = searchParams.get('orderId');
    const transId = searchParams.get('transId');
    const invoiceId = searchParams.get('invoiceId');
    const message = searchParams.get('message');
    const amount = searchParams.get('amount');
    const redirectUrlParam = searchParams.get('redirectUrl') || '/payment';
    const initialCountdown = parseInt(searchParams.get('countdown') || '5');

    // FIX: Decode URL
    const getDecodedRedirectUrl = () => {
        try {
            let decoded = redirectUrlParam;
            while (decoded.includes('%25')) {
                decoded = decodeURIComponent(decoded);
            }
            decoded = decodeURIComponent(decoded);
            return decoded;
        } catch (error) {
            return '/payment';
        }
    };

    const redirectUrl = getDecodedRedirectUrl();

    useEffect(() => {
        console.log('🔍 PaymentResult mounted with params:', {
            status, orderId, transId, redirectUrl
        });
    }, []);

    useEffect(() => {
        setCountdown(initialCountdown);
    }, [initialCountdown]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            console.log('🔄 Redirecting to:', redirectUrl);
            navigate(redirectUrl, { replace: true });
        }
    }, [countdown, redirectUrl, navigate]);

    const handleManualRedirect = () => {
        navigate(redirectUrl, { replace: true });
    };

    const getStatusConfig = () => {
        switch (status) {
            case 'success':
                return {
                    icon: '✅',
                    title: 'Thanh toán thành công!',
                    message: 'Cảm ơn bạn đã thanh toán.',
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    buttonColor: 'bg-green-600 hover:bg-green-700'
                };
            default:
                return {
                    icon: '❌',
                    title: 'Thanh toán thất bại',
                    message: message || 'Thanh toán không thành công.',
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    buttonColor: 'bg-blue-600 hover:bg-blue-700'
                };
        }
    };

    const config = getStatusConfig();

    if (!status) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
        // Sử dụng full screen layout độc lập
        <div className="fixed inset-0 bg-white z-50">
            <div className={`min-h-screen flex items-center justify-center ${config.bgColor} p-4`}>
                <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
                    <div className="text-6xl mb-6 animate-bounce">{config.icon}</div>
                    <h1 className={`text-3xl font-bold mb-4 ${config.color}`}>
                        {config.title}
                    </h1>
                    <p className="text-gray-600 mb-6 text-lg">
                        {config.message}
                    </p>

                    {/* Countdown */}
                    <div className="mb-8">
                        <p className="text-gray-500 mb-3">
                            Tự động chuyển hướng sau: 
                            <span className="font-bold text-blue-600 ml-2 text-xl">
                                {countdown} giây
                            </span>
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                                className="bg-blue-600 h-3 rounded-full transition-all duration-1000"
                                style={{ width: `${100 - (countdown / initialCountdown) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <button
                        onClick={handleManualRedirect}
                        className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg ${config.buttonColor} transition-transform hover:scale-105`}
                    >
                        {status === 'success' ? '🎉 Quay về trang thanh toán' : '🔄 Thử lại'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentResult;