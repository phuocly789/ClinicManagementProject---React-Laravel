import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Row, Col, Badge, Spinner, Alert, Pagination } from 'react-bootstrap';
import technicianService from '../../services/technicianService'; // ✅ IMPORT SERVICE

const TechnicianSection = ({ testResultsData, confirmAction, updateStats }) => {
  const [doctorServices, setDoctorServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // ✅ Lấy danh sách chỉ định từ API SERVICE
  const fetchAssignedServices = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ SỬ DỤNG SERVICE - CODE NGẮN GỌN
      const response = await technicianService.getAssignedServices(page);
      
      if (response.data.success) {
        setDoctorServices(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching assigned services:', err);
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedServices(currentPage);
  }, [currentPage]);

  useEffect(() => {
    updateStats();
  }, [testResultsData, updateStats]);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Hoàn thành': return 'success';
      case 'Đang thực hiện': return 'warning';
      case 'Đã chỉ định':
      case 'Đang chờ': return 'secondary';
      default: return 'secondary';
    }
  };

  // ✅ Xử lý phân trang - ĐƠN GIẢN
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // ✅ Render phân trang - ĐƠN GIẢN
  const renderPagination = () => {
    if (!pagination || pagination.last_page <= 1) return null;

    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination>
          <Pagination.Prev 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          />
          
          {[...Array(pagination.last_page)].map((_, index) => (
            <Pagination.Item
              key={index + 1}
              active={index + 1 === currentPage}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </Pagination.Item>
          ))}
          
          <Pagination.Next 
            disabled={currentPage === pagination.last_page}
            onClick={() => handlePageChange(currentPage + 1)}
          />
        </Pagination>
      </div>
    );
  };

  return (
    <div className="section active" id="test-results">
      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header className="bg-success text-white">
              <h3 className="mb-0"><i className="fas fa-vials me-2"></i> Kết Quả Xét Nghiệm</h3>
            </Card.Header>
            <Card.Body>
              <Table striped responsive>
                <thead>
                  <tr>
                    <th>Mã lịch</th>
                    <th>Mã Bệnh Nhân</th>
                    <th>Tên bệnh nhân</th>
                    <th>Dịch vụ</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {testResultsData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.id}</td>
                      <td>{item.id}</td>
                      <td>{item.patient}</td>
                      <td>{item.service}</td>
                      <td>
                        <Badge bg={getStatusVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td>
                        {item.status === 'Đang xử lý' ? (
                          <Button variant="success" size="sm"
                            onClick={() => confirmAction('updateTestResult', item.id, item.patient, item.service)}>
                            <i className="fas fa-check me-1"></i> Cập nhật kết quả
                          </Button>
                        ) : (
                          <div className="d-flex gap-2">
                            <Button variant="warning" size="sm"
                              onClick={() => confirmAction('editTestResult', item.id, item.patient, item.service, item.result)}>
                              <i className="fas fa-edit me-1"></i> Chỉnh sửa
                            </Button>
                            <Button variant="primary" size="sm"
                              onClick={() => printTestResult(item.id, item.patient, item.service, item.result)}>
                              <i className="fas fa-print me-1"></i> Xuất phiếu
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* ✅ BẢNG DANH SÁCH CHỈ ĐỊNH - SERVICE */}
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header className="bg-info text-white">
              <h3 className="mb-0">
                <i className="fas fa-stethoscope me-2"></i> 
                Danh Sách Chỉ Định Dịch Vụ
                {pagination.total > 0 && (
                  <Badge bg="light" text="dark" className="ms-2">
                    Tổng: {pagination.total}
                  </Badge>
                )}
              </h3>
            </Card.Header>
            <Card.Body>
              {loading && (
                <div className="text-center">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Đang tải danh sách dịch vụ...</p>
                </div>
              )}

              {error && (
                <Alert variant="danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="ms-2"
                    onClick={() => fetchAssignedServices(currentPage)}
                  >
                    Thử lại
                  </Button>
                </Alert>
              )}

              {!loading && !error && doctorServices.length > 0 && (
                <>
                  <Table bordered hover responsive>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã Dịch Vụ</th>
                        <th>Tên Bệnh Nhân</th>
                        <th>Tuổi</th>
                        <th>Giới tính</th>
                        <th>Dịch Vụ</th>
                        <th>Ngày Chỉ Định</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorServices.map((srv, index) => (
                        <tr key={srv.service_order_id}>
                          <td>{(currentPage - 1) * 10 + index + 1}</td>
                          <td>{srv.service_order_id}</td>
                          <td>
                            <strong>{srv.patient_name}</strong>
                            {srv.patient_phone && (
                              <div className="text-muted small">{srv.patient_phone}</div>
                            )}
                          </td>
                          <td>{srv.patient_age}</td>
                          <td>{srv.patient_gender}</td>
                          <td>
                            {srv.service_name}
                            <div className="text-muted small">{srv.service_type}</div>
                          </td>
                          <td>{srv.order_date}</td>
                          <td>
                            <Badge bg={getStatusVariant(srv.status)}>
                              {srv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {renderPagination()}

                  {pagination && (
                    <div className="text-center text-muted mt-2">
                      Hiển thị {pagination.from} đến {pagination.to} trong tổng số {pagination.total} dịch vụ
                    </div>
                  )}
                </>
              )}

              {!loading && !error && doctorServices.length === 0 && (
                <Alert variant="info" className="text-center">
                  <i className="fas fa-info-circle me-2"></i>
                  Không có dịch vụ nào được chỉ định
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={12}>
          <Card>
            <Card.Header className="bg-success text-white">
              <h3 className="mb-0"><i className="fas fa-chart-line me-2"></i> Thống Kê</h3>
            </Card.Header>
            <Card.Body>
              <p><strong>Số lượng dịch vụ đã chỉ định:</strong> {pagination.total || 0}</p>
              <p><strong>Trang hiện tại:</strong> {currentPage}</p>
              <p><strong>Thời gian cập nhật:</strong> {new Date().toLocaleString('vi-VN')}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TechnicianSection;