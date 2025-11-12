// src/components/Payment/PaymentMethod.jsx
import React, { useState } from 'react';
import { Modal, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { paymentService } from '../../services/paymentService';

const PaymentMethod = ({ show, onHide, invoice, onPaymentSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('momo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paymentMethods = [
    {
      value: 'momo',
      label: 'Ví MoMo',
      description: 'Quét QR code qua ứng dụng MoMo',
      icon: '📱'
    },
    {
      value: 'napas',
      label: 'Thẻ ATM/Napas',
      description: 'Thanh toán qua thẻ ngân hàng nội địa',
      icon: '💳'
    }
  ];

  const handlePayment = async () => {
    if (!invoice) return;
    
    setLoading(true);
    setError('');
    
    try {
      const orderId = `CLINIC_${invoice.id}_${Date.now()}`;
      const orderInfo = `Thanh toán phiếu khám - ${invoice.patient_name || 'Bệnh nhân'}`;

      console.log('🔄 Starting payment process...', {
        invoiceId: invoice.id,
        orderId,
        amount: invoice.total,
        method: selectedMethod
      });

      const response = await paymentService.createPayment({
        invoiceId: invoice.id,
        orderId: orderId,
        amount: invoice.total,
        orderInfo: orderInfo,
        paymentMethod: selectedMethod
      });

      if (response.success) {
        console.log('✅ Payment created, redirecting to:', response.payUrl);
        window.location.href = response.payUrl;
      } else {
        setError(response.message || 'Có lỗi xảy ra khi tạo thanh toán');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Lỗi kết nối đến server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-success text-white">
        <Modal.Title>
          <i className="fas fa-credit-card me-2"></i>
          Thanh toán hóa đơn
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Thông tin hóa đơn */}
        <Card className="mb-4">
          <Card.Body>
            <div className="row">
              <div className="col-md-6">
                <strong>Mã hóa đơn:</strong> {invoice.code}
              </div>
              <div className="col-md-6">
                <strong>Bệnh nhân:</strong> {invoice.patient_name || 'N/A'}
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-md-6">
                <strong>Ngày tạo:</strong> {invoice.date}
              </div>
              <div className="col-md-6">
                <strong>Tổng tiền:</strong> 
                <span className="text-success fw-bold fs-5 ms-2">
                  {invoice.total.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Hiển thị lỗi */}
        {error && (
          <Alert variant="danger" className="mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {/* Chọn phương thức thanh toán */}
        <Form>
          <Form.Label className="fw-bold mb-3">
            <i className="fas fa-wallet me-2"></i>
            Chọn phương thức thanh toán:
          </Form.Label>
          
          <div className="payment-methods">
            {paymentMethods.map((method) => (
              <Card 
                key={method.value}
                className={`mb-2 cursor-pointer ${
                  selectedMethod === method.value ? 'border-primary border-2' : ''
                }`}
                onClick={() => setSelectedMethod(method.value)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Body className="py-3">
                  <div className="d-flex align-items-center">
                    <Form.Check
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={selectedMethod === method.value}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="me-3"
                    />
                    <div>
                      <div className="d-flex align-items-center">
                        <span className="fs-5 me-2">{method.icon}</span>
                        <strong>{method.label}</strong>
                      </div>
                      <small className="text-muted">{method.description}</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </Form>

        {/* Thông báo phương thức đã chọn */}
        <div className="mt-3 p-3 bg-light rounded">
          <small className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            {selectedMethod === 'momo' 
              ? 'Bạn sẽ được chuyển đến trang quét QR code qua ứng dụng MoMo' 
              : 'Bạn sẽ được chuyển đến trang nhập thông tin thẻ ATM/Napas'
            }
          </small>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          <i className="fas fa-times me-2"></i>
          Hủy
        </Button>
        <Button 
          variant="success" 
          onClick={handlePayment}
          disabled={loading}
          className="d-flex align-items-center"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Đang xử lý...
            </>
          ) : (
            <>
              <i className="fas fa-credit-card me-2"></i>
              Tiến hành thanh toán
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PaymentMethod;