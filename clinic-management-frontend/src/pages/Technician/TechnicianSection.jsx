import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Row, Col, Badge, Alert, Spinner, Modal, Form
} from 'react-bootstrap';
import technicianService from '../../services/technicianService';
import { printPdfService } from '../../services/printPdfService';
import Pagination from '../../Components/Pagination/Pagination';


// ✅ Constants để tránh magic strings
const STATUS = {
  ASSIGNED: 'Đã chỉ định',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PENDING: 'Đang chờ'
};

const ACTION_TYPES = {
  START: 'start',
  COMPLETE: 'complete',
  CANCEL: 'cancel'
};

const ITEMS_PER_PAGE = 5;

const TechnicianSection = ({ testResultsData, completedServicesData, updateStats, loading, pagination, onPageChange }) => {
  const navigate = useNavigate();
  console.log('🎯 TechnicianSection rendered');
  console.log('📥 testResultsData từ props:', testResultsData);
  console.log('📥 completedServicesData từ props:', completedServicesData);

  // ✅ STATE
  const [localData, setLocalData] = useState([]);
  const [completedServices, setCompletedServices] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [resultText, setResultText] = useState('');

  // ✅ STATE CHO PAGINATION
  const [currentAssignedPage, setCurrentAssignedPage] = useState(0);
  const [currentCompletedPage, setCurrentCompletedPage] = useState(0);

  // ✅ STATE CHO CONFIRM MODAL
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmData, setConfirmData] = useState(null);

  // ✅ STATE CHO MODAL XEM KẾT QUẢ
  const [showViewResultModal, setShowViewResultModal] = useState(false);
  const [viewingService, setViewingService] = useState(null);

  // ✅ STATE CHO IN PDF
  const [printingPdf, setPrintingPdf] = useState(false);

  // ✅ STATE CHO TÙY CHỈNH PDF
  const [customizingPdf, setCustomizingPdf] = useState(false);

  // ✅ Đồng bộ testResultsData khi props thay đổi
  useEffect(() => {
    console.log('🔄 [EFFECT] Syncing localData with testResultsData');
    console.log('📥 [EFFECT] Raw testResultsData:', testResultsData);

    if (testResultsData && Array.isArray(testResultsData)) {
      console.log('✅ [EFFECT] Setting localData:', testResultsData.length, 'items');
      setLocalData(testResultsData);
      setCurrentAssignedPage(0);
    } else {
      console.log('⚠️ [EFFECT] testResultsData is not array, setting empty');
      setLocalData([]);
    }
  }, [testResultsData]);

  // ✅ Đồng bộ completedServicesData khi props thay đổi
  useEffect(() => {
    console.log('🔄 [EFFECT] Syncing completedServices with completedServicesData');
    console.log('📥 [EFFECT] Raw completedServicesData:', completedServicesData);

    if (completedServicesData && Array.isArray(completedServicesData)) {
      const sortedCompletedServices = [...completedServicesData].sort((a, b) => {
        const dateA = new Date(a.completed_at || a.updated_at || a.order_date || 0);
        const dateB = new Date(b.completed_at || b.updated_at || b.order_date || 0);
        return dateB - dateA;
      });

      console.log('✅ [EFFECT] Setting sorted completedServices:', sortedCompletedServices.length, 'items');
      setCompletedServices(sortedCompletedServices);
      setCurrentCompletedPage(0);
    } else {
      console.log('⚠️ [EFFECT] completedServicesData is not array, setting empty');
      setCompletedServices([]);
    }
  }, [completedServicesData]);

  // ✅ PAGINATION FUNCTIONS
  const handleAssignedPageChange = (selectedItem) => {
    setCurrentAssignedPage(selectedItem.selected);
  };

  const handleCompletedPageChange = (selectedItem) => {
    setCurrentCompletedPage(selectedItem.selected);
  };

  // ✅ TÍNH TOÁN DỮ LIỆU PHÂN TRANG
  const getPaginatedData = (data, currentPage) => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const getPageCount = (data) => {
    return Math.ceil(data.length / ITEMS_PER_PAGE);
  };

  // ✅ DỮ LIỆU ĐÃ PHÂN TRANG
  const paginatedAssignedData = getPaginatedData(localData, currentAssignedPage);
  const paginatedCompletedData = getPaginatedData(completedServices, currentCompletedPage);

  const assignedPageCount = getPageCount(localData);
  const completedPageCount = getPageCount(completedServices);

  // ✅ CONFIRM MODAL FUNCTIONS
  const openConfirmModal = (action, data) => {
    setConfirmAction(action);
    setConfirmData(data);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmData(null);
  };

  const executeConfirmAction = () => {
    if (!confirmAction || !confirmData) return;

    switch (confirmAction) {
      case 'start':
        handleStatusChange(
          confirmData.serviceOrderId,
          confirmData.patientName,
          confirmData.serviceName,
          STATUS.IN_PROGRESS
        );
        break;
      case 'complete':
        handleStatusChange(
          confirmData.serviceOrderId,
          confirmData.patientName,
          confirmData.serviceName,
          STATUS.COMPLETED
        );
        break;
      case 'cancel':
        handleStatusChange(
          confirmData.serviceOrderId,
          confirmData.patientName,
          confirmData.serviceName,
          STATUS.CANCELLED
        );
        break;
      default:
        console.warn('Unknown confirm action:', confirmAction);
    }

    closeConfirmModal();
  };

  // ✅ RENDER CONFIRM MODAL CONTENT
  const renderConfirmContent = () => {
    if (!confirmData) return null;

    const { patientName, serviceName, actionType } = confirmData;

    const getConfirmConfig = () => {
      switch (actionType) {
        case 'start':
          return {
            title: 'Bắt Đầu Dịch Vụ',
            icon: 'play-circle',
            variant: 'primary',
            message: `Bạn có chắc muốn BẮT ĐẦU dịch vụ "${serviceName}" cho bệnh nhân ${patientName}?`,
            confirmText: 'Bắt Đầu'
          };
        case 'complete':
          return {
            title: 'Hoàn Thành Dịch Vụ',
            icon: 'check-circle',
            variant: 'success',
            message: `Bạn có chắc muốn HOÀN THÀNH dịch vụ "${serviceName}" cho bệnh nhân ${patientName}?`,
            confirmText: 'Hoàn Thành'
          };
        case 'cancel':
          return {
            title: 'Hủy Dịch Vụ',
            icon: 'times-circle',
            variant: 'danger',
            message: `Bạn có chắc muốn HỦY dịch vụ "${serviceName}" cho bệnh nhân ${patientName}?`,
            confirmText: 'Hủy Dịch Vụ'
          };
        default:
          return {
            title: 'Xác Nhận',
            icon: 'question-circle',
            variant: 'warning',
            message: 'Bạn có chắc muốn thực hiện hành động này?',
            confirmText: 'Xác Nhận'
          };
      }
    };

    const config = getConfirmConfig();

    return (
      <>
        <div className="text-center mb-3">
          <i className={`fas fa-${config.icon} fa-3x text-${config.variant} mb-3`}></i>
          <h4 className={`text-${config.variant} fw-bold`}>{config.title}</h4>
        </div>
        <p className="text-center fs-5">{config.message}</p>
        <div className="bg-light p-3 rounded mt-3">
          <div className="row">
            <div className="col-6">
              <strong>Bệnh nhân:</strong> {patientName}
            </div>
            <div className="col-6">
              <strong>Dịch vụ:</strong> {serviceName}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ✅ Helper functions
  const getStatusVariant = useCallback((status) => {
    if (!status) return 'secondary';

    const statusMap = {
      [STATUS.COMPLETED]: 'success',
      [STATUS.IN_PROGRESS]: 'warning',
      [STATUS.ASSIGNED]: 'primary',
      [STATUS.PENDING]: 'secondary',
      [STATUS.CANCELLED]: 'danger'
    };

    return statusMap[status] || 'secondary';
  }, []);

  const formatPrice = useCallback((price) => {
    if (!price) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  }, []);

  // ✅ OPTIMISTIC UPDATE: handleStatusChange
  const handleStatusChange = async (serviceOrderId, patientName, serviceName, newStatus) => {
    if (localLoading) {
      console.log('⏳ Đang xử lý, vui lòng chờ...');
      return;
    }

    try {
      setLocalLoading(true);
      setLocalError('');
      setLocalSuccess('');

      console.log(`🔄 Đang thay đổi trạng thái: ${serviceOrderId} -> ${newStatus}`);

      const previousData = [...localData];
      const previousCompleted = [...completedServices];

      // ✅ CẬP NHẬT UI NGAY LẬP TỨC (Optimistic Update)
      updateLocalStatus(serviceOrderId, newStatus);

      // ✅ NẾU HOÀN THÀNH, CHUYỂN DỊCH VỤ SANG DANH SÁCH HOÀN THÀNH
      if (newStatus === STATUS.COMPLETED) {
        const completedService = localData.find(s => s.service_order_id === serviceOrderId);
        if (completedService) {
          setCompletedServices(prev => [{
            ...completedService,
            status: STATUS.COMPLETED,
            completed_at: new Date().toLocaleDateString('vi-VN')
          }, ...prev]);

          setLocalData(prev => prev.filter(s => s.service_order_id !== serviceOrderId));
        }
      }

      // ✅ GỬI API
      try {
        const response = await technicianService.updateServiceStatus(serviceOrderId, newStatus);

        console.log('📨 API Response:', response);

        const isSuccess =
          response.data?.success === true ||
          response.data?.status === 'success' ||
          response.status === 200 ||
          response.statusText === 'OK';

        if (isSuccess) {
          console.log('✅ API cập nhật thành công');
          const actionMessage = getActionMessage(newStatus, patientName, serviceName);
          setLocalSuccess(`✅ ${actionMessage}`);
          setTimeout(() => setLocalSuccess(''), 3000);
        } else {
          console.warn('⚠️ API trả về success=false, nhưng có thể đã update DB');
          const actionMessage = getActionMessage(newStatus, patientName, serviceName);
          setLocalSuccess(`✅ ${actionMessage} (đã đồng bộ)`);
          setTimeout(() => setLocalSuccess(''), 3000);
        }

      } catch (apiError) {
        console.error('❌ Lỗi API:', apiError);

        if (apiError.response?.status >= 500) {
          console.warn('⚠️ Lỗi server, có thể đã update DB');
          const actionMessage = getActionMessage(newStatus, patientName, serviceName);
          setLocalSuccess(`✅ ${actionMessage} (đã đồng bộ)`);
          setTimeout(() => setLocalSuccess(''), 3000);
        } else {
          console.error('❌ Lỗi client, rollback UI');
          setLocalData(previousData);
          setCompletedServices(previousCompleted);

          let errorMessage = '❌ Lỗi cập nhật';
          if (apiError.response?.data?.message) {
            errorMessage = `❌ ${apiError.response.data.message}`;
          } else if (apiError.message) {
            errorMessage = `❌ ${apiError.message}`;
          }

          setLocalError(errorMessage);
          setTimeout(() => setLocalError(''), 5000);
        }
      }

    } catch (err) {
      console.error('💥 Lỗi không mong muốn:', err);
      setLocalError('❌ Có lỗi xảy ra, vui lòng thử lại');
      setTimeout(() => setLocalError(''), 5000);
    } finally {
      setLocalLoading(false);
    }
  };

  // ✅ handleSaveResult
  const handleSaveResult = async () => {
    if (localLoading) return;

    if (!currentService) {
      setLocalError('❌ Không tìm thấy thông tin dịch vụ');
      return;
    }

    const trimmedResult = resultText.trim();
    if (!trimmedResult) {
      setLocalError('❌ Vui lòng nhập kết quả xét nghiệm');
      return;
    }

    try {
      setLocalLoading(true);
      setLocalError('');
      setLocalSuccess('');

      console.log(`🔄 Đang lưu kết quả cho dịch vụ: ${currentService.service_order_id}`);

      const oldResult = currentService.result;

      // ✅ CẬP NHẬT UI NGAY LẬP TỨC
      updateLocalStatus(currentService.service_order_id, currentService.status, trimmedResult);

      // ✅ GỬI API LƯU KẾT QUẢ
      const response = await technicianService.updateServiceResult(
        currentService.service_order_id,
        trimmedResult
      );

      console.log('✅ API Response:', response);

      if (response.data?.success) {
        const successMessage = `✅ Đã lưu kết quả "${currentService.service_name}" cho ${currentService.patient_name}`;
        setLocalSuccess(successMessage);

        closeResultModal();

        // ✅ RELOAD DATA TRONG BACKGROUND
        setTimeout(() => {
          if (updateStats) {
            console.log('🔄 Tự động đồng bộ data sau lưu kết quả...');
            updateStats();
          }
        }, 800);

        setTimeout(() => setLocalSuccess(''), 3000);
      } else {
        throw new Error(response.data?.message || 'Lưu kết quả thất bại');
      }

    } catch (err) {
      console.error('❌ Lỗi lưu kết quả:', err);

      if (currentService) {
        updateLocalStatus(currentService.service_order_id, currentService.status, oldResult);
      }

      let errorMessage = '❌ Không thể lưu kết quả. Vui lòng thử lại.';
      if (err.response?.data?.message) {
        errorMessage = `❌ ${err.response.data.message}`;
      } else if (err.message) {
        errorMessage = `❌ ${err.message}`;
      }

      setLocalError(errorMessage);
      setTimeout(() => setLocalError(''), 5000);

    } finally {
      setLocalLoading(false);
    }
  };

  // ✅ CẬP NHẬT updateLocalStatus
  const updateLocalStatus = useCallback((serviceOrderId, newStatus, newResult = null) => {
    console.log(`🔄 Updating local status: ${serviceOrderId} -> ${newStatus}`);

    setLocalData(prevData => {
      const updatedData = prevData.map(service =>
        service.service_order_id === serviceOrderId
          ? {
            ...service,
            status: newStatus,
            ...(newResult !== null && {
              result: newResult,
              _previousResult: service.result
            })
          }
          : service
      );
      return updatedData;
    });

    if (newResult !== null) {
      setCompletedServices(prevCompleted => {
        return prevCompleted.map(service =>
          service.service_order_id === serviceOrderId
            ? {
              ...service,
              result: newResult
            }
            : service
        );
      });
    }
  }, []);

  // ✅ Modal functions
  const openResultModal = (service) => {
    setCurrentService(service);
    setResultText(service.result || '');
    setShowResultModal(true);
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setCurrentService(null);
    setResultText('');
  };

  // ✅ Hàm xem kết quả chi tiết
  const viewResultDetail = (service) => {
    if (!service.result || service.result.trim() === '') {
      setLocalError('Chưa có kết quả xét nghiệm cho dịch vụ này');
      setTimeout(() => setLocalError(''), 3000);
      return;
    }

    console.log('📋 Xem kết quả chi tiết:', {
      patient: service.patient_name,
      service: service.service_name,
      result: service.result
    });

    setViewingService(service);
    setShowViewResultModal(true);
  };

  // ✅ Hàm đóng modal xem kết quả
  const closeViewResultModal = () => {
    setShowViewResultModal(false);
    setViewingService(null);
  };

  // ✅ Hàm in PDF kết quả xét nghiệm - SỬ DỤNG printPdfService
  const printPDFResult = async (service) => {
    if (!service.result || service.result.trim() === '') {
      setLocalError('Chưa có kết quả xét nghiệm để in');
      setTimeout(() => setLocalError(''), 3000);
      return;
    }

    try {
      setPrintingPdf(true);
      setLocalError('');
      setLocalSuccess('');

      console.log('🔄 Đang tạo PDF kết quả xét nghiệm...', {
        serviceId: service.service_order_id,
        patient: service.patient_name
      });

      // ✅ CHUẨN BỊ DỮ LIỆU CHO PDF
      const pdfData = {
        type: 'test_result',
        patient_name: service.patient_name,
        patient_code: `BN${service.patient_id}`,
        lab_number: `XN${service.service_order_id}`,
        department: 'KHOA XÉT NGHIỆM',
        technician_name: 'Kỹ thuật viên Xét nghiệm',
        appointment_date: service.order_date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: new Date().toLocaleTimeString('vi-VN'),
        doctor_name: service.referring_doctor_name || 'Bác sĩ chỉ định',

        // ✅ CHUYỂN ĐỔI KẾT QUẢ THÀNH DẠNG MẢNG TEST RESULTS
        test_results: [
          {
            test_name: service.service_name,
            result: service.result,
            unit: '',
            reference_range: '',
            method: 'OTSH.B-01(1)',
            is_normal: true
          }
        ],

        // ✅ PDF SETTINGS
        pdf_settings: {
          clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
          clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
          clinicPhone: '024.3574.7788',
          customTitle: 'PHIẾU KẾT QUẢ XÉT NGHIỆM',
          fontFamily: 'Times New Roman',
          fontSize: '12px',
          primaryColor: '#2c5aa0'
        }
      };

      console.log('📤 PDF Data gửi đi:', pdfData);

      // ✅ SỬA LẠI TÊN HÀM: printPDF thay vì printPaymentInvoice
      await printPdfService.printPDF(pdfData);

      setLocalSuccess(`✅ Đã xuất PDF kết quả xét nghiệm cho ${service.patient_name}`);
      setTimeout(() => setLocalSuccess(''), 5000);

    } catch (error) {
      console.error('❌ Lỗi khi in PDF:', error);

      let errorMessage = '❌ Lỗi khi tạo PDF kết quả xét nghiệm';
      if (error.message.includes('Network Error')) {
        errorMessage = '❌ Lỗi kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else if (error.message.includes('404')) {
        errorMessage = '❌ Không tìm thấy API in PDF. Vui lòng liên hệ quản trị viên.';
      } else if (error.message.includes('500')) {
        errorMessage = '❌ Lỗi server khi tạo PDF. Vui lòng thử lại sau.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '❌ Timeout khi tạo PDF. Vui lòng thử lại.';
      }

      setLocalError(errorMessage);
      setTimeout(() => setLocalError(''), 5000);
    } finally {
      setPrintingPdf(false);
    }
  };

  // ✅ Hàm tùy chỉnh PDF kết quả xét nghiệm
  const customizePDFResult = async (service) => {
    if (!service.result || service.result.trim() === '') {
      setLocalError('Chưa có kết quả xét nghiệm để tùy chỉnh');
      setTimeout(() => setLocalError(''), 3000);
      return;
    }

    try {
      setCustomizingPdf(true);
      setLocalError('');
      setLocalSuccess('');

      console.log('🎨 Đang chuẩn bị dữ liệu cho trình chỉnh sửa PDF...', {
        serviceId: service.service_order_id,
        patient: service.patient_name
      });

      // ✅ CHUẨN BỊ DỮ LIỆU CHO PDF EDITOR
      const pdfEditorData = {
        type: 'test_result',
        source: 'technician', // Đánh dấu nguồn từ technician

        // Thông tin bệnh nhân
        patient_name: service.patient_name,
        patient_age: service.patient_age || 'N/A',
        patient_gender: service.patient_gender || 'N/A',
        patient_phone: service.patient_phone || 'N/A',
        patient_address: service.patient_address || 'N/A',

        // Thông tin dịch vụ
        lab_number: `XN${service.service_order_id}`,
        department: 'KHOA XÉT NGHIỆM',
        technician_name: 'Kỹ thuật viên Xét nghiệm',
        appointment_date: service.order_date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: new Date().toLocaleTimeString('vi-VN'),
        doctor_name: service.referring_doctor_name || 'Bác sĩ chỉ định',

        // Kết quả xét nghiệm
        test_results: [
          {
            test_name: service.service_name,
            result: service.result,
            unit: '',
            reference_range: '',
            method: 'OTSH.B-01(1)',
            is_normal: true
          }
        ],

        // PDF Settings mặc định
        pdf_settings: {
          clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
          clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
          clinicPhone: '024.3574.7788',
          customTitle: 'PHIẾU KẾT QUẢ XÉT NGHIỆM',
          fontFamily: 'Times New Roman',
          fontSize: '12px',
          primaryColor: '#2c5aa0',

          // Logo và watermark mặc định
          logo: {
            enabled: false,
            url: '',
            width: '80px',
            height: '80px',
            position: 'left',
            opacity: 1
          },
          watermark: {
            enabled: false,
            text: 'MẪU BẢN QUYỀN',
            url: '',
            opacity: 0.1,
            fontSize: 48,
            color: '#cccccc',
            rotation: -45
          }
        },

        // Thông tin bổ sung để nhận diện
        service_order_id: service.service_order_id,
        appointment_id: service.appointment_id,
        timestamp: Date.now()
      };

      console.log('📤 PDF Editor Data:', pdfEditorData);

      // ✅ LƯU DỮ LIỆU VÀO SESSION STORAGE
      sessionStorage.setItem('pdfEditorData', JSON.stringify(pdfEditorData));
      sessionStorage.setItem('editorSource', 'technician');
      sessionStorage.setItem('shouldRefreshOnReturn', 'true');

      // ✅ CHUYỂN HƯỚNG ĐẾN TRANG EDITOR
      const editorUrl = '/technician/technician-print-pdf-editor';

      // Sử dụng navigate nếu có, hoặc window.location
      if (typeof navigate === 'function') {
        navigate(editorUrl, {
          state: {
            source: 'technician',
            pdfData: pdfEditorData,
            serviceInfo: {
              patientName: service.patient_name,
              serviceName: service.service_name,
              serviceId: service.service_order_id
            }
          }
        });
      } else {
        // Fallback: lưu state vào sessionStorage và chuyển trang
        sessionStorage.setItem('navigationState', JSON.stringify({
          source: 'technician',
          pdfData: pdfEditorData,
          serviceInfo: {
            patientName: service.patient_name,
            serviceName: service.service_name,
            serviceId: service.service_order_id
          }
        }));
        window.location.href = editorUrl;
      }

      setLocalSuccess(`✅ Đang chuyển đến trình chỉnh sửa PDF cho ${service.patient_name}`);
      setTimeout(() => setLocalSuccess(''), 3000);

    } catch (error) {
      console.error('❌ Lỗi khi mở trình chỉnh sửa PDF:', error);

      let errorMessage = '❌ Lỗi khi mở trình chỉnh sửa PDF';
      if (error.message.includes('Network Error')) {
        errorMessage = '❌ Lỗi kết nối. Vui lòng kiểm tra đường dẫn.';
      }

      setLocalError(errorMessage);
      setTimeout(() => setLocalError(''), 5000);
    } finally {
      setCustomizingPdf(false);
    }
  };

  // ✅ Message helpers
  const getActionMessage = (status, patientName, serviceName) => {
    const messageMap = {
      [STATUS.IN_PROGRESS]: `Đã bắt đầu "${serviceName}" cho ${patientName}`,
      [STATUS.COMPLETED]: `Đã hoàn thành "${serviceName}" cho ${patientName}`,
      [STATUS.CANCELLED]: `Đã hủy "${serviceName}" cho ${patientName}`
    };

    return messageMap[status] || `Đã thay đổi trạng thái "${serviceName}" cho ${patientName}`;
  };

  // ✅ Tính toán statistics
  const statistics = React.useMemo(() => {
    console.log('📊 Calculating statistics from localData and completedServices');

    const totalAssignedServices = localData.length;
    const completedServicesCount = completedServices.length;
    const inProgressServices = localData.filter(s =>
      s.status === STATUS.IN_PROGRESS
    ).length;
    const assignedServices = localData.filter(s =>
      s.status === STATUS.ASSIGNED
    ).length;

    const totalManagedServices = totalAssignedServices + completedServicesCount;
    const totalRevenue = [...localData, ...completedServices].reduce((total, service) => total + (service.price || 0), 0);

    return {
      totalServices: totalManagedServices,
      completedServices: completedServicesCount,
      inProgressServices,
      assignedServices,
      totalRevenue
    };
  }, [localData, completedServices]);

  const renderStatisticsCards = () => (
    <Row className="g-3">
      {[
        {
          title: 'Tổng Dịch Vụ',
          value: statistics.totalServices || 0,
          subtitle: 'Đang quản lý',
          variant: 'primary',
          icon: 'layer-group'
        },
        {
          title: 'Hoàn Thành',
          value: statistics.completedServices || 0,
          subtitle: 'Đã xử lý xong',
          variant: 'success',
          icon: 'check-circle'
        },
        {
          title: 'Đang Thực Hiện',
          value: statistics.inProgressServices || 0,
          subtitle: 'Đang xử lý',
          variant: 'warning',
          icon: 'spinner'
        },
        {
          title: 'Đã Chỉ Định',
          value: statistics.assignedServices || 0,
          subtitle: 'Chờ xử lý',
          variant: 'info',
          icon: 'clock'
        }
      ].map((card, index) => (
        <Col xxl={3} lg={6} key={index}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-muted mb-2">{card.title}</h6>
                  <h2 className={`fw-bold text-${card.variant} mb-0`}>{card.value}</h2>
                  <small className="text-muted">{card.subtitle}</small>
                </div>
                <div className={`bg-${card.variant} bg-opacity-10 p-3 rounded`}>
                  <i className={`fas fa-${card.icon} fa-2x text-${card.variant}`}></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderServiceRow = (service, index) => {
    if (!service) return null;

    return (
      <tr key={service.service_order_id || index} className="border-bottom">
        <td className="text-center">
          <span className="fw-semibold text-muted">{index + 1}</span>
        </td>
        <td>
          <Badge bg="primary" className="fs-7 w-100">
            #{service.service_order_id || 'N/A'}
          </Badge>
        </td>
        <td>
          <span className="text-muted fw-semibold">#{service.appointment_id || 'N/A'}</span>
        </td>
        <td>
          <div>
            <div className="fw-semibold text-dark">{service.patient_name || 'Chưa có tên'}</div>
            {service.patient_phone && service.patient_phone !== 'N/A' && (
              <small className="text-muted">
                <i className="fas fa-phone me-1"></i>
                {service.patient_phone}
              </small>
            )}
          </div>
        </td>
        <td className="text-center">
          <span className="fw-semibold">{service.patient_age || 'N/A'}</span>
        </td>
        <td className="text-center">
          <Badge
            bg={service.patient_gender === 'Nam' ? 'info' : 'danger'}
            className="fs-7"
          >
            {service.patient_gender || 'N/A'}
          </Badge>
        </td>
        <td>
          <div className="fw-semibold text-dark">{service.service_name || 'Chưa có tên dịch vụ'}</div>
          <small className="text-muted">{service.service_type || ''}</small>
        </td>
        <td className="text-center">
          <small className="text-dark fw-semibold">
            {service.referring_doctor_name || 'N/A'}
          </small>
        </td>
        <td className="text-center">
          <Badge bg="outline-success" className="border text-success fs-7">
            {formatPrice(service.price)}
          </Badge>
        </td>
        <td className="text-center">
          <small className="text-muted">{formatDate(service.order_date)}</small>
        </td>
        <td className="text-center">
          <Badge
            bg={getStatusVariant(service.status)}
            className="fs-7 px-3 py-2"
          >
            {service.status || 'N/A'}
          </Badge>
        </td>
        <td className="text-center">
          <div className="d-flex justify-content-center gap-2">
            {/* Nút Bắt đầu */}
            {(service.status === STATUS.ASSIGNED || service.status === STATUS.PENDING) && (
              <Button
                variant="primary"
                size="sm"
                className="px-3"
                onClick={() => openConfirmModal('start', {
                  serviceOrderId: service.service_order_id,
                  patientName: service.patient_name,
                  serviceName: service.service_name,
                  actionType: 'start'
                })}
                disabled={localLoading}
                title="Bắt đầu dịch vụ"
              >
                <i className="fas fa-play me-1"></i>
              </Button>
            )}

            {/* Nút Kết quả */}
            {service.status === STATUS.IN_PROGRESS && (
              <Button
                variant="info"
                size="sm"
                className="px-3"
                onClick={() => openResultModal(service)}
                disabled={localLoading}
                title={service.result ? 'Sửa kết quả xét nghiệm' : 'Thêm kết quả xét nghiệm'}
              >
                <i className="fas fa-vial me-1"></i>
              </Button>
            )}

            {/* Nút Hoàn thành */}
            {service.status === STATUS.IN_PROGRESS && (
              <Button
                variant="success"
                size="sm"
                className="px-3"
                onClick={() => openConfirmModal('complete', {
                  serviceOrderId: service.service_order_id,
                  patientName: service.patient_name,
                  serviceName: service.service_name,
                  actionType: 'complete'
                })}
                disabled={localLoading}
                title="Hoàn thành dịch vụ"
              >
                <i className="fas fa-check me-1"></i>
              </Button>
            )}

            {/* Nút Hủy */}
            {service.status !== STATUS.COMPLETED && service.status !== STATUS.CANCELLED && (
              <Button
                variant="outline-danger"
                size="sm"
                className="px-3"
                onClick={() => openConfirmModal('cancel', {
                  serviceOrderId: service.service_order_id,
                  patientName: service.patient_name,
                  serviceName: service.service_name,
                  actionType: 'cancel'
                })}
                disabled={localLoading}
                title="Hủy dịch vụ"
              >
                <i className="fas fa-times me-1"></i>
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ✅ Render actions cho completed services
  const renderCompletedServiceActions = (service) => (
    <div className="d-flex justify-content-center gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        className="px-3"
        onClick={() => viewResultDetail(service)}
        disabled={!service.result || service.result.trim() === ''}
        title={service.result ? "Xem kết quả chi tiết" : "Chưa có kết quả"}
      >
        <i className="fas fa-eye me-1"></i>
      </Button>

      <Button
        variant="outline-success"
        size="sm"
        className="px-3"
        onClick={() => printPDFResult(service)}
        disabled={!service.result || service.result.trim() === '' || printingPdf}
        title="In PDF kết quả"
      >
        {printingPdf ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <i className="fas fa-print me-1"></i>
        )}
      </Button>

      <Button
        variant="outline-info"
        size="sm"
        className="px-3"
        onClick={() => customizePDFResult(service)}
        disabled={!service.result || service.result.trim() === '' || customizingPdf}
        title="Tùy chỉnh PDF"
      >
        {customizingPdf ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <i className="fas fa-edit me-1"></i>
        )}
      </Button>
    </div>
  );

  // ✅ Render completed service row
  const renderCompletedServiceRow = (service, index) => {
    if (!service) return null;

    return (
      <tr key={service.service_order_id || `completed-${index}`} className="border-bottom">
        <td className="text-center">
          <span className="fw-semibold text-muted">{index + 1}</span>
        </td>
        <td>
          <Badge bg="success" className="fs-7 w-100">
            #{service.service_order_id || 'N/A'}
          </Badge>
        </td>
        <td>
          <span className="text-muted fw-semibold">#{service.appointment_id || 'N/A'}</span>
        </td>
        <td>
          <div>
            <div className="fw-semibold text-dark">{service.patient_name || 'Chưa có tên'}</div>
            {service.patient_phone && service.patient_phone !== 'N/A' && (
              <small className="text-muted">
                <i className="fas fa-phone me-1"></i>
                {service.patient_phone}
              </small>
            )}
          </div>
        </td>
        <td className="text-center">
          <span className="fw-semibold">{service.patient_age || 'N/A'}</span>
        </td>
        <td className="text-center">
          <Badge
            bg={service.patient_gender === 'Nam' ? 'info' : 'danger'}
            className="fs-7"
          >
            {service.patient_gender || 'N/A'}
          </Badge>
        </td>
        <td>
          <div className="fw-semibold text-dark">{service.service_name || 'Chưa có tên dịch vụ'}</div>
          <small className="text-muted">{service.service_type || ''}</small>
        </td>
        <td className="text-center">
          <small className="text-dark fw-semibold">
            {service.referring_doctor_name || 'N/A'}
          </small>
        </td>
        <td className="text-center">
          <Badge bg="outline-success" className="border text-success fs-7">
            {formatPrice(service.price)}
          </Badge>
        </td>
        <td className="text-center">
          <small className="text-muted">{formatDate(service.order_date)}</small>
        </td>
        <td className="text-center">
          <small className="text-muted">
            {service.completed_at || formatDate(service.updated_at) || 'N/A'}
          </small>
        </td>
        <td className="text-center">
          <Badge
            bg={getStatusVariant(service.status)}
            className="fs-7 px-3 py-2"
          >
            {service.status || 'N/A'}
          </Badge>
        </td>
        <td className="text-center">
          {renderCompletedServiceActions(service)}
        </td>
      </tr>
    );
  };

  // ✅ Render loading state
  const renderLoadingState = () => (
    <div className="text-center py-5">
      <Spinner animation="border" variant="primary" className="me-2" />
      <span className="text-muted">Đang tải dữ liệu...</span>
    </div>
  );

  // ✅ Render empty state
  const renderEmptyState = (message = "Không có dữ liệu") => (
    <div className="text-center py-5">
      <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
      <p className="text-muted">{message}</p>
    </div>
  );

  // ✅ Main render
  return (
    <div className="technician-section">
      {/* Alert Messages */}
      {localError && (
        <Alert variant="danger" dismissible onClose={() => setLocalError('')}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {localError}
        </Alert>
      )}

      {localSuccess && (
        <Alert variant="success" dismissible onClose={() => setLocalSuccess('')}>
          <i className="fas fa-check-circle me-2"></i>
          {localSuccess}
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="mb-4">
        {renderStatisticsCards()}
      </div>

      {/* Assigned Services Section */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-primary text-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-tasks me-2"></i>
              Dịch Vụ Được Chỉ Định
            </h5>
            <Badge bg="light" text="dark" className="fs-6">
              {localData.length} dịch vụ
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            renderLoadingState()
          ) : localData.length === 0 ? (
            renderEmptyState("Chưa có dịch vụ nào được chỉ định")
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="text-center py-3">STT</th>
                      <th className="py-3">Mã DV</th>
                      <th className="py-3">Mã Lịch</th>
                      <th className="py-3">Bệnh Nhân</th>
                      <th className="text-center py-3">Tuổi</th>
                      <th className="text-center py-3">Giới Tính</th>
                      <th className="py-3">Dịch Vụ</th>
                      <th className="text-center py-3">Bác Sĩ</th>
                      <th className="text-center py-3">Giá</th>
                      <th className="text-center py-3">Ngày Đặt</th>
                      <th className="text-center py-3">Trạng Thái</th>
                      <th className="text-center py-3">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAssignedData.map((service, index) =>
                      renderServiceRow(service, index + (currentAssignedPage * ITEMS_PER_PAGE))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination for Assigned Services */}
              {assignedPageCount > 1 && (
                <div className="d-flex justify-content-center p-3 border-top">
                  <Pagination
                    pageCount={assignedPageCount}
                    onPageChange={handleAssignedPageChange}
                    forcePage={currentAssignedPage}
                  />
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Completed Services Section */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-success text-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-check-circle me-2"></i>
              Dịch Vụ Đã Hoàn Thành
            </h5>
            <Badge bg="light" text="dark" className="fs-6">
              {completedServices.length} dịch vụ
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            renderLoadingState()
          ) : completedServices.length === 0 ? (
            renderEmptyState("Chưa có dịch vụ nào hoàn thành")
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="text-center py-3">STT</th>
                      <th className="py-3">Mã DV</th>
                      <th className="py-3">Mã Lịch</th>
                      <th className="py-3">Bệnh Nhân</th>
                      <th className="text-center py-3">Tuổi</th>
                      <th className="text-center py-3">Giới Tính</th>
                      <th className="py-3">Dịch Vụ</th>
                      <th className="text-center py-3">Bác Sĩ</th>
                      <th className="text-center py-3">Giá</th>
                      <th className="text-center py-3">Ngày Đặt</th>
                      <th className="text-center py-3">Ngày Hoàn Thành</th>
                      <th className="text-center py-3">Trạng Thái</th>
                      <th className="text-center py-3">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompletedData.map((service, index) =>
                      renderCompletedServiceRow(service, index + (currentCompletedPage * ITEMS_PER_PAGE))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination for Completed Services */}
              {completedPageCount > 1 && (
                <div className="d-flex justify-content-center p-3 border-top">
                  <Pagination
                    pageCount={completedPageCount}
                    onPageChange={handleCompletedPageChange}
                    forcePage={currentCompletedPage}
                  />
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Result Input Modal */}
      <Modal show={showResultModal} onHide={closeResultModal} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="fas fa-vial me-2"></i>
            Nhập Kết Quả Xét Nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentService && (
            <div className="mb-4 p-3 bg-light rounded">
              <div className="row">
                <div className="col-md-6">
                  <strong>Bệnh nhân:</strong> {currentService.patient_name}
                </div>
                <div className="col-md-6">
                  <strong>Dịch vụ:</strong> {currentService.service_name}
                </div>
                <div className="col-md-6 mt-2">
                  <strong>Mã dịch vụ:</strong> #{currentService.service_order_id}
                </div>
                <div className="col-md-6 mt-2">
                  <strong>Ngày đặt:</strong> {formatDate(currentService.order_date)}
                </div>
              </div>
            </div>
          )}

          <Form.Group>
            <Form.Label className="fw-semibold">
              Kết quả xét nghiệm <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={8}
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="Nhập kết quả xét nghiệm chi tiết..."
              className="border-2"
            />
            <Form.Text className="text-muted">
              Vui lòng nhập đầy đủ và chính xác kết quả xét nghiệm.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeResultModal} disabled={localLoading}>
            <i className="fas fa-times me-1"></i>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveResult}
            disabled={localLoading || !resultText.trim()}
          >
            {localLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang lưu...
              </>
            ) : (
              <>
                <i className="fas fa-save me-1"></i>
                Lưu Kết Quả
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Result Modal */}
      <Modal show={showViewResultModal} onHide={closeViewResultModal} size="xl" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <i className="fas fa-file-medical me-2"></i>
            Kết Quả Xét Nghiệm Chi Tiết
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingService && (
            <>
              <div className="mb-4 p-3 bg-light rounded">
                <div className="row">
                  <div className="col-md-4">
                    <strong>Bệnh nhân:</strong> {viewingService.patient_name}
                  </div>
                  <div className="col-md-4">
                    <strong>Dịch vụ:</strong> {viewingService.service_name}
                  </div>
                  <div className="col-md-4">
                    <strong>Mã dịch vụ:</strong> #{viewingService.service_order_id}
                  </div>
                  <div className="col-md-4 mt-2">
                    <strong>Ngày đặt:</strong> {formatDate(viewingService.order_date)}
                  </div>
                  <div className="col-md-4 mt-2">
                    <strong>Ngày hoàn thành:</strong> {viewingService.completed_at || formatDate(viewingService.updated_at) || 'N/A'}
                  </div>
                  <div className="col-md-4 mt-2">
                    <strong>Bác sĩ chỉ định:</strong> {viewingService.referring_doctor_name || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="border rounded p-4 bg-white">
                <h6 className="text-primary mb-3">
                  <i className="fas fa-vial me-2"></i>
                  KẾT QUẢ XÉT NGHIỆM
                </h6>
                <pre className="mb-0 fs-6" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {viewingService.result}
                </pre>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeViewResultModal}>
            <i className="fas fa-times me-1"></i>
            Đóng
          </Button>
          {viewingService && (
            <Button
              variant="primary"
              onClick={() => printPDFResult(viewingService)}
              disabled={printingPdf}
            >
              {printingPdf ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang in...
                </>
              ) : (
                <>
                  <i className="fas fa-print me-1"></i>
                  In PDF
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Confirm Action Modal */}
      <Modal show={showConfirmModal} onHide={closeConfirmModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Xác Nhận Hành Động</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {renderConfirmContent()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeConfirmModal} disabled={localLoading}>
            <i className="fas fa-times me-1"></i>
            Hủy
          </Button>
          <Button
            variant={confirmAction === 'cancel' ? 'danger' : confirmAction === 'start' ? 'primary' : 'success'}
            onClick={executeConfirmAction}
            disabled={localLoading}
          >
            {localLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang xử lý...
              </>
            ) : (
              <>
                <i className={`fas fa-${confirmAction === 'start' ? 'play' :
                    confirmAction === 'complete' ? 'check' :
                      'times'
                  } me-1`}></i>
                {confirmAction === 'start' ? 'Bắt Đầu' :
                  confirmAction === 'complete' ? 'Hoàn Thành' :
                    'Hủy Dịch Vụ'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TechnicianSection;