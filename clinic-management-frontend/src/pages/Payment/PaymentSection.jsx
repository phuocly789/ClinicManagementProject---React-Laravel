// src/components/PaymentSection.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Form, Badge, Button, Container, Alert, Nav, Row, Col } from 'react-bootstrap';
import PaymentMethod from '../Payment/PaymentMethod';
import InvoiceDetailModal from './InvoiceDetailModal';
import { paymentService } from '../../services/paymentService';
import PaymentHistory from './PaymentHistory';
import Pagination from '../../Components/Pagination/Pagination';
import Loading from '../../Components/Loading/Loading';

// Constants
const INVOICE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  PROCESSING: 'processing'
};

const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.PENDING]: 'Chờ thanh toán',
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.CANCELLED]: 'Đã hủy',
  [INVOICE_STATUS.PROCESSING]: 'Đang xử lý'
};

const PAYMENT_METHODS = {
  MOMO: 'momo',
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  INSURANCE: 'insurance'
};

const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.MOMO]: 'MoMo',
  [PAYMENT_METHODS.CASH]: 'Tiền mặt',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Chuyển khoản',
  [PAYMENT_METHODS.INSURANCE]: 'Bảo hiểm'
};

const TAB_KEYS = {
  ALL: 'all',
  PENDING: 'pending',
  PAID: 'paid',
  PAYMENT_HISTORY: 'payment_history',
  CANCELLED: 'cancelled'
};

const ITEMS_PER_PAGE = 10;

const PaymentSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(TAB_KEYS.ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Helper functions - không cần useCallback
  const normalizeStatus = (status) => {
    if (!status) return INVOICE_STATUS.PENDING;
    const statusString = String(status).toLowerCase().trim();
    const statusMap = {
      'chờ thanh toán': INVOICE_STATUS.PENDING,
      'pending': INVOICE_STATUS.PENDING,
      'đã thanh toán': INVOICE_STATUS.PAID,
      'paid': INVOICE_STATUS.PAID,
      'đã hủy': INVOICE_STATUS.CANCELLED,
      'cancelled': INVOICE_STATUS.CANCELLED,
      'đang xử lý': INVOICE_STATUS.PROCESSING,
      'processing': INVOICE_STATUS.PROCESSING
    };
    return statusMap[statusString] || INVOICE_STATUS.PENDING;
  };

  const isInvoicePaid = (invoice) => {
    if (!invoice) return false;
    const normalizedStatus = normalizeStatus(invoice.status);
    const hasPaymentMethod = invoice.payment_method && invoice.payment_method !== 'null';
    const hasPaidAt = invoice.paid_at;
    return normalizedStatus === INVOICE_STATUS.PAID || hasPaymentMethod || hasPaidAt;
  };

  const canPayInvoice = (invoice) => {
    if (!invoice) return false;
    const normalizedStatus = normalizeStatus(invoice.status);
    const isPaid = isInvoicePaid(invoice);
    return !isPaid &&
           normalizedStatus === INVOICE_STATUS.PENDING &&
           activeTab !== TAB_KEYS.CANCELLED &&
           activeTab !== TAB_KEYS.PAYMENT_HISTORY &&
           invoice.can_pay !== false;
  };

  const getStatusLabel = (status) => {
    return INVOICE_STATUS_LABELS[normalizeStatus(status)] || status;
  };

  const getPaymentMethodLabel = (paymentMethod) => {
    return PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod || 'Chưa thanh toán';
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case INVOICE_STATUS.PENDING: return <Badge bg="warning">Chờ thanh toán</Badge>;
      case INVOICE_STATUS.PAID: return <Badge bg="success">Đã thanh toán</Badge>;
      case INVOICE_STATUS.CANCELLED: return <Badge bg="danger">Đã hủy</Badge>;
      case INVOICE_STATUS.PROCESSING: return <Badge bg="info">Đang xử lý</Badge>;
      default: return <Badge bg="secondary">{getStatusLabel(status)}</Badge>;
    }
  };

  const getPaymentMethodBadge = (paymentMethod, status) => {
    const normalizedStatus = normalizeStatus(status);
    const isPaid = normalizedStatus === INVOICE_STATUS.PAID;
    const hasPaymentMethod = paymentMethod && paymentMethod !== 'null';

    if (!isPaid && !hasPaymentMethod) {
      return <Badge bg="secondary">Chưa thanh toán</Badge>;
    }

    if (isPaid && hasPaymentMethod) {
      switch (paymentMethod) {
        case PAYMENT_METHODS.MOMO: return <Badge bg="primary">MoMo</Badge>;
        case PAYMENT_METHODS.CASH: return <Badge bg="success">Tiền mặt</Badge>;
        case PAYMENT_METHODS.BANK_TRANSFER: return <Badge bg="info">Chuyển khoản</Badge>;
        case PAYMENT_METHODS.INSURANCE: return <Badge bg="warning">Bảo hiểm</Badge>;
        default: return <Badge bg="secondary">{getPaymentMethodLabel(paymentMethod)}</Badge>;
      }
    }

    if (hasPaymentMethod) {
      return <Badge bg="success">Đã thanh toán</Badge>;
    }

    return <Badge bg="light" text="dark">{getStatusLabel(status)}</Badge>;
  };

  // Fetch invoices - đơn giản hóa
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm.trim() || undefined
      };

      // Thêm status filter nếu có
      if (statusFilter) {
        filters.status = statusFilter;
      } else {
        const tabToStatusMap = {
          [TAB_KEYS.PENDING]: INVOICE_STATUS.PENDING,
          [TAB_KEYS.PAID]: INVOICE_STATUS.PAID,
          [TAB_KEYS.CANCELLED]: INVOICE_STATUS.CANCELLED,
        };
        if (tabToStatusMap[activeTab]) {
          filters.status = tabToStatusMap[activeTab];
        }
      }

      const response = activeTab === TAB_KEYS.PAYMENT_HISTORY 
        ? await paymentService.getPaymentHistory(filters)
        : await paymentService.getInvoices(filters);

      if (response?.data) {
        let invoicesData = [];
        let paginationData = {};

        if (response.data.success) {
          invoicesData = response.data.data?.invoices || response.data.data || [];
          paginationData = response.data.data?.pagination || {};
        } else if (Array.isArray(response.data)) {
          invoicesData = response.data;
        } else if (response.data.invoices) {
          invoicesData = response.data.invoices;
          paginationData = response.data.pagination || {};
        } else {
          invoicesData = response.data;
        }

        setInvoices(invoicesData);
        setTotalItems(paginationData.total || invoicesData.length || 0);
        
        if (invoicesData.length === 0 && !response.data.message) {
          setError('Không có dữ liệu hóa đơn');
        }
      } else {
        setError('Dữ liệu trả về không hợp lệ');
        setInvoices([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error('Fetch invoices error:', err);
      setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu');
      setInvoices([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // Effects - tối ưu hóa
  useEffect(() => {
    fetchInvoices();
  }, [currentPage, activeTab]); // Chỉ phụ thuộc vào những thứ thực sự thay đổi

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Handlers
  const handleViewDetail = async (invoice) => {
    try {
      const result = await paymentService.getInvoiceDetail(invoice.id);
      if (result?.data && (result.data.success || result.data.id)) {
        setSelectedInvoiceDetail(result.data);
        setShowDetailModal(true);
      } else {
        setError('Không thể tải chi tiết hóa đơn');
      }
    } catch (err) {
      console.error('View detail error:', err);
      setError('Không thể tải chi tiết hóa đơn');
    }
  };

  const handleInitiatePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    fetchInvoices();
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedInvoiceDetail(null);
  };

  const handleRetry = () => {
    fetchInvoices();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setStatusFilter('');
  };

  // Memoized values
  const invoiceCounts = useMemo(() => {
    return {
      [INVOICE_STATUS.PENDING]: invoices.filter(inv => normalizeStatus(inv.status) === INVOICE_STATUS.PENDING).length,
      [INVOICE_STATUS.PAID]: invoices.filter(inv => normalizeStatus(inv.status) === INVOICE_STATUS.PAID).length,
      [INVOICE_STATUS.CANCELLED]: invoices.filter(inv => normalizeStatus(inv.status) === INVOICE_STATUS.CANCELLED).length,
      payment_history: invoices.length,
      total: totalItems
    };
  }, [invoices, totalItems]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const getPaginationInfo = () => {
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    return `Hiển thị ${startItem}-${endItem} của ${totalItems} hóa đơn`;
  };

  const emptyStateConfig = useMemo(() => {
    const config = {
      [TAB_KEYS.ALL]: {
        icon: 'fas fa-receipt',
        title: 'Không có hóa đơn nào',
        description: 'Hãy tạo hóa đơn mới hoặc kiểm tra lại bộ lọc'
      },
      [TAB_KEYS.PENDING]: {
        icon: 'fas fa-clock',
        title: 'Không có hóa đơn chờ thanh toán',
        description: 'Tất cả hóa đơn đã được xử lý'
      },
      [TAB_KEYS.PAID]: {
        icon: 'fas fa-check-circle',
        title: 'Không có hóa đơn đã thanh toán',
        description: 'Chưa có hóa đơn nào được thanh toán'
      },
      [TAB_KEYS.PAYMENT_HISTORY]: {
        icon: 'fas fa-history',
        title: 'Không có lịch sử thanh toán',
        description: 'Chưa có giao dịch thanh toán nào được thực hiện qua hệ thống'
      },
      [TAB_KEYS.CANCELLED]: {
        icon: 'fas fa-times-circle',
        title: 'Không có hóa đơn đã hủy',
        description: 'Không có hóa đơn nào bị hủy'
      }
    };
    return config[activeTab] || config[TAB_KEYS.ALL];
  }, [activeTab]);

  return (
    <Container fluid className="py-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center">
            <i className="fas fa-credit-card fa-lg me-3"></i>
            <div>
              <h5 className="mb-0 fw-bold">QUẢN LÝ THANH TOÁN</h5>
              <small className="opacity-75">Quản lý và theo dõi tất cả giao dịch thanh toán</small>
            </div>
          </div>
          <Button variant="light" size="sm" onClick={fetchInvoices} disabled={loading}>
            <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </Card.Header>

        <Card.Body className="p-4">
          {/* TAB BAR */}
          <Nav variant="tabs" className="mb-4 border-bottom-0" activeKey={activeTab} onSelect={handleTabChange}>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.ALL} className="fw-semibold">
                <i className="fas fa-list me-2"></i>
                Tất cả hóa đơn
                <Badge bg="secondary" className="ms-2">{invoiceCounts.total}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.PENDING} className="fw-semibold">
                <i className="fas fa-clock me-2"></i>
                Chờ thanh toán
                <Badge bg="warning" className="ms-2">{invoiceCounts[INVOICE_STATUS.PENDING]}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.PAID} className="fw-semibold">
                <i className="fas fa-check-circle me-2"></i>
                Đã thanh toán
                <Badge bg="success" className="ms-2">{invoiceCounts[INVOICE_STATUS.PAID]}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.PAYMENT_HISTORY} className="fw-semibold">
                <i className="fas fa-history me-2"></i>
                Lịch sử thanh toán
                <Badge bg="info" className="ms-2">{invoiceCounts.payment_history}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.CANCELLED} className="fw-semibold">
                <i className="fas fa-times-circle me-2"></i>
                Đã hủy
                <Badge bg="danger" className="ms-2">{invoiceCounts[INVOICE_STATUS.CANCELLED]}</Badge>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Filter bar */}
          <Row className="mb-4 g-3">
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="🔍 Tìm kiếm theo mã HD, tên bệnh nhân, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">📊 Tất cả trạng thái</option>
                <option value={INVOICE_STATUS.PENDING}>⏳ Chờ thanh toán</option>
                <option value={INVOICE_STATUS.PAID}>✅ Đã thanh toán</option>
                <option value={INVOICE_STATUS.PROCESSING}>🔄 Đang xử lý</option>
                <option value={INVOICE_STATUS.CANCELLED}>❌ Đã hủy</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button
                variant="primary"
                onClick={() => setCurrentPage(1)}
                disabled={loading}
                className="w-100"
              >
                <i className="fas fa-search me-1"></i>
                Tìm kiếm
              </Button>
            </Col>
          </Row>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <span>{error}</span>
              </div>
              <Button variant="outline-danger" size="sm" onClick={handleRetry}>
                <i className="fas fa-redo me-1"></i>
                Thử lại
              </Button>
            </Alert>
          )}

          {/* Loading và Data */}
          {loading ? (
            <Loading isLoading={true} text="Đang tải dữ liệu hóa đơn..." />
          ) : (
            <>
              {invoices.length > 0 ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <small className="text-muted fw-semibold">
                      {getPaginationInfo()}
                    </small>
                  </div>

                  <div className="table-responsive border rounded">
                    <Table hover className="mb-0">
                      <thead className="table-primary">
                        <tr>
                          {activeTab === TAB_KEYS.PAYMENT_HISTORY ? (
                            <>
                              <th width="12%" className="py-3 border-end">MÃ GIAO DỊCH</th>
                              <th width="15%" className="py-3 border-end">BỆNH NHÂN</th>
                              <th width="12%" className="py-3 border-end">MÃ HĐ</th>
                              <th width="15%" className="py-3 border-end">PHƯƠNG THỨC</th>
                              <th width="12%" className="py-3 border-end">SỐ TIỀN</th>
                              <th width="14%" className="py-3 border-end">THỜI GIAN</th>
                              <th width="10%" className="py-3 border-end">TRẠNG THÁI</th>
                              <th width="10%" className="py-3 text-center">XEM</th>
                            </>
                          ) : (
                            <>
                              <th width="12%" className="py-3 border-end">MÃ HÓA ĐƠN</th>
                              <th width="18%" className="py-3 border-end">BỆNH NHÂN</th>
                              <th width="12%" className="py-3 border-end">NGÀY LẬP</th>
                              <th width="13%" className="py-3 border-end">TỔNG TIỀN</th>
                              <th width="13%" className="py-3 border-end">TRẠNG THÁI</th>
                              <th width="12%" className="py-3 border-end">HÌNH THỨC</th>
                              <th width="20%" className="py-3 text-center">THAO TÁC</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {activeTab === TAB_KEYS.PAYMENT_HISTORY ? (
                          invoices.map((invoice) => (
                            <PaymentHistory 
                              key={invoice.id} 
                              invoice={invoice}
                              onViewDetail={handleViewDetail}
                            />
                          ))
                        ) : (
                          invoices.map((invoice) => (
                            <tr key={invoice.id} className="border-bottom">
                              <td className="border-end">
                                <strong className="text-primary">{invoice.code}</strong>
                              </td>
                              <td className="border-end">
                                <div className="fw-semibold">{invoice.patient_name}</div>
                                <small className="text-muted">{invoice.patient_phone}</small>
                              </td>
                              <td className="border-end">{invoice.date}</td>
                              <td className="border-end fw-bold text-success">
                                {invoice.total?.toLocaleString('vi-VN')} VNĐ
                              </td>
                              <td className="border-end">{getStatusBadge(invoice.status)}</td>
                              <td className="border-end">
                                {getPaymentMethodBadge(invoice.payment_method, invoice.status)}
                              </td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm" role="group">
                                  <Button
                                    variant="outline-primary"
                                    onClick={() => handleViewDetail(invoice)}
                                    size="sm"
                                    className="me-2"
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    Chi tiết
                                  </Button>
                                  {canPayInvoice(invoice) && (
                                    <Button
                                      variant="success"
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
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                      <Pagination
                        pageCount={totalPages}
                        onPageChange={(selected) => handlePageChange(selected.selected + 1)}
                        currentPage={currentPage - 1}
                        isLoading={loading}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className={`${emptyStateConfig.icon} fa-4x text-muted mb-3`}></i>
                  <h5 className="text-muted mb-2">{emptyStateConfig.title}</h5>
                  <p className="text-muted mb-3">{emptyStateConfig.description}</p>
                  <Button variant="primary" onClick={fetchInvoices}>
                    <i className="fas fa-sync-alt me-1"></i>
                    Tải lại
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modals */}
      <PaymentMethod
        show={showPaymentModal}
        onHide={handleClosePaymentModal}
        invoice={selectedInvoice}
        onPaymentSuccess={handleClosePaymentModal}
      />

      <InvoiceDetailModal
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        invoice={selectedInvoiceDetail}
      />
    </Container>
  );
};

export default PaymentSection;