import React, { useState, useEffect, useCallback } from 'react';
import { Container, Modal, Button, Toast, ToastContainer, Spinner } from 'react-bootstrap';
import Sidebar from '../Components/Sidebar';
import TodaySection from './Doctors/TodaySection';
import ScheduleSection from './Doctors/ScheduleSection';
import HistorySection from './Doctors/HistorySection';
import EventModalContent from './Doctors/EventModal';
import PrescriptionModalContent from './Doctors/PrescriptionModalContent';
import '../pages/Doctors/DoctorDashboard.css';

const API_BASE_URL = 'http://localhost:8000'; // Backend Laravel

const DoctorDashboard = () => {
  const [currentSection, setCurrentSection] = useState('today');
  const [todayPatients, setTodayPatients] = useState([]); // Từ /api/doctor/today-patients
  const [patients, setPatients] = useState([]); // Từ /api/doctor/patients
  const [events, setEvents] = useState([]); // Từ /api/doctor/staff-schedules
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedTodayPatient, setSelectedTodayPatient] = useState(null);
  const [prescriptionRows, setPrescriptionRows] = useState([]);
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [tests, setTests] = useState({ test1: false, test2: false, test3: false });
  const [requestedTests, setRequestedTests] = useState({});

  // Confirm và toast states
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // BỎ token và auth check - load trực tiếp

  // Fetch helper KHÔNG CẦN TOKEN (public API tạm thời)
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    try {
      const config = {
        headers: {
          'Accept': 'application/json',
          // BỎ Authorization header
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      };

      const response = await fetch(`${API_BASE_URL}/api${url}`, config);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      setToastMessage(`Lỗi API: ${error.message}`);
      setShowToast(true);
      throw error;
    }
  }, []);

  // Load data theo section
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      switch (currentSection) {
        case 'today':
          const todayData = await fetchWithAuth('/doctor/today-patients');
          setTodayPatients(todayData);
          break;
        case 'history':
          const patientsData = await fetchWithAuth('/doctor/patients');
          setPatients(patientsData);
          break;
        case 'schedule':
          const eventsData = await fetchWithAuth('/doctor/staff-schedules'); // Giả định endpoint
          setEvents(eventsData);
          break;
        default:
          break;
      }
    } catch (error) {
      // Error handled in fetchWithAuth
    } finally {
      setIsLoading(false);
    }
  }, [currentSection, fetchWithAuth]);

  // Load data khi section thay đổi - LUÔN LOAD, KHÔNG CHECK TOKEN
  useEffect(() => {
    loadData();
  }, [currentSection, loadData]);

  // Switch section và load data
  const switchSection = (section) => {
    setCurrentSection(section);
  };

  // Các handler khác (event, prescription, examination) như trước, nhưng dùng fetchWithAuth cho POST
  const handleEventSubmit = async (formData) => {
    try {
      setIsLoading(true);
      const method = editingEventId ? 'PUT' : 'POST';
      const url = editingEventId ? `/doctor/staff-schedules/${editingEventId}` : '/doctor/staff-schedules';
      const result = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setToastMessage(result.message || 'Lưu lịch thành công');
      setShowToast(true);
      loadData(); // Reload events
      closeEventModal();
    } catch (error) {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrescriptionSubmit = async (data) => {
    if (!selectedTodayPatient) return;
    try {
      setIsLoading(true);
      const result = await fetchWithAuth('/doctor/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, appointment_id: selectedTodayPatient.id }), // Dùng AppointmentId
      });
      setToastMessage(result.message || 'Thêm thuốc thành công');
      setShowToast(true);
      setPrescriptionRows([...prescriptionRows, data]);
      closePrescriptionModal();
    } catch (error) {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  // Handler cho examination (lưu/tạm lưu, cập nhật Appointment Status)
  const handleExaminationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTodayPatient) return;
    const isSave = confirmType === 'save';
    try {
      setIsProcessing(true);
      const data = {
        appointment_id: selectedTodayPatient.id, // AppointmentId
        patient_id: selectedTodayPatient.patient_id,
        symptoms,
        diagnosis,
        tests: Object.keys(tests).filter(k => tests[k]),
        requested_tests: Object.keys(requestedTests).filter(k => requestedTests[k]),
        prescriptions: prescriptionRows,
        is_complete: isSave,
      };
      const method = isSave ? 'POST' : 'PATCH';
      const result = await fetchWithAuth('/doctor/examinations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setToastMessage(result.message || (isSave ? 'Hoàn tất hồ sơ' : 'Tạm lưu thành công'));
      setShowToast(true);
      if (isSave) {
        // Reset form
        setSymptoms(''); setDiagnosis(''); setTests({ test1: false, test2: false, test3: false });
        setPrescriptionRows([]); setSelectedTodayPatient(null);
      }
      setShowConfirm(false);
    } catch (error) {
      // Handled
    } finally {
      setIsProcessing(false);
    }
  };

  // Các function khác (open/close modal, prev/next month, etc.) giữ nguyên như code gốc
  const openEventModal = (eventId = null) => { setEditingEventId(eventId); setShowEventModal(true); };
  const closeEventModal = () => { setShowEventModal(false); setEditingEventId(null); };
  const openPrescriptionModal = () => setShowPrescriptionModal(true);
  const closePrescriptionModal = () => setShowPrescriptionModal(false);
  const handleTempSave = () => { setConfirmType('temp'); setShowConfirm(true); };
  const handleConfirmSave = () => { setConfirmType('save'); setShowConfirm(true); };
  const processConfirm = () => handleExaminationSubmit({ preventDefault: () => {} });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // BỎ check token - dashboard load trực tiếp

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar currentSection={currentSection} switchSection={switchSection} />
      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        <Container fluid>
          <div className="alert alert-success mb-4 tab-container">
            <h2 className="alert-heading mb-0">Bảng Điều Khiển Của Bác Sĩ</h2>
          </div>

          {isLoading && <Spinner animation="border" className="position-fixed top-50 start-50 translate-middle" />}

          {currentSection === 'today' && (
            <TodaySection
              currentSection={currentSection}
              prescriptionRows={prescriptionRows}
              setPrescriptionRows={setPrescriptionRows}
              removePrescription={(index) => setPrescriptionRows(prescriptionRows.filter((_, i) => i !== index))}
              editPrescription={(data, index) => {
                const updated = [...prescriptionRows];
                updated[index] = data;
                setPrescriptionRows(updated);
              }}
              symptoms={symptoms} setSymptoms={setSymptoms}
              diagnosis={diagnosis} setDiagnosis={setDiagnosis}
              tests={tests} setTests={setTests}
              requestedTests={requestedTests} setRequestedTests={setRequestedTests}
              openPrescriptionModal={openPrescriptionModal}
              handleExaminationSubmit={handleConfirmSave}
              handleTempSave={handleTempSave}
              selectedTodayPatient={selectedTodayPatient}
              setSelectedTodayPatient={setSelectedTodayPatient}
              todayPatients={todayPatients} // Từ API
            />
          )}

          {currentSection === 'schedule' && (
            <ScheduleSection
              currentSection={currentSection}
              events={events} // Từ API
              currentDate={currentDate}
              openEventModal={openEventModal}
              prevMonth={prevMonth}
              nextMonth={nextMonth}
            />
          )}

          {currentSection === 'history' && (
            <HistorySection
              currentSection={currentSection}
              patients={patients} // Từ API
              selectedPatient={selectedPatient}
              setSelectedPatient={setSelectedPatient}
            />
          )}
        </Container>
      </div>

      {/* Modals và Toast giữ nguyên như code gốc */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>{confirmType === 'save' ? 'Xác nhận lưu hồ sơ' : 'Xác nhận tạm lưu'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{confirmType === 'save' ? 'Hoàn tất hồ sơ?' : 'Tạm lưu?'} </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>Hủy</Button>
          <Button variant="success" onClick={processConfirm} disabled={isProcessing}>
            {isProcessing ? <><Spinner size="sm" className="me-2" /> Đang xử lý...</> : 'Xác nhận'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg="success" show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Event Modal */}
      <Modal show={showEventModal} onHide={closeEventModal} centered size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>{editingEventId ? 'Sửa Lịch' : 'Thêm Lịch'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EventModalContent editingEventId={editingEventId} events={events} onSubmit={handleEventSubmit} onClose={closeEventModal} />
        </Modal.Body>
      </Modal>

      {/* Prescription Modal */}
      <Modal show={showPrescriptionModal} onHide={closePrescriptionModal} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Thêm Thuốc</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PrescriptionModalContent onSubmit={handlePrescriptionSubmit} onClose={closePrescriptionModal} />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DoctorDashboard;