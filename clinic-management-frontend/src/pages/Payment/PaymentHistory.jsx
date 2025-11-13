// src/components/PaymentSection/PaymentHistory.jsx
import React from 'react';
import { Badge, Button } from 'react-bootstrap';

const PaymentHistory = ({ invoice, onViewDetail }) => {
  const getPaymentMethodDetails = (method) => {
    const methods = {
      'momo': { name: 'Ví MoMo', icon: 'fas fa-mobile-alt text-primary', color: 'primary' },
      'cash': { name: 'Tiền mặt', icon: 'fas fa-money-bill-wave text-success', color: 'success' },
      'napas': { name: 'Thẻ Napas', icon: 'fas fa-university text-info', color: 'danger' },
      'insurance': { name: 'Bảo hiểm', icon: 'fas fa-heartbeat text-warning', color: 'warning' }
    };
    return methods[method] || { name: 'Khác', icon: 'fas fa-question-circle', color: 'secondary' };
  };

  const paymentInfo = getPaymentMethodDetails(invoice.payment_method);

  return (
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
          onClick={() => onViewDetail(invoice)}
          title="Xem chi tiết hóa đơn"
        >
          <i className="fas fa-receipt"></i>
        </Button>
      </td>
    </tr>
  );
};

export default PaymentHistory;