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
  currentSection,
  selectedPatient,
  setSelectedPatient
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

  // Fetch history khi chọn patient
  useEffect(() => {
    if (selectedPatient) {
      const fetchHistory = async () => {
        const patientId = selectedPatient.patient_id;
        console.log('DEBUG - Fetching history for patient_id:', patientId);

        if (!patientId) {
          console.warn('No patient_id, skipping fetch');
          setError('Chưa có ID bệnh nhân hợp lệ.');
          setHistory([]);
          return;
        }

        try {
          setHistoryLoading(true);
          setError(null);

          const response = await fetch(`${API_BASE_URL}/api/doctor/patients/${patientId}/history`);
          console.log('DEBUG - History response status:', response.status);

          // Kiểm tra nếu response không OK
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

            // Thử đọc response text thay vì JSON
            try {
              const errorText = await response.text();
              console.error('DEBUG - History error body:', errorText);

              // Kiểm tra nếu errorText là HTML (thường do Laravel error page)
              if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
                errorMessage = `Lỗi server (${response.status}). Vui lòng thử lại sau.`;
              } else if (errorText) {
                errorMessage = errorText;
              }
            } catch (textError) {
              console.error('DEBUG - Cannot read error text:', textError);
            }

            setError(errorMessage);
            setHistory([]);
            return;
          }

          // Thử parse JSON
          let result;
          try {
            const responseText = await response.text();
            console.log('DEBUG - History response text:', responseText);

            if (!responseText.trim()) {
              throw new Error('Response trống');
            }

            result = JSON.parse(responseText);
          } catch (parseError) {
            console.error('DEBUG - JSON parse error:', parseError);
            throw new Error(`Dữ liệu trả về không hợp lệ: ${parseError.message}`);
          }

          console.log('DEBUG - History parsed data:', result);

          if (!result.success) {
            throw new Error(result.message || 'API response invalid');
          }

          setHistory(result.data || []);
          setExpandedVisit(null);

        } catch (error) {
          console.error('Error fetching history:', error);
          setError(`Lỗi: ${error.message}`);
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      };

      fetchHistory();
    } else {
      setHistory([]);
      setError(null);
      setExpandedVisit(null);
    }
  }, [selectedPatient]);

  const toggleVisitExpansion = (index) => {
    setExpandedVisit(expandedVisit === index ? null : index);
  };

  const calculateTotalCost = (visit) => {
    const serviceCost = visit.total_service_cost || 0;
    const prescriptionCost = visit.total_prescription_cost || 0;
    return serviceCost + prescriptionCost;
  };

  const renderPatientList = () => {
    return displayPatients.map(patient => (
      <ListGroup.Item
        key={patient.patient_id}
        action
        onClick={() => setSelectedPatient(patient)}
        className="patient-item"
      >
        <div className="d-flex w-100 justify-content-between align-items-center">
          <div>
            <h6 className="mb-1">{patient.name}</h6>
            <small className="text-muted">
              ID: {patient.patient_id} | Tuổi: {patient.age} | SĐT: {patient.phone}
            </small>
          </div>
          <Badge bg="primary">Chi tiết</Badge>
        </div>
      </ListGroup.Item>
    ));
  };

  const renderHistoryDetails = () => {
    if (!selectedPatient) return (
      <Card.Body>
        <p className="text-center text-muted">Chưa chọn bệnh nhân.</p>
      </Card.Body>
    );

    if (historyLoading) return (
      <Card.Body className="text-center">
        <Spinner animation="border" className="mb-3" />
        <p className="text-muted">Đang tải lịch sử khám...</p>
      </Card.Body>
    );

    if (error) return (
      <Card.Body>
        <Alert variant="warning">
          <Alert.Heading>Lỗi tải lịch sử</Alert.Heading>
          <p>{error}</p>
          <div className="d-flex gap-2">
            <Button variant="outline-warning" onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
            <Button variant="outline-secondary" onClick={() => setSelectedPatient(null)}>
              Quay lại
            </Button>
          </div>
        </Alert>
      </Card.Body>
    );

    return (
      <>
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">{selectedPatient.name}</h5>
              <small>Mã BN: {selectedPatient.patient_id}</small>
            </div>
            <Button variant="light" onClick={() => setSelectedPatient(null)}>
              ← Quay lại
            </Button>
          </div>
        </Card.Header>

        <Card.Body>
          <Row className="mb-4">
            <Col md={6}>
              <Card>
                <Card.Header className="bg-light">
                  <strong>Thông Tin Cá Nhân</strong>
                </Card.Header>
                <Card.Body>
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
                  <strong>Thống Kê</strong>
                </Card.Header>
                <Card.Body>
                  <p><strong>Tổng số lần khám:</strong> {history.length}</p>
                  <p><strong>Lần khám gần nhất:</strong> {history[0]?.visit_date || 'N/A'}</p>
                  <p><strong>Tổng chi phí ước tính:</strong> {' '}
                    {history.reduce((total, visit) => total + calculateTotalCost(visit), 0).toLocaleString()} VNĐ
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card>
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">Lịch Sử Khám Bệnh</h6>
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
                            <strong>Lần khám {history.length - index}</strong> - {visit.visit_date} {visit.time}
                          </span>
                          <Badge bg={visit.status === 'Đã khám' ? 'success' : 'warning'}>
                            {visit.status}
                          </Badge>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <Row>
                          <Col md={6}>
                            <p><strong>Triệu chứng:</strong> {visit.symptoms || 'Không có'}</p>
                            <p><strong>Chẩn đoán:</strong> {visit.diagnosis || 'Không có'}</p>
                            <p><strong>Ghi chú:</strong> {visit.notes || 'Không có'}</p>
                          </Col>
                          <Col md={6}>
                            <p><strong>Kết quả xét nghiệm:</strong> {visit.test_results || 'Chưa có'}</p>
                            <p><strong>Tổng chi phí:</strong> {calculateTotalCost(visit).toLocaleString()} VNĐ</p>
                          </Col>
                        </Row>

                        {/* Dịch vụ */}
                        {visit.services && visit.services.length > 0 && (
                          <div className="mt-3">
                            <h6>Dịch vụ đã sử dụng:</h6>
                            <Table striped bordered size="sm">
                              <thead>
                                <tr>
                                  <th>Tên dịch vụ</th>
                                  <th>Giá</th>
                                  <th>Trạng thái</th>
                                  <th>Kết quả</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visit.services.map((service, sIndex) => (
                                  <tr key={sIndex}>
                                    <td>{service.name}</td>
                                    <td>{service.price?.toLocaleString()} VNĐ</td>
                                    <td>
                                      <Badge bg={
                                        service.status === 'Hoàn thành' ? 'success' :
                                          service.status === 'Đã chỉ định' ? 'primary' : 'secondary'
                                      }>
                                        {service.status}
                                      </Badge>
                                    </td>
                                    <td>{service.result}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )}

                        {/* Đơn thuốc */}
                        {visit.prescriptions && visit.prescriptions.length > 0 ? (
                          <div className="mt-3">
                            <h6>Đơn thuốc:</h6>
                            {visit.prescriptions.map((prescription, pIndex) => (
                              <Card key={pIndex} className="mb-3">
                                <Card.Header className="bg-light">
                                  <strong>Đơn thuốc ngày: {prescription.prescription_date}</strong>
                                </Card.Header>
                                <Card.Body>
                                  <p><strong>Hướng dẫn:</strong> {prescription.instructions}</p>
                                  <Table striped bordered size="sm">
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
                                      {prescription.medicines.map((medicine, mIndex) => (
                                        <tr key={mIndex}>
                                          <td>{medicine.medicine_name}</td>
                                          <td>{medicine.quantity}</td>
                                          <td>{medicine.unit}</td>
                                          <td>{medicine.dosage}</td>
                                          <td>{medicine.unit_price?.toLocaleString()} VNĐ</td>
                                          <td>{medicine.total_price?.toLocaleString()} VNĐ</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </Card.Body>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted mt-3">Không có đơn thuốc cho lần khám này.</p>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              )}
            </Card.Body>
          </Card>
        </Card.Body>
      </>
    );
  };

  return (
    <div className={`section ${currentSection === 'history' ? 'active' : ''}`} id="history">
      <Card>
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">Lịch Sử Bệnh Nhân</h5>
        </Card.Header>

        {!selectedPatient ? (
          <Card.Body>
            {/* Search and Filter Section */}
            <Row className="mb-3">
              <Col md={6}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm theo tên, ID hoặc SĐT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                    Xóa
                  </Button>
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
                  Tổng: {filteredPatients.length} bệnh nhân
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
                <Alert.Heading>Lỗi tải danh sách</Alert.Heading>
                <p>{error}</p>
                <Button variant="outline-danger" onClick={() => window.location.reload()}>
                  Thử lại
                </Button>
              </Alert>
            ) : (
              <>
                <ListGroup variant="flush">
                  {displayPatients.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">Không tìm thấy bệnh nhân nào.</p>
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
        ) : (
          <Card.Body>
            {renderHistoryDetails()}
          </Card.Body>
        )}
      </Card>
    </div>
  );
};

export default HistorySection;