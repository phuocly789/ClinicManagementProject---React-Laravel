import React, { useState, useEffect } from 'react';
import {
  Card,
  ListGroup,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  Row,
  Col,
  Form,
  InputGroup,
  Accordion
} from 'react-bootstrap';
import Pagination from '../../Components/Pagination/Pagination';
import doctorService from '../../services/doctorService';
import Swal from 'sweetalert2';

const HistorySection = ({
  currentSection
}) => {
  const [allPatients, setAllPatients] = useState([]);
  const [displayPatients, setDisplayPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);

  // Hàm chuyển dịch lỗi BE sang thông báo FE thân thiện
  const translateError = (error) => {
    console.error('🔴 Backend Error:', error);

    const backendMessage = error.response?.data?.message || error.message || '';

    const errorMap = {
      'Patient not found': 'Không tìm thấy thông tin bệnh nhân',
      'No history found': 'Không có lịch sử khám bệnh',
      'Invalid patient ID': 'Mã bệnh nhân không hợp lệ',
      'Network Error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet',
      'Request failed with status code 404': 'Không tìm thấy dữ liệu',
      'Request failed with status code 500': 'Lỗi máy chủ. Vui lòng thử lại sau',
      'timeout of 5000ms exceeded': 'Quá thời gian chờ phản hồi',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (backendMessage.includes(key) || error.message.includes(key)) {
        return value;
      }
    }

    if (backendMessage) {
      return `Lỗi: ${backendMessage}`;
    }

    return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
  };

  // Hàm hiển thị confirmation với SweetAlert2
  const showConfirmation = async (options) => {
    const result = await Swal.fire({
      title: options.title || 'Xác nhận hành động',
      text: options.message || 'Bạn có chắc muốn thực hiện hành động này?',
      icon: options.icon || 'question',
      showCancelButton: true,
      confirmButtonColor: options.confirmColor || '#3085d6',
      cancelButtonColor: options.cancelColor || '#d33',
      confirmButtonText: options.confirmText || 'Xác nhận',
      cancelButtonText: options.cancelText || 'Hủy',
      showLoaderOnConfirm: options.showLoader || false,
      preConfirm: options.preConfirm || undefined,
      allowOutsideClick: () => !Swal.isLoading()
    });

    return result;
  };

  // Hàm hiển thị thông báo thành công
  const showSuccessAlert = (message) => {
    Swal.fire({
      title: 'Thành công!',
      text: message,
      icon: 'success',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK'
    });
  };

  // Fetch patients list
  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔄 DEBUG - Fetching all patients...');

        let response;
        let patientsData = [];

        try {
          response = await doctorService.getAllPatients();
          patientsData = response.data.data || response.data || [];
        } catch (error) {
          console.log('❌ getAllPatients failed, trying getToday...');
          response = await doctorService.getToday();
          patientsData = response.data.data || response.data || [];
        }

        console.log('✅ DEBUG - Patients data loaded:', patientsData);

        setAllPatients(patientsData);
        setFilteredPatients(patientsData);
        updatePagination(patientsData, 0);

      } catch (error) {
        const translatedError = translateError(error);
        console.error('❌ Error fetching patients:', error);
        setError(translatedError);
        setAllPatients([]);
        setFilteredPatients([]);
        setDisplayPatients([]);
        setPageCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Filter and sort patients
  useEffect(() => {
    let filtered = allPatients;

    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_id?.toString().includes(searchTerm) ||
        patient.phone?.includes(searchTerm)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'id':
          return (a.patient_id || 0) - (b.patient_id || 0);
        case 'age':
          return (a.age || 0) - (b.age || 0);
        default:
          return 0;
      }
    });

    setFilteredPatients(filtered);
    updatePagination(filtered, 0);
    setCurrentPage(0);
  }, [searchTerm, sortBy, allPatients]);

  // Update pagination
  const updatePagination = (patients, page) => {
    const totalPages = Math.ceil(patients.length / 10);
    setPageCount(totalPages);

    const startIndex = page * 10;
    const endIndex = startIndex + 10;
    setDisplayPatients(patients.slice(startIndex, endIndex));
  };

  // Handle page change
  const handlePageChange = (data) => {
    const newPage = data.selected;
    setCurrentPage(newPage);
    updatePagination(filteredPatients, newPage);
  };

  // XỬ LÝ CLICK CHI TIẾT
  const handlePatientDetailClick = async (patient) => {
    console.log('🔄 DEBUG - Clicked patient detail:', patient);

    const result = await showConfirmation({
      title: 'Xem chi tiết bệnh nhân',
      text: `Bạn có chắc muốn xem lịch sử khám bệnh của ${patient.name}?`,
      confirmText: 'Xem chi tiết',
      cancelText: 'Hủy',
      icon: 'info'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setSelectedPatient(patient);
      setPatientDetail(null);
      setHistory([]);
      setError(null);

      const patientId = patient.patient_id || patient.id;

      console.log('🆔 DEBUG - Patient ID to fetch history:', patientId);

      if (!patientId) {
        throw new Error('Không tìm thấy ID bệnh nhân');
      }

      await fetchPatientHistory(patientId);

      showSuccessAlert(`Đã tải lịch sử khám bệnh của ${patient.name}`);

    } catch (error) {
      const translatedError = translateError(error);
      console.error('❌ Error in handlePatientDetailClick:', error);
      setError(translatedError);

      Swal.fire({
        title: 'Lỗi!',
        text: translatedError,
        icon: 'error',
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
    }
  };

  // LẤY LỊCH SỬ - LẤY CẢ THÔNG TIN CHI TIẾT TỪ API HISTORY
  const fetchPatientHistory = async (patientId) => {
    if (!patientId) return;

    try {
      setHistoryLoading(true);
      setError(null);

      console.log('🌐 DEBUG - Calling history APIs...');

      let historyData = [];
      let patientDetailData = null;

      try {
        const response = await doctorService.getPatientHistory(patientId);
        console.log('🔍 DEBUG - Full API response:', response.data);
        console.log('🔍 DEBUG - Full API response:', response.patient);

        // API HISTORY TRẢ VỀ CẢ HISTORY VÀ PATIENT INFO
        historyData = response.data.data || response.data || [];
        patientDetailData = response.patient; // Lấy thông tin chi tiết từ API history

        console.log('✅ Used getPatientHistory API');
        console.log('✅ Patient detail from history API:', patientDetailData);

      } catch (error) {
        console.log('❌ getPatientHistory failed:', error);
        // ... các fallback APIs khác
      }

      setHistory(historyData);
      setPatientDetail(patientDetailData); // Set thông tin chi tiết
      setExpandedVisit(null);

      console.log(`✅ Loaded ${historyData.length} history records`);

    } catch (error) {
      const translatedError = translateError(error);
      console.error('❌ Error fetching patient history:', error);
      setError(translatedError);
      setHistory([]);
      setPatientDetail(null);
      throw error;
    } finally {
      setHistoryLoading(false);
    }
  };
  // Hàm quay lại danh sách
  const handleBackToList = async () => {
    if (history.length > 0) {
      const result = await showConfirmation({
        title: 'Quay lại danh sách',
        text: 'Bạn có chắc muốn quay lại danh sách? Dữ liệu lịch sử đang xem sẽ bị ẩn.',
        confirmText: 'Đồng ý',
        cancelText: 'Ở lại',
        icon: 'warning'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    setSelectedPatient(null);
    setPatientDetail(null);
    setHistory([]);
    setError(null);
    setExpandedVisit(null);
  };

  // Hàm xóa bộ lọc tìm kiếm
  const handleClearSearch = async () => {
    if (searchTerm) {
      const result = await showConfirmation({
        title: 'Xóa bộ lọc tìm kiếm',
        text: 'Bạn có chắc muốn xóa bộ lọc tìm kiếm hiện tại?',
        confirmText: 'Xóa bộ lọc',
        cancelText: 'Giữ nguyên',
        icon: 'question'
      });

      if (result.isConfirmed) {
        setSearchTerm('');
      }
    }
  };

  // Hàm reload dữ liệu
  const handleReloadData = async () => {
    const result = await showConfirmation({
      title: 'Tải lại dữ liệu',
      text: 'Bạn có chắc muốn tải lại toàn bộ dữ liệu bệnh nhân?',
      confirmText: 'Tải lại',
      cancelText: 'Hủy',
      icon: 'info',
      showLoader: true,
      preConfirm: async () => {
        try {
          setLoading(true);
          setError(null);

          let response;
          let patientsData = [];

          try {
            response = await doctorService.getAllPatients();
            patientsData = response.data.data || response.data || [];
          } catch (error) {
            console.log('❌ getAllPatients failed, trying getToday...');
            response = await doctorService.getToday();
            patientsData = response.data.data || response.data || [];
          }

          setAllPatients(patientsData);
          setFilteredPatients(patientsData);
          updatePagination(patientsData, 0);
          setCurrentPage(0);

          return patientsData;
        } catch (error) {
          const translatedError = translateError(error);
          setError(translatedError);
          Swal.showValidationMessage(`Lỗi: ${translatedError}`);
        } finally {
          setLoading(false);
        }
      }
    });

    if (result.isConfirmed) {
      showSuccessAlert('Đã tải lại dữ liệu thành công!');
    }
  };

  const toggleVisitExpansion = (index) => {
    setExpandedVisit(expandedVisit === index ? null : index);
  };

  const calculateTotalCost = (visit) => {
    const serviceCost = visit.total_service_cost || visit.service_cost || 0;
    const prescriptionCost = visit.total_prescription_cost || visit.prescription_cost || 0;
    return serviceCost + prescriptionCost;
  };

  const renderPrescriptionDetails = (prescription) => {
    const medicines = prescription.medicines || prescription.details || prescription.prescription_details || [];

    if (!medicines || medicines.length === 0) {
      return <p className="text-muted">Không có thông tin thuốc.</p>;
    }

    return (
      <Table striped bordered size="sm" className="mt-2">
        <thead>
          <tr>
            <th>Tên thuốc</th>
            <th>Số lượng</th>
            <th>Đơn vị</th>
            <th>Liều dùng</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((medicine, mIndex) => (
            <tr key={mIndex}>
              <td>{medicine.medicine_name || medicine.medicine || medicine.name || 'N/A'}</td>
              <td>{medicine.quantity || medicine.Quantity || 0}</td>
              <td>{medicine.unit || medicine.Unit || 'N/A'}</td>
              <td>{medicine.dosage || medicine.Dosage || medicine.usage || 'N/A'}</td>
              <td>{(medicine.unit_price || medicine.price || 0).toLocaleString()} VNĐ</td>
              <td>{(medicine.total_price || medicine.total || 0).toLocaleString()} VNĐ</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderServiceDetails = (services) => {
    if (!services || services.length === 0) {
      return <p className="text-muted">Không có dịch vụ nào.</p>;
    }

    return (
      <Table striped bordered size="sm" className="mt-2">
        <thead>
          <tr>
            <th>Tên dịch vụ</th>
            <th>Giá</th>
            <th>Trạng thái</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service, sIndex) => (
            <tr key={sIndex}>
              <td>{service.name || service.service_name || service.service_type || 'N/A'}</td>
              <td>{(service.price || service.cost || 0).toLocaleString()} VNĐ</td>
              <td>
                <Badge bg={
                  (service.status || '').toLowerCase() === 'hoàn thành' ? 'success' :
                    (service.status || '').toLowerCase() === 'đã chỉ định' ? 'primary' : 'secondary'
                }>
                  {service.status || 'Chưa xác định'}
                </Badge>
              </td>
              <td>{service.result || service.note || service.description || 'Chưa có'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <div className={`section ${currentSection === 'history' ? 'active' : ''}`} id="history">
      <Card>
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0"> Lịch Sử Bệnh Nhân</h5>
        </Card.Header>

        {!selectedPatient ? (
          // Render danh sách bệnh nhân
          <Card.Body>
            <Row className="mb-3">
              <Col md={6}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm theo tên, ID hoặc SĐT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      onClick={handleClearSearch}
                      title="Xóa bộ lọc tìm kiếm"
                    >
                      ✕
                    </Button>
                  )}
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Sắp xếp theo tên</option>
                  <option value="id">Sắp xếp theo ID</option>
                  <option value="age">Sắp xếp theo tuổi</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-muted small">
                    <i className="fas fa-layer-group text-primary"></i> Tổng: {filteredPatients.length} bệnh nhân
                  </div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleReloadData}
                    title="Tải lại dữ liệu"
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : <i className="fas fa-undo"></i>}
                  </Button>
                </div>
              </Col>
            </Row>

            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
                <p className="text-muted mt-2">Đang tải danh sách bệnh nhân...</p>
              </div>
            ) : error ? (
              <Alert variant="danger">
                <Alert.Heading> Lỗi tải danh sách</Alert.Heading>
                <p>{error}</p>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-danger"
                    onClick={handleReloadData}
                    disabled={loading}
                  >
                    {loading ? <Spinner size="sm" /> : 'Thử lại'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => setError(null)}
                  >
                    Đóng thông báo
                  </Button>
                </div>
              </Alert>
            ) : (
              <>
                <ListGroup variant="flush">
                  {displayPatients.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">Không tìm thấy bệnh nhân nào.</p>
                      <Button variant="outline-primary" onClick={handleClearSearch}>
                        Xóa bộ lọc
                      </Button>
                    </div>
                  ) : (
                    displayPatients.map(patient => (
                      <ListGroup.Item
                        key={patient.patient_id || patient.id}
                        action
                        onClick={() => handlePatientDetailClick(patient)}
                        className="patient-item"
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex w-100 justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">{patient.name}</h6>
                            <small className="text-muted">
                              ID: {patient.patient_id || patient.id} | Tuổi: {patient.age} | SĐT: {patient.phone}
                            </small>
                          </div>
                          <Badge bg="primary">
                            <i className="far fa-eye"></i> Chi tiết
                          </Badge>
                        </div>
                      </ListGroup.Item>
                    ))
                  )}
                </ListGroup>

                {pageCount > 1 && (
                  <div className="mt-3">
                    <Pagination
                      pageCount={pageCount}
                      onPageChange={handlePageChange}
                      currentPage={currentPage}
                      isLoading={loading}
                    />
                  </div>
                )}
              </>
            )}
          </Card.Body>
        ) : (
          // Render chi tiết bệnh nhân
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4>Chi Tiết Bệnh Nhân</h4>
                <p className="text-muted mb-0">
                  {patientDetail?.name || selectedPatient.name} - ID: {patientDetail?.patient_id || selectedPatient.patient_id || selectedPatient.id}
                </p>
              </div>
              <Button
                variant="outline-secondary"
                onClick={handleBackToList}
                disabled={historyLoading}
              >
                <i className="fas fa-arrow-left"></i> Quay lại danh sách
              </Button>
            </div>

            {historyLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" className="mb-3" />
                <p className="text-muted">Đang tải lịch sử khám...</p>
              </div>
            ) : error ? (
              <Alert variant="warning">
                <Alert.Heading>Thông báo</Alert.Heading>
                <p>{error}</p>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-warning"
                    onClick={() => handlePatientDetailClick(selectedPatient)}
                    disabled={historyLoading}
                  >
                    {historyLoading ? <Spinner size="sm" /> : ' Thử lại'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => setError(null)}
                  >
                    Đóng thông báo
                  </Button>
                </div>
              </Alert>
            ) : (
              <>
                <Row className="mb-4">
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light">
                        <strong><i className="fas fa-user-circle text-success"></i> Thông Tin Cá Nhân</strong>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <p><strong>Mã BN:</strong><br />{patientDetail?.patient_id || selectedPatient.patient_id || selectedPatient.id}</p>
                            <p><strong>Họ tên:</strong><br />{patientDetail?.name || selectedPatient.name}</p>
                            <p><strong>Ngày sinh:</strong><br />{patientDetail?.date_of_birth || 'N/A'}</p>
                            <p><strong>Tuổi:</strong><br />{patientDetail?.age || selectedPatient.age}</p>
                            <p><strong>Giới tính:</strong><br />{patientDetail?.gender || 'N/A'}</p>
                          </Col>
                          <Col md={6}>
                            <p><strong>SĐT:</strong><br />{patientDetail?.phone || selectedPatient.phone}</p>
                            <p><strong>Email:</strong><br />{patientDetail?.email || 'N/A'}</p>
                            <p><strong>Địa chỉ:</strong><br />{patientDetail?.address || selectedPatient.address || 'N/A'}</p>
                            <p><strong>Tiền sử bệnh:</strong><br />{patientDetail?.medical_history || 'N/A'}</p>
                            <p><strong>Ngày đăng ký:</strong><br />{patientDetail?.registered_date || 'N/A'}</p>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light">
                        <strong> <i className="fas fa-chart-pie text-warning"></i> Thống Kê</strong>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Tổng số lần khám:</strong> {history.length}</p>
                        <p><strong>Lần khám gần nhất:</strong> {history[0]?.visit_date || history[0]?.appointment_date || 'N/A'}</p>
                        <p><strong>Tổng chi phí ước tính:</strong> {' '}
                          {history.reduce((total, visit) => total + calculateTotalCost(visit), 0).toLocaleString()} VNĐ
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card>
                  <Card.Header className="bg-info text-white">
                    <h6 className="mb-0"><i className="fas fa-clock"></i> Lịch Sử Khám Bệnh ({history.length} lần)</h6>
                  </Card.Header>
                  <Card.Body>
                    {history.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted">Không có lịch sử khám bệnh.</p>
                      </div>
                    ) : (
                      <Accordion flush>
                        {history.map((visit, index) => (
                          <Accordion.Item key={index} eventKey={index.toString()}>
                            <Accordion.Header onClick={() => toggleVisitExpansion(index)}>
                              <div className="d-flex justify-content-between w-100 me-3">
                                <span>
                                  <strong>Lần khám {history.length - index}</strong> - {visit.visit_date || visit.appointment_date} {visit.time}
                                </span>
                                <div className="d-flex gap-2">
                                  <Badge bg={visit.status === 'Đã khám' ? 'success' : 'warning'}>
                                    {visit.status}
                                  </Badge>
                                  <Badge bg="secondary">
                                    {calculateTotalCost(visit).toLocaleString()} VNĐ
                                  </Badge>
                                </div>
                              </div>
                            </Accordion.Header>
                            <Accordion.Body>
                              <Row>
                                <Col md={6}>
                                  <p><strong>Triệu chứng:</strong> {visit.symptoms || 'Không có'}</p>
                                  <p><strong>Chẩn đoán:</strong> {visit.diagnosis || 'Không có'}</p>
                                  <p><strong>Ghi chú:</strong> {visit.notes || visit.note || 'Không có'}</p>
                                </Col>
                                <Col md={6}>
                                  <p><strong>Kết quả xét nghiệm:</strong> {visit.test_results || 'Chưa có'}</p>
                                  <p><strong>Bác sĩ:</strong> {visit.doctorName || 'N/A'}</p>
                                  <p><strong>Tổng chi phí:</strong> {calculateTotalCost(visit).toLocaleString()} VNĐ</p>
                                </Col>
                              </Row>

                              <div className="mt-3">
                                <h6>Dịch vụ đã sử dụng:</h6>
                                {renderServiceDetails(visit.services)}
                              </div>

                              <div className="mt-3">
                                <h6>Đơn thuốc:</h6>
                                {visit.prescriptions && visit.prescriptions.length > 0 ? (
                                  visit.prescriptions.map((prescription, pIndex) => (
                                    <Card key={pIndex} className="mb-3">
                                      <Card.Header className="bg-light">
                                        <strong>Đơn thuốc ngày: {prescription.prescription_date || prescription.created_at || visit.visit_date}</strong>
                                      </Card.Header>
                                      <Card.Body>
                                        <p><strong>Hướng dẫn:</strong> {prescription.instructions || prescription.note || 'Không có'}</p>
                                        {renderPrescriptionDetails(prescription)}
                                      </Card.Body>
                                    </Card>
                                  ))
                                ) : (
                                  <p className="text-muted">Không có đơn thuốc cho lần khám này.</p>
                                )}
                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    )}
                  </Card.Body>
                </Card>
              </>
            )}
          </Card.Body>
        )}
      </Card>
    </div>
  );
};

export default HistorySection;