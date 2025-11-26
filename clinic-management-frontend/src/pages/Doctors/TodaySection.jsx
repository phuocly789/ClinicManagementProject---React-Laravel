import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, Row, Col, Form, Button, Spinner, Badge } from "react-bootstrap";
import Swal from "sweetalert2";

import PatientList from "../Doctors/DotorTodayCompo/PatientList";
import DiagnosisSection from "../Doctors/DotorTodayCompo/DiagnosisSection";
import ServicesSection from "../Doctors/DotorTodayCompo/ServicesSection";
import PrescriptionSection from "../Doctors/DotorTodayCompo/PrescriptionSection";
import doctorService from "../../services/doctorService";
import CustomToast from "../../Components/CustomToast/CustomToast";

const TodaySection = ({
  currentSection = "today",
  prescriptionRows = [],
  setPrescriptionRows = () => {},
  removePrescription = () => {},
  editPrescription = () => {},
  symptoms = "",
  setSymptoms = () => {},
  diagnosis = "",
  setDiagnosis = () => {},
  services = {},
  setServices = () => {},
  requestedServices = {},
  setRequestedServices = () => {},
  openPrescriptionModal = () => {},
  selectedTodayPatient = null,
  setSelectedTodayPatient = () => {},
  todayPatients = [],
  onQueueUpdate,
  setTodayPatients = () => {},
  doctorInfo = null,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExamining, setIsExamining] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [diagnoses, setDiagnoses] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // THÊM STATE CHO CUSTOM TOAST
  const [toast, setToastState] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const printRef = useRef(null);

  const isFormDisabled =
    viewMode ||
    !selectedTodayPatient ||
    selectedTodayPatient?.status !== "Đang khám";

  // HÀM HIỂN THỊ TOAST - THÊM MỚI
  const showToast = useCallback((type, message) => {
    setToastState({
      show: true,
      type,
      message,
    });
  }, []);

  // HÀM ĐÓNG TOAST - THÊM MỚI
  const closeToast = useCallback(() => {
    setToastState({
      show: false,
      type: "success",
      message: "",
    });
  }, []);

  // HÀM CHUYỂN DỊCH LỖI BE SANG FE - PHIÊN BẢN HOÀN CHỈNH
  const translateError = useCallback((error) => {
    console.error('🔴 Backend Error Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.status
    });

    // ✅ ƯU TIÊN LẤY THÔNG BÁO LỖI TỪ BACKEND
    const backendError = error.message ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      '';

    console.log('🔍 Backend error message extracted:', backendError);

    // ✅ NẾU BACKEND ĐÃ TRẢ VỀ MESSAGE THÂN THIỆN THÌ DÙNG LUÔN
    if (backendError &&
      (backendError.includes('Không tìm thấy') ||
        backendError.includes('Vui lòng') ||
        backendError.includes('Lỗi') ||
        backendError.includes('thiếu') ||
        backendError.includes('không hợp lệ') ||
        backendError.includes('thuốc') ||
        backendError.includes('hệ thống'))) {
      return backendError;
    }

    // Map các lỗi HTTP status
    const statusMap = {
      400: 'Yêu cầu không hợp lệ',
      401: 'Không có quyền truy cập',
      403: 'Truy cập bị từ chối',
      404: 'Không tìm thấy dữ liệu',
      422: 'Dữ liệu không hợp lệ',
      500: 'Lỗi máy chủ',
      502: 'Lỗi kết nối',
      503: 'Dịch vụ không khả dụng'
    };

    if (error.status && statusMap[error.status]) {
      return statusMap[error.status];
    }

    // Map các lỗi network
    const errorMap = {
      'Network Error': 'Lỗi kết nối mạng. Vui lòng kiểm tra internet',
      'timeout': 'Quá thời gian chờ phản hồi',
      'Request failed': 'Yêu cầu thất bại'
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (backendError.includes(key) || error.message.includes(key)) {
        return value;
      }
    }

    // Fallback
    return backendError || 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
  }, []);

  // HÀM XỬ LÝ LỖI VÀ HIỂN THỊ THÔNG BÁO - ĐÃ SỬA
  const handleError = useCallback((error, customMessage = '') => {
    console.error('❌ Error Details:', {
      error,
      response: error.response,
      data: error.response?.data
    });

    const translatedError = translateError(error);

    console.log('📢 Error message to display:', translatedError);

    // ✅ SỬ DỤNG CUSTOM TOAST THAY VÌ SWAL
    showToast('error', customMessage || translatedError);
  }, [translateError, showToast]);

  // HÀM HIỂN THỊ CONFIRMATION VỚI XỬ LÝ LỖI TỐT HƠN
  const showConfirmation = useCallback(async (options) => {
    try {
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
    } catch (error) {
      // ✅ ĐẢM BẢO SWAL LUÔN ĐÓNG KHI CÓ LỖI
      Swal.close();
      console.error('❌ Lỗi trong showConfirmation:', error);
      throw error;
    }
  }, []);

  // HÀM HIỂN THỊ THÔNG BÁO THÀNH CÔNG - FIX: DÙNG useCallback
  const showSuccessAlert = useCallback((message) => {
    Swal.fire({
      title: "Thành công!",
      text: message,
      icon: 'success',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK'
    });
  }, []);

  // HÀM XỬ LÝ LỖI VÀ HIỂN THỊ THÔNG BÁO - FIX: DÙNG useCallback
  const handleError = useCallback(
    (error, customMessage = "") => {
      const translatedError = translateError(error);
      console.error("❌ Error:", error);

      // SỬ DỤNG CUSTOM TOAST THAY VÌ SWAL
      showToast("error", customMessage || translatedError);
    },
    [translateError, showToast]
  );

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
      case "done":
        return "Đã khám";
      case "in-progress":
        return "Đang khám";
      case "waiting":
        return "Đang chờ";
      default:
        return status;
    }
  }, []);

  // FETCH TODAY PATIENTS - FIX: TÁCH RIÊNG VÀ DÙNG useCallback
  const fetchTodayPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Đang tải danh sách bệnh nhân...");

      const response = await doctorService.getToday();
      console.log("📊 TOÀN BỘ API Response:", response);

      if (response && response.data) {
        const patientsData =
          response.data.data || response.data.patients || response.data || [];

        console.log("📊 Dữ liệu bệnh nhân cuối cùng:", patientsData);

        setTodayPatients(Array.isArray(patientsData) ? patientsData : []);
      } else {
        console.warn("⚠️ Không có dữ liệu trong response:", response);
        setTodayPatients([]);
        showToast("info", "Không có dữ liệu bệnh nhân hôm nay");
      }
    } catch (error) {
      console.error("❌ Lỗi fetch today patients:", error);
      setTodayPatients([]);
      handleError(error, "Lỗi tải danh sách bệnh nhân");
    } finally {
      setIsLoading(false);
    }
  }, [setTodayPatients, showToast, handleError]);

  // EFFECT CHÍNH - CHỈ CHẠY KHI MOUNT
  useEffect(() => {
    fetchTodayPatients();
  }, []); // CHỈ CHẠY 1 LẦN KHI MOUNT

  // EFFECT CHO REFRESH TRIGGER - FIX: CHỈ CHẠY KHI refreshTrigger THAY ĐỔI
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchTodayPatients();
    }
  }, [refreshTrigger, fetchTodayPatients]);

  // FIXED: LOAD COMPLETED EXAM - FIX: GIẢM DEPENDENCY
  const loadCompletedExam = useCallback(
    async (appointmentId) => {
      console.log("=== 🚨 DEBUG API CALL START 🚨 ===");
      console.log("🔍 appointmentId:", appointmentId);

      if (!appointmentId) {
        console.error("❌ appointmentId is null or undefined");
        showToast("error", "Không tìm thấy ID cuộc hẹn");
        return;
      }

      setIsLoading(true);
      try {
        console.log("1. 📞 Calling doctorService.getExamination...");

        let response;
        try {
          response = await doctorService.getExamination(appointmentId);
          console.log("2. ✅ Service call SUCCESS - response:", response);
        } catch (serviceError) {
          console.error("❌ Service call FAILED:", serviceError);
          throw new Error(`Service call failed: ${serviceError.message}`);
        }

        console.log("3. 📦 Response object:", response);

        if (!response) {
          throw new Error("NO RESPONSE OBJECT - API call completely failed");
        }

        const data = response.data || response;
        console.log(
          "6. 🔍 Using data from:",
          data === response.data ? "response.data" : "response"
        );

        if (
          !data ||
          (typeof data === "object" && Object.keys(data).length === 0)
        ) {
          throw new Error("API returned empty data object");
        }

        console.log("8. 🗺️ Starting data mapping...");

        const symptomsValue =
          data.symptoms || data.diagnoses?.[0]?.Symptoms || "";
        const diagnosisValue =
          data.diagnosis || data.diagnoses?.[0]?.Diagnosis || "";

        console.log("✅ Symptoms will be set to:", symptomsValue);
        console.log("✅ Diagnosis will be set to:", diagnosisValue);

        setSymptoms(symptomsValue);
        setDiagnosis(diagnosisValue);

        // Services mapping
        if (data.services && Array.isArray(data.services)) {
          const servicesObj = data.services.reduce((acc, serviceId) => {
            acc[serviceId] = true;
            return acc;
          }, {});
          setServices(servicesObj);
          console.log("✅ Services mapped:", servicesObj);
        } else {
          console.log("ℹ️ No services data found");
          setServices({});
        }

        // Prescriptions mapping
        if (data.prescriptions && Array.isArray(data.prescriptions)) {
          const prescriptionRows = data.prescriptions.map((pres) => ({
            medicineId: pres.medicineId,
            medicine: pres.medicine,
            quantity: pres.quantity,
            dosage: pres.dosage,
            unitPrice: pres.unitPrice || 0,
            totalPrice: pres.totalPrice || 0,
          }));
          setPrescriptionRows(prescriptionRows);
          console.log("✅ Prescriptions mapped:", prescriptionRows);
        } else {
          console.log("ℹ️ No prescriptions data found");
          setPrescriptionRows([]);
        }

        setRequestedServices(data.requestedServices || {});
        setDiagnoses(data.diagnoses || []);

        console.log("9. 🎉 DATA MAPPING COMPLETED SUCCESSFULLY");
        showToast("success", "Đã tải hồ sơ cũ để xem.");
      } catch (error) {
        console.error("🚨 FINAL ERROR in loadCompletedExam:", error);
        handleError(error, "Lỗi tải hồ sơ khám bệnh");
      } finally {
        setIsLoading(false);
        console.log("=== 🚨 DEBUG API CALL END 🚨 ===");
      }
    },
    [
      showToast,
      handleError,
      setSymptoms,
      setDiagnosis,
      setServices,
      setRequestedServices,
      setPrescriptionRows,
    ]
  );

  // START EXAMINATION - FIX: GIẢM DEPENDENCY
  const startExamination = useCallback(
    async (patientId, patientName) => {
      if (!patientId) return null;

      const result = await showConfirmation({
        title: "Bắt đầu khám bệnh",
        text: `Bạn có chắc muốn bắt đầu khám cho bệnh nhân ${patientName}?`,
        confirmText: "Bắt đầu khám",
        cancelText: "Hủy",
        icon: "question",
        showLoader: true,
        preConfirm: async () => {
          try {
            setIsLoading(true);
            const result = await doctorService.startExamination(patientId);

            console.log("DEBUG - API start response:", result.data);

            const updatedPatient = {
              ...selectedTodayPatient,
              status: "Đang khám",
            };
            setSelectedTodayPatient(updatedPatient);
            setIsExamining(true);
            setViewMode(false);

            await fetchTodayPatients();
            setRefreshTrigger((prev) => prev + 1);

            return `Đã bắt đầu khám cho ${patientName}`;
          } catch (error) {
            const translatedError = translateError(error);
            throw new Error(translatedError);
          } finally {
            setIsLoading(false);
          }
        },
      });

      if (result.isConfirmed) {
        showToast("success", result.value);
        return result.value;
      }
      return null;
    },
    [
      showConfirmation,
      selectedTodayPatient,
      setSelectedTodayPatient,
      fetchTodayPatients,
      translateError,
      showToast,
    ]
  );

  // FIXED: HANDLE SELECT PATIENT - FIX: GIẢM DEPENDENCY VÀ TÁCH LOGIC
  const handleSelectPatient = useCallback(
    async (patient) => {
      console.log("🔄 Chọn bệnh nhân:", patient);

      if (!patient) {
        // Hiển thị confirmation khi bỏ chọn bệnh nhân
        if (
          selectedTodayPatient &&
          (symptoms ||
            diagnosis ||
            Object.keys(services).length > 0 ||
            prescriptionRows.length > 0)
        ) {
          const result = await showConfirmation({
            title: "Bỏ chọn bệnh nhân",
            text: "Bạn có chắc muốn bỏ chọn bệnh nhân hiện tại? Dữ liệu chưa lưu sẽ bị mất.",
            icon: "warning",
            confirmText: "Bỏ chọn",
            cancelText: "Ở lại",
            confirmColor: "#d33",
          });

          if (!result.isConfirmed) {
            return;
          }
        }

        setSelectedTodayPatient(null);
        setIsExamining(false);
        setViewMode(false);
        setSymptoms("");
        setDiagnosis("");
        setServices({});
        setRequestedServices({});
        setPrescriptionRows([]);
        setDiagnoses([]);
        return;
      }

      const currentStatus = getStatusText(patient.status);
      console.log("📊 Trạng thái:", currentStatus);

      // LUÔN SET SELECTED PATIENT TRƯỚC
      setSelectedTodayPatient(patient);

      // RESET FORM TRƯỚC KHI LOAD DỮ LIỆU MỚI
      setSymptoms("");
      setDiagnosis("");
      setServices({});
      setRequestedServices({});
      setPrescriptionRows([]);
      setDiagnoses([]);

      if (currentStatus === "Đang khám") {
        console.log("🔵 Bệnh nhân đang khám - enable form");
        setIsExamining(true);
        setViewMode(false);
      } else if (currentStatus === "Đang chờ") {
        console.log("🟡 Bệnh nhân đang chờ - bắt đầu khám");
        await startExamination(
          patient.id || patient.AppointmentId,
          patient.name
        );
      } else if (currentStatus === "Đã khám") {
        console.log("🟢 Bệnh nhân đã khám - xem hồ sơ");
        setIsExamining(false);
        setViewMode(true);

        const result = await showConfirmation({
          title: "Xem hồ sơ đã khám",
          text: `Bạn có muốn xem hồ sơ khám bệnh của ${patient.name}?`,
          confirmText: "Xem hồ sơ",
          cancelText: "Hủy",
          icon: "info",
        });

        if (result.isConfirmed) {
          await loadCompletedExam(patient.id || patient.AppointmentId);
        }
      } else {
        handleError(new Error(`Trạng thái không hợp lệ: ${currentStatus}`));
      }
    },
    [
      selectedTodayPatient,
      symptoms,
      diagnosis,
      services,
      prescriptionRows,
      showConfirmation,
      setSelectedTodayPatient,
      getStatusText,
      startExamination,
      loadCompletedExam,
      handleError,
    ]
  );

  const findNextPatient = useCallback(
    (currentPatientId, patients) => {
      if (!patients.length) return null;

      const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const inProgressPatients = patients.filter(
        (p) =>
          getStatusText(p.status) === "Đang khám" && p.id !== currentPatientId
      );

      if (inProgressPatients.length > 0) {
        return inProgressPatients[0];
      }

      const waitingPatients = patients
        .filter((p) => getStatusText(p.status) === "Đang chờ")
        .sort((a, b) => parseTime(a.time) - parseTime(b.time));

      return waitingPatients[0] || null;
    },
    [getStatusText]
  );

  // HANDLE EXAMINATION SUBMIT - ĐÃ SỬA LỖI LOADING
  const handleExaminationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTodayPatient) {
      showToast("warning", "Chưa chọn bệnh nhân.");
      return;
    }

    if (
      !symptoms &&
      !diagnosis &&
      Object.keys(services).length === 0 &&
      prescriptionRows.length === 0
    ) {
      showToast(
        "warning",
        "Chưa có dữ liệu nào để lưu. Vui lòng nhập chẩn đoán hoặc chọn dịch vụ/thuốc."
      );
      return;
    }

    // ✅ TẠO SWAL INSTANCE ĐỂ CÓ THỂ ĐÓNG KHI CÓ LỖI
    let swalInstance = null;

    try {
      const result = await Swal.fire({
        title: 'Hoàn tất khám bệnh',
        text: `Bạn có chắc muốn hoàn tất khám cho bệnh nhân ${selectedTodayPatient.name}? Hồ sơ sẽ được lưu vào cơ sở dữ liệu.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Hoàn tất khám',
        cancelButtonText: 'Hủy',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            setIsLoading(true);
            const submitData = {
              symptoms,
              diagnosis,
              services,
              prescriptions: prescriptionRows,
              diagnoses: diagnoses.length > 0 ? diagnoses : [{ Symptoms: symptoms, Diagnosis: diagnosis }],
              status: 'done',
            };
            console.log('DEBUG - Submit data:', submitData);

            const saveResult = await doctorService.completeExamination(selectedTodayPatient.id, submitData);

            const result = saveResult.data;

            await fetchTodayPatients();
            setRefreshTrigger(prev => prev + 1);

            // Reset form data
            setSymptoms('');
            setDiagnosis('');
            setServices({});
            setRequestedServices({});
            setPrescriptionRows([]);
            setDiagnoses([]);

            // TÌM BỆNH NHÂN TIẾP THEO
            const nextPatient = findNextPatient(selectedTodayPatient.id, todayPatients);

            let successMessage = `Đã hoàn tất khám cho ${selectedTodayPatient.name}`;

            if (nextPatient) {
              setSelectedTodayPatient(nextPatient);

              if (getStatusText(nextPatient.status) === 'Đang chờ') {
                await startExamination(nextPatient.id || nextPatient.AppointmentId, nextPatient.name);
                successMessage += `. Đã tự động chuyển sang bệnh nhân tiếp theo: ${nextPatient.name}`;
              } else if (getStatusText(nextPatient.status) === 'Đang khám') {
                setIsExamining(true);
                setViewMode(false);
                successMessage += `. Đã chuyển sang bệnh nhân đang khám: ${nextPatient.name}`;
              }
            } else {
              setSelectedTodayPatient(null);
              setIsExamining(false);
              setViewMode(false);
              successMessage += '. Đã lưu vào DB. Không còn bệnh nhân chờ khám hôm nay.';
            }

            return successMessage;
          } catch (error) {
            // ✅ QUAN TRỌNG: ĐÓNG SWAL LOADING KHI CÓ LỖI
            Swal.close();
            const translatedError = translateError(error);
            throw new Error(translatedError);
          } finally {
            setIsLoading(false);
            setIsExamining(false);
              setViewMode(false);
              successMessage += `. Đã chuyển sang bệnh nhân đang khám: ${nextPatient.name}`;
            }
          } else {
            setSelectedTodayPatient(null);
          }
        },
        allowOutsideClick: () => !Swal.isLoading()
      });

          return successMessage;
        } catch (error) {
          const translatedError = translateError(error);
          throw new Error(translatedError);
        } finally {
          setIsLoading(false);
          setIsExamining(false);
        }
      },
    });

    if (result.isConfirmed) {
      showToast("success", result.value);
      if (result.isConfirmed) {
        showToast('success', result.value);
      }
    } catch (error) {
      // ✅ XỬ LÝ LỖI NGOẠI LỆ Ở ĐÂY
      console.error('❌ Lỗi trong handleExaminationSubmit:', error);
      showToast('error', error.message || 'Đã xảy ra lỗi khi hoàn tất khám');
    }
  };

  // HANDLE TEMP SAVE - FIX: TÁCH RIÊNG
  const handleTempSave = async () => {
    if (!selectedTodayPatient) {
      showToast("warning", "Chưa chọn bệnh nhân.");
      return;
    }

    if (
      !symptoms &&
      !diagnosis &&
      Object.keys(services).length === 0 &&
      prescriptionRows.length === 0
    ) {
      showToast("info", "Chưa có dữ liệu nào để tạm lưu.");
      return;
    }

    const result = await showConfirmation({
      title: "Tạm lưu dữ liệu",
      text: "Bạn có chắc muốn tạm lưu dữ liệu khám hiện tại? Dữ liệu sẽ được lưu nhưng trạng thái bệnh nhân không thay đổi.",
      confirmText: "Tạm lưu",
      cancelText: "Hủy",
      icon: "info",
      showLoader: true,
      preConfirm: async () => {
        try {
          setIsLoading(true);
          const draftData = {
            symptoms,
            diagnosis,
            services,
            prescriptions: prescriptionRows,
            diagnoses:
              diagnoses.length > 0
                ? diagnoses
                : [{ Symptoms: symptoms, Diagnosis: diagnosis }],
          };

          console.log("DEBUG - Temp save data:", draftData);

          const tempSaveResult = await doctorService.tempSaveExamination(
            selectedTodayPatient.id,
            draftData
          );

          const result = tempSaveResult.data;

          return "Đã tạm lưu dữ liệu khám (không đổi trạng thái).";
        } catch (error) {
          const translatedError = translateError(error);
          throw new Error(translatedError);
        } finally {
          setIsLoading(false);
        }
      },
    });

    if (result.isConfirmed) {
      showToast("success", result.value);
    }
  };

  // HANDLE REFRESH PATIENTS - FIX: TÁCH RIÊNG
  const handleRefreshPatients = async () => {
    const result = await showConfirmation({
      title: "Làm mới danh sách",
      text: "Bạn có muốn làm mới danh sách bệnh nhân?",
      confirmText: "Làm mới",
      cancelText: "Hủy",
      icon: "question",
    });

    if (result.isConfirmed) {
      await fetchTodayPatients();
      showToast("success", "Đã làm mới danh sách bệnh nhân");
    }
  };

  // HANDLE START FIRST EXAMINATION - FIX: TÁCH RIÊNG
  const handleStartFirstExamination = async () => {
    const firstPatient =
      todayPatients.find((p) => getStatusText(p.status) === "Đang chờ") ||
      todayPatients[0];
    if (firstPatient) {
      const result = await showConfirmation({
        title: "Bắt đầu khám đầu tiên",
        text: `Bạn có muốn bắt đầu khám cho bệnh nhân ${firstPatient.name}?`,
        confirmText: "Bắt đầu khám",
        cancelText: "Hủy",
        icon: "question",
      });

      if (result.isConfirmed) {
        handleSelectPatient(firstPatient);
      }
    }
  };

  const handleRemoveWithConfirm = async (index) => {
    const result = await Swal.fire({
      title: "Xác nhận xóa",
      text: "Bạn có chắc chắn muốn xóa thuốc này khỏi đơn?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Có, xóa!",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      removePrescription(index);
      showToast("success", "Đã xóa thuốc khỏi đơn");
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
      <div
        className={`section ${currentSection === "today" ? "active" : ""}`}
        id="today"
      >
        <Row>
          <Col md={4}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-success text-white text-start d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  Danh sách khám ({new Date().toLocaleDateString("vi-VN")})
                </h5>
                <Button
                  variant="light"
                  size="sm"
                  onClick={handleRefreshPatients}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <i className="fas fa-undo-alt"></i>
                  )}
                </Button>
              </Card.Header>
              <Card.Body className="p-0">
                <PatientList
                  todayPatients={todayPatients}
                  isLoading={isLoading}
                  selectedTodayPatient={selectedTodayPatient}
                  onPatientSelect={handleSelectPatient}
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
                {viewMode && (
                  <Badge bg="secondary" className="ms-2">
                    Chế độ xem (không chỉnh sửa)
                  </Badge>
                )}
                {isExamining && (
                  <Badge bg="success" className="ms-2">
                    {" "}
                    Đang khám
                  </Badge>
                )}
              </Card.Header>
              <Card.Body>
                <div className="card-text text-start">
                  {selectedTodayPatient ? (
                    <>
                      <strong>Bệnh nhân:</strong> {selectedTodayPatient.name} -{" "}
                      <strong>Tuổi:</strong> {selectedTodayPatient.age} -{" "}
                      <strong>Giới tính:</strong> {selectedTodayPatient.gender}{" "}
                      - <strong>SĐT:</strong> {selectedTodayPatient.phone} -{" "}
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
                        Số bệnh nhân đang chờ:{" "}
                        <strong>
                          {
                            todayPatients.filter(
                              (p) => getStatusText(p.status) === "Đang chờ"
                            ).length
                          }
                        </strong>
                        .
                        <br />
                        Bệnh nhân tiếp theo:{" "}
                        <strong>
                          {todayPatients.find(
                            (p) => getStatusText(p.status) === "Đang chờ"
                          )?.name ||
                            todayPatients[0]?.name ||
                            "Không có"}
                        </strong>
                        ({todayPatients[0]?.time || "N/A"}).
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleStartFirstExamination}
                        disabled={isLoading}
                        className="me-2"
                      >
                        {isLoading ? (
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-1"
                          />
                        ) : (
                          "🚀"
                        )}{" "}
                        Bắt đầu khám ngay
                      </Button>
                      <small>Hoặc chọn từ danh sách bên trái để bắt đầu.</small>
                    </div>
                  ) : (
                    <span className="text-muted">
                      Chưa có lịch khám bệnh nhân hôm nay. Kiểm tra lại sau.
                    </span>
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
                      setToast={showToast}
                      onDiagnosisUpdate={(newDiagnoses) => {
                        if (
                          !diagnoses.length ||
                          diagnoses[0].Diagnosis !== newDiagnoses.Diagnosis ||
                          diagnoses[0].Symptoms !== newDiagnoses.Symptoms
                        ) {
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
                      setToast={showToast}
                      selectedTodayPatient={selectedTodayPatient}
                      symptoms={symptoms}
                      diagnoses={diagnoses}
                      doctorInfo={doctorInfo}
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
                      setToast={showToast}
                      diagnoses={diagnoses}
                      doctorInfo={doctorInfo}
                    />
                  </Row>

                  <div className="d-flex justify-content-start gap-2 mt-3">
                    <Button
                      variant="success"
                      type="button"
                      onClick={handleExaminationSubmit}
                      disabled={
                        isFormDisabled ||
                        isLoading ||
                        viewMode ||
                        (!symptoms &&
                          !diagnosis &&
                          Object.keys(services).length === 0 &&
                          prescriptionRows.length === 0)
                      }
                      className="no-print"
                    >
                      {isLoading ? (
                        <Spinner animation="border" size="sm" />
                      ) : null}
                      <i className="fas fa-check-circle"></i> Hoàn Tất & Lưu Hồ
                      Sơ
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleTempSave}
                      disabled={
                        isFormDisabled ||
                        isLoading ||
                        viewMode ||
                        (!symptoms &&
                          !diagnosis &&
                          Object.keys(services).length === 0 &&
                          prescriptionRows.length === 0)
                      }
                      className="no-print"
                    >
                      <i className="fas fa-save"></i> Tạm Lưu
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div id="print-content" ref={printRef} style={{ display: "none" }} />

        {/* THÊM CUSTOM TOAST COMPONENT */}
        {toast.show && (
          <CustomToast
            type={toast.type}
            message={toast.message}
            onClose={closeToast}
          />
        )}
      </div>
    </>
  );
};

export default TodaySection;
