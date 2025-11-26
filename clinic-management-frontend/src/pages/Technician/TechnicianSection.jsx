import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Row, Col, Badge, Spinner, Modal, Form
} from 'react-bootstrap';
import Swal from 'sweetalert2';
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

// ✅ Custom Toast Component
const CustomToast = ({ show, message, type, onClose, delay = 3000 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, delay);
      return () => clearTimeout(timer);
    }
  }, [show, delay, onClose]);

  if (!show) return null;

  const bgColor = type === 'success' ? 'bg-success' :
    type === 'error' ? 'bg-danger' :
      type === 'warning' ? 'bg-warning' : 'bg-info';

  return (
    <div
      className={`${bgColor} text-white position-fixed top-0 end-0 m-4 p-3 rounded shadow`}
      style={{ zIndex: 9999, minWidth: '300px' }}
    >
      <div className="d-flex justify-content-between align-items-center">
        <span>{message}</span>
        <button
          type="button"
          className="btn-close btn-close-white"
          onClick={onClose}
        ></button>
      </div>
    </div>
  );
};

// ✅ Alert Helper Functions
const showAlert = {
  // For loading states
  loading: (message = 'Đang xử lý...') => {
    Swal.fire({
      title: message,
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      showConfirmButton: false
    });
  },

  // For success messages
  success: (title, message, config = {}) => {
    return Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#198754',
      timer: 2000,
      showConfirmButton: false,
      ...config
    });
  },

  // For error messages
  error: (title, message, config = {}) => {
    return Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonColor: '#dc3545',
      ...config
    });
  },

  // For info messages
  info: (title, message, config = {}) => {
    return Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonColor: '#0dcaf0',
      ...config
    });
  },

  // Close any open alert
  close: () => Swal.close()
};

const TechnicianSection = ({ testResultsData, completedServicesData, updateStats, loading, pagination, onPageChange }) => {
  const navigate = useNavigate();

  // ✅ STATE CHO TOAST
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  // ✅ Toast functions
  const showToast = (message, type = 'success') => {
    setToast({
      show: true,
      message,
      type
    });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // ✅ STATE
  const [localData, setLocalData] = useState([]);
  const [completedServices, setCompletedServices] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [resultText, setResultText] = useState('');

  // ✅ STATE CHO PAGINATION
  const [currentAssignedPage, setCurrentAssignedPage] = useState(0);
  const [currentCompletedPage, setCurrentCompletedPage] = useState(0);

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

  // ✅ XỬ LÝ LỖI API CHUNG
  const handleApiError = (error, defaultMessage = 'Có lỗi xảy ra, vui lòng thử lại') => {
    console.error('❌ API Error:', error);

    let errorMessage = defaultMessage;

    if (error.response) {
      // Lỗi từ server (4xx, 5xx)
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.data?.error;

      switch (status) {
        case 400:
          errorMessage = serverMessage || 'Dữ liệu gửi lên không hợp lệ';
          break;
        case 401:
          errorMessage = 'Bạn không có quyền thực hiện hành động này';
          break;
        case 403:
          errorMessage = 'Truy cập bị từ chối';
          break;
        case 404:
          errorMessage = 'Không tìm thấy tài nguyên';
          break;
        case 409:
          errorMessage = 'Dữ liệu đã tồn tại hoặc xung đột';
          break;
        case 422:
          errorMessage = serverMessage || 'Dữ liệu không hợp lệ';
          break;
        case 500:
          errorMessage = 'Lỗi máy chủ, vui lòng thử lại sau';
          break;
        case 502:
          errorMessage = 'Lỗi kết nối đến server';
          break;
        case 503:
          errorMessage = 'Dịch vụ tạm thời không khả dụng';
          break;
        default:
          errorMessage = serverMessage || `Lỗi server (${status})`;
      }
    } else if (error.request) {
      // Không nhận được response từ server
      errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
    } else if (error.message) {
      // Lỗi khác
      if (error.message.includes('Network Error')) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Kết nối quá thời gian chờ. Vui lòng thử lại.';
      } else {
        errorMessage = error.message;
      }
    }

    return errorMessage;
  };

  // ✅ SWEETALERT2 CONFIRM FUNCTIONS - CHO CÁC HÀNH ĐỘNG CHÍNH
  const showConfirmDialog = (action, data) => {
    const { patientName, serviceName, actionType } = data;

    const getConfirmConfig = () => {
      switch (actionType) {
        case 'start':
          return {
            title: 'Bắt Đầu Dịch Vụ',
            icon: 'question',
            iconColor: '#0d6efd',
            confirmButtonColor: '#0d6efd',
            confirmButtonText: 'Bắt Đầu',
            html: `
              <div class="text-center">
                <i class="fas fa-play-circle fa-3x text-primary mb-3"></i>
                <h4 class="text-primary fw-bold">Bắt Đầu Dịch Vụ</h4>
              </div>
              <p class="text-center fs-5">Bạn có chắc muốn <strong>BẮT ĐẦU</strong> dịch vụ <strong>"${serviceName}"</strong> cho bệnh nhân <strong>${patientName}</strong>?</p>
              <div class="bg-light p-3 rounded mt-3">
                <div class="row">
                  <div class="col-6">
                    <strong>Bệnh nhân:</strong> ${patientName}
                  </div>
                  <div class="col-6">
                    <strong>Dịch vụ:</strong> ${serviceName}
                  </div>
                </div>
              </div>
            `
          };
        case 'complete':
          return {
            title: 'Hoàn Thành Dịch Vụ',
            icon: 'success',
            iconColor: '#198754',
            confirmButtonColor: '#198754',
            confirmButtonText: 'Hoàn Thành',
            html: `
              <div class="text-center">
                <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                <h4 class="text-success fw-bold">Hoàn Thành Dịch Vụ</h4>
              </div>
              <p class="text-center fs-5">Bạn có chắc muốn <strong>HOÀN THÀNH</strong> dịch vụ <strong>"${serviceName}"</strong> cho bệnh nhân <strong>${patientName}</strong>?</p>
              <div class="bg-light p-3 rounded mt-3">
                <div class="row">
                  <div class="col-6">
                    <strong>Bệnh nhân:</strong> ${patientName}
                  </div>
                  <div class="col-6">
                    <strong>Dịch vụ:</strong> ${serviceName}
                  </div>
                </div>
              </div>
            `
          };
        case 'cancel':
          return {
            title: 'Hủy Dịch Vụ',
            icon: 'warning',
            iconColor: '#dc3545',
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Hủy Dịch Vụ',
            html: `
              <div class="text-center">
                <i class="fas fa-times-circle fa-3x text-danger mb-3"></i>
                <h4 class="text-danger fw-bold">Hủy Dịch Vụ</h4>
              </div>
              <p class="text-center fs-5">Bạn có chắc muốn <strong>HỦY</strong> dịch vụ <strong>"${serviceName}"</strong> cho bệnh nhân <strong>${patientName}</strong>?</p>
              <div class="alert alert-warning mt-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Lưu ý:</strong> Hành động này không thể hoàn tác!
              </div>
              <div class="bg-light p-3 rounded mt-3">
                <div class="row">
                  <div class="col-6">
                    <strong>Bệnh nhân:</strong> ${patientName}
                  </div>
                  <div class="col-6">
                    <strong>Dịch vụ:</strong> ${serviceName}
                  </div>
                </div>
              </div>
            `
          };
        default:
          return {
            title: 'Xác Nhận',
            icon: 'question',
            confirmButtonColor: '#6c757d',
            confirmButtonText: 'Xác Nhận',
            html: `
              <p class="text-center fs-5">Bạn có chắc muốn thực hiện hành động này?</p>
            `
          };
      }
    };

    const config = getConfirmConfig();

    Swal.fire({
      title: config.title,
      html: config.html,
      icon: config.icon,
      iconColor: config.iconColor,
      showCancelButton: true,
      confirmButtonText: config.confirmButtonText,
      cancelButtonText: 'Hủy',
      confirmButtonColor: config.confirmButtonColor,
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'sweetalert-custom-popup',
        confirmButton: 'sweetalert-confirm-btn',
        cancelButton: 'sweetalert-cancel-btn'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        executeAction(action, data);
      }
    });
  };

  // ✅ CONFIRM CHO XEM CHI TIẾT KẾT QUẢ
  const confirmViewResultDetail = (service) => {
    if (!service.result || service.result.trim() === '') {
      showAlert.info('Thông Báo', 'Chưa có kết quả xét nghiệm cho dịch vụ này');
      return;
    }

    Swal.fire({
      title: 'Xem Chi Tiết Kết Quả',
      html: `
        <div class="text-center">
          <i class="fas fa-eye fa-3x text-info mb-3"></i>
          <h4 class="text-info fw-bold">Xem Kết Quả Chi Tiết</h4>
        </div>
        <p class="text-center fs-5">Bạn có muốn xem chi tiết kết quả xét nghiệm?</p>
        <div class="bg-light p-3 rounded mt-3">
          <div class="row">
            <div class="col-6">
              <strong>Bệnh nhân:</strong> ${service.patient_name}
            </div>
            <div class="col-6">
              <strong>Dịch vụ:</strong> ${service.service_name}
            </div>
            <div class="col-12 mt-2">
              <strong>Mã dịch vụ:</strong> #${service.service_order_id}
            </div>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Xem Chi Tiết',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#0dcaf0',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        executeViewResultDetail(service);
      }
    });
  };

  // ✅ CONFIRM CHO LƯU KẾT QUẢ
  const confirmSaveResult = () => {
    const trimmedResult = resultText.trim();
    if (!trimmedResult) {
      showToast('Vui lòng nhập kết quả xét nghiệm', 'error');
      return;
    }

    Swal.fire({
      title: 'Lưu Kết Quả Xét Nghiệm',
      html: `
        <div class="text-center">
          <i class="fas fa-save fa-3x text-primary mb-3"></i>
          <h4 class="text-primary fw-bold">Lưu Kết Quả</h4>
        </div>
        <p class="text-center fs-5">Bạn có chắc muốn lưu kết quả xét nghiệm này?</p>
        <div class="bg-light p-3 rounded mt-3">
          <div class="row">
            <div class="col-6">
              <strong>Bệnh nhân:</strong> ${currentService.patient_name}
            </div>
            <div class="col-6">
              <strong>Dịch vụ:</strong> ${currentService.service_name}
            </div>
            <div class="col-12 mt-2">
              <strong>Mã dịch vụ:</strong> #${currentService.service_order_id}
            </div>
          </div>
        </div>
        <div class="alert alert-info mt-3">
          <i class="fas fa-info-circle me-2"></i>
          Kết quả sẽ được lưu vào hệ thống và không thể sửa đổi sau khi lưu.
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Lưu Kết Quả',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        handleSaveResult();
      }
    });
  };

  // ✅ CONFIRM CHO IN PDF
  const confirmPrintPDF = (service) => {
    if (!service.result || service.result.trim() === '') {
      showAlert.info('Thông Báo', 'Chưa có kết quả xét nghiệm để in');
      return;
    }

    Swal.fire({
      title: 'In Kết Quả PDF',
      html: `
        <div class="text-center">
          <i class="fas fa-print fa-3x text-success mb-3"></i>
          <h4 class="text-success fw-bold">In Kết Quả PDF</h4>
        </div>
        <p class="text-center fs-5">Bạn có muốn in kết quả xét nghiệm ra file PDF?</p>
        <div class="bg-light p-3 rounded mt-3">
          <div class="row">
            <div class="col-6">
              <strong>Bệnh nhân:</strong> ${service.patient_name}
            </div>
            <div class="col-6">
              <strong>Dịch vụ:</strong> ${service.service_name}
            </div>
            <div class="col-12 mt-2">
              <strong>Mã dịch vụ:</strong> #${service.service_order_id}
            </div>
          </div>
        </div>
        <div class="alert alert-info mt-3">
          <i class="fas fa-info-circle me-2"></i>
          File PDF sẽ được tải xuống tự động sau khi tạo thành công.
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'In PDF',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        printPDFResult(service);
      }
    });
  };

  // ✅ CONFIRM CHO CHUYỂN TRANG TÙY CHỈNH PDF
  const confirmCustomizePDF = (service) => {
    if (!service.result || service.result.trim() === '') {
      showAlert.info('Thông Báo', 'Chưa có kết quả xét nghiệm để tùy chỉnh');
      return;
    }

    Swal.fire({
      title: 'Tùy Chỉnh PDF',
      html: `
        <div class="text-center">
          <i class="fas fa-edit fa-3x text-info mb-3"></i>
          <h4 class="text-info fw-bold">Tùy Chỉnh PDF</h4>
        </div>
        <p class="text-center fs-5">Bạn có muốn chuyển sang trang tùy chỉnh PDF?</p>
        <div class="bg-light p-3 rounded mt-3">
          <div class="row">
            <div class="col-6">
              <strong>Bệnh nhân:</strong> ${service.patient_name}
            </div>
            <div class="col-6">
              <strong>Dịch vụ:</strong> ${service.service_name}
            </div>
            <div class="col-12 mt-2">
              <strong>Mã dịch vụ:</strong> #${service.service_order_id}
            </div>
          </div>
        </div>
        <div class="alert alert-warning mt-3">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Lưu ý:</strong> Bạn sẽ được chuyển đến trang chỉnh sửa PDF. Mọi thay đổi chưa lưu trên trang này sẽ bị mất.
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Chuyển Trang',
      cancelButtonText: 'Ở Lại',
      confirmButtonColor: '#0dcaf0',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        customizePDFResult(service);
      }
    });
  };

  // ✅ Thực hiện hành động sau khi confirm
  const executeAction = (action, data) => {
    switch (action) {
      case 'start':
        handleStatusChange(
          data.serviceOrderId,
          data.patientName,
          data.serviceName,
          STATUS.IN_PROGRESS
        );
        break;
      case 'complete':
        handleStatusChange(
          data.serviceOrderId,
          data.patientName,
          data.serviceName,
          STATUS.COMPLETED
        );
        break;
      case 'cancel':
        handleStatusChange(
          data.serviceOrderId,
          data.patientName,
          data.serviceName,
          STATUS.CANCELLED
        );
        break;
      default:
        console.warn('Unknown action:', action);
    }
  };

  // ✅ Thực hiện xem chi tiết kết quả
  const executeViewResultDetail = (service) => {
    console.log('📋 Xem kết quả chi tiết:', {
      patient: service.patient_name,
      service: service.service_name,
      result: service.result
    });

    setViewingService(service);
    setShowViewResultModal(true);
  };

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

  // ✅ OPTIMISTIC UPDATE: handleStatusChange với xử lý lỗi đầy đủ
  const handleStatusChange = async (serviceOrderId, patientName, serviceName, newStatus) => {
    if (localLoading) {
      showAlert.info('Đang xử lý...', 'Vui lòng chờ trong giây lát', { timer: 1500 });
      return;
    }

    try {
      setLocalLoading(true);

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
          showToast(actionMessage, 'success');

        } else {
          // ❌ API trả về success = false
          const errorMessage = response.data?.message || 'Cập nhật trạng thái thất bại';
          console.warn('⚠️ API trả về success=false:', errorMessage);

          // Rollback UI
          setLocalData(previousData);
          setCompletedServices(previousCompleted);

          showToast(errorMessage, 'error');
        }

      } catch (apiError) {
        console.error('❌ Lỗi API:', apiError);

        // Rollback UI khi có lỗi
        setLocalData(previousData);
        setCompletedServices(previousCompleted);

        const errorMessage = handleApiError(apiError, 'Cập nhật trạng thái thất bại');
        showToast(errorMessage, 'error');
      }

    } catch (err) {
      console.error('💥 Lỗi không mong muốn:', err);
      showToast('Có lỗi xảy ra, vui lòng thử lại', 'error');

    } finally {
      setLocalLoading(false);
    }
  };

  const handleSaveResult = async () => {
    if (localLoading) return;

    if (!currentService) {
      showToast('Không tìm thấy thông tin dịch vụ', 'error');
      return;
    }

    const trimmedResult = resultText.trim();
    if (!trimmedResult) {
      showToast('Vui lòng nhập kết quả xét nghiệm', 'error');
      return;
    }

    try {
      setLocalLoading(true);
      showAlert.loading('Đang lưu kết quả...');

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
        const successMessage = `Đã lưu kết quả "${currentService.service_name}" cho ${currentService.patient_name}`;

        showAlert.close();
        showToast(successMessage, 'success');
        closeResultModal();

        // ✅ RELOAD DATA TRONG BACKGROUND
        setTimeout(() => {
          if (updateStats) {
            console.log('🔄 Tự động đồng bộ data sau lưu kết quả...');
            updateStats();
          }
        }, 800);

      } else {
        // ❌ API trả về success = false
        const errorMessage = response.data?.message || 'Lưu kết quả thất bại';
        throw new Error(errorMessage);
      }

    } catch (err) {
      console.error('❌ Lỗi lưu kết quả:', err);
      showAlert.close();

      // Rollback UI khi có lỗi
      if (currentService) {
        updateLocalStatus(currentService.service_order_id, currentService.status, oldResult);
      }

      const errorMessage = handleApiError(err, 'Không thể lưu kết quả. Vui lòng thử lại.');

      // ✅ PHƯƠNG ÁN DỰ PHÒNG: Dùng SweetAlert2 cho lỗi
      showAlert.error('Lỗi', errorMessage);

      // Vẫn thử hiển thị Toast (để test)
      showToast(errorMessage, 'error');

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

  // ✅ Hàm in PDF với xử lý lỗi đầy đủ
  const printPDFResult = async (service) => {
    try {
      setPrintingPdf(true);
      showAlert.loading('Đang tạo PDF...');

      console.log('🔄 Đang tạo PDF kết quả xét nghiệm...', {
        serviceId: service.service_order_id,
        patient: service.patient_name
      });

      // ✅ CHUẨN BỊ DỮ LIỆU CHO PDF
      const pdfData = {
        type: 'test_result',
        patient_name: service.patient_name,
        age: service.patient_age,
        gender: service.patient_gender,
        patient_code: `BN${service.patient_id}`,
        lab_number: `XN${service.service_order_id}`,
        department: 'KHOA XÉT NGHIỆM',
        technician_name: service.assigned_technician_name || 'Kỹ thuật viên Xét nghiệm',
        appointment_date: service.order_date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: new Date().toLocaleTimeString('vi-VN'),
        doctorName: service.referring_doctor_name || 'Bác sĩ chỉ định',

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

        pdf_settings: {
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

          clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
          clinicAddress: 'Số 123 Đường ABC, Quận 1, TP.HCM',
          clinicPhone: '028 1234 5678',
          doctorName: `${service.referring_doctor_name}` || 'Bác sĩ chỉ định',
          customTitle: 'Phiếu KQ Xét Nghiệm',

          pageOrientation: 'portrait',
          pageSize: 'A4',
          marginTop: '15mm',
          marginBottom: '15mm',
          marginLeft: '10mm',
          marginRight: '10mm',

          logo: { enabled: false },
          watermark: { enabled: false }
        }
      };

      console.log('📤 PDF Data gửi đi:', pdfData);

      await printPdfService.printPDF(pdfData);

      showAlert.close();
      showToast(`Đã xuất PDF kết quả xét nghiệm cho ${service.patient_name}`, 'success');

    } catch (error) {
      console.error('❌ Lỗi khi in PDF:', error);
      showAlert.close();

      const errorMessage = handleApiError(error, 'Lỗi khi tạo PDF kết quả xét nghiệm');
      showToast(errorMessage, 'error');

    } finally {
      setPrintingPdf(false);
    }
  };

  // ✅ Hàm tùy chỉnh PDF với xử lý lỗi
  const customizePDFResult = async (service) => {
    try {
      setCustomizingPdf(true);
      showAlert.loading('Đang chuẩn bị...');

      console.log('🎨 Đang chuẩn bị dữ liệu cho trình chỉnh sửa PDF...', {
        serviceId: service.service_order_id,
        patient: service.patient_name
      });

      // ✅ CHUẨN BỊ DỮ LIỆU CHO PDF EDITOR
      const pdfEditorData = {
        type: 'test_result',
        source: 'technician',

        patient_name: service.patient_name,
        patient_age: service.patient_age || 'N/A',
        patient_gender: service.patient_gender || 'N/A',
        patient_phone: service.patient_phone || 'N/A',
        patient_address: service.patient_address || 'N/A',

        lab_number: `XN${service.service_order_id}`,
        patient_code: `BN${service.patient_id}`,
        department: 'KHOA XÉT NGHIỆM',
        technician_name: service.assigned_technician_name || 'Kỹ thuật viên Xét nghiệm',
        appointment_date: service.order_date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: new Date().toLocaleTimeString('vi-VN'),
        doctor_name: service.referring_doctor_name || 'Bác sĩ chỉ định',

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

        pdf_settings: {
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

          clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
          clinicAddress: 'Số 123 Đường ABC, Quận 1, TP.HCM',
          clinicPhone: '028 1234 5678',
          doctorName: `${service.referring_doctor_name}` || 'Bác sĩ chỉ định',
          customTitle: 'Phiếu KQ Xét Nghiệm',

          pageOrientation: 'portrait',
          pageSize: 'A4',
          marginTop: '15mm',
          marginBottom: '15mm',
          marginLeft: '10mm',
          marginRight: '10mm',

          logo: { enabled: false },
          watermark: { enabled: false }
        },

        service_order_id: service.service_order_id,
        appointment_id: service.appointment_id,
        timestamp: Date.now()
      };

      // ✅ LƯU DỮ LIỆU VÀO SESSION STORAGE
      sessionStorage.setItem('pdfEditorData', JSON.stringify(pdfEditorData));
      sessionStorage.setItem('editorSource', 'technician');
      sessionStorage.setItem('shouldRefreshOnReturn', 'true');

      showAlert.close();
      showToast(`Đang chuyển đến trình chỉnh sửa PDF cho ${service.patient_name}`, 'success');

      // ✅ CHUYỂN HƯỚNG ĐẾN TRANG EDITOR
      const editorUrl = '/technician/technician-print-pdf-editor';

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

    } catch (error) {
      console.error('❌ Lỗi khi mở trình chỉnh sửa PDF:', error);
      showAlert.close();

      const errorMessage = handleApiError(error, 'Lỗi khi mở trình chỉnh sửa PDF');
      showToast(errorMessage, 'error');

    } finally {
      setCustomizingPdf(false);
    }
  };

  // ✅ Modal functions
  const openResultModal = (service) => {
    setCurrentService(service);
    setResultText(service.result || '');
    setShowResultModal(true);
  };

  const closeResultModal = () => {
    if (resultText !== (currentService?.result || '')) {
      Swal.fire({
        title: 'Thoát mà không lưu?',
        text: 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn thoát?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Thoát',
        cancelButtonText: 'Ở lại',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          setShowResultModal(false);
          setCurrentService(null);
          setResultText('');
        }
      });
    } else {
      setShowResultModal(false);
      setCurrentService(null);
      setResultText('');
    }
  };

  // ✅ Hàm đóng modal xem kết quả
  const closeViewResultModal = () => {
    setShowViewResultModal(false);
    setViewingService(null);
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
                onClick={() => showConfirmDialog('start', {
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
                onClick={() => showConfirmDialog('complete', {
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
                onClick={() => showConfirmDialog('cancel', {
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
        onClick={() => confirmViewResultDetail(service)}
        disabled={!service.result || service.result.trim() === ''}
        title={service.result ? "Xem kết quả chi tiết" : "Chưa có kết quả"}
      >
        <i className="fas fa-eye me-1"></i>
      </Button>

      <Button
        variant="outline-success"
        size="sm"
        className="px-3"
        onClick={() => confirmPrintPDF(service)}
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
        onClick={() => confirmCustomizePDF(service)}
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
      {/* ✅ CUSTOM TOAST COMPONENT */}
      <CustomToast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
        delay={3000}
      />

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
            onClick={confirmSaveResult}
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
              onClick={() => confirmPrintPDF(viewingService)}
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
    </div>
  );
};

export default TechnicianSection;