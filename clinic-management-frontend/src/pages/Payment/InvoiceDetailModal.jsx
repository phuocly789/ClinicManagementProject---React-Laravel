// src/components/InvoiceDetailModal.jsx
import React from 'react';
import { Modal, Button, Row, Col, Badge, Table, Card } from 'react-bootstrap';

const InvoiceDetailModal = ({ show, onHide, invoice }) => {
  if (!invoice) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Chờ thanh toán': return <Badge bg="warning">Chờ thanh toán</Badge>;
      case 'Đã thanh toán': return <Badge bg="success">Đã thanh toán</Badge>;
      case 'Đã hủy': return <Badge bg="danger">Đã hủy</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'momo': return 'Ví điện tử MoMo';
      case 'cash': return 'Tiền mặt';
      case 'bank_transfer': return 'Chuyển khoản ngân hàng';
      default: return 'Chưa thanh toán';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>
          <i className="fas fa-receipt me-2 text-primary"></i>
          Chi tiết hóa đơn {invoice.code}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Thông tin cơ bản */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white">
            <h6 className="mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Thông tin hóa đơn
            </h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="fw-medium text-muted">Mã hóa đơn:</td>
                      <td>
                        <Badge bg="primary" className="fs-6">{invoice.code}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Ngày tạo:</td>
                      <td className="fw-medium">{invoice.date}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Trạng thái:</td>
                      <td>{getStatusBadge(invoice.status)}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Tổng tiền:</td>
                      <td className="fw-bold text-success fs-5">
                        {invoice.total?.toLocaleString('vi-VN')} VNĐ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
              <Col md={6}>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="fw-medium text-muted">Bệnh nhân:</td>
                      <td className="fw-medium">{invoice.patient_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Số điện thoại:</td>
                      <td>{invoice.patient_phone || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Mã bệnh nhân:</td>
                      <td>BN{String(invoice.patient_id).padStart(4, '0')}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Mã cuộc hẹn:</td>
                      <td>
                        {invoice.appointment_id ? `LH${String(invoice.appointment_id).padStart(4, '0')}` : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Thông tin thanh toán - CHỈ HIỆN KHI ĐÃ THANH TOÁN */}
        {invoice.status === 'Đã thanh toán' && (
          <Card className="mb-4 border-success">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">
                <i className="fas fa-credit-card me-2"></i>
                Thông tin thanh toán
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr>
                        <td width="50%" className="fw-medium text-muted">Phương thức:</td>
                        <td className="fw-medium">
                          {getPaymentMethodText(invoice.payment_method)}
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium text-muted">Mã giao dịch:</td>
                        <td>
                          <code className="text-primary">{invoice.transaction_id || 'N/A'}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Col>
                <Col md={6}>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr>
                        <td width="50%" className="fw-medium text-muted">Mã đơn hàng:</td>
                        <td>
                          <code>{invoice.order_id || 'N/A'}</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium text-muted">Thời gian thanh toán:</td>
                        <td className="fw-medium text-success">
                          {invoice.paid_at || 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Chi tiết dịch vụ */}
        {invoice.invoice_details && invoice.invoice_details.length > 0 && (
          <Card>
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Chi tiết dịch vụ & thuốc
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Loại</th>
                    <th>Tên</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_details.map((detail, index) => (
                    <tr key={index}>
                      <td>
                        <Badge bg={detail.service ? 'primary' : 'success'}>
                          {detail.service ? 'Dịch vụ' : 'Thuốc'}
                        </Badge>
                      </td>
                      <td>
                        {detail.service?.ServiceName || detail.medicine?.MedicineName || 'N/A'}
                      </td>
                      <td>
                        {detail.unit_price?.toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td>{detail.quantity || 1}</td>
                      <td className="fw-medium text-success">
                        {(
                          (detail.unit_price || 0) * (detail.quantity || 1)
                        )?.toLocaleString('vi-VN')} VNĐ
                      </td>
                    </tr>
                  ))}
                  <tr className="table-secondary fw-bold">
                    <td colSpan="4" className="text-end">Tổng cộng:</td>
                    <td className="text-success fs-6">
                      {invoice.total?.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {/* Thông báo khi chưa có chi tiết */}
        {(!invoice.invoice_details || invoice.invoice_details.length === 0) && (
          <div className="text-center py-4 text-muted">
            <i className="fas fa-info-circle fa-2x mb-3"></i>
            <p>Không có chi tiết dịch vụ nào cho hóa đơn này</p>
          </div>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <i className="fas fa-times me-1"></i>
          Đóng
        </Button>
        {invoice.status === 'Đã thanh toán' && (
          <Button variant="primary" onClick={() => window.print()}>
            <i className="fas fa-print me-1"></i>
            In hóa đơn
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default InvoiceDetailModal;