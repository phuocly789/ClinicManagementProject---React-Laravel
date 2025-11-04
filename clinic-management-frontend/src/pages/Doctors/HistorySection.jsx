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

const API_BASE_URL = 'http://localhost:8000';

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
  
  // FIX: Sử dụng state nội bộ thay vì prop
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Fetch patients list
  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/doctor/patients`);
        console.log('DEBUG - Patients response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('DEBUG - Patients error body:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('DEBUG - All patients loaded:', result);

        if (!result.success) {
          throw new Error(result.message || 'API response invalid');
        }

        const patientsData = result.data || result || [];
        setAllPatients(patientsData);
        setFilteredPatients(patientsData);
        updatePagination(patientsData, 0);

      } catch (error) {
        console.error('Error fetching patients:', error);
        setError(error.message);
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

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_id?.toString().includes(searchTerm) ||
        patient.phone?.includes(searchTerm)
      );
    }

    // Apply sorting
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

  // FIXED: HÀM XỬ LÝ CLICK CHI TIẾT
  const handlePatientDetailClick = async (patient) => {
    console.log('🔄 DEBUG - Clicked patient detail:', patient);
    
    try {
      // ẨN DANH SÁCH, HIỆN CHI TIẾT
      setSelectedPatient(patient);
      setHistory([]); // Reset history trước khi load mới
      setError(null);
      
      const patientId = patient.patient_id || patient.id;
      console.log('🆔 DEBUG - Patient ID to fetch history:', patientId);

      if (!patientId) {
        setError('Không tìm thấy ID bệnh nhân');
        return;
      }

      // GỌI API ĐỂ LẤY LỊCH SỬ
      await fetchPatientHistory(patientId);
    } catch (error) {
      console.error('❌ Error in handlePatientDetailClick:', error);
      setError(`Lỗi khi chọn bệnh nhân: ${error.message}`);
    }
  };

  // FIXED: HÀM GỌI API LỊCH SỬ
  const fetchPatientHistory = async (patientId) => {
    if (!patientId) return;

    try {
      setHistoryLoading(true);
      setError(null);

      console.log('🌐 DEBUG - Calling API for history...');
      
      const endpoints = [
        `${API_BASE_URL}/api/doctor/patients/${patientId}/history`,
        `${API_BASE_URL}/api/doctor/patients/${patientId}/medical-history`,
        `${API_BASE_URL}/api/doctor/patients/${patientId}/examinations`,
        `${API_BASE_URL}/api/patients/${patientId}/history`
      ];

      let response = null;
      let workingEndpoint = '';

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          response = await fetch(endpoint);
          
          if (response.ok) {
            workingEndpoint = endpoint;
            console.log(`✅ Found working endpoint: ${endpoint}`);
            break;
          }
        } catch (err) {
          console.log(`❌ Endpoint failed: ${endpoint}`, err);
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Không tìm thấy endpoint phù hợp. Status: ${response?.status}`);
      }

      const result = await response.json();
      console.log('📄 DEBUG - History API response data:', result);

      let historyData = [];
      
      if (result.success && result.data) {
        historyData = result.data;
      } else if (Array.isArray(result)) {
        historyData = result;
      } else if (result.data && Array.isArray(result.data)) {
        historyData = result.data;
      } else if (result.history) {
        historyData = result.history;
      } else {
        console.warn('⚠️ Unexpected response format:', result);
        historyData = result || [];
      }

      setHistory(historyData);
      setExpandedVisit(null);

      console.log(`✅ Loaded ${historyData.length} history records`);

    } catch (error) {
      console.error('❌ Error fetching patient history:', error);
      setError(`Lỗi tải lịch sử: ${error.message}`);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // FIXED: HÀM QUAY LẠI DANH SÁCH
  const handleBackToList = () => {
    setSelectedPatient(null);
    setHistory([]);
    setError(null);
    setExpandedVisit(null);
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

  const renderPatientList = () => {
    return displayPatients.map(patient => (
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
            👁️ Chi tiết
          </Badge>
        </div>
      </ListGroup.Item>
    ));
  };

  // RENDER DANH SÁCH BỆNH NHÂN
  const renderPatientListView = () => {
    return (
      <Card.Body>
        {/* Search and Filter Section */}
        <Row className="mb-3">
          <Col md={6}>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="🔍 Tìm kiếm theo tên, ID hoặc SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
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
            <div className="text-muted small">
              📊 Tổng: {filteredPatients.length} bệnh nhân
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
            <Alert.Heading>❌ Lỗi tải danh sách</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={() => window.location.reload()}>
              🔄 Thử lại
            </Button>
          </Alert>
        ) : (
          <>
            <ListGroup variant="flush">
              {displayPatients.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">Không tìm thấy bệnh nhân nào.</p>
                  <Button variant="outline-primary" onClick={() => setSearchTerm('')}>
                    Xóa bộ lọc
                  </Button>
                </div>
              ) : (
                renderPatientList()
              )}
            </ListGroup>

            {/* Pagination */}
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
    );
  };

  // RENDER CHI TIẾT BỆNH NHÂN
  const renderPatientDetailView = () => {
    if (!selectedPatient) return null;

    return (
      <Card.Body>
        {/* HEADER CHI TIẾT */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4>📋 Chi Tiết Bệnh Nhân</h4>
            <p className="text-muted mb-0">
              {selectedPatient.name} - ID: {selectedPatient.patient_id || selectedPatient.id}
            </p>
          </div>
          <Button variant="outline-secondary" onClick={handleBackToList}>
            ← Quay lại danh sách
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
            <Button variant="outline-warning" onClick={() => handlePatientDetailClick(selectedPatient)}>
              🔄 Thử lại
            </Button>
          </Alert>
        ) : (
          <>
            {/* THÔNG TIN CÁ NHÂN */}
            <Row className="mb-4">
              <Col md={6}>
                <Card>
                  <Card.Header className="bg-light">
                    <strong>👤 Thông Tin Cá Nhân</strong>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Họ tên:</strong> {selectedPatient.name}</p>
                    <p><strong>Mã BN:</strong> {selectedPatient.patient_id || selectedPatient.id}</p>
                    <p><strong>Tuổi:</strong> {selectedPatient.age}</p>
                    <p><strong>Giới tính:</strong> {selectedPatient.gender}</p>
                    <p><strong>SĐT:</strong> {selectedPatient.phone}</p>
                    <p><strong>Địa chỉ:</strong> {selectedPatient.address || 'N/A'}</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card>
                  <Card.Header className="bg-light">
                    <strong>📊 Thống Kê</strong>
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

            {/* LỊCH SỬ KHÁM BỆNH */}
            <Card>
              <Card.Header className="bg-info text-white">
                <h6 className="mb-0">🏥 Lịch Sử Khám Bệnh ({history.length} lần)</h6>
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
                              <p><strong>Bác sĩ:</strong> {visit.doctor_name || visit.doctor || 'N/A'}</p>
                              <p><strong>Tổng chi phí:</strong> {calculateTotalCost(visit).toLocaleString()} VNĐ</p>
                            </Col>
                          </Row>

                          {/* Dịch vụ */}
                          <div className="mt-3">
                            <h6>🩺 Dịch vụ đã sử dụng:</h6>
                            {renderServiceDetails(visit.services)}
                          </div>

                          {/* Đơn thuốc */}
                          <div className="mt-3">
                            <h6>💊 Đơn thuốc:</h6>
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
    );
  };

  return (
    <div className={`section ${currentSection === 'history' ? 'active' : ''}`} id="history">
      <Card>
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">📁 Lịch Sử Bệnh Nhân</h5>
        </Card.Header>

        {/* TOGGLE VIEW: DANH SÁCH HOẶC CHI TIẾT */}
        {!selectedPatient ? renderPatientListView() : renderPatientDetailView()}
      </Card>
    </div>
  );
};

export default HistorySection;