import React, { useState, useEffect } from "react";
import { Col, Card, Table, Button, Form, Modal, Spinner, Alert } from "react-bootstrap";
import PDFPreviewEditor from "../PrintsPDF/PDFPreviewEditor";
import { useNavigate } from "react-router-dom";
import { printPdfService } from "../../../services/printPdfService";
import doctorService from "../../../services/doctorService";
import Swal from 'sweetalert2';

const PrescriptionSection = ({
  prescriptionRows,
  setPrescriptionRows,
  removePrescription,
  handleRemoveWithConfirm,
  isFormDisabled,
  selectedTodayPatient,
  symptoms,
  diagnosis,
  services,
  setToast,
  diagnoses,
  doctorInfo,
}) => {
  const navigate = useNavigate();

  const [editingIndex, setEditingIndex] = useState(null);
  const [newRow, setNewRow] = useState({
    medicine: '',
    quantity: '',
    dosage: '',
    unitPrice: 0,
    totalPrice: 0
  });
  const [suggestions, setSuggestions] = useState([]);

  // THÊM STATE CHO PDF PREVIEW
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);
  const [previewHTML, setPreviewHTML] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // THÊM CẤU TRÚC PDF MẶC ĐỊNH
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
    customTitle: 'Toa Thuốc',

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
      'No medicines found': 'Không tìm thấy thuốc',
      'Invalid medicine data': 'Dữ liệu thuốc không hợp lệ',
      'Medicine not found': 'Không tìm thấy thông tin thuốc',
      'Network Error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet',
      'Request failed with status code 404': 'Không tìm thấy dữ liệu',
      'Request failed with status code 500': 'Lỗi máy chủ. Vui lòng thử lại sau',
      'timeout of 5000ms exceeded': 'Quá thời gian chờ phản hồi',
      'No prescription data': 'Không có dữ liệu đơn thuốc',
      'PDF generation failed': 'Lỗi tạo file PDF'
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

  // Reset form khi chuyển trạng thái
  useEffect(() => {
    if (editingIndex === null) {
      setNewRow({
        medicine: '',
        quantity: '',
        dosage: '',
        unitPrice: 0,
        totalPrice: 0
      });
    } else {
      setNewRow({ ...prescriptionRows[editingIndex] });
    }
  }, [editingIndex, prescriptionRows]);

  // Search gợi ý thuốc - ĐÃ THÊM XỬ LÝ LỖI
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (newRow.medicine.trim().length >= 2) {
        try {
          const response = await doctorService.searchMedicines(newRow.medicine);

          // XỬ LÝ CẤU TRÚC RESPONSE
          let medicines = [];
          if (Array.isArray(response)) {
            medicines = response;
          } else if (response && Array.isArray(response.data)) {
            medicines = response.data;
          } else {
            console.warn('⚠️ Cấu trúc response không xác định:', response);
          }

          setSuggestions(medicines);
        } catch (err) {
          console.error("Lỗi khi tìm thuốc:", err);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [newRow.medicine]);

  // HÀM CHỌN GỢI Ý - LẤY ĐẦY ĐỦ THÔNG TIN TỪ AI
  const handleSelectSuggestion = (medicine) => {
    console.log("🎯 Dữ liệu thuốc từ AI:", medicine);

    const newUnitPrice = medicine.Price ? parseFloat(medicine.Price) : 0;
    const quantity = newRow.quantity || 1;
    const newTotalPrice = quantity * newUnitPrice;

    // TẠO LIỀU DÙNG MẶC ĐỊNH TỪ THÔNG TIN AI
    const defaultDosage = generateDosageFromAI(medicine);

    setNewRow(prev => ({
      ...prev,
      medicine: medicine.MedicineName,
      unitPrice: newUnitPrice,
      totalPrice: newTotalPrice,
      dosage: defaultDosage
    }));
    setSuggestions([]);

    console.log("✅ Đã điền thông tin:", {
      name: medicine.MedicineName,
      price: newUnitPrice,
      dosage: defaultDosage
    });
  };

  // HÀM PHỤ TRỢ ĐỂ TẠO LIỀU DÙNG TỪ THÔNG TIN AI
  const generateDosageFromAI = (medicine) => {
    if (medicine.Reason) {
      // Phân tích lý do để gợi ý liều dùng
      const reason = medicine.Reason.toLowerCase();
      if (reason.includes("giảm đau") || reason.includes("đau răng")) {
        return "1 viên/lần, 2-3 lần/ngày sau khi ăn";
      } else if (reason.includes("kháng sinh") || reason.includes("nhiễm khuẩn")) {
        return "1 viên/lần, 2 lần/ngày (sáng, tối)";
      } else if (reason.includes("bảo vệ dạ dày") || reason.includes("omeprazole")) {
        return "1 viên/ngày, uống trước khi ăn sáng 30 phút";
      }
      return `Theo chỉ định: ${medicine.Reason.substring(0, 60)}...`;
    }
    return "Theo chỉ định của bác sĩ";
  };

  // FUNCTION PREVIEW PDF - ĐÃ THÊM XỬ LÝ LỖI
  const handlePreview = async () => {
    if (!selectedTodayPatient || prescriptionRows.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn bệnh nhân và thêm ít nhất một đơn thuốc trước khi xem trước.",
        variant: "warning",
      });
      return;
    }

    const result = await showConfirmation({
      title: 'Xác nhận chỉnh sửa PDF',
      text: 'Bạn có muốn chuyển đến trình chỉnh sửa PDF để tùy chỉnh toa thuốc?',
      icon: 'question',
      confirmText: 'Có, chuyển đến editor',
      cancelText: 'Hủy'
    });

    if (!result.isConfirmed) {
      return;
    }

    const previewData = {
      type: 'prescription',
      patient_name: selectedTodayPatient.name || 'N/A',
      age: String(selectedTodayPatient.age || 'N/A'),
      gender: selectedTodayPatient.gender || 'N/A',
      phone: selectedTodayPatient.phone || 'N/A',
      address: selectedTodayPatient.address || 'N/A',
      appointment_date: selectedTodayPatient.date
        ? new Date(selectedTodayPatient.date).toLocaleDateString('vi-VN')
        : new Date().toLocaleDateString('vi-VN'),
      appointment_time: selectedTodayPatient.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      doctor_name: doctorInfo?.doctor_Name || 'Bác sĩ chưa rõ',
      prescriptions: [
        {
          details: prescriptionRows.map(row => ({
            medicine: row.medicine || 'N/A',
            quantity: parseInt(row.quantity) || 1,
            dosage: row.dosage || 'N/A',
            unitPrice: parseFloat(row.unitPrice) || 0,
          })),
        },
      ],
      diagnoses: diagnoses || [],
      services: services || [],
      pdf_settings: defaultPdfSettings,
      appointment_id: selectedTodayPatient.id || selectedTodayPatient.AppointmentId,
      patient_id: selectedTodayPatient.PatientId || selectedTodayPatient.patient_id,
      originalData: {
        prescriptionRows: [...prescriptionRows],
        symptoms,
        diagnosis,
        services,
        diagnoses
      },
      timestamp: Date.now()
    };

    console.log('📤 Data preview toa thuốc gửi đến editor:', previewData);

    try {
      // XÓA DỮ LIỆU CŨ TRƯỚC KHI LƯU MỚI
      sessionStorage.removeItem('pdfEditorData');
      sessionStorage.removeItem('shouldRefreshOnReturn');
      sessionStorage.removeItem('editorSource');

      // Lưu data MỚI NHẤT vào sessionStorage
      sessionStorage.setItem('pdfEditorData', JSON.stringify(previewData));
      sessionStorage.setItem('shouldRefreshOnReturn', 'true');
      sessionStorage.setItem('editorSource', 'prescription');

      // CHUYỂN HƯỚNG TRONG CÙNG TAB
      navigate('/doctor/print-pdf-editor', {
        state: {
          pdfData: previewData,
          source: 'prescription',
          timestamp: Date.now()
        }
      });

      setToast({
        show: true,
        message: "✅ Đang chuyển đến trình chỉnh sửa PDF...",
        variant: "success",
      });

    } catch (error) {
      console.error('Error navigating to PDF editor:', error);
      handleError(error, 'Lỗi khi chuyển đến trình chỉnh sửa PDF');
    }
  };

  // FUNCTION XỬ LÝ KHI DỮ LIỆU ĐƯỢC CẬP NHẬT TỪ EDITOR
  const handleEditorDataUpdate = (updatedData) => {
    if (updatedData.prescriptionRows) {
      setPrescriptionRows(updatedData.prescriptionRows);
    }
    if (updatedData.diagnosis) {
      // Nếu bạn có setDiagnosis prop, thêm vào đây
      // setDiagnosis(updatedData.diagnosis);
    }

    showSuccessAlert('Đã cập nhật dữ liệu từ trình chỉnh sửa PDF');
  };

  // KIỂM TRA KHI COMPONENT MOUNT XEM CÓ DỮ LIỆU CẦN CẬP NHẬT TỪ EDITOR KHÔNG
  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem('shouldRefreshOnReturn');
    const editorSource = sessionStorage.getItem('editorSource');
    const editorData = sessionStorage.getItem('pdfEditorData');

    // Chỉ xử lý nếu dữ liệu đến từ PrescriptionSection
    if (shouldRefresh === 'true' && editorSource === 'prescription' && editorData) {
      try {
        const parsedData = JSON.parse(editorData);

        // KIỂM TRA TIMESTAMP ĐỂ ĐẢM BẢO LÀ DỮ LIỆU MỚI
        const currentTimestamp = Date.now();
        const dataTimestamp = parsedData.timestamp || 0;

        // Chỉ cập nhật nếu dữ liệu không quá cũ (trong vòng 10 phút)
        if (currentTimestamp - dataTimestamp < 10 * 60 * 1000) {
          // Cập nhật dữ liệu từ editor
          if (parsedData.originalData) {
            handleEditorDataUpdate(parsedData.originalData);
          }
          console.log('✅ Đã cập nhật dữ liệu MỚI từ PDF editor');
        } else {
          console.log('⚠️ Dữ liệu từ PDF editor đã quá cũ, bỏ qua');
        }

      } catch (error) {
        console.error('Error processing editor return data:', error);
        handleError(error, 'Lỗi xử lý dữ liệu từ PDF editor');
      } finally {
        // LUÔN RESET FLAG SAU KHI XỬ LÝ
        sessionStorage.removeItem('shouldRefreshOnReturn');
        sessionStorage.removeItem('editorSource');
        sessionStorage.removeItem('pdfEditorData');
      }
    }
  }, []);

  // XÓA DỮ LIỆU KHI COMPONENT UNMOUNT ĐỂ TRÁNH DÙNG DỮ LIỆU CŨ
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('shouldRefreshOnReturn');
      sessionStorage.removeItem('editorSource');
      sessionStorage.removeItem('pdfEditorData');
    };
  }, []);

  // LOAD PREVIEW HTML - ĐÃ THÊM XỬ LÝ LỖI
  const loadPreviewHTML = async (data) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      // THÊM PDF SETTINGS VÀO DATA
      const requestData = {
        ...data,
        pdf_settings: defaultPdfSettings
      };

      console.log('📤 Preview data with PDF settings:', requestData);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || ''}/api/print/preview-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Kiểm tra HTTP status
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Lỗi server'}`);
      }

      const result = await response.json();

      if (result.success) {
        setPreviewHTML(result.html);
        console.log('✅ Preview HTML loaded successfully');
      } else {
        const errorMsg = result.message || 'Lỗi không xác định từ server';
        setPreviewError(errorMsg);
        console.error('❌ Preview API error:', errorMsg);
        handleError(new Error(errorMsg), 'Lỗi tải preview PDF');
      }
    } catch (error) {
      const errorMsg = `Lỗi kết nối: ${error.message}`;
      setPreviewError(errorMsg);
      console.error('❌ Preview load error:', error);
      handleError(error, 'Lỗi tải preview PDF');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // RELOAD PREVIEW
  const reloadPreview = () => {
    if (pdfPreviewData) {
      console.log('🔄 Reloading preview...');
      loadPreviewHTML(pdfPreviewData);
    } else {
      console.warn('⚠️ No preview data to reload');
      handleError(new Error('Không có dữ liệu preview để tải lại'));
    }
  };

  const handleFieldChange = (field, value) => {
    let updatedRow = { ...newRow };

    if (field === 'quantity' || field === 'unitPrice') {
      updatedRow[field] = field === 'quantity' ? value : Number(value);

      const quantity = field === 'quantity' ? value : newRow.quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : newRow.unitPrice;
      updatedRow.totalPrice = (quantity || 0) * (unitPrice || 0);
    } else {
      updatedRow[field] = value;
    }

    setNewRow(updatedRow);
  };

  const startEditing = (index) => {
    setEditingIndex(index);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setSuggestions([]);
  };

  // HÀM THÊM THUỐC - ĐÃ THÊM XỬ LÝ LỖI
  const handleAddNew = async () => {
    if (!newRow.medicine.trim() || !newRow.quantity || !newRow.dosage.trim()) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng điền đầy đủ thông tin thuốc!",
        variant: "warning",
      });
      return;
    }

    if (newRow.unitPrice < 0) {
      setToast({
        show: true,
        message: "⚠️ Đơn giá không được âm!",
        variant: "warning",
      });
      return;
    }

    const result = await showConfirmation({
      title: 'Xác nhận thêm thuốc',
      text: `Bạn có chắc chắn muốn thêm thuốc "${newRow.medicine}" vào đơn?`,
      icon: 'question',
      confirmText: 'Có, thêm thuốc',
      cancelText: 'Hủy'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const newMedicine = {
        medicine: newRow.medicine.trim(),
        quantity: Number(newRow.quantity),
        dosage: newRow.dosage.trim(),
        unitPrice: Number(newRow.unitPrice),
        totalPrice: Number(newRow.quantity) * Number(newRow.unitPrice)
      };

      setPrescriptionRows(prev => [...prev, newMedicine]);

      setNewRow({
        medicine: '',
        quantity: '',
        dosage: '',
        unitPrice: 0,
        totalPrice: 0
      });

      showSuccessAlert('Thêm thuốc thành công!');
    } catch (error) {
      handleError(error, 'Lỗi thêm thuốc vào đơn');
    }
  };

  // HÀM CẬP NHẬT THUỐC - ĐÃ THÊM XỬ LÝ LỖI
  const handleUpdate = async () => {
    if (!newRow.medicine.trim() || !newRow.quantity || !newRow.dosage.trim()) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng điền đầy đủ thông tin thuốc!",
        variant: "warning",
      });
      return;
    }

    const result = await showConfirmation({
      title: 'Xác nhận cập nhật',
      text: `Bạn có chắc chắn muốn cập nhật thông tin thuốc "${newRow.medicine}"?`,
      icon: 'question',
      confirmText: 'Có, cập nhật',
      cancelText: 'Hủy'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const updatedMedicine = {
        medicine: newRow.medicine.trim(),
        quantity: Number(newRow.quantity),
        dosage: newRow.dosage.trim(),
        unitPrice: Number(newRow.unitPrice),
        totalPrice: Number(newRow.quantity) * Number(newRow.unitPrice)
      };

      const updatedRows = [...prescriptionRows];
      updatedRows[editingIndex] = updatedMedicine;
      setPrescriptionRows(updatedRows);

      cancelEditing();

      showSuccessAlert('Cập nhật thuốc thành công!');
    } catch (error) {
      handleError(error, 'Lỗi cập nhật thông tin thuốc');
    }
  };

  // HÀM IN PDF - ĐÃ THÊM XỬ LÝ LỖI
  const handlePrint = async () => {
    if (!selectedTodayPatient || prescriptionRows.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn bệnh nhân và thêm ít nhất một đơn thuốc trước khi in.",
        variant: "warning",
      });
      return;
    }

    const result = await showConfirmation({
      title: 'Xác nhận xuất PDF',
      text: 'Bạn có chắc chắn muốn xuất toa thuốc ra file PDF?',
      icon: 'question',
      confirmText: 'Có, xuất PDF',
      cancelText: 'Hủy'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const printData = {
        type: 'prescription',
        patient_name: selectedTodayPatient.name || 'N/A',
        age: String(selectedTodayPatient.age || 'N/A'),
        gender: selectedTodayPatient.gender || 'N/A',
        phone: selectedTodayPatient.phone || 'N/A',
        appointment_date: selectedTodayPatient.date
          ? new Date(selectedTodayPatient.date).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
        appointment_time: selectedTodayPatient.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        doctor_name: doctorInfo?.doctor_Name  || 'Bác sĩ chưa rõ',
        prescriptions: [
          {
            details: prescriptionRows.map(row => ({
              medicine: row.medicine || 'N/A',
              quantity: parseInt(row.quantity) || 1,
              dosage: row.dosage || 'N/A',
              unitPrice: parseFloat(row.unitPrice) || 0,
            })),
          },
        ],
        diagnoses: diagnoses || [],
        services: services || [],
        pdf_settings: defaultPdfSettings
      };

      console.log('📤 Print data with PDF settings:', printData);

      const response = await printPdfService.printPDF(printData);
      console.log('✅ PDF Service Result:', response)
      console.log('📥 API Response status:', response.status)

      showSuccessAlert('Đã xuất toa thuốc thành công!');

    } catch (error) {
      console.error('❌ Error exporting prescription:', error);
      handleError(error, 'Lỗi xuất toa thuốc');
    }
  };

  // HÀM HỦY CHỈNH SỬA - ĐÃ THÊM CONFIRMATION
  const handleCancelEditing = async () => {
    if (newRow.medicine || newRow.quantity || newRow.dosage) {
      const result = await showConfirmation({
        title: 'Xác nhận hủy',
        text: 'Bạn có chắc chắn muốn hủy thao tác chỉnh sửa? Dữ liệu chưa lưu sẽ bị mất.',
        icon: 'warning',
        confirmText: 'Có, hủy bỏ',
        cancelText: 'Tiếp tục chỉnh sửa'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    cancelEditing();
  };

  // HÀM XEM TRƯỚC TRONG MODAL - ĐÃ THÊM XỬ LÝ LỖI
  const handleModalPreview = async () => {
    if (!selectedTodayPatient || prescriptionRows.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn bệnh nhân và thêm ít nhất một đơn thuốc trước khi xem trước.",
        variant: "warning",
      });
      return;
    }

    const result = await showConfirmation({
      title: 'Xem trước toa thuốc',
      text: 'Bạn có muốn xem trước toa thuốc trong cửa sổ mới?',
      icon: 'info',
      confirmText: 'Có, xem trước',
      cancelText: 'Hủy'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const previewData = {
        type: 'prescription',
        patient_name: selectedTodayPatient.name || 'N/A',
        age: String(selectedTodayPatient.age || 'N/A'),
        gender: selectedTodayPatient.gender || 'N/A',
        phone: selectedTodayPatient.phone || 'N/A',
        appointment_date: selectedTodayPatient.date
          ? new Date(selectedTodayPatient.date).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
        appointment_time: selectedTodayPatient.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        doctor_name: doctorInfo?.doctor_Name || 'Bác sĩ chưa rõ',
        prescriptions: [
          {
            details: prescriptionRows.map(row => ({
              medicine: row.medicine || 'N/A',
              quantity: parseInt(row.quantity) || 1,
              dosage: row.dosage || 'N/A',
              unitPrice: parseFloat(row.unitPrice) || 0,
            })),
          },
        ],
        diagnoses: diagnoses || [],
        services: services || [],
        pdf_settings: defaultPdfSettings
      };

      setPdfPreviewData(previewData);
      setShowPDFPreview(true);
      await loadPreviewHTML(previewData);
    } catch (error) {
      handleError(error, 'Lỗi mở preview toa thuốc');
    }
  };

  // HÀM ĐÓNG MODAL PREVIEW - ĐÃ THÊM CONFIRMATION
  const handleClosePreview = async () => {
    if (isLoadingPreview) {
      const result = await showConfirmation({
        title: 'Đang tải preview',
        text: 'Preview đang được tải. Bạn có chắc muốn đóng?',
        icon: 'warning',
        confirmText: 'Đóng',
        cancelText: 'Tiếp tục chờ'
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    setShowPDFPreview(false);
    setPreviewError(null);
    setPreviewHTML('');
  };

  return (
    <Col md={12}>
      <Card className="mb-3 border-light shadow-sm">
        <Card.Header className="text-start fw-bold">
          3. Kê đơn thuốc
        </Card.Header>
        <Card.Body className="text-start">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th width="25%">Tên thuốc</th>
                <th width="10%">Số lượng</th>
                <th width="20%">Liều dùng</th>
                <th width="15%">Đơn giá (VND)</th>
                <th width="15%">Thành tiền (VND)</th>
                <th width="15%">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionRows.map((row, index) => (
                <tr key={index}>
                  {editingIndex === index ? (
                    <>
                      <td>
                        <Form.Group style={{ position: 'relative' }}>
                          <Form.Control
                            type="text"
                            value={newRow.medicine}
                            onChange={(e) => handleFieldChange('medicine', e.target.value)}
                            required
                          />
                          {suggestions.length > 0 && (
                            <div
                              className="suggestion-dropdown"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                zIndex: 1000,
                                maxHeight: '200px',
                                overflowY: 'auto'
                              }}
                            >
                              {suggestions.map((s, i) => (
                                <div
                                  key={i}
                                  className="suggestion-item p-2 border-bottom"
                                  onClick={() => handleSelectSuggestion(s)}
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: '#f8f9fa',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                >
                                  <div><strong>{s.MedicineName}</strong> ({s.Unit})</div>
                                  <div className="text-success">💰 {s.Price?.toLocaleString()}₫</div>
                                  <div className="text-muted small mt-1">{s.Reason}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </Form.Group>
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="1"
                          value={newRow.quantity}
                          onChange={(e) => handleFieldChange('quantity', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={newRow.dosage}
                          onChange={(e) => handleFieldChange('dosage', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="0"
                          step="100"
                          value={newRow.unitPrice}
                          onChange={(e) => handleFieldChange('unitPrice', e.target.value)}
                          required
                        />
                      </td>
                      <td className="align-middle">
                        {newRow.totalPrice?.toLocaleString() || 0}
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
                      <td>{row.medicine}</td>
                      <td>{row.quantity}</td>
                      <td>{row.dosage}</td>
                      <td>{row.unitPrice?.toLocaleString() || 0}</td>
                      <td>{row.totalPrice?.toLocaleString() || 0}</td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveWithConfirm(index)}
                          disabled={isFormDisabled}
                        >
                          <i className="fas fa-trash"></i> Xóa
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="ms-1 mt-1"
                          onClick={() => startEditing(index)}
                          disabled={isFormDisabled}
                        >
                          <i className="fas fa-wrench"></i> Sửa
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* Dòng thêm mới */}
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <td>
                  <Form.Group style={{ position: 'relative' }}>
                    <Form.Control
                      type="text"
                      placeholder="Nhập tên thuốc..."
                      value={newRow.medicine}
                      onChange={(e) => handleFieldChange('medicine', e.target.value)}
                      disabled={editingIndex !== null}
                    />
                    {suggestions.length > 0 && editingIndex === null && (
                      <div
                        className="suggestion-dropdown"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        {suggestions.map((s, i) => (
                          <div
                            key={i}
                            className="suggestion-item p-2 border-bottom"
                            onClick={() => handleSelectSuggestion(s)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: '#f8f9fa',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          >
                            <div><strong>{s.MedicineName}/{s.Unit}</strong> ({s.MedicineType})</div>
                            <div className="text-success">
                              {(() => {
                                const price = s.Price ? Number(s.Price) : 0;
                                if (isNaN(price)) return 'N/A'; // Fallback nếu không parse được
                                return price.toLocaleString('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                });
                              })()}
                            </div>
                            <div className="text-muted small mt-1">{s.Description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="1"
                    placeholder="0"
                    value={newRow.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="Liều dùng..."
                    value={newRow.dosage}
                    onChange={(e) => handleFieldChange('dosage', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={newRow.unitPrice}
                    onChange={(e) => handleFieldChange('unitPrice', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td className="align-middle">
                  <strong>{newRow.totalPrice?.toLocaleString() || 0}</strong>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleAddNew}
                    disabled={editingIndex !== null || isFormDisabled}
                  >
                    <i className="fas fa-plus"></i> Thêm
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>

          {prescriptionRows.length === 0 && (
            <div className="text-center text-muted py-3">
              Chưa có thuốc nào trong đơn. Hãy thêm thuốc bằng cách điền thông tin vào dòng cuối cùng.
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex gap-2">
        <Button
          variant="outline-info"
          onClick={handlePreview}
          disabled={!selectedTodayPatient || prescriptionRows.length === 0}
          className="no-print"
        >
          <i className="fas fa-eye"></i> Chỉnh sửa PDF
        </Button>

        <Button
          variant="outline-success"
          onClick={handlePrint}
          disabled={!selectedTodayPatient || prescriptionRows.length === 0}
          className="no-print"
        >
          <i className="fas fa-print"></i> Xuất toa thuốc
        </Button>
      </div>

      {/* MODAL PREVIEW TOA THUỐC */}
      <Modal show={showPDFPreview} onHide={handleClosePreview} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title> Xem trước Toa Thuốc</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ minHeight: '500px' }}>
          <PDFPreviewEditor
            previewHTML={previewHTML}
            isLoadingPreview={isLoadingPreview}
            onReloadPreview={reloadPreview}
            type="prescription"
            error={previewError}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClosePreview}>
            Đóng
          </Button>
          <Button
            variant="success"
            onClick={() => {
              handlePrint();
              setShowPDFPreview(false);
            }}
            disabled={isLoadingPreview || previewError}
          >
            <i className="fas fa-print"></i>
            {isLoadingPreview ? <Spinner size="sm" /> : 'Tải về PDF'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Col>
  );
};

export default PrescriptionSection;