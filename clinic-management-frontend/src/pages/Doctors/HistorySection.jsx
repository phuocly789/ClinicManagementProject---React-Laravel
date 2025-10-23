import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Table, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import Pagination from '../../Components/Pagination/Pagination'; // Adjust path nếu cần

const API_BASE_URL = 'http://localhost:8000';

const HistorySection = ({ 
  currentSection,
  selectedPatient, 
  setSelectedPatient
}) => {
  const [allPatients, setAllPatients] = useState([]); // Full list từ API
  const [displayPatients, setDisplayPatients] = useState([]); // Paginated slice
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch patients list (chỉ khi mount hoặc cần reload)
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
        // Calculate pagination (10 per page)
        const totalPages = Math.ceil(patientsData.length / 10);
        setPageCount(totalPages);
        setCurrentPage(0); // Reset to first page
        // Update display patients
        const startIndex = 0 * 10;
        const endIndex = startIndex + 10;
        setDisplayPatients(patientsData.slice(startIndex, endIndex));
      } catch (error) {
        console.error('Error fetching patients:', error);
        setError(error.message);
        setAllPatients([]);
        setDisplayPatients([]);
        setPageCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []); // Chỉ load 1 lần khi component mount

  // Handle page change
  const handlePageChange = (data) => {
    const newPage = data.selected;
    setCurrentPage(newPage);
    // Update display patients
    const startIndex = newPage * 10;
    const endIndex = startIndex + 10;
    setDisplayPatients(allPatients.slice(startIndex, endIndex));
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
          if (!response.ok) {
            const errorText = await response.text();
            console.error('DEBUG - History error body:', errorText);
            if (response.status === 404) {
              setError('API lịch sử bệnh nhân chưa sẵn sàng (404). Vui lòng liên hệ admin.');
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            setHistory([]);
            return;
          }
          const result = await response.json();
          console.log('DEBUG - History data:', result);
          if (!result.success) {
            throw new Error(result.message || 'API response invalid');
          }
          setHistory(result.data || []);
        } catch (error) {
          console.error('Error fetching history:', error);
          setError(error.message);
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      };

      fetchHistory();
    } else {
      setHistory([]);
      setError(null);
    }
  }, [selectedPatient]);

  const renderPatientList = () => {
    return displayPatients.map(patient => (
      <ListGroup.Item key={patient.patient_id} action onClick={() => setSelectedPatient(patient)}>
        <div className="d-flex w-100 justify-content-between">
          <h6 className="mb-1">{patient.name} - {patient.patient_id}</h6>
          <Badge bg="success">Xem chi tiết</Badge>
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
      <Card.Body>
        <Spinner animation="border" className="d-block mx-auto" />
        <p className="text-center text-muted">Đang tải lịch sử khám...</p>
      </Card.Body>
    );

    if (error) return (
      <Card.Body>
        <Alert variant="warning">
          <Alert.Heading>Lỗi tải lịch sử</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-warning" onClick={() => window.location.reload()}>Thử lại</Button>
        </Alert>
      </Card.Body>
    );

    return (
      <>
        <Card.Header>
          <h5>Thông Tin Bệnh Nhân: {selectedPatient.name}</h5>
        </Card.Header>
        <Card.Body>
          <p><strong>Mã BN:</strong> {selectedPatient.patient_id}</p>
          <p><strong>Tuổi:</strong> {selectedPatient.age}</p>
          <p><strong>Giới tính:</strong> {selectedPatient.gender}</p>
          <p><strong>SĐT:</strong> {selectedPatient.phone}</p>
          <p><strong>Địa chỉ:</strong> {selectedPatient.address || 'N/A'}</p>
          <Card.Header className="mt-3">
            <h6>Lịch Sử Khám Bệnh</h6>
          </Card.Header>
          {history.length === 0 ? (
            <p className="text-muted">Không có lịch sử khám bệnh.</p>
          ) : (
            history.map((visit, index) => (
              <Card.Body key={index}>
                <h6>Ngày khám: {visit.visit_date || 'N/A'} - Giờ: {visit.time || 'N/A'}</h6>
                <p><strong>Triệu chứng:</strong> {visit.symptoms || 'N/A'}</p>
                <p><strong>Chẩn đoán:</strong> {visit.diagnosis || 'N/A'}</p>
                <p><strong>Xét nghiệm:</strong> 
                  {visit.services && visit.services.length > 0 ? (
                    <ul>
                      {visit.services.map((service, sIndex) => (
                        <li key={sIndex}>{service.name} - {service.price} VNĐ</li>
                      ))}
                    </ul>
                  ) : 'Không có'}
                </p>
                <p><strong>Kết quả xét nghiệm:</strong> {visit.test_results || 'Chưa có'}</p>
                <p><strong>Ghi chú:</strong> {visit.notes || 'N/A'}</p>
                <Table striped bordered hover responsive className="mt-2">
                  <thead>
                    <tr>
                      <th>Tên thuốc</th>
                      <th>Số lượng</th>
                      <th>Liều dùng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visit.prescriptions && visit.prescriptions.length > 0 ? (
                      visit.prescriptions.map((presc, pIndex) => (
                        <tr key={pIndex}>
                          <td>{presc.medicine || 'N/A'}</td>
                          <td>{presc.quantity || 'N/A'}</td>
                          <td>{presc.dosage || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="text-center text-muted">Không có đơn thuốc</td></tr>
                    )}
                  </tbody>
                </Table>
                <hr />
              </Card.Body>
            ))
          )}
          <Button variant="secondary" onClick={() => setSelectedPatient(null)}>Quay lại danh sách</Button>
        </Card.Body>
      </>
    );
  };

  return (
    <div className={`section ${currentSection === 'history' ? 'active' : ''}`} id="history">
      <Card>
        <Card.Header>
          <h5>Lịch Sử Bệnh Nhân</h5>
        </Card.Header>
        {!selectedPatient ? (
          <Card.Body>
            {loading ? (
              <Spinner animation="border" className="d-block mx-auto" />
            ) : error ? (
              <Alert variant="danger">
                <Alert.Heading>Lỗi tải danh sách</Alert.Heading>
                <p>{error}</p>
                <Button variant="outline-danger" onClick={() => window.location.reload()}>Thử lại</Button>
              </Alert>
            ) : (
              <>
                <ListGroup variant="flush">
                  {displayPatients.length === 0 ? (
                    <p className="text-muted">Không có bệnh nhân.</p>
                  ) : (
                    renderPatientList()
                  )}
                </ListGroup>
                {/* Pagination cho danh sách bệnh nhân */}
                <Pagination
                  pageCount={pageCount}
                  onPageChange={handlePageChange}
                  currentPage={currentPage}
                  isLoading={loading}
                />
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