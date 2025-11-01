import React from 'react';
import { Card, Table, Button, Row, Col, Badge, Alert, Spinner } from 'react-bootstrap';
import technicianService from '../../services/technicianService';

const TechnicianSection = ({ testResultsData, updateStats, loading }) => {
  console.log('🎯 TechnicianSection rendered');
  console.log('📥 testResultsData từ props:', testResultsData);

  // ✅ THÊM STATE CHO COMPONENT
  const [localLoading, setLocalLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState('');
  const [localSuccess, setLocalSuccess] = React.useState('');

  // ✅ HÀM XỬ LÝ THAY ĐỔI TRẠNG THÁI - ĐÃ SỬA
  const handleStatusChange = async (serviceOrderId, patientName, serviceName, newStatus) => {
    try {
      setLocalLoading(true);
      setLocalError('');
      setLocalSuccess('');

      console.log(`🔄 Đang thay đổi trạng thái: ${serviceOrderId} -> ${newStatus}`);

      const response = await technicianService.updateServiceStatus(serviceOrderId, newStatus);

      console.log('✅ API Response:', response);

      if (response && response.success) {
        const actionMessage = getActionMessage(newStatus, patientName, serviceName);
        setLocalSuccess(`✅ ${actionMessage}`);

        // ✅ QUAN TRỌNG: GỌI LẠI DATA ĐỂ CẬP NHẬT UI
        if (updateStats) {
          console.log('🔄 Đang gọi lại data để cập nhật UI...');
          await updateStats(); // Đảm bảo hàm này re-fetch data
        }

        // ✅ TỰ ĐỘNG ẨN THÔNG BÁO SAU 3 GIÂY
        setTimeout(() => {
          setLocalSuccess('');
        }, 3000);
      } else {
        throw new Error(response?.message || 'Có lỗi xảy ra');
      }

    } catch (err) {
      console.error('❌ Lỗi thay đổi trạng thái:', err);
      setLocalError(`❌ Không thể thay đổi trạng thái. Vui lòng thử lại.`);
    } finally {
      setLocalLoading(false);
    }
  };

  // ✅ HÀM XỬ LÝ KẾT QUẢ XÉT NGHIỆM
  const handleTestResult = async (serviceOrderId, patientName, serviceName, currentResult = '') => {
    try {
      const result = prompt(`Nhập kết quả ${serviceName} cho ${patientName}:`, currentResult);

      if (result && result.trim()) {
        setLocalLoading(true);

        const response = await technicianService.updateServiceResult(
          serviceOrderId,
          result.trim(),
          'Hoàn thành'
        );

        if (response && response.success) {
          setLocalSuccess(`✅ Đã cập nhật kết quả "${serviceName}" cho ${patientName}`);

          // ✅ RELOAD DATA
          if (updateStats) {
            updateStats();
          }
        }
      }
    } catch (err) {
      console.error('❌ Lỗi cập nhật kết quả:', err);
      setLocalError('❌ Không thể cập nhật kết quả. Vui lòng thử lại.');
    } finally {
      setLocalLoading(false);
    }
  };

  // ✅ HÀM LẤY MESSAGE THEO TRẠNG THÁI
  const getActionMessage = (status, patientName, serviceName) => {
    switch (status) {
      case 'Đang thực hiện':
        return `Đã bắt đầu "${serviceName}" cho ${patientName}`;
      case 'Hoàn thành':
        return `Đã hoàn thành "${serviceName}" cho ${patientName}`;
      case 'Đã hủy':
        return `Đã hủy "${serviceName}" cho ${patientName}`;
      default:
        return `Đã thay đổi trạng thái "${serviceName}" cho ${patientName}`;
    }
  };

  // ✅ HÀM XÁC NHẬN TRƯỚC KHI THỰC HIỆN
  const confirmStatusChange = (serviceOrderId, patientName, serviceName, newStatus, actionName) => {
    const message = getConfirmMessage(actionName, patientName, serviceName);
    if (window.confirm(message)) {
      handleStatusChange(serviceOrderId, patientName, serviceName, newStatus);
    }
  };

  // ✅ HÀM LẤY MESSAGE XÁC NHẬN
  const getConfirmMessage = (action, patientName, serviceName) => {
    switch (action) {
      case 'start':
        return `Bạn có chắc muốn BẮT ĐẦU "${serviceName}" cho ${patientName}?`;
      case 'complete':
        return `Bạn có chắc muốn HOÀN THÀNH "${serviceName}" cho ${patientName}?`;
      case 'cancel':
        return `Bạn có chắc muốn HỦY "${serviceName}" cho ${patientName}?`;
      default:
        return 'Bạn có chắc muốn thực hiện hành động này?';
    }
  };

  const getStatusVariant = (status) => {
    if (!status) return 'secondary';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('hoàn thành')) return 'success';
    if (statusLower.includes('đang thực hiện')) return 'warning';
    if (statusLower.includes('đã chỉ định')) return 'primary';
    if (statusLower.includes('đang chờ')) return 'secondary';
    if (statusLower.includes('đã hủy')) return 'danger';
    return 'secondary';
  };

  const formatPrice = (price) => {
    if (!price) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  };

  // Thống kê
  const totalServices = testResultsData.length;
  const completedServices = testResultsData.filter(s =>
    s.status && s.status.toLowerCase().includes('hoàn thành')
  ).length;
  const inProgressServices = testResultsData.filter(s =>
    s.status && s.status.toLowerCase().includes('đang thực hiện')
  ).length;
  const assignedServices = testResultsData.filter(s =>
    s.status && s.status.toLowerCase().includes('đã chỉ định')
  ).length;
  const totalRevenue = testResultsData.reduce((total, service) => total + (service.price || 0), 0);
  const averagePrice = totalServices > 0 ? totalRevenue / totalServices : 0;

  // ✅ LẤY DANH SÁCH DỊCH VỤ ĐÃ HOÀN THÀNH ĐỂ HIỂN THỊ PHẦN KẾT QUẢ
  const completedServicesData = testResultsData.filter(s =>
    s.status && s.status.toLowerCase().includes('hoàn thành')
  );

  return (
    <div className="section active" id="test-results">
      {/* Header Stats */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                <i className="fas fa-vials text-primary me-2"></i>
                Quản Lý Dịch Vụ
              </h2>
              <p className="text-muted mb-0">Danh sách dịch vụ được chỉ định và kết quả xét nghiệm</p>
            </div>
            {totalServices > 0 && (
              <Badge bg="primary" className="fs-6 px-3 py-2">
                <i className="fas fa-list-check me-2"></i>
                {totalServices} dịch vụ
              </Badge>
            )}
          </div>
        </Col>
      </Row>

      {/* ✅ THÊM ALERT LOCAL */}
      {localError && (
        <Alert variant="danger" dismissible onClose={() => setLocalError('')}>
          {localError}
        </Alert>
      )}
      {localSuccess && (
        <Alert variant="success" dismissible onClose={() => setLocalSuccess('')}>
          {localSuccess}
        </Alert>
      )}

      {/* ✅ LOADING LOCAL */}
      {localLoading && (
        <div className="text-center mb-3">
          <Spinner animation="border" variant="primary" size="sm" />
          <span className="ms-2">Đang xử lý...</span>
        </div>
      )}

      <Row>
        {/* Statistics Cards */}
        <Col xl={12} className="mb-4">
          <Row className="g-3">
            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Tổng Dịch Vụ</h6>
                      <h2 className="fw-bold text-primary mb-0">{totalServices}</h2>
                      <small className="text-muted">Đang quản lý</small>
                    </div>
                    <div className="bg-primary bg-opacity-10 p-3 rounded">
                      <i className="fas fa-layer-group fa-2x text-primary"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Hoàn Thành</h6>
                      <h2 className="fw-bold text-success mb-0">{completedServices}</h2>
                      <small className="text-muted">Đã xử lý xong</small>
                    </div>
                    <div className="bg-success bg-opacity-10 p-3 rounded">
                      <i className="fas fa-check-circle fa-2x text-success"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Đang Thực Hiện</h6>
                      <h2 className="fw-bold text-warning mb-0">{inProgressServices}</h2>
                      <small className="text-muted">Đang xử lý</small>
                    </div>
                    <div className="bg-warning bg-opacity-10 p-3 rounded">
                      <i className="fas fa-spinner fa-2x text-warning"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Đã Chỉ Định</h6>
                      <h2 className="fw-bold text-info mb-0">{assignedServices}</h2>
                      <small className="text-muted">Chờ xử lý</small>
                    </div>
                    <div className="bg-info bg-opacity-10 p-3 rounded">
                      <i className="fas fa-clock fa-2x text-info"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Main Services Table - DANH SÁCH CHỈ ĐỊNH */}
        <Col xl={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold text-dark">
                  <i className="fas fa-list-check text-primary me-2"></i>
                  Danh Sách Dịch Vụ Được Chỉ Định
                </h5>
                <div className="text-muted">
                  <small>
                    <i className="fas fa-sync-alt me-1"></i>
                    Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
                  </small>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" size="lg" />
                  <p className="mt-3 text-muted fs-5">Đang tải dữ liệu...</p>
                </div>
              ) : testResultsData.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th width="60" className="text-center py-3">#</th>
                        <th width="120" className="py-3">Mã Dịch Vụ</th>
                        <th width="120" className="py-3">Mã Lịch</th>
                        <th className="py-3">Bệnh Nhân</th>
                        <th width="80" className="text-center py-3">Tuổi</th>
                        <th width="100" className="text-center py-3">Giới Tính</th>
                        <th className="py-3">Dịch Vụ</th>
                        <th width="150" className="text-center py-3">Bác Sĩ Chỉ Định</th>
                        <th width="120" className="text-center py-3">Giá</th>
                        <th width="140" className="text-center py-3">Ngày Chỉ Định</th>
                        <th width="140" className="text-center py-3">Trạng Thái</th>
                        <th width="180" className="text-center py-3">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResultsData.map((service, index) => (
                        <tr key={service.service_order_id} className="border-bottom">
                          <td className="text-center">
                            <span className="fw-semibold text-muted">{index + 1}</span>
                          </td>

                          <td>
                            <Badge bg="primary" className="fs-7 w-100">
                              #{service.service_order_id}
                            </Badge>
                          </td>

                          <td>
                            <span className="text-muted fw-semibold">#{service.appointment_id}</span>
                          </td>

                          <td>
                            <div>
                              <div className="fw-semibold text-dark">{service.patient_name}</div>
                              {service.patient_phone && service.patient_phone !== 'N/A' && (
                                <small className="text-muted">
                                  <i className="fas fa-phone me-1"></i>
                                  {service.patient_phone}
                                </small>
                              )}
                            </div>
                          </td>

                          <td className="text-center">
                            <span className="fw-semibold">{service.patient_age}</span>
                          </td>

                          <td className="text-center">
                            <Badge
                              bg={service.patient_gender === 'Nam' ? 'info' : 'danger'}
                              className="fs-7"
                            >
                              {service.patient_gender}
                            </Badge>
                          </td>

                          <td>
                            <div className="fw-semibold text-dark">{service.service_name}</div>
                            <small className="text-muted">{service.service_type}</small>
                          </td>

                          <td className="text-center">
                            <small className="text-dark fw-semibold">
                              {service.referring_doctor_name}
                            </small>
                          </td>

                          <td className="text-center">
                            <Badge bg="outline-success" className="border text-success fs-7">
                              {formatPrice(service.price)}
                            </Badge>
                          </td>

                          <td className="text-center">
                            <small className="text-muted">{formatDate(service.order_date)}</small>
                          </td>

                          <td className="text-center">
                            <Badge
                              bg={getStatusVariant(service.status)}
                              className="fs-7 px-3 py-2"
                            >
                              {service.status}
                            </Badge>
                          </td>

                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-2">
                              {/* ✅ NÚT BẮT ĐẦU - KHI "Đã chỉ định" hoặc "Đang chờ" */}
                              {(service.status === 'Đã chỉ định' || service.status === 'Đang chờ') && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="px-3"
                                  onClick={() => confirmStatusChange(
                                    service.service_order_id,
                                    service.patient_name,
                                    service.service_name,
                                    'Đang thực hiện',
                                    'start'
                                  )}
                                  disabled={localLoading}
                                >
                                  <i className="fas fa-play me-1"></i>
                                  Bắt đầu
                                </Button>
                              )}

                              {/* ✅ NÚT HOÀN THÀNH - KHI "Đang thực hiện" */}
                              {service.status === 'Đang thực hiện' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="px-3"
                                  onClick={() => confirmStatusChange(
                                    service.service_order_id,
                                    service.patient_name,
                                    service.service_name,
                                    'Hoàn thành',
                                    'complete'
                                  )}
                                  disabled={localLoading}
                                >
                                  <i className="fas fa-check me-1"></i>
                                  Hoàn thành
                                </Button>
                              )}

                              {/* ✅ NÚT KẾT QUẢ - HIỂN THỊ CHO TẤT CẢ TRẠNG THÁI */}
                              <Button
                                variant="info"
                                size="sm"
                                className="px-3"
                                onClick={() => handleTestResult(
                                  service.service_order_id,
                                  service.patient_name,
                                  service.service_name,
                                  service.result || ''
                                )}
                                disabled={localLoading}
                              >
                                <i className="fas fa-vial me-1"></i>
                                Kết quả
                              </Button>

                              {/* ✅ NÚT HỦY - KHI CHƯA HOÀN THÀNH */}
                              {service.status !== 'Hoàn thành' && service.status !== 'Đã hủy' && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="px-3"
                                  onClick={() => confirmStatusChange(
                                    service.service_order_id,
                                    service.patient_name,
                                    service.service_name,
                                    'Đã hủy',
                                    'cancel'
                                  )}
                                  disabled={localLoading}
                                >
                                  <i className="fas fa-times me-1"></i>
                                  Hủy
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="py-4">
                    <i className="fas fa-clipboard-list fa-4x text-muted mb-3 opacity-50"></i>
                    <h4 className="text-muted fw-light mb-3">Không có dịch vụ nào được chỉ định</h4>
                    <p className="text-muted mb-0">
                      Hiện tại không có dịch vụ xét nghiệm nào được chỉ định cho bạn.
                    </p>
                  </div>
                </div>
              )}
            </Card.Body>

            {/* Footer Summary */}
            {testResultsData.length > 0 && (
              <Card.Footer className="bg-light py-3">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <small className="text-muted">
                      Hiển thị <strong>{testResultsData.length}</strong> dịch vụ •
                      Tổng giá trị: <strong className="text-success">{formatPrice(totalRevenue)}</strong>
                    </small>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <small className="text-muted">
                      Giá trung bình: <strong>{formatPrice(averagePrice)}</strong>
                    </small>
                  </div>
                </div>
              </Card.Footer>
            )}
          </Card>
        </Col>

        {/* ✅ PHẦN KẾT QUẢ XÉT NGHIỆM - GIỮ NGUYÊN */}
        <Col xl={12} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-success bg-gradient text-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0 fw-bold">
                  <i className="fas fa-vials me-2"></i>
                  Kết Quả Xét Nghiệm
                </h4>
                <Badge bg="light" text="dark" className="fs-6">
                  <i className="fas fa-list me-1"></i>
                  Tổng: {completedServicesData.length} kết quả
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th width="80" className="text-center py-3">Mã Lịch</th>
                      <th width="120" className="py-3">Mã Bệnh Nhân</th>
                      <th className="py-3">Tên Bệnh Nhân</th>
                      <th className="py-3">Dịch Vụ</th>
                      <th width="140" className="text-center py-3">Ngày Xét Nghiệm</th>
                      <th width="120" className="text-center py-3">Trạng Thái</th>
                      <th width="200" className="text-center py-3">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Hiển thị các dịch vụ đã hoàn thành */}
                    {completedServicesData.map((service, index) => (
                      <tr key={service.service_order_id} className="border-bottom">
                        <td className="text-center">
                          <Badge bg="primary" className="fs-7">#{service.appointment_id}</Badge>
                        </td>
                        <td>
                          <span className="text-muted fw-semibold">#BN{service.patient_id || 'N/A'}</span>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{service.patient_name}</div>
                          <small className="text-muted">{service.patient_age} tuổi - {service.patient_gender}</small>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{service.service_name}</div>
                          <small className="text-muted">{service.service_type}</small>
                        </td>
                        <td className="text-center">
                          <small className="text-muted">{formatDate(service.order_date)}</small>
                        </td>
                        <td className="text-center">
                          <Badge bg="success" className="fs-7 px-3 py-2">
                            <i className="fas fa-check me-1"></i>
                            Hoàn thành
                          </Badge>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="px-3"
                              onClick={() => alert(`Kết quả: ${service.result || 'Chưa có kết quả'}`)}
                            >
                              <i className="fas fa-eye me-1"></i>
                              Xem
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="px-3"
                            >
                              <i className="fas fa-print me-1"></i>
                              In
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="px-3"
                              onClick={() => handleTestResult(
                                service.service_order_id,
                                service.patient_name,
                                service.service_name,
                                service.result || ''
                              )}
                            >
                              <i className="fas fa-edit me-1"></i>
                              Sửa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Nếu không có kết quả nào */}
                    {completedServicesData.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          <i className="fas fa-vials fa-2x text-muted mb-2 opacity-50"></i>
                          <p className="text-muted mb-0">Chưa có kết quả xét nghiệm nào</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Footer với thống kê */}
              <Card.Footer className="bg-light py-3">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <small className="text-muted">
                      Hiển thị <strong>{completedServicesData.length}</strong> kết quả xét nghiệm •
                      Cập nhật: <strong>{new Date().toLocaleTimeString('vi-VN')}</strong>
                    </small>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <div className="d-flex justify-content-end gap-3">
                      <small className="text-muted">
                        <Badge bg="success" className="me-1">{completedServicesData.length}</Badge> Hoàn thành
                      </small>
                    </div>
                  </div>
                </div>
              </Card.Footer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TechnicianSection;