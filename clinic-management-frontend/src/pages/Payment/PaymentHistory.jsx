// src/components/PaymentSection/PaymentHistory.jsx
import React, { useState } from 'react';
import { Badge, Button } from 'react-bootstrap';
import { Eye, XCircle, FileText } from "lucide-react";

const PaymentHistory = ({ invoice, onViewDetail }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const getPaymentMethodDetails = (method) => {
    const methods = {
      'momo': { name: 'Ví MoMo', icon: 'fas fa-mobile-alt text-primary', color: 'primary' },
      'cash': { name: 'Tiền mặt', icon: 'fas fa-money-bill-wave text-success', color: 'success' },
      'napas': { name: 'Thẻ Napas', icon: 'fas fa-university text-info', color: 'danger' },
      'insurance': { name: 'Bảo hiểm', icon: 'fas fa-heartbeat text-warning', color: 'warning' }
    };
    return methods[method] || { name: 'Khác', icon: 'fas fa-question-circle', color: 'secondary' };
  };

  const handleViewDetailClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onViewDetail(invoice);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const paymentInfo = getPaymentMethodDetails(invoice.payment_method);

  return (
    <>
      <tr>
        <td className="border-end">
          <div className="d-flex align-items-center">
            <i className={`${paymentInfo.icon} me-2`}></i>
            <div>
              <strong className="text-dark">{invoice.transaction_id || 'N/A'}</strong>
              {!invoice.transaction_id && (
                <small className="text-muted d-block">Chưa có mã GD</small>
              )}
            </div>
          </div>
        </td>
        <td className="border-end">
          <div className="fw-semibold">{invoice.patient_name || 'N/A'}</div>
          <small className="text-muted">{invoice.patient_phone || 'N/A'}</small>
        </td>
        <td className="border-end">
          <Badge bg="outline-primary" className="border text-primary">
            {invoice.code}
          </Badge>
        </td>
        <td className="border-end">
          <Badge bg={paymentInfo.color}>
            <i className={`${paymentInfo.icon} me-1`}></i>
            {paymentInfo.name}
          </Badge>
        </td>
        <td className="border-end fw-bold text-success">
          {invoice.total?.toLocaleString('vi-VN')} ₫
        </td>
        <td className="border-end">
          <div className="small">
            <div>Ngày thanh toán: {invoice.paid_at || 'N/A'}</div>
            <small className="text-muted"> Ngày tạo: {invoice.date || 'N/A'}
            </small>
          </div>
        </td>
        <td className="border-end">
          <Badge bg="success">
            <i className="fas fa-check-circle me-1"></i>
            Thành công
          </Badge>
        </td>
        <td className="text-center">
          <Button
            variant="outline-info"
            size="sm"
            onClick={handleViewDetailClick}
            title="Xem chi tiết hóa đơn"
          >
            <i className="fas fa-receipt"></i>
          </Button>
        </td>
      </tr>

      {/* Custom Confirm Dialog */}
      {showConfirm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={handleCancel}
        >
          <div
            className="mx-auto px-4 py-4 rounded-3 shadow-lg bg-info-subtle text-info-emphasis border border-info"
            style={{ maxWidth: "28rem", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCancel}
              className="position-absolute top-0 end-0 btn btn-link text-secondary p-2"
              style={{ textDecoration: "none" }}
            >
              <XCircle size={20} />
            </button>

            {/* Icon & Title */}
            <div className="text-center mb-3">
              <div className="text-info mb-3">
                <FileText size={40} />
              </div>
              <h4 className="fw-bold mb-2">Xem Chi Tiết Hóa Đơn</h4>
            </div>

            {/* Message */}
            <div className="text-center mb-3">
              <p className="fw-medium mb-2">
                Bạn có chắc muốn xem chi tiết hóa đơn <strong>{invoice.code}</strong>?
              </p>
              <div className="text-muted small">
                <p className="mb-1">Bệnh nhân: <strong>{invoice.patient_name}</strong></p>
                <p className="mb-1">Số tiền: <strong>{invoice.total?.toLocaleString('vi-VN')} ₫</strong></p>
                <p className="mb-0">Phương thức: <strong>{paymentInfo.name}</strong></p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-2 justify-content-center mt-4">
              <Button
                variant="secondary"
                onClick={handleCancel}
              >
                <i className="fas fa-times me-1"></i>
                Hủy
              </Button>
              <Button
                variant="info"
                onClick={handleConfirm}
              >
                <i className="fas fa-eye me-1"></i>
                Xem Chi Tiết
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentHistory;