// src/components/InvoiceDetailModal.jsx
import React from 'react';
import { Modal, Button, Row, Col, Badge, Table, Card } from 'react-bootstrap';

const InvoiceDetailModal = ({ show, onHide, invoice }) => {
  console.log('🔍 InvoiceDetailModal received:', invoice);

  // FIXED: Xử lý nhiều cấu trúc data khác nhau
  let invoiceData = null;
  
  if (invoice) {
    if (invoice.success !== undefined) {
      // Structure: {success: true, data: {...}}
      invoiceData = invoice.data || invoice;
    } else if (invoice.id) {
      // Structure: {id: 49, code: 'HD000049', ...} (direct invoice object)
      invoiceData = invoice;
    } else {
      // Structure: {data: {...}} (nested data)
      invoiceData = invoice.data || invoice;
    }
  }

  console.log('📄 Processed invoice data:', invoiceData);

  if (!invoiceData) {
    console.log('❌ No invoice data available');
    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết hóa đơn</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center text-muted py-4">
            <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
            <p>Không có dữ liệu hóa đơn</p>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

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
      case 'insurance': return 'Bảo hiểm';
      default: return 'Chưa thanh toán';
    }
  };

  const {
    code = 'N/A',
    patient_name = 'N/A',
    patient_phone = 'N/A',
    patient_id,
    date = 'N/A',
    total = 0,
    status = 'N/A',
    payment_method,
    transaction_id,
    order_id,
    paid_at,
    appointment_id,
    invoice_details = []
  } = invoiceData;

  console.log('📋 Invoice details to render:', invoice_details);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>
          <i className="fas fa-receipt me-2 text-primary"></i>
          Chi tiết hóa đơn {code}
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
                        <Badge bg="primary" className="fs-6">{code}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Ngày tạo:</td>
                      <td className="fw-medium">{date}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Trạng thái:</td>
                      <td>{getStatusBadge(status)}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Tổng tiền:</td>
                      <td className="fw-bold text-success fs-5">
                        {total?.toLocaleString('vi-VN')} VNĐ
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
                      <td className="fw-medium">{patient_name}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Số điện thoại:</td>
                      <td>{patient_phone}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Mã bệnh nhân:</td>
                      <td>BN{String(patient_id).padStart(4, '0')}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Mã cuộc hẹn:</td>
                      <td>
                        {appointment_id ? `LH${String(appointment_id).padStart(4, '0')}` : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Thông tin thanh toán */}
        {status === 'Đã thanh toán' && (
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
                          {getPaymentMethodText(payment_method)}
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium text-muted">Mã giao dịch:</td>
                        <td>
                          <code className="text-primary">{transaction_id || 'N/A'}</code>
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
                          <code>{order_id || 'N/A'}</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium text-muted">Thời gian thanh toán:</td>
                        <td className="fw-medium text-success">
                          {paid_at || 'N/A'}
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
        {invoice_details && invoice_details.length > 0 ? (
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
                    <th>#</th>
                    <th>Loại</th>
                    <th>Tên</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice_details.map((detail, index) => {
                    const isService = !!detail.service;
                    const itemName = isService 
                      ? detail.service?.ServiceName 
                      : detail.medicine?.MedicineName;
                    const unitPrice = detail.UnitPrice || detail.unit_price || 0;
                    const quantity = detail.Quantity || detail.quantity || 1;
                    const subtotal = detail.SubTotal || (unitPrice * quantity);

                    return (
                      <tr key={detail.InvoiceDetailId || index}>
                        <td>{index + 1}</td>
                        <td>
                          <Badge bg={isService ? 'primary' : 'success'}>
                            {isService ? 'Dịch vụ' : 'Thuốc'}
                          </Badge>
                        </td>
                        <td className="fw-medium">
                          {itemName || 'N/A'}
                          {isService && detail.service?.Description && (
                            <div>
                              <small className="text-muted">
                                {detail.service.Description}
                              </small>
                            </div>
                          )}
                        </td>
                        <td>{unitPrice.toLocaleString('vi-VN')} VNĐ</td>
                        <td>{quantity}</td>
                        <td className="fw-bold text-success">
                          {subtotal.toLocaleString('vi-VN')} VNĐ
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="table-secondary fw-bold">
                    <td colSpan="5" className="text-end">Tổng cộng:</td>
                    <td className="text-success fs-6">
                      {total?.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ) : (
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
        {status === 'Đã thanh toán' && (
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