// src/pages/Payment/PaymentResult.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Card, Alert, Button } from 'react-bootstrap';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

const PaymentResult = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);

    // Parse query parameters từ URL
    const getQueryParams = () => {
        const searchParams = new URLSearchParams(location.search);
        return {
            status: searchParams.get('status') || 'unknown',
            message: decodeURIComponent(searchParams.get('message') || ''),
            invoiceId: searchParams.get('invoiceId'),
            orderId: searchParams.get('orderId'),
            transId: searchParams.get('transId'),
            amount: searchParams.get('amount'),
            redirectUrl: searchParams.get('redirectUrl') || '/payment'
        };
    };

    const { status, message, invoiceId, orderId, transId, amount, redirectUrl } = getQueryParams();

    useEffect(() => {
        console.log(' Payment Result Params:', {
            status,
            message,
            invoiceId,
            orderId,
            transId,
            amount,
            redirectUrl
        });
    }, [location]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            navigate(redirectUrl);
        }
    }, [countdown, navigate, redirectUrl]);

    const handleManualRedirect = () => {
        navigate(redirectUrl);
    };

    const getStatusConfig = () => {
        switch (status) {
            case 'success':
                return {
                    icon: <CheckCircle size={80} className="text-success" />,
                    title: 'Thanh Toán Thành Công! 🎉',
                    variant: 'success',
                    bgClass: 'bg-success text-white',
                    description: 'Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.'
                };
            case 'cancelled':
                return {
                    icon: <AlertTriangle size={80} className="text-warning" />,
                    title: 'Đã Hủy Thanh Toán',
                    variant: 'warning',
                    bgClass: 'bg-warning text-dark',
                    description: 'Bạn có thể thực hiện thanh toán lại bất cứ lúc nào.'
                };
            case 'error':
                return {
                    icon: <XCircle size={80} className="text-danger" />,
                    title: 'Thanh Toán Thất Bại',
                    variant: 'danger',
                    bgClass: 'bg-danger text-white',
                    description: 'Đã có lỗi xảy ra trong quá trình thanh toán.'
                };
            default:
                return {
                    icon: <AlertTriangle size={80} className="text-secondary" />,
                    title: 'Kết Quả Không Xác Định',
                    variant: 'secondary',
                    bgClass: 'bg-secondary text-white',
                    description: 'Không thể xác định trạng thái thanh toán.'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
            <Container className="d-flex align-items-center justify-content-center min-vh-100">
                <Card className="shadow-lg border-0" style={{ maxWidth: '600px', width: '100%' }}>
                    {/* Header */}
                    <Card.Header className={`${config.bgClass} border-0 text-center py-4`}>
                        <div className="mb-3">
                            {config.icon}
                        </div>
                        <h2 className="fw-bold mb-0">{config.title}</h2>
                    </Card.Header>

                    <Card.Body className="text-center p-5">
                        {/* Message */}
                        {message && (
                            <Alert variant={config.variant} className="mb-4">
                                <strong>{message}</strong>
                            </Alert>
                        )}

                        {/* Description */}
                        <p className="text-muted mb-4 fs-5">
                            {config.description}
                        </p>

                        {/* Thông tin chi tiết */}
                        {(invoiceId || orderId || transId || amount) && (
                            <Card className="bg-light border-0 mb-4">
                                <Card.Body className="text-start">
                                    <h6 className="fw-bold mb-3"> Thông tin giao dịch:</h6>
                                    <div className="row">
                                        {invoiceId && (
                                            <div className="col-6 mb-3">
                                                <strong>Mã hóa đơn:</strong>
                                                <div className="text-primary fw-bold">{invoiceId}</div>
                                            </div>
                                        )}
                                        {orderId && (
                                            <div className="col-6 mb-3">
                                                <strong>Mã đơn hàng:</strong>
                                                <div className="text-muted">{orderId}</div>
                                            </div>
                                        )}
                                        {transId && (
                                            <div className="col-6 mb-3">
                                                <strong>Mã giao dịch:</strong>
                                                <div className="text-success fw-bold">{transId}</div>
                                            </div>
                                        )}
                                        {amount && (
                                            <div className="col-6 mb-3">
                                                <strong>Số tiền:</strong>
                                                <div className="text-success fw-bold fs-5">
                                                    {parseInt(amount).toLocaleString('vi-VN')} VNĐ
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        )}

                        {/* Countdown */}
                        <div className="mb-4">
                            <p className="text-muted mb-2">
                                Tự động chuyển hướng sau: <strong className="fs-4">{countdown}</strong> giây
                            </p>
                            <div className="progress" style={{ height: '8px', borderRadius: '10px' }}>
                                <div 
                                    className={`progress-bar bg-${config.variant}`}
                                    style={{ 
                                        width: `${((5 - countdown) / 5) * 100}%`,
                                        transition: 'width 1s ease-in-out',
                                        borderRadius: '10px'
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-grid gap-3">
                            <Button 
                                variant={config.variant}
                                onClick={handleManualRedirect}
                                size="lg"
                                className="fw-bold py-3"
                            >
                                <ArrowLeft size={24} className="me-2" />
                                Quay lại trang thanh toán
                            </Button>
                            
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default PaymentResult;