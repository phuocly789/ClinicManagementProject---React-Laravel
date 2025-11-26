// src/components/Payment/PaymentMethod.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { paymentService } from '../../services/paymentService';
import { CreditCard, XCircle, CheckCircle, AlertTriangle } from "lucide-react";

const PaymentMethod = ({ show, onHide, invoice, onPaymentSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('momo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Reset state khi mở modal mới
  useEffect(() => {
    if (show) {
      setLoading(false);
      setError('');
      setSelectedMethod('momo');
      setShowConfirm(false);
      setShowCancelConfirm(false);
    }
  }, [show]);

  const paymentMethods = [
    {
      value: 'momo',
      label: 'Ví MoMo',
      description: 'Quét QR code qua ứng dụng MoMo',
      icon: <i class="fas fa-mobile-alt text-danger"></i>
    },
    {
      value: 'napas',
      label: 'Thẻ ATM/Napas',
      description: 'Thanh toán qua thẻ ngân hàng nội địa',
      icon: <i class="fas fa-credit-card text-primary"></i>
    }
  ];

  const handlePaymentConfirm = () => {
    setShowConfirm(true);
  };

  const handlePayment = async () => {
    if (!invoice) return;
    
    setLoading(true);
    setError('');
    setShowConfirm(false);
    
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
        
        // QUAN TRỌNG: Đóng modal trước khi chuyển hướng
        onHide();
        
        // Chuyển hướng đến trang thanh toán MoMo/Napas
        // MoMo sẽ tự động redirect về /payment/result sau khi hoàn tất
        window.location.href = response.payUrl;
        
      } else {
        setError(response.message || 'Có lỗi xảy ra khi tạo thanh toán');
        setLoading(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Lỗi kết nối đến server. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (loading) {
      // Đang loading thì không cho hủy
      return;
    }
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    setShowConfirm(false);
    onHide();
  };

  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
  };

  // Đóng modal khi click ra ngoài (chỉ khi không loading)
  const handleModalHide = () => {
    if (!loading) {
      handleCancelClick();
    }
  };

  if (!invoice) return null;

  return (
    <>
      <Modal 
        show={show} 
        onHide={handleModalHide} 
        size="lg" 
        centered
        backdrop={loading ? 'static' : true}
        keyboard={!loading}
      >
        <Modal.Header closeButton={!loading} className="bg-success text-white">
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
                    {invoice.total?.toLocaleString('vi-VN')} VNĐ
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

          {/* Loading overlay */}
          {loading && (
            <div className="position-absolute top-0 left-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light bg-opacity-75">
              <div className="text-center">
                <Spinner animation="border" variant="primary" className="mb-3" />
                <p className="text-primary fw-bold">Đang kết nối đến cổng thanh toán...</p>
              </div>
            </div>
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
                  } ${loading ? 'opacity-50' : ''}`}
                  onClick={() => !loading && setSelectedMethod(method.value)}
                  style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  <Card.Body className="py-3">
                    <div className="d-flex align-items-center">
                      <Form.Check
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={selectedMethod === method.value}
                        onChange={(e) => !loading && setSelectedMethod(e.target.value)}
                        className="me-3"
                        disabled={loading}
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
                ? 'Bạn sẽ được chuyển đến trang quét QR code qua ứng dụng MoMo. Sau khi thanh toán, hệ thống sẽ tự động chuyển hướng về trang kết quả.' 
                : 'Bạn sẽ được chuyển đến trang nhập thông tin thẻ ATM/Napas. Sau khi thanh toán, hệ thống sẽ tự động chuyển hướng về trang kết quả.'
              }
            </small>
          </div>
        </Modal.Body>
        
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleCancelClick} 
            disabled={loading}
          >
            <i className="fas fa-times me-2"></i>
            Hủy
          </Button>
          <Button 
            variant="success" 
            onClick={handlePaymentConfirm}
            disabled={loading || !selectedMethod}
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

      {/* Custom Confirm Dialog - Thanh toán */}
      {showConfirm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={handleCancelCancel}
        >
          <div
            className="mx-auto px-4 py-4 rounded-3 shadow-lg bg-primary-subtle text-primary-emphasis border border-primary"
            style={{ maxWidth: "32rem", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCancelCancel}
              className="position-absolute top-0 end-0 btn btn-link text-secondary p-2"
              style={{ textDecoration: "none" }}
              disabled={loading}
            >
              <XCircle size={20} />
            </button>

            {/* Icon & Title */}
            <div className="text-center mb-3">
              <div className="text-primary mb-3">
                <CreditCard size={40} />
              </div>
              <h4 className="fw-bold mb-2">Xác Nhận Thanh Toán</h4>
            </div>

            {/* Message */}
            <div className="text-center mb-3">
              <p className="fw-medium mb-2">
                Bạn có chắc muốn thanh toán hóa đơn <strong>{invoice.code}</strong>?
              </p>
              <div className="text-muted small">
                <p className="mb-1">Bệnh nhân: <strong>{invoice.patient_name}</strong></p>
                <p className="mb-1">Số tiền: <strong>{invoice.total?.toLocaleString('vi-VN')} VNĐ</strong></p>
                <p className="mb-1">Phương thức: <strong>
                  {selectedMethod === 'momo' ? 'Ví MoMo' : 'Thẻ ATM/Napas'}
                </strong></p>
                <p className="mb-0">Ngày tạo: <strong>{invoice.date}</strong></p>
              </div>
            </div>

            {/* Thông báo quan trọng */}
            <Alert variant="info" className="mt-3 small">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Lưu ý quan trọng:</strong> Bạn sẽ được chuyển đến trang thanh toán {selectedMethod === 'momo' ? 'MoMo' : 'Napas'}. 
              Không đóng trang cho đến khi hoàn tất giao dịch.
            </Alert>

            {/* Action Buttons */}
            <div className="d-flex gap-2 justify-content-center mt-4">
              <Button 
                variant="secondary" 
                onClick={handleCancelCancel}
                disabled={loading}
              >
                <i className="fas fa-times me-1"></i>
                Hủy
              </Button>
              <Button 
                variant="primary" 
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
                    <i className="fas fa-check me-1"></i>
                    Xác Nhận Thanh Toán
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog - Hủy */}
      {showCancelConfirm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={handleCancelCancel}
        >
          <div
            className="mx-auto px-4 py-4 rounded-3 shadow-lg bg-warning-subtle text-warning-emphasis border border-warning"
            style={{ maxWidth: "28rem", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCancelCancel}
              className="position-absolute top-0 end-0 btn btn-link text-secondary p-2"
              style={{ textDecoration: "none" }}
            >
              <XCircle size={20} />
            </button>

            {/* Icon & Title */}
            <div className="text-center mb-3">
              <div className="text-warning mb-3">
                <AlertTriangle size={40} />
              </div>
              <h4 className="fw-bold mb-2">Hủy Thanh Toán</h4>
            </div>

            {/* Message */}
            <div className="text-center mb-3">
              <p className="fw-medium mb-2">
                Bạn có chắc muốn hủy thanh toán hóa đơn <strong>{invoice.code}</strong>?
              </p>
              <div className="text-muted small">
                <p className="mb-1">Bệnh nhân: <strong>{invoice.patient_name}</strong></p>
                <p className="mb-1">Số tiền: <strong>{invoice.total?.toLocaleString('vi-VN')} VNĐ</strong></p>
                <p className="mb-0">Quá trình thanh toán sẽ bị hủy bỏ.</p>
              </div>
            </div>

            {/* Warning Message */}
            <Alert variant="warning" className="mt-3 small">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Hành động này không thể hoàn tác. Bạn sẽ cần bắt đầu lại từ đầu nếu muốn thanh toán.
            </Alert>

            {/* Action Buttons */}
            <div className="d-flex gap-2 justify-content-center mt-4">
              <Button 
                variant="secondary" 
                onClick={handleCancelCancel}
              >
                <i className="fas fa-arrow-left me-1"></i>
                Tiếp Tục Thanh Toán
              </Button>
              <Button 
                variant="warning" 
                onClick={handleCancelConfirm}
              >
                <i className="fas fa-times me-1"></i>
                Xác Nhận Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentMethod;