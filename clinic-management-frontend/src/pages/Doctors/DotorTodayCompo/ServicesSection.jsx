import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Col, Card, Form, Button, Spinner, Badge, Row, Table } from "react-bootstrap";
import Pagination from "../../../Components/Pagination/Pagination";
import { useNavigate } from "react-router-dom";
import { printPdfService } from "../../../services/printPdfService";
import doctorService from "../../../services/doctorService";
import Swal from 'sweetalert2';

const ServicesSection = ({
  services,
  setServices,
  requestedServices,
  setRequestedServices,
  diagnosis,
  isFormDisabled,
  setToast,
  selectedTodayPatient,
  symptoms,
  diagnoses = [],
  doctorInfo,
}) => {
  const navigate = useNavigate();
  const [localServices, setLocalServices] = useState([]);
  const [localServicesLoading, setLocalServicesLoading] = useState(true);
  const [serviceSuggestions, setServiceSuggestions] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;

  // THÊM STATE CHO CHỈNH SỬA GIỐNG PRESCRIPTION
  const [editingIndex, setEditingIndex] = useState(null);
  const [newService, setNewService] = useState({
    serviceName: '',
    price: 0,
    quantity: 1,
    totalPrice: 0
  });

  // THÊM CẤU HÌNH PDF MẶC ĐỊNH
  const defaultPdfSettings = {
    page_size: "A4",
    orientation: "portrait",
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: true,
    footer: true,
    fontFamily: 'Times New Roman',
    fontSize: '14px',
    fontColor: '#000000',
    primaryColor: '#2c5aa0',
    backgroundColor: '#ffffff',
    borderColor: '#333333',
    headerBgColor: '#f0f0f0',
    lineHeight: 1.5,
    fontStyle: 'normal',
    fontWeight: 'normal',

    // Clinic info
    clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
    clinicAddress: 'Số 123 Đường ABC, Quận 1, TP.HCM',
    clinicPhone: '028 1234 5678',
    doctorName: doctorInfo?.doctor_Name || 'Hệ thống',
    customTitle: 'Phiếu Chỉ Định Dịch Vụ',

    // Page settings
    pageOrientation: 'portrait',
    pageSize: 'A4',
    marginTop: '15mm',
    marginBottom: '15mm',
    marginLeft: '10mm',
    marginRight: '10mm',

    // Logo settings (disabled)
    logo: {
      enabled: false,
      url: '',
      width: '80px',
      height: '80px',
      position: 'left',
      opacity: 0.8
    },

    // Watermark settings (disabled)
    watermark: {
      enabled: false,
      text: 'MẪU BẢN QUYỀN',
      url: '',
      opacity: 0.1,
      fontSize: 48,
      color: '#cccccc',
      rotation: -45
    }
  };

  // HÀM CHUYỂN DỊCH LỖI BE SANG FE
  const translateError = (error) => {
    console.error('🔴 Backend Error:', error);

    const backendMessage = error.response?.data?.message || error.message || '';

    // Map các lỗi phổ biến từ BE sang thông báo tiếng Việt thân thiện
    const errorMap = {
      'Patient not found': 'Không tìm thấy thông tin bệnh nhân',
      'No services found': 'Không tìm thấy dịch vụ',
      'Invalid appointment ID': 'Mã cuộc hẹn không hợp lệ',
      'Services already assigned': 'Dịch vụ đã được chỉ định trước đó',
      'Network Error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet',
      'Request failed with status code 404': 'Không tìm thấy dịch vụ',
      'Request failed with status code 500': 'Lỗi máy chủ. Vui lòng thử lại sau',
      'timeout of 5000ms exceeded': 'Quá thời gian chờ phản hồi',
      'No services selected': 'Chưa chọn dịch vụ nào',
      'Appointment not found': 'Không tìm thấy thông tin cuộc hẹn'
    };

    // Tìm thông báo tương ứng hoặc trả về mặc định
    for (const [key, value] of Object.entries(errorMap)) {
      if (backendMessage.includes(key) || error.message.includes(key)) {
        return value;
      }
    }

    // Fallback cho các lỗi khác
    if (backendMessage) {
      return `Lỗi: ${backendMessage}`;
    }

    return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
  };

  // HÀM HIỂN THỊ CONFIRMATION VỚI SWEETALERT2
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

  // HÀM HIỂN THỊ THÔNG BÁO THÀNH CÔNG
  const showSuccessAlert = (message) => {
    Swal.fire({
      title: 'Thành công!',
      text: message,
      icon: 'success',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK'
    });
  };

  // HÀM XỬ LÝ LỖI VÀ HIỂN THỊ THÔNG BÁO
  const handleError = (error, customMessage = '') => {
    const translatedError = translateError(error);
    console.error('❌ Error:', error);

    Swal.fire({
      title: 'Lỗi!',
      text: customMessage || translatedError,
      icon: 'error',
      confirmButtonColor: '#d33',
      confirmButtonText: 'OK'
    });
  };

  // FIX: SỬ DỤNG DIRECTLY TỪ PROPS, KHÔNG DÙNG STATE LOCAL TRUNG GIAN
  const servicesState = services || {};

  // Fetch services - CHỈ CHẠY 1 LẦN KHI MOUNT - ĐÃ SỬA LỖI
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLocalServicesLoading(true);
        console.log('🔄 Đang gọi API services...');

        const response = await doctorService.getServices();
        console.log('📥 API Services Response:', response);

        // FIX: API TRẢ VỀ ARRAY TRỰC TIẾP, KHÔNG PHẢI response.data
        let servicesArray = [];

        if (Array.isArray(response)) {
          // Case 1: response là array trực tiếp
          servicesArray = response;
          console.log('✅ Case 1: response là array trực tiếp');
        } else if (response && Array.isArray(response.data)) {
          // Case 2: response có property data là array
          servicesArray = response.data;
          console.log('✅ Case 2: response.data là array');
        } else {
          console.warn('⚠️ Cấu trúc response không xác định:', response);
        }

        console.log('📋 Services array cuối cùng:', servicesArray);

        if (servicesArray.length > 0) {
          console.log('✅ Nhận được danh sách dịch vụ:', servicesArray.length, 'dịch vụ');
          setLocalServices(servicesArray);

          // FIX: Chỉ khởi tạo services nếu chưa có
          if (!services || Object.keys(services).length === 0) {
            const initialServices = servicesArray.reduce((acc, service) => {
              return { ...acc, [service.ServiceId]: false };
            }, {});
            console.log('✅ Đã khởi tạo services state:', initialServices);
            setServices(initialServices);
          } else {
            console.log('ℹ️ Services state đã có sẵn');
          }
        } else {
          console.warn('⚠️ Không có dịch vụ nào trong dữ liệu');
          setLocalServices([]);
          setToast('info', "Không có dịch vụ nào khả dụng");
        }

      } catch (error) {
        const translatedError = translateError(error);
        console.error('❌ Error fetching services:', error);
        setToast('error', `Lỗi tải danh sách dịch vụ: ${translatedError}`);
        setLocalServices([]);
      } finally {
        setLocalServicesLoading(false);
        console.log('🏁 Kết thúc loading services');
      }
    };

    fetchServices();
  }, [setServices, setToast]); // CHỈ CHẠY 1 LẦN

  // RESET FORM KHI CHUYỂN TRẠNG THÁI CHỈNH SỬA
  useEffect(() => {
    if (editingIndex === null) {
      setNewService({
        serviceName: '',
        price: 0,
        quantity: 1,
        totalPrice: 0
      });
    }
  }, [editingIndex]);

  // FUNCTION PREVIEW PDF - ĐÃ THÊM CONFIRMATION
  const handlePreview = async () => {
    if (!selectedTodayPatient) {
      setToast('warning', "Vui lòng chọn bệnh nhân trước khi xem trước.");
      return;
    }

    // ✅ Lấy data services
    const selectedServices = Object.keys(servicesState)
      .filter(serviceId => servicesState[serviceId])
      .map(serviceId => {
        const service = localServices.find(s => s.ServiceId == serviceId);
        return service ? {
          ServiceName: service.ServiceName,
          Price: service.Price || 0,
          Quantity: 1
        } : null;
      })
      .filter(Boolean);

    if (selectedServices.length === 0) {
      setToast('warning', "Vui lòng chọn ít nhất một dịch vụ trước khi xem trước.");
      return;
    }

    // ✅ Hiển thị confirmation trước khi chuyển đến editor
    const result = await showConfirmation({
      title: 'Chỉnh sửa PDF dịch vụ',
      text: `Bạn có muốn chuyển đến trình chỉnh sửa PDF để tùy chỉnh phiếu chỉ định ${selectedServices.length} dịch vụ?`,
      confirmText: 'Chuyển đến editor',
      cancelText: 'Hủy',
      icon: 'question'
    });

    if (!result.isConfirmed) {
      return;
    }

    // ✅ Tạo data gửi đến PDF Editor (GIỐNG PRESCRIPTION)
    const previewData = {
      type: 'service',
      patient_name: selectedTodayPatient.name || 'N/A',
      age: String(selectedTodayPatient?.age ?? 'N/A'),
      gender: selectedTodayPatient.gender || 'N/A',
      phone: selectedTodayPatient.phone || 'N/A',
      address: selectedTodayPatient.address || 'N/A',

      // ✅ THÔNG TIN HẸN KHÁM
      appointment_date: selectedTodayPatient.date
        ? new Date(selectedTodayPatient.date).toLocaleDateString('vi-VN')
        : new Date().toLocaleDateString('vi-VN'),
      appointment_time: selectedTodayPatient.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      doctor_name: doctorInfo?.doctor_Name || 'Bác sĩ chưa rõ',

      // ✅ SERVICES DATA - CẤU TRÚC CHUẨN
      services: selectedServices,

      // ✅ THÔNG TIN Y TẾ
      symptoms: symptoms || '',
      diagnosis: diagnosis || '',
      instructions: 'Vui lòng thực hiện các dịch vụ theo chỉ định',

      // ✅ PDF SETTINGS
      pdf_settings: defaultPdfSettings,

      // ✅ THÔNG TIN ID
      appointment_id: selectedTodayPatient.id || selectedTodayPatient.AppointmentId,
      patient_id: selectedTodayPatient.PatientId || selectedTodayPatient.patient_id,

      // ✅ ORIGINAL DATA ĐỂ BACKUP
      originalData: {
        services: [...selectedServices],
        symptoms,
        diagnosis,
        instructions: 'Vui lòng thực hiện các dịch vụ theo chỉ định',
      },

      timestamp: Date.now()
    };

    console.log('📤 Data preview DỊCH VỤ gửi đến PDF Editor:', {
      patient: previewData.patient_name,
      patient: previewData.age,
      doctor: previewData.doctor_name,
      services_count: previewData.services.length,
      services: previewData.services
    });
    console.log('tất cae Data preview DỊCH VỤ gửi đến PDF Editor:', {
      all: selectedTodayPatient,
    });

    try {
      // ✅ XÓA DỮ LIỆU CŨ TRƯỚC KHI LƯU MỚI
      sessionStorage.removeItem('pdfEditorData');
      sessionStorage.removeItem('shouldRefreshOnReturn');
      sessionStorage.removeItem('editorSource');

      // ✅ Lưu data MỚI NHẤT vào sessionStorage
      sessionStorage.setItem('pdfEditorData', JSON.stringify(previewData));
      sessionStorage.setItem('shouldRefreshOnReturn', 'true');
      sessionStorage.setItem('editorSource', 'services');
      console.log('🚀 BEFORE NAVIGATE - State to send:', {
        pdfData: previewData,
        source: 'services',
        servicesData: selectedServices,
        patientInfo: {
          name: previewData.patient_name,
          age: previewData.age,
          gender: previewData.gender,
          phone: previewData.phone,
          address: previewData.address
        },
        doctorInfo: {
          name: previewData.doctor_name // ← THÊM DOCTOR INFO
        }
      });

      navigate('/doctor/print-pdf-editor', {
        state: {
          pdfData: previewData,
          source: 'services',
          timestamp: Date.now(),
          fromServices: true,
          servicesData: selectedServices,
          patientInfo: {
            name: previewData.patient_name,
            age: previewData.age,
            gender: previewData.gender,
            phone: previewData.phone,
            address: previewData.address
          },
          doctorInfo: doctorInfo
        }
      });

      console.log('✅ AFTER NAVIGATE - Should be on PDF Editor page');

      setToast('success', "Đang chuyển đến trình chỉnh sửa PDF...");

    } catch (error) {
      console.error('Error navigating to PDF editor:', error);
      handleError(error, 'Lỗi khi chuyển đến trình chỉnh sửa PDF');
    }
  };

  // FUNCTION DOWNLOAD PDF - ĐÃ THÊM CONFIRMATION
  const printDocument = async () => {
    if (!selectedTodayPatient) {
      setToast('warning', "Chưa chọn bệnh nhân.");
      return;
    }

    const selectedServices = Object.keys(servicesState)
      .filter(serviceId => servicesState[serviceId])
      .map(serviceId => {
        const service = localServices.find(s => s.ServiceId == serviceId);
        return service ? {
          ServiceName: service.ServiceName,
          Price: service.Price || 0,
          Quantity: 1
        } : null;
      })
      .filter(Boolean);

    if (selectedServices.length === 0) {
      setToast('warning', "Chưa chọn dịch vụ nào.");
      return;
    }

    // ✅ Hiển thị confirmation trước khi xuất PDF
    const result = await showConfirmation({
      title: 'Xuất PDF dịch vụ',
      text: `Bạn có chắc muốn xuất phiếu chỉ định ${selectedServices.length} dịch vụ ra file PDF?`,
      confirmText: 'Xuất PDF',
      cancelText: 'Hủy',
      icon: 'question'
    });

    if (!result.isConfirmed) {
      return;
    }

    const requestData = {
      type: 'service',
      patient_name: selectedTodayPatient.name,
      age: selectedTodayPatient.age,
      gender: selectedTodayPatient.gender,
      phone: selectedTodayPatient.phone,
      appointment_date: selectedTodayPatient.date || new Date().toLocaleDateString('vi-VN'),
      appointment_time: selectedTodayPatient.time,
      doctor_name: doctorInfo?.doctor_Name || 'Bác sĩ điều trị',
      diagnoses: diagnoses.length > 0 ? diagnoses : [{ Symptoms: symptoms, Diagnosis: diagnosis }],
      services: selectedServices,
      // THÊM PDF SETTINGS VÀO ĐÂY
      pdf_settings: defaultPdfSettings
    };

    try {
      const response = await printPdfService.printPDF(requestData);
      console.log('✅ PDF Service Result:', response)
      console.log(' PDF Service Result:', requestData)
      console.log('📥 API Response status:', response.status);

      showSuccessAlert('Đã xuất phiếu chỉ định dịch vụ thành công!');

    } catch (error) {
      console.error('Error printing service document:', error);
      handleError(error, 'Lỗi xuất PDF dịch vụ');
    }
  };

  // HÀM XỬ LÝ THAY ĐỔI TRƯỜNG DỮ LIỆU
  const handleFieldChange = (field, value) => {
    let updatedService = { ...newService };

    if (field === 'quantity' || field === 'price') {
      updatedService[field] = field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0;

      const quantity = field === 'quantity' ? parseInt(value) || 0 : newService.quantity;
      const price = field === 'price' ? parseFloat(value) || 0 : newService.price;
      updatedService.totalPrice = quantity * price;
    } else {
      updatedService[field] = value;
    }

    setNewService(updatedService);
  };

  // HÀM BẮT ĐẦU CHỈNH SỬA
  const startEditing = (serviceId) => {
    const service = localServices.find(s => s.ServiceId == serviceId);
    if (service) {
      setNewService({
        serviceName: service.ServiceName,
        price: service.Price || 0,
        quantity: 1,
        totalPrice: service.Price || 0
      });
      setEditingIndex(serviceId);
    }
  };

  // HÀM HỦY CHỈNH SỬA - ĐÃ THÊM CONFIRMATION
  const handleCancelEditing = async () => {
    if (newService.serviceName || newService.price > 0) {
      const result = await showConfirmation({
        title: 'Hủy chỉnh sửa',
        text: 'Bạn có chắc muốn hủy thao tác chỉnh sửa? Dữ liệu chưa lưu sẽ bị mất.',
        confirmText: 'Hủy bỏ',
        cancelText: 'Tiếp tục chỉnh sửa',
        icon: 'warning'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    cancelEditing();
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setNewService({
      serviceName: '',
      price: 0,
      quantity: 1,
      totalPrice: 0
    });
  };

  // HÀM CẬP NHẬT DỊCH VỤ - ĐÃ THÊM CONFIRMATION
  const handleUpdate = async () => {
    if (!newService.serviceName.trim()) {
      setToast('warning', "Vui lòng nhập tên dịch vụ!");
      return;
    }

    const result = await showConfirmation({
      title: 'Cập nhật dịch vụ',
      text: `Bạn có chắc muốn cập nhật thông tin dịch vụ thành "${newService.serviceName}"?`,
      confirmText: 'Cập nhật',
      cancelText: 'Hủy',
      icon: 'question'
    });

    if (!result.isConfirmed) {
      return;
    }

    cancelEditing();
    showSuccessAlert('Cập nhật dịch vụ thành công!');
  };

  // HÀM XÓA DỊCH VỤ - ĐÃ THÊM CONFIRMATION
  const handleRemoveService = async (serviceId, serviceName) => {
    const result = await showConfirmation({
      title: 'Xóa dịch vụ',
      text: `Bạn có chắc muốn xóa dịch vụ "${serviceName}" khỏi danh sách đã chọn?`,
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      icon: 'warning',
      confirmColor: '#d33'
    });

    if (result.isConfirmed) {
      setServices(prev => ({
        ...prev,
        [serviceId]: false
      }));

      showSuccessAlert(`Đã xóa dịch vụ "${serviceName}" thành công!`);
    }
  };

  // FIX: Handle test change - ĐÃ THÊM CONFIRMATION CHO VIỆC BỎ CHỌN VỚI SWEETALERT2
  const handleTestChange = useCallback((serviceId, serviceName) => async (e) => {
    const isChecked = e.target.checked;

    // Nếu đang bỏ chọn (uncheck), hiển thị confirmation với SweetAlert2
    if (!isChecked) {
      const result = await showConfirmation({
        title: 'Bỏ chọn dịch vụ',
        text: `Bạn có chắc muốn bỏ chọn dịch vụ "${serviceName}"?`,
        confirmText: 'Bỏ chọn',
        cancelText: 'Giữ lại',
        icon: 'warning',
        confirmColor: '#d33'
      });

      if (!result.isConfirmed) {
        // Nếu người dùng không xác nhận, giữ nguyên trạng thái checked
        e.preventDefault();
        return;
      }
    }

    // Cập nhật trực tiếp prop state
    setServices(prev => ({
      ...prev,
      [serviceId]: isChecked
    }));

    if (isChecked) {
      setToast('success', `Đã chọn dịch vụ "${serviceName}"`);
    } else {
      setToast('info', `Đã bỏ chọn dịch vụ "${serviceName}"`);
    }
  }, [setServices, setToast, showConfirmation]);

  // Memoize testLabels
  const testLabels = useMemo(() => {
    return localServices.reduce((acc, service) => ({
      ...acc,
      [service.ServiceId]: service.ServiceName
    }), {});
  }, [localServices]);

  // Pagination
  const { pageCount, currentItems } = useMemo(() => {
    const pageCount = Math.ceil(localServices.length / itemsPerPage);
    const currentItems = localServices.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
    return { pageCount, currentItems };
  }, [localServices, currentPage, itemsPerPage]);

  // FIX: SERVICE SUGGESTIONS - XỬ LÝ API GỢI Ý DỊCH VỤ
  useEffect(() => {
    const trimmedDiagnosis = diagnosis?.trim();
    if (!trimmedDiagnosis || trimmedDiagnosis.length < 3) {
      setServiceSuggestions([]);
      return;
    }

    setServiceLoading(true);
    const timeout = setTimeout(async () => {
      try {
        console.log('🔍 Gọi API suggestService với diagnosis:', trimmedDiagnosis);
        const response = await doctorService.suggestService(trimmedDiagnosis);
        console.log('🔍 API Service Response:', response);

        let suggestions = [];

        // FIX: XỬ LÝ CẤU TRÚC RESPONSE THEO ĐÚNG API
        if (Array.isArray(response)) {
          suggestions = response;
          console.log('✅ Case 1: response là array trực tiếp');
        }
        // DỰ PHÒNG: nếu có response.data
        else if (response && Array.isArray(response.data)) {
          suggestions = response.data;
          console.log('✅ Case 2: response.data là array');
        }
        // DỰ PHÒNG: nếu có response.suggestions
        else if (response && Array.isArray(response.suggestions)) {
          suggestions = response.suggestions;
          console.log('✅ Case 3: response.suggestions là array');
        }
        else {
          console.warn('⚠️ Cấu trúc response không xác định:', response);
          suggestions = [];
        }

        console.log('📊 Service suggestions cuối cùng:', suggestions);

        if (suggestions.length > 0) {
          // CHUẨN HÓA DỮ LIỆU - QUAN TRỌNG: XÁC ĐỊNH ĐÚNG FIELD NAMES
          const normalizedSuggestions = suggestions.map(item => {
            // THỬ CÁC FIELD NAME CÓ THỂ CÓ TỪ API
            const serviceName = item.ServiceName || item.serviceName || item.name || item.Service || item.MedicineName || 'Dịch vụ không tên';
            const reason = item.Reason || item.reason || item.description || item.explanation || 'Đề xuất dựa trên chẩn đoán';

            return {
              ServiceName: serviceName,
              Reason: reason,
              // GIỮ LẠI DỮ LIỆU GỐC ĐỂ DEBUG
              originalData: item
            };
          });

          setServiceSuggestions(normalizedSuggestions);
          console.log('✅ Đã set service suggestions:', normalizedSuggestions);
        } else {
          setServiceSuggestions([]);
          console.log('ℹ Không có gợi ý dịch vụ nào từ API');
        }

      } catch (err) {
        console.error("❌ Service suggestion error:", err);
        console.error("Error details:", err.response?.data || err.message);
        setToast('error', `Lỗi gợi ý dịch vụ: ${err.message}`);
        setServiceSuggestions([]);
      } finally {
        setServiceLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [diagnosis, setToast]);

  // Match function
  const findMatchingKey = useCallback((serviceName, labels) => {
    if (!serviceName) return null;

    const matchServiceName = (suggestedName, label) => {
      if (!suggestedName || !label) return 0;
      const lowerSuggested = suggestedName.toLowerCase();
      const lowerLabel = label.toLowerCase();

      if (lowerSuggested.includes(lowerLabel) || lowerLabel.includes(lowerSuggested)) {
        return 1.0;
      }

      const wordsSuggested = lowerSuggested.split(/\s+/).filter(w => w.length > 0);
      const wordsLabel = lowerLabel.split(/\s+/).filter(w => w.length > 0);
      if (wordsSuggested.length === 0 || wordsLabel.length === 0) return 0;

      const commonWords = wordsSuggested.filter(word => wordsLabel.includes(word));
      return commonWords.length / Math.max(wordsSuggested.length, wordsLabel.length);
    };

    let bestKey = null;
    let bestScore = 0;

    Object.keys(labels).forEach(key => {
      const score = matchServiceName(serviceName, labels[key]);
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    });

    return bestScore > 0.5 ? bestKey : null;
  }, []);

  // FUNCTION: Handle request service - ĐÃ THÊM CONFIRMATION VÀ XỬ LÝ LỖI
  const handleRequestService = useCallback(async () => {
    console.log('🔍 DEBUG selectedTodayPatient:', selectedTodayPatient);

    const selected = Object.keys(servicesState).filter((k) => servicesState[k]);
    const selectedCount = selected.length;

    if (selectedCount === 0) {
      setToast('warning', "Bạn chưa chọn dịch vụ nào.");
      return;
    }

    if (!selectedTodayPatient) {
      setToast('warning', "Chưa chọn bệnh nhân.");
      return;
    }

    const appointmentId = selectedTodayPatient.appointment_id ||
      selectedTodayPatient.AppointmentId ||
      selectedTodayPatient.appointmentId ||
      selectedTodayPatient.id ||
      selectedTodayPatient.AppointmentID;

    if (!appointmentId) {
      setToast('warning', `Không tìm thấy ID cuộc hẹn. Vui lòng chọn bệnh nhân từ danh sách hôm nay.`);
      return;
    }

    // ✅ Hiển thị confirmation trước khi gửi yêu cầu
    const result = await showConfirmation({
      title: 'Yêu cầu thực hiện dịch vụ',
      text: `Bạn có chắc muốn gửi yêu cầu thực hiện ${selectedCount} dịch vụ cho bệnh nhân ${selectedTodayPatient.name}?`,
      confirmText: 'Gửi yêu cầu',
      cancelText: 'Hủy',
      icon: 'question',
      showLoader: true,
      preConfirm: async () => {
        try {
          setServiceLoading(true);

          const requestData = {
            selectedServices: selected.map(id => parseInt(id)),
            diagnosis: diagnosis || '',
            symptoms: symptoms || '',
            notes: "Chỉ định từ bác sĩ"
          };

          console.log('📤 Gửi request assign services:', {
            appointmentId,
            requestData
          });

          // GỌI API
          const response = await doctorService.assignServices(appointmentId, requestData);

          console.log('📥 API Response:', response);

          // FIX: CHECK SUCCESS Ở RESPONSE LEVEL
          if (response && response.success === true) {
            const successMessage = response.message || `Đã chỉ định ${selectedCount} dịch vụ thành công!`;

            const updatedRequestedServices = { ...requestedServices };
            selected.forEach(serviceId => {
              updatedRequestedServices[serviceId] = true;
            });
            setRequestedServices(updatedRequestedServices);

            console.log('✅ Đã cập nhật requested services:', updatedRequestedServices);

            return successMessage;
          } else {
            // FIX: XỬ LÝ KHI KHÔNG THÀNH CÔNG
            const errorMessage = response?.message || 'Lỗi không xác định từ server';
            throw new Error(errorMessage);
          }

        } catch (error) {
          const translatedError = translateError(error);
          throw new Error(translatedError);
        } finally {
          setServiceLoading(false);
        }
      }
    });

    if (result.isConfirmed) {
      showSuccessAlert(result.value || `Đã gửi yêu cầu ${selectedCount} dịch vụ thành công!`);
    }

  }, [servicesState, selectedTodayPatient, diagnosis, symptoms, requestedServices, setRequestedServices, setToast, showConfirmation, translateError]);

  // RENDER DANH SÁCH DỊCH VỤ ĐỂ CHỌN (CHECKBOX)
  const renderServicesCheckbox = () => {
    const half = Math.ceil(currentItems.length / 2);
    const leftColumn = currentItems.slice(0, half);
    const rightColumn = currentItems.slice(half);

    const renderServiceColumn = (columnServices) =>
      columnServices.map((service) => {
        const checked = servicesState[service.ServiceId] || false;

        return (
          <div key={service.ServiceId} className="d-flex justify-content-between align-items-center mb-2">
            <div className="form-check d-flex align-items-center">
              <input
                id={`checkbox-${service.ServiceId}`}
                type="checkbox"
                checked={checked}
                onChange={handleTestChange(service.ServiceId, service.ServiceName)}
                disabled={isFormDisabled}
                className="form-check-input me-2"
              />
              <label htmlFor={`checkbox-${service.ServiceId}`} className="form-check-label mb-0">
                {service.ServiceName} - {service.Price ? service.Price.toLocaleString() + ' VNĐ' : 'Giá chưa cập nhật'}
              </label>
            </div>
            {requestedServices[service.ServiceId] && (
              <Badge bg="success" pill className="ms-2">
                Đã yêu cầu
              </Badge>
            )}
          </div>
        );
      });

    return (
      <Row>
        <Col md={6}>{renderServiceColumn(leftColumn)}</Col>
        <Col md={6}>{renderServiceColumn(rightColumn)}</Col>
      </Row>
    );
  };

  // RENDER DỊCH VỤ ĐÃ CHỌN DẠNG TABLE GIỐNG PRESCRIPTION - ĐÃ BỎ NÚT THÊM
  const renderSelectedServicesTable = () => {
    const selectedServices = localServices.filter(service => servicesState[service.ServiceId]);

    return (
      <>
        <h6 className="mt-4">Danh sách dịch vụ đã chọn:</h6>
        {selectedServices.length === 0 ? (
          <p className="text-muted">Chưa có dịch vụ nào được chọn.</p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th width="40%">Tên dịch vụ</th>
                <th width="15%">Đơn giá (VND)</th>
                <th width="10%">Số lượng</th>
                <th width="15%">Thành tiền (VND)</th>
                <th width="20%">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {selectedServices.map((service, index) => (
                <tr key={service.ServiceId}>
                  {editingIndex === service.ServiceId ? (
                    <>
                      <td>
                        <Form.Control
                          type="text"
                          value={newService.serviceName}
                          onChange={(e) => handleFieldChange('serviceName', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="0"
                          step="1000"
                          value={newService.price}
                          onChange={(e) => handleFieldChange('price', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="1"
                          value={newService.quantity}
                          onChange={(e) => handleFieldChange('quantity', e.target.value)}
                          required
                        />
                      </td>
                      <td className="align-middle">
                        {newService.totalPrice?.toLocaleString() || 0}
                      </td>
                      <td>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={handleUpdate}
                        >
                          <i className="fas fa-save"></i> Lưu
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="ms-1 mt-1"
                          onClick={handleCancelEditing}
                        >
                          <i className="fas fa-times"></i> Hủy
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{service.ServiceName}</td>
                      <td>{service.Price?.toLocaleString() || 0}</td>
                      <td>1</td>
                      <td>{service.Price?.toLocaleString() || 0}</td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveService(service.ServiceId, service.ServiceName)}
                          disabled={isFormDisabled}
                        >
                          <i className="fas fa-trash"></i> Xóa
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="ms-1 mt-1"
                          onClick={() => startEditing(service.ServiceId)}
                          disabled={isFormDisabled}
                        >
                          <i className="fas fa-wrench"></i> Sửa
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </>
    );
  };

  const handlePageChange = useCallback(({ selected }) => {
    setCurrentPage(selected);
  }, []);

  return (
    <Col md={12}>
      <Card className="mb-3 border-light shadow-sm">
        <Card.Header className="text-start fw-bold">
          2. Chỉ định dịch vụ cận lâm sàng
        </Card.Header>
        <Card.Body className="text-start">
          <Form.Group className="mb-3">
            {serviceSuggestions.length > 0 && (
              <div className="ai-suggestions mb-3 p-3 border rounded bg-light">
                <h6 className="text-primary">
                  <i className="fas fa-flask me-2"></i>
                  Gợi ý dịch vụ phù hợp (dựa trên chẩn đoán):
                </h6>
                <ul className="mb-0 list-unstyled">
                  {serviceSuggestions.map((service, i) => {
                    const serviceName = service.ServiceName;
                    const serviceKey = findMatchingKey(serviceName, testLabels);
                    const isAvailable = !!serviceKey;
                    const isAlreadySelected = serviceKey ? servicesState[serviceKey] : false;

                    return (
                      <li key={`${serviceName}-${i}`} className="mb-2 p-2 border-bottom">
                        <div className="service-info">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <strong className={isAvailable ? 'text-success' : 'text-muted'}>
                                {serviceName}
                                {!isAvailable && <small className="text-warning ms-1">(chưa có trong danh sách)</small>}
                              </strong>
                              <div className="mt-1">
                                <small className="text-muted">
                                  <i>{service.Reason}</i>
                                </small>
                              </div>
                            </div>
                            <Button
                              variant={isAlreadySelected ? "success" : isAvailable ? "primary" : "secondary"}
                              size="sm"
                              onClick={async () => {
                                if (serviceKey) {
                                  const isCurrentlyChecked = servicesState[serviceKey] || false;
                                  const newValue = !isCurrentlyChecked;

                                  // Hiển thị confirmation khi chọn dịch vụ từ gợi ý AI
                                  if (newValue) {
                                    const result = await showConfirmation({
                                      title: 'Chọn dịch vụ từ gợi ý AI',
                                      text: `Bạn có muốn chọn dịch vụ "${serviceName}" từ gợi ý AI?`,
                                      confirmText: 'Chọn dịch vụ',
                                      cancelText: 'Hủy',
                                      icon: 'info'
                                    });

                                    if (!result.isConfirmed) {
                                      return;
                                    }
                                  }

                                  setServices(prev => ({
                                    ...prev,
                                    [serviceKey]: newValue
                                  }));

                                  setToast('success', `Đã ${newValue ? 'chọn' : 'bỏ chọn'} dịch vụ "${serviceName}".`);
                                } else {
                                  setToast('warning', `Dịch vụ "${serviceName}" chưa có trong danh sách dịch vụ khả dụng.`);
                                }
                              }}
                              disabled={isFormDisabled || !isAvailable}
                            >
                              {isAlreadySelected ? (
                                <>✓ Đã chọn</>
                              ) : isAvailable ? (
                                <>+ Chọn dịch vụ</>
                              ) : (
                                <>Không khả dụng</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {serviceLoading && (
              <div className="text-center mt-2">
                <Spinner animation="border" size="sm" /> Đang tải gợi ý dịch vụ...
              </div>
            )}

            <h6>Danh sách dịch vụ khả dụng:</h6>
            {localServicesLoading ? (
              <div className="text-center">
                <Spinner animation="border" size="sm" /> Đang tải danh sách dịch vụ...
              </div>
            ) : localServices.length === 0 ? (
              <p className="text-muted">Không có dịch vụ nào khả dụng.</p>
            ) : (
              <>
                {renderServicesCheckbox()}
                <Pagination
                  pageCount={pageCount}
                  onPageChange={handlePageChange}
                  currentPage={currentPage}
                  isFormDisabled={localServicesLoading}
                />
              </>
            )}

            {/* HIỂN THỊ DANH SÁCH DỊCH VỤ ĐÃ CHỌN DẠNG TABLE */}
            {renderSelectedServicesTable()}
          </Form.Group>

          <div className="text-end">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleRequestService}
              disabled={isFormDisabled || !Object.values(servicesState).some(v => v) || serviceLoading}
              className="no-print"
            >
              <i className="fas fa-bell"></i>
              {serviceLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang gửi...
                </>
              ) : (
                ` Yêu cầu thực hiện dịch vụ đã chọn (${Object.values(servicesState).filter(v => v).length})`
              )}
            </Button>

            <Button
              variant="outline-info"
              size="sm"
              onClick={handlePreview}
              disabled={!selectedTodayPatient || !Object.values(servicesState).some(Boolean)}
              className="no-print ms-2"
              key="preview-button"
            >
              <i className="fas fa-eye"></i> Chỉnh sửa PDF
            </Button>

            <Button
              variant="outline-success"
              size="sm"
              onClick={printDocument}
              disabled={!selectedTodayPatient || !Object.values(servicesState).some(Boolean)}
              className="no-print ms-2"
            >
              <i className="fas fa-print"></i> Xuất PDF
            </Button>
          </div>

          <hr />

        </Card.Body>
      </Card>
    </Col>
  );
};

export default React.memo(ServicesSection);