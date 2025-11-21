import { createEchoClient } from "../../utils/echo";
import notificationSound from "../../assets/notification.mp3";
import doctorService from "../../services/doctorService";
const API_BASE_URL = "http://localhost:8000";
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Modal, Button, Toast, ToastContainer, Spinner } from 'react-bootstrap';
import TodaySection from './TodaySection';
import DoctorSchedule from './DoctorSchedule';
import HistorySection from './HistorySection';

const DoctorDashboard = () => {
  const [currentSection, setCurrentSection] = useState("today");
  const [todayPatients, setTodayPatients] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedTodayPatient, setSelectedTodayPatient] = useState(null);
  const [prescriptionRows, setPrescriptionRows] = useState([]);
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [services, setServices] = useState({});
  const [requestedServices, setRequestedServices] = useState({});

  // Confirm và toast states
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", variant: "" });
  const [echo, setEcho] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const doctorId = 1;

  // Fetch helper
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    try {
      const config = {
        headers: {
          Accept: "application/json",
          ...options.headers,
        },
        credentials: "include",
        ...options,
      };

      const response = await fetch(`${API_BASE_URL}/api${url}`, config);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      setToastMessage(`Lỗi API: ${error.message}`);
      setShowToast(true);
      throw error;
    }
  }, []);

  // Handle real-time queue updates for doctor
  const handleDoctorQueueUpdate = (event) => {
    const { doctor, action } = event;

    if (!doctor || action !== "updated") return;

    // Check if patient already exists
    setTodayPatients((prevPatients) => {
      const existingIndex = prevPatients.findIndex((p) => p.id === doctor.id);

      if (existingIndex !== -1) {
        // Update existing patient
        const updated = [...prevPatients];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...doctor,
        };
        return updated;
      } else {
        // Add new patient to the list
        return [...prevPatients, doctor];
      }
    });

    // Show toast notification
    setToast({
      show: true,
      message: `Bệnh nhân ${doctor.name} đã được gọi vào khám`,
      variant: "info",
    });

    // Play notification sound (optional)
    playNotificationSound();
  };

  // Optional: Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio(notificationSound);
      audio.play().catch((err) => console.log("Audio play failed:", err));
    } catch (error) {
      console.log("Notification sound error:", error);
    }
  };

  // Fetch doctor's room info
  useEffect(() => {
    const fetchDoctorRoom = async () => {
      try {
        const response = await doctorService.getRoom();
        if (response.data && response.data.room_id) {
          setRoomId(response.data.room_id);
        }
      } catch (error) {
        console.error("Error fetching doctor room:", error);
      }
    };

    fetchDoctorRoom();
  }, [fetchWithAuth]);

  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio(notificationSound);
      audio.play().catch(() => {});
      audio.pause();
      audio.currentTime = 0;

      // Chỉ cần chạy 1 lần
      document.removeEventListener("click", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  // Initialize WebSocket for doctor's room
  useEffect(() => {
    if (!roomId) return;

    const echoClient = createEchoClient();
    setEcho(echoClient);

    // Listen to doctor's room channel
    echoClient
      .channel(`room.${roomId}`)
      .listen(".queue.status.updated", (event) => {
        console.log("Doctor received update:", event);
        handleDoctorQueueUpdate(event);
      });

    return () => {
      echoClient.disconnect();
    };
  }, [roomId]);

  // Load data theo section
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      switch (currentSection) {
        case "today":
          const todayData = await fetchWithAuth("/doctor/today-patients");
          console.log("DEBUG - Today patients loaded:", todayData);
          setTodayPatients(todayData.data || todayData || []);
          break;
        case "schedule":
          const eventsData = await fetchWithAuth(
            `/doctor/schedules/${doctorId}`
          );
          console.log("DEBUG - Events loaded:", eventsData);
          setEvents(eventsData.data || eventsData || []);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error loading ${currentSection} data:`, error);
      if (currentSection === "today") setTodayPatients([]);
      if (currentSection === "schedule") setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSection, fetchWithAuth, doctorId]);

  // Load data khi section thay đổi
  useEffect(() => {
    if (currentSection !== "history") {
      loadData();
    }
  }, [currentSection, loadData]);

  // Switch section
  const switchSection = (section) => {
    setCurrentSection(section);
    if (section !== "history") {
      setSelectedPatient(null);
    }
  };

  // Prescription functions
  const removePrescription = useCallback((index) => {
    setPrescriptionRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const editPrescription = useCallback((data, index) => {
    setPrescriptionRows((prev) => {
      const updated = [...prev];
      updated[index] = data;
      return updated;
    });
  }, []);

  const handlePrescriptionSubmit = async (data) => {
    if (!selectedTodayPatient) return;
    try {
      setIsLoading(true);
      const result = await fetchWithAuth("/doctor/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          appointment_id: selectedTodayPatient.id,
        }),
      });
      setToastMessage(result.message || "Thêm thuốc thành công");
      setShowToast(true);
      setPrescriptionRows([...prescriptionRows, data]);
      closePrescriptionModal();
    } catch (error) {
      // Handled in fetchWithAuth
    } finally {
      setIsLoading(false);
    }
  };

  // Handler cho examination
  const handleExaminationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTodayPatient) return;
    const isSave = confirmType === "save";
    try {
      setIsProcessing(true);
      const data = {
        appointment_id: selectedTodayPatient.id,
        patient_id: selectedTodayPatient.patient_id,
        symptoms,
        diagnosis,
        services,
        requested_services: requestedServices,
        prescriptions: prescriptionRows,
        is_complete: isSave,
        status: isSave ? "done" : "temp",
      };
      const method = isSave ? "POST" : "PATCH";
      const result = await fetchWithAuth("/doctor/examinations", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setToastMessage(
        result.message || (isSave ? "Hoàn tất hồ sơ" : "Tạm lưu thành công")
      );
      setShowToast(true);
      if (isSave) {
        setTodayPatients((prev) =>
          prev.filter((p) => p.id !== selectedTodayPatient.id)
        );
        setSymptoms("");
        setDiagnosis("");
        setServices({});
        setRequestedServices({});
        setPrescriptionRows([]);
        setSelectedTodayPatient(null);
      }
      setShowConfirm(false);
    } catch (error) {
      // Handled
    } finally {
      setIsProcessing(false);
    }
  };

  // Các function khác
  const openEventModal = (eventId = null) => {
    setEditingEventId(eventId);
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingEventId(null);
  };

  const openPrescriptionModal = () => setShowPrescriptionModal(true);
  const closePrescriptionModal = () => setShowPrescriptionModal(false);

  const handleTempSave = () => {
    setConfirmType("temp");
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    setConfirmType("save");
    setShowConfirm(true);
  };

  const processConfirm = () =>
    handleExaminationSubmit({ preventDefault: () => {} });

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  return (
    <div className="d-flex min-vh-100 bg-light">
      <div className="flex-grow-1 p-4">
        <Container fluid>
          {isLoading && (
            <div className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Đang tải dữ liệu...</p>
            </div>
          )}

          {currentSection === "today" && (
            <TodaySection
              currentSection={currentSection}
              prescriptionRows={prescriptionRows}
              setPrescriptionRows={setPrescriptionRows}
              removePrescription={removePrescription}
              editPrescription={editPrescription}
              symptoms={symptoms}
              setSymptoms={setSymptoms}
              diagnosis={diagnosis}
              setDiagnosis={setDiagnosis}
              services={services}
              setServices={setServices}
              requestedServices={requestedServices}
              setRequestedServices={setRequestedServices}
              openPrescriptionModal={openPrescriptionModal}
              selectedTodayPatient={selectedTodayPatient}
              setSelectedTodayPatient={setSelectedTodayPatient}
              todayPatients={todayPatients}
              setTodayPatients={setTodayPatients} // THÊM DÒNG NÀY
              setToast={setToast}
            />
          )}

          {currentSection === "schedule" && (
            <DoctorSchedule
              currentSection={currentSection}
              events={events}
              currentDate={currentDate}
              openEventModal={openEventModal}
              prevMonth={prevMonth}
              nextMonth={nextMonth}
            />
          )}

          {currentSection === "history" && (
            <HistorySection
              currentSection={currentSection}
              selectedPatient={selectedPatient}
              setSelectedPatient={setSelectedPatient}
            />
          )}
        </Container>
      </div>

      {/* Toast Container */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          bg={toast.variant || "success"}
          show={toast.show}
          onClose={() => setToast({ ...toast, show: false })}
          delay={3000}
          autohide
        >
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Confirmation Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            {confirmType === "save" ? "Xác nhận lưu hồ sơ" : "Xác nhận tạm lưu"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmType === "save"
            ? "Bạn có chắc chắn muốn hoàn tất hồ sơ khám bệnh?"
            : "Bạn có muốn tạm lưu thông tin khám bệnh?"}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Hủy
          </Button>
          <Button
            variant="success"
            onClick={processConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Spinner size="sm" className="me-2" /> Đang xử lý...
              </>
            ) : (
              "Xác nhận"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DoctorDashboard;
