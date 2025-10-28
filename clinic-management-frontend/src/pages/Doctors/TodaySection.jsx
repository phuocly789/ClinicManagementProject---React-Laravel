import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Badge,
} from "react-bootstrap";
import Swal from 'sweetalert2';

import PatientList from '../Doctors/DotorTodayCompo/PatientList';
import DiagnosisSection from '../Doctors/DotorTodayCompo/DiagnosisSection';
import ServicesSection from '../Doctors/DotorTodayCompo/ServicesSection';
import PrescriptionSection from '../Doctors/DotorTodayCompo/PrescriptionSection';
import doctorService from "../../services/doctorService";

const API_BASE_URL = 'http://localhost:8000';

const TodaySection = ({
  currentSection = "today",
  prescriptionRows = [],
  setPrescriptionRows = () => { },
  removePrescription = () => { },
  editPrescription = () => { },
  symptoms = "",
  setSymptoms = () => { },
  diagnosis = "",
  setDiagnosis = () => { },
  services = {},
  setServices = () => { },
  requestedServices = {},
  setRequestedServices = () => { },
  openPrescriptionModal = () => { },
  selectedTodayPatient = null,
  setSelectedTodayPatient = () => { },
  todayPatients = [],
  setToast = () => { },
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExamining, setIsExamining] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [diagnoses, setDiagnoses] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const printRef = useRef(null);
  const cache = useRef(new Map());

  const isFormDisabled = viewMode || !selectedTodayPatient || selectedTodayPatient?.status !== 'Đang khám';

  const getStatusVariant = useCallback((status) => {
    if (!status) return "secondary";
    switch (status.toLowerCase()) {
      case "done": case "đã khám": return "success";
      case "in-progress": case "đang khám": return "info";
      case "waiting": case "đang chờ": case "chờ khám": return "warning";
      default: return "secondary";
    }
  }, []);

  const getStatusText = useCallback((status) => {
    if (!status) return "";
    if (["Đã khám", "Đang khám", "Đang chờ"].includes(status)) return status;
    switch (status.toLowerCase()) {
      case "done": return "Đã khám";
      case "in-progress": return "Đang khám";
      case "waiting": return "Đang chờ";
      default: return status;
    }
  }, []);

  const filterValidStatuses = useCallback((patients) => {
    const validStatuses = ["Đã khám", "Đang khám", "Đang chờ"];
    return patients.filter(patient => validStatuses.includes(getStatusText(patient.status)));
  }, [getStatusText]);

  const fetchTodayPatients = async () => {
    try {
      setIsLoading(true);
      const response = await doctorService.getToday();
      if (response.success === true) {
        const filteredData = filterValidStatuses(response.data);
        cache.current.set('today-patients', response.data);
      } else {
        console.warn('API response success is false:', response);
      }
    } catch (error) {
      console.error('Error fetching today patients:', error);
      setToast({
        show: true,
        message: `Lỗi tải danh sách bệnh nhân: ${error.message}`,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayPatients();
  }, []);

  const loadCompletedExam = useCallback(async (patientId) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/doctor/examinations/${patientId}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Không tải được hồ sơ`);
      const data = await response.json();

      setSymptoms(data.symptoms || '');
      setDiagnosis(data.diagnosis || '');
      setServices(data.services || {});
      setRequestedServices(data.requestedServices || {});
      setPrescriptionRows(data.prescriptions || []);
      setDiagnoses(data.diagnoses ? [data.diagnoses] : []);

      setToast({ show: true, message: '✅ Đã tải hồ sơ cũ để xem.', variant: 'info' });
    } catch (error) {
      console.error('Error loading completed exam:', error);
      setToast({ show: true, message: `Lỗi tải hồ sơ: ${error.message}`, variant: 'danger' });
    } finally {
      setIsLoading(false);
    }
  }, [setToast, setSymptoms, setDiagnosis, setServices, setRequestedServices, setPrescriptionRows]);

  const startExamination = useCallback(async (patientId) => {
    if (!patientId) return null;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/doctor/examinations/${patientId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Không thể bắt đầu khám`);

      const result = await response.json();
      console.log('DEBUG - API start response:', result);

      setSelectedTodayPatient(prev => prev ? { ...prev, status: 'Đang khám' } : null);
      setIsExamining(true);
      setViewMode(false);
      setToast({ show: true, message: '✅ Đã bắt đầu khám bệnh nhân.', variant: 'info' });

      // CHỈ REFRESH KHI BẮT ĐẦU KHÁM
      await fetchTodayPatients();
      setRefreshTrigger(prev => prev + 1);

      return result.data;
    } catch (error) {
      console.error('Error starting exam:', error);
      setToast({ show: true, message: `Lỗi bắt đầu khám: ${error.message}`, variant: 'danger' });
      setSelectedTodayPatient(prev => prev ? { ...prev, status: 'Đang khám' } : null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setToast, setSelectedTodayPatient]);

  const handleSelectPatient = useCallback(async (patient) => {
    if (!patient) {
      setSelectedTodayPatient(null);
      setIsExamining(false);
      setViewMode(false);
      setSymptoms('');
      setDiagnosis('');
      setServices({});
      setRequestedServices({});
      setPrescriptionRows([]);
      setDiagnoses([]);
      return;
    }

    const currentStatus = getStatusText(patient.status);
    if (currentStatus === 'Đang khám') {
      setSelectedTodayPatient(patient);
      setIsExamining(true);
      setViewMode(false);
    } else if (currentStatus === 'Đang chờ') {
      await startExamination(patient.id || patient.AppointmentId);
    } else if (currentStatus === 'Đã khám') {
      setSelectedTodayPatient(patient);
      setViewMode(true);
      await loadCompletedExam(patient.id || patient.AppointmentId);
      setIsExamining(false);
    } else {
      setToast({ show: true, message: `⚠️ Trạng thái không hợp lệ cho bệnh nhân ${patient.name}.`, variant: 'warning' });
      return;
    }
  }, [startExamination, getStatusText, setToast, loadCompletedExam, setSelectedTodayPatient, setSymptoms, setDiagnosis, setServices, setRequestedServices, setPrescriptionRows]);

  // CẢI THIỆN HÀM TÌM BỆNH NHÂN TIẾP THEO
  const findNextPatient = useCallback((currentPatientId, patients) => {
    if (!patients.length) return null;

    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Ưu tiên tìm bệnh nhân Đang khám trước
    const inProgressPatients = patients.filter(p => 
      getStatusText(p.status) === 'Đang khám' && p.id !== currentPatientId
    );
    
    if (inProgressPatients.length > 0) {
      return inProgressPatients[0]; // Lấy bệnh nhân đầu tiên đang khám
    }

    // Sau đó tìm bệnh nhân Đang chờ theo thứ tự thời gian
    const waitingPatients = patients
      .filter(p => getStatusText(p.status) === 'Đang chờ')
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));

    return waitingPatients[0] || null;
  }, [getStatusText]);

  const handleExaminationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTodayPatient) {
      setToast({ show: true, message: "Chưa chọn bệnh nhân.", variant: "warning" });
      return;
    }

    if (!symptoms && !diagnosis && Object.keys(services).length === 0 && prescriptionRows.length === 0) {
      setToast({ show: true, message: "Chưa có dữ liệu nào để lưu. Vui lòng nhập chẩn đoán hoặc chọn dịch vụ/thuốc.", variant: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        symptoms,
        diagnosis,
        services,
        prescriptions: prescriptionRows,
        diagnoses: diagnoses.length > 0 ? diagnoses : [{ Symptoms: symptoms, Diagnosis: diagnosis }],
        status: 'done',
      };
      console.log('DEBUG - Submit data:', submitData);

      const response = await fetch(`${API_BASE_URL}/api/doctor/examinations/${selectedTodayPatient.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      // CHỈ REFRESH KHI HOÀN TẤT KHÁM
      await fetchTodayPatients();
      setRefreshTrigger(prev => prev + 1);

      // Reset form data
      setSymptoms('');
      setDiagnosis('');
      setServices({});
      setRequestedServices({});
      setPrescriptionRows([]);
      setDiagnoses([]);

      // TÌM BỆNH NHÂN TIẾP THEO SAU KHI REFRESH
      const refreshedResponse = await doctorService.getToday();
      if (refreshedResponse.success) {
        const refreshedPatients = filterValidStatuses(refreshedResponse.data);
        
        // Tìm bệnh nhân tiếp theo
        const nextPatient = findNextPatient(selectedTodayPatient.id, refreshedPatients);
        
        if (nextPatient) {
          // Tự động chọn bệnh nhân tiếp theo
          setSelectedTodayPatient(nextPatient);
          
          // Nếu bệnh nhân tiếp theo đang chờ, tự động bắt đầu khám
          if (getStatusText(nextPatient.status) === 'Đang chờ') {
            await startExamination(nextPatient.id || nextPatient.AppointmentId);
          } else if (getStatusText(nextPatient.status) === 'Đang khám') {
            // Nếu đã đang khám, chỉ cần set selected
            setIsExamining(true);
            setViewMode(false);
          }
          
          setToast({
            show: true,
            message: `✅ Hoàn tất khám cho ${selectedTodayPatient.name}. Đã tự động chuyển sang bệnh nhân tiếp theo: ${nextPatient.name}.`,
            variant: "success",
          });
        } else {
          // Không còn bệnh nhân nào
          setSelectedTodayPatient(null);
          setIsExamining(false);
          setViewMode(false);
          setToast({
            show: true,
            message: `✅ Hoàn tất khám cho ${selectedTodayPatient.name}. Đã lưu vào DB. Không còn bệnh nhân chờ khám hôm nay.`,
            variant: "success",
          });
        }
      }

    } catch (error) {
      console.error('Error submitting examination:', error);
      setToast({
        show: true,
        message: `Lỗi khi hoàn tất khám: ${error.message}`,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
      setIsExamining(false);
    }
  };

  const handleTempSave = async () => {
    if (!selectedTodayPatient) {
      setToast({ show: true, message: "Chưa chọn bệnh nhân.", variant: "warning" });
      return;
    }

    if (!symptoms && !diagnosis && Object.keys(services).length === 0 && prescriptionRows.length === 0) {
      setToast({ show: true, message: "Chưa có dữ liệu nào để tạm lưu.", variant: "info" });
      return;
    }

    setIsLoading(true);
    try {
      const draftData = {
        symptoms,
        diagnosis,
        services,
        prescriptions: prescriptionRows,
        diagnoses: diagnoses.length > 0 ? diagnoses : [{ Symptoms: symptoms, Diagnosis: diagnosis }],
      };
      console.log('DEBUG - Temp save data:', draftData);

      const response = await fetch(`${API_BASE_URL}/api/doctor/examinations/${selectedTodayPatient.id}/temp-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(draftData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      setToast({
        show: true,
        message: "💾 Đã tạm lưu dữ liệu khám (không đổi trạng thái).",
        variant: "info",
      });
    } catch (error) {
      console.error('Error temporary save:', error);
      setToast({
        show: true,
        message: `Lỗi tạm lưu: ${error.message}`,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveWithConfirm = async (index) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa thuốc này khỏi đơn?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Có, xóa!',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      removePrescription(index);
      setToast({
        show: true,
        message: "✅ Đã xóa thuốc khỏi đơn.",
        variant: "success",
      });
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-content, #print-content * { visibility: visible; }
          #print-content { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          .no-print { display: none !important; }
        }
        .form-check-input:checked {
          background-color: #0d6efd;
          border-color: #0d6efd;
        }
        .form-check-input:focus {
          border-color: #86b7fe;
          outline: 0;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
        }
      `}</style>
      <div className={`section ${currentSection === "today" ? "active" : ""}`} id="today">
        <Row>
          <Col md={4}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-success text-white text-start d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Danh sách khám ({new Date().toLocaleDateString('vi-VN')})</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <PatientList
                  todayPatients={todayPatients}
                  isLoading={isLoading}
                  selectedTodayPatient={selectedTodayPatient}
                  onPatientSelect={handleSelectPatient}
                  getStatusVariant={getStatusVariant}
                  getStatusText={getStatusText}
                  refreshTrigger={refreshTrigger}
                />
              </Card.Body>
            </Card>
          </Col>

          <Col md={8}>
            <Card className="shadow-sm">
              <Card.Header className="bg-info text-white text-start">
                <h5 className="mb-0">Thông Tin Khám Bệnh</h5>
                {viewMode && <Badge bg="secondary" className="ms-2">👁️ Chế độ xem (không chỉnh sửa)</Badge>}
              </Card.Header>
              <Card.Body>
                <div className="card-text text-start">
                  {selectedTodayPatient ? (
                    <>
                      <strong>Bệnh nhân:</strong> {selectedTodayPatient.name} -{" "}
                      <strong>Tuổi:</strong> {selectedTodayPatient.age} -{" "}
                      <strong>Giới tính:</strong> {selectedTodayPatient.gender} -{" "}
                      <strong>SĐT:</strong> {selectedTodayPatient.phone} -{" "}
                      <strong>Giờ:</strong> {selectedTodayPatient.time} -{" "}
                      <strong>Trạng thái:</strong>{" "}
                      <Badge bg={getStatusVariant(selectedTodayPatient.status)}>
                        {getStatusText(selectedTodayPatient.status)}
                      </Badge>
                    </>
                  ) : todayPatients.length > 0 ? (
                    <div className="alert alert-info">
                      <h6>👋 Chào mừng! Hôm nay có khám bệnh.</h6>
                      <p>
                        Số bệnh nhân đang chờ: <strong>{todayPatients.filter(p => getStatusText(p.status) === 'Đang chờ').length}</strong>.
                        <br />
                        Bệnh nhân tiếp theo: <strong>{todayPatients.find(p => getStatusText(p.status) === 'Đang chờ')?.name || todayPatients[0]?.name || 'Không có'}</strong>
                        ({todayPatients[0]?.time || 'N/A'}).
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const firstPatient = todayPatients.find(p => getStatusText(p.status) === 'Đang chờ') || todayPatients[0];
                          if (firstPatient) {
                            handleSelectPatient(firstPatient);
                          }
                        }}
                        disabled={isLoading}
                        className="me-2"
                      >
                        {isLoading ? <Spinner animation="border" size="sm" className="me-1" /> : '🚀'} Bắt đầu khám ngay
                      </Button>
                      <small>Hoặc chọn từ danh sách bên trái để bắt đầu.</small>
                    </div>
                  ) : (
                    <span className="text-muted">Chưa có lịch khám bệnh nhân hôm nay. Kiểm tra lại sau.</span>
                  )}
                </div>
                <hr />

                <Form onSubmit={(e) => e.preventDefault()}>
                  <Row>
                    <DiagnosisSection
                      symptoms={symptoms}
                      setSymptoms={setSymptoms}
                      diagnosis={diagnosis}
                      setDiagnosis={setDiagnosis}
                      isFormDisabled={isFormDisabled}
                      prescriptionRows={prescriptionRows}
                      setPrescriptionRows={setPrescriptionRows}
                      setToast={setToast}
                      onDiagnosisUpdate={(newDiagnoses) => {
                        if (!diagnoses.length || diagnoses[0].Diagnosis !== newDiagnoses.Diagnosis || diagnoses[0].Symptoms !== newDiagnoses.Symptoms) {
                          setDiagnoses([newDiagnoses]);
                        }
                      }}
                    />

                    <ServicesSection
                      services={services}
                      setServices={setServices}
                      requestedServices={requestedServices}
                      setRequestedServices={setRequestedServices}
                      diagnosis={diagnosis}
                      isFormDisabled={isFormDisabled}
                      setToast={setToast}
                      selectedTodayPatient={selectedTodayPatient}
                    />

                    <PrescriptionSection
                      prescriptionRows={prescriptionRows}
                      setPrescriptionRows={setPrescriptionRows}
                      removePrescription={removePrescription}
                      handleRemoveWithConfirm={handleRemoveWithConfirm}
                      isFormDisabled={isFormDisabled}
                      selectedTodayPatient={selectedTodayPatient}
                      symptoms={symptoms}
                      diagnosis={diagnosis}
                      services={services}
                      setToast={setToast}
                      diagnoses={diagnoses}
                    />
                  </Row>

                  <div className="d-flex justify-content-start gap-2 mt-3">
                    <Button
                      variant="success"
                      type="button"
                      onClick={handleExaminationSubmit}
                      disabled={isFormDisabled || isLoading || viewMode || (!symptoms && !diagnosis && Object.keys(services).length === 0 && prescriptionRows.length === 0)}
                      className="no-print"
                    >
                      {isLoading ? <Spinner animation="border" size="sm" /> : null}
                      Hoàn Tất & Lưu Hồ Sơ
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleTempSave}
                      disabled={isFormDisabled || isLoading || viewMode || (!symptoms && !diagnosis && Object.keys(services).length === 0 && prescriptionRows.length === 0)}
                      className="no-print"
                    >
                      Tạm Lưu
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div id="print-content" ref={printRef} style={{ display: 'none' }} />
      </div>
    </>
  );
};

export default TodaySection;