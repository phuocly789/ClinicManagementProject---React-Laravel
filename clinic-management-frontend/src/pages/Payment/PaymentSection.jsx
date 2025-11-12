// src/components/PaymentSection.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Badge, Button, Container, Spinner, Alert } from 'react-bootstrap';
import PaymentMethod from '../Payment/PaymentMethod';
import InvoiceDetailModal from './InvoiceDetailModal'; // THÊM IMPORT NÀY
import { paymentService } from '../../services/paymentService';

const PaymentSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // THÊM STATE NÀY
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null); // THÊM STATE NÀY
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lấy danh sách hóa đơn từ API
  useEffect(() => {
    fetchInvoices();
  }, [searchTerm, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      
      const result = await paymentService.getInvoices(filters);
      
      if (result.success) {
        setInvoices(result.data);
      } else {
        setError(result.message || 'Lỗi khi tải dữ liệu');
      }
    } catch (err) {
      console.error('Fetch invoices error:', err);
      setError(err.response?.data?.message || 'Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Chờ thanh toán': return <Badge bg="warning">Chờ thanh toán</Badge>;
      case 'Đã thanh toán': return <Badge bg="success">Đã thanh toán</Badge>;
      case 'Đã hủy': return <Badge bg="danger">Đã hủy</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodBadge = (paymentMethod, status) => {
    if (status !== 'Đã thanh toán') {
      return <Badge bg="secondary">Chưa thanh toán</Badge>;
    }
    
    switch (paymentMethod) {
      case 'momo': return <Badge bg="primary">MoMo</Badge>;
      case 'cash': return <Badge bg="success">Tiền mặt</Badge>;
      case 'bank_transfer': return <Badge bg="info">Chuyển khoản</Badge>;
      default: return <Badge bg="secondary">Không xác định</Badge>;
    }
  };

  const handleInitiatePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  // SỬA HÀM NÀY - nhận invoice object thay vì chỉ id
  const handleViewDetail = async (invoice) => {
    try {
      const result = await paymentService.getInvoiceDetail(invoice.id);
      if (result.success) {
        setSelectedInvoiceDetail(result.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('View detail error:', err);
      setError('Không thể tải chi tiết hóa đơn');
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    fetchInvoices();
  };

  // THÊM HÀM NÀY để đóng modal chi tiết
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedInvoiceDetail(null);
  };

  const handleRetry = () => {
    fetchInvoices();
  };

  return (
    <Container fluid className="py-4">
      <Card>
        <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-money-bill-wave me-2"></i>
            Quản lý Thanh toán
          </h5>
          <Button variant="light" size="sm" onClick={fetchInvoices} disabled={loading}>
            <i className="fas fa-sync-alt me-1"></i>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </Card.Header>
        
        <Card.Body>
          {/* Filter bar */}
          <div className="row mb-3">
            <div className="col-md-6">
              <Form.Control 
                type="text" 
                placeholder="Tìm kiếm theo mã HD hoặc tên bệnh nhân"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="Chờ thanh toán">Chờ thanh toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
                <option value="Đã hủy">Đã hủy</option>
              </Form.Select>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" className="d-flex justify-content-between align-items-center">
              <div>
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
              <Button variant="outline-danger" size="sm" onClick={handleRetry}>
                Thử lại
              </Button>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="success" />
              <p className="mt-2">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="table-responsive">
                <Table striped hover className="align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th width="12%">Mã HD</th>
                      <th width="18%">Bệnh nhân</th>
                      <th width="12%">Ngày</th>
                      <th width="13%">Tổng tiền</th>
                      <th width="13%">Trạng thái</th>
                      <th width="12%">Hình thức</th>
                      <th width="20%">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <strong>{invoice.code}</strong>
                        </td>
                        <td>{invoice.patient_name || 'N/A'}</td>
                        <td>{invoice.date}</td>
                        <td className="fw-bold text-success">
                          {invoice.total.toLocaleString('vi-VN')} VNĐ
                        </td>
                        <td>{getStatusBadge(invoice.status)}</td>
                        <td>
                          {getPaymentMethodBadge(invoice.payment_method, invoice.status)}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm" role="group">
                            <Button 
                              variant="outline-primary" 
                              onClick={() => handleViewDetail(invoice)} // SỬA THÀNH invoice object
                              size="sm"
                            >
                              <i className="fas fa-eye me-1"></i>
                              Xem
                            </Button>
                            {invoice.can_pay && (
                              <Button 
                                variant="outline-success" 
                                onClick={() => handleInitiatePayment(invoice)}
                                size="sm"
                              >
                                <i className="fas fa-credit-card me-1"></i>
                                Thanh toán
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {invoices.length === 0 && !loading && (
                <div className="text-center py-4">
                  <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Không có hóa đơn nào</p>
                  <Button variant="outline-success" onClick={fetchInvoices}>
                    <i className="fas fa-sync-alt me-1"></i>
                    Tải lại
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Payment Modal */}
      <PaymentMethod
        show={showPaymentModal}
        onHide={handleClosePaymentModal}
        invoice={selectedInvoice}
        onPaymentSuccess={handleClosePaymentModal}
      />

      {/* THÊM MODAL CHI TIẾT VÀO ĐÂY */}
      <InvoiceDetailModal
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        invoice={selectedInvoiceDetail}
      />
    </Container>
  );
};

export default PaymentSection;