import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
} from "react-bootstrap";
import Swal from 'sweetalert2';

import PatientList from '../Doctors/DotorTodayCompo/PatientList';
import DiagnosisSection from '../Doctors/DotorTodayCompo/DiagnosisSection';
import ServicesSection from '../Doctors/DotorTodayCompo/ServicesSection';
import PrescriptionSection from '../Doctors/DotorTodayCompo/PrescriptionSection';
import PrescriptionModal from './PrescriptionModal';
import doctorService from "../../services/doctorService";
import dayjs from "dayjs";
import { generatePrintHtml, printHtml } from "../../utils/PrintDocument";

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
  setservices = () => { },
  requestedservices = {},
  setRequestedservices = () => { },
  openPrescriptionModal = () => { },
  selectedTodayPatient = null,
  setSelectedTodayPatient = () => { },
}) => {
  const [todayPatients, setTodayPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", variant: "" });
  const [showModal, setShowModal] = useState(false);
  const [defaultData, setDefaultData] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const printRef = useRef(null);
  const cache = useRef(new Map());

  const isFormDisabled = selectedTodayPatient && selectedTodayPatient?.status === 'Đang khám' ? false : true;

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
      const response = await doctorService.getToday();
      if (response.success === true) {
        const filteredData = filterValidStatuses(response.data);
        cache.current.set('today-patients', response.data);
        console.log("Check time: ", dayjs(response.data[0].date).format('DD/MM/YYYY HH:mm:ss'));
        setTodayPatients(filteredData);
      }
    } catch (error) {
      console.error('Error fetching today patients:', error);
    }
  };

  useEffect(() => {
    fetchTodayPatients();
  }, []);

  const findNextPatient = useCallback((currentPatientId, patients) => {
    if (!currentPatientId || !patients.length) return null;

    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const currentTime = parseTime(patients.find(p => p.id === currentPatientId)?.time || '00:00');

    const waitingPatientsAfter = patients
      .filter(p => getStatusText(p.status) === 'Đang chờ' && parseTime(p.time) > currentTime)
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));

    return waitingPatientsAfter[0] || null;
  }, [getStatusText]);

  const handleExaminationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTodayPatient) {
      setToast({ show: true, message: "Chưa chọn bệnh nhân.", variant: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        symptoms,
        diagnosis,
        services: { ...services }, // Dynamic services
        prescriptions: [...prescriptionRows],
        status: 'done',
      };

      const response = await fetch(`${API_BASE_URL}/api/doctor/examinations/${selectedTodayPatient.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Submit thành công:', result);

      setSymptoms('');
      setDiagnosis('');
      setservices({}); 
      setRequestedservices({});
      setPrescriptionRows([]);

      await fetchTodayPatients();

      const nextPatient = findNextPatient(selectedTodayPatient.id, todayPatients);
      if (nextPatient) {
        setSelectedTodayPatient(nextPatient);
        setToast({
          show: true,
          message: ` Hoàn tất khám cho ${selectedTodayPatient.name}. Đã chuyển sang bệnh nhân tiếp theo: ${nextPatient.name}.`,
          variant: "success",
        });
      } else {
        setSelectedTodayPatient(null);
        setToast({
          show: true,
          message: `Hoàn tất khám cho ${selectedTodayPatient.name}. Không còn bệnh nhân chờ khám hôm nay.`,
          variant: "success",
        });
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
    }
  };

  const handleTempSave = () => {
    setToast({ show: true, message: "Đã tạm lưu.", variant: "info" });
  };

  const handleOpenAddModal = () => {
    setDefaultData(null);
    setEditIndex(null);
    setShowModal(true);
  };

  const handleEdit = (index) => {
    const medicineToEdit = prescriptionRows[index];
    setDefaultData(medicineToEdit);
    setEditIndex(index);
    setShowModal(true);
  };

  const handleModalSubmit = (submittedData) => {
    if (editIndex !== null) {
      editPrescription(submittedData, editIndex);
      setToast({
        show: true,
        message: `✅ Đã cập nhật thuốc "${submittedData.medicine}".`,
        variant: "success",
      });
    } else {
      setPrescriptionRows([...prescriptionRows, submittedData]);
      setToast({
        show: true,
        message: `✅ Đã thêm thuốc "${submittedData.medicine}".`,
        variant: "success",
      });
    }
    setShowModal(false);
    setDefaultData(null);
    setEditIndex(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setDefaultData(null);
    setEditIndex(null);
  };

  const printDocument = (type) => {
    if (!selectedTodayPatient) {
      setToast({ show: true, message: "⚠️ Chưa chọn bệnh nhân.", variant: "warning" });
      return;
    }

    try {
      const html = generatePrintHtml(
        type,
        selectedTodayPatient,
        symptoms,
        diagnosis,
        services,
        prescriptionRows,
        {} // 🆕 Empty testLabels (ServicesSection sẽ handle dynamic)
      );
      printHtml(html, printRef);
    } catch (error) {
      console.error('Error printing:', error);
      setToast({ show: true, message: `Lỗi in: ${error.message}`, variant: "danger" });
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
      `}</style>
      <div className={`section ${currentSection === "today" ? "active" : ""}`} id="today">
        <Row>
          <Col md={4}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white text-start">
                <h5 className="mb-0">Danh sách khám ({new Date().toLocaleDateString('vi-VN')})</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <PatientList
                  todayPatients={todayPatients}
                  isLoading={isLoading}
                  selectedTodayPatient={selectedTodayPatient}
                  setSelectedTodayPatient={setSelectedTodayPatient}
                  getStatusVariant={getStatusVariant}
                  getStatusText={getStatusText}
                />
              </Card.Body>
            </Card>
          </Col>

          <Col md={8}>
            <Card className="shadow-sm">
              <Card.Header className="bg-info text-white text-start">
                <h5 className="mb-0">Thông Tin Khám Bệnh</h5>
              </Card.Header>
              <Card.Body>
                <p className="card-text text-start">
                  {selectedTodayPatient ? (
                    <>
                      <strong>Bệnh nhân:</strong> {selectedTodayPatient.name} -{" "}
                      <strong>Tuổi:</strong> {selectedTodayPatient.age} -{" "}
                      <strong>Giới tính:</strong> {selectedTodayPatient.gender} -{" "}
                      <strong>SĐT:</strong> {selectedTodayPatient.phone} -{" "}
                      <strong>Giờ:</strong> {selectedTodayPatient.time} -{" "}
                      <strong>Trạng thái:</strong>{" "}
                      {getStatusText(selectedTodayPatient.status)}
                    </>
                  ) : (
                    <span className="text-muted">Chưa chọn bệnh nhân nào</span>
                  )}
                </p>
                <hr />

                <Form onSubmit={handleExaminationSubmit}>
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
                    />

                    <ServicesSection
                      services={services}
                      setservices={setservices}
                      requestedservices={requestedservices}
                      setRequestedservices={setRequestedservices}
                      diagnosis={diagnosis}
                      isFormDisabled={isFormDisabled}
                      setToast={setToast}
                      printDocument={printDocument}
                      selectedTodayPatient={selectedTodayPatient}
                    /> {/* 🆕 Bỏ services/servicesLoading, testLabels (local trong ServicesSection) */}

                    <PrescriptionSection
                      prescriptionRows={prescriptionRows}
                      removePrescription={removePrescription}
                      handleRemoveWithConfirm={handleRemoveWithConfirm}
                      handleOpenAddModal={handleOpenAddModal}
                      handleEdit={handleEdit}
                      isFormDisabled={isFormDisabled}
                      printDocument={printDocument}
                      selectedTodayPatient={selectedTodayPatient}
                    />
                  </Row>

                  <div className="d-flex justify-content-start gap-2 mt-3">
                    <Button
                      variant="success"
                      type="submit"
                      disabled={isFormDisabled || isLoading}
                      className="no-print"
                    >
                      {isLoading ? <Spinner animation="border" size="sm" /> : null}
                      Hoàn Tất & Lưu Hồ Sơ
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleTempSave}
                      disabled={isFormDisabled}
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

        <PrescriptionModal
          show={showModal}
          onHide={handleModalClose}
          defaultData={defaultData}
          onSubmit={handleModalSubmit}
        />

        <div id="print-content" ref={printRef} style={{ display: 'none' }} />
      </div>
    </>
  );
};

export default TodaySection;