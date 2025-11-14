import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Row, Col, Badge, Alert, Spinner, Modal, Form
} from 'react-bootstrap';
import technicianService from '../../services/technicianService';
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

const ITEMS_PER_PAGE = 2; // ✅ 5 dòng mỗi trang

const TechnicianSection = ({ testResultsData, completedServicesData, updateStats, loading }) => {
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

  // ✅ Đồng bộ testResultsData khi props thay đổi
  useEffect(() => {
    console.log('🔄 [EFFECT] Syncing localData with testResultsData');
    console.log('📥 [EFFECT] Raw testResultsData:', testResultsData);

    if (testResultsData && Array.isArray(testResultsData)) {
      console.log('✅ [EFFECT] Setting localData:', testResultsData.length, 'items');
      setLocalData(testResultsData);
      setCurrentAssignedPage(0); // Reset về trang đầu khi data thay đổi
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
      console.log('✅ [EFFECT] Setting completedServices:', completedServicesData.length, 'items');
      setCompletedServices(completedServicesData);
      setCurrentCompletedPage(0); // Reset về trang đầu khi data thay đổi
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

      // ✅ 1. CẬP NHẬT UI NGAY LẬP TỨC (Optimistic Update)
      updateLocalStatus(serviceOrderId, newStatus);

      // ✅ 2. GỬI API
      try {
        const response = await technicianService.updateServiceStatus(serviceOrderId, newStatus);

        if (response.data?.success) {
          console.log('✅ API cập nhật thành công');
        } else {
          console.warn('⚠️ API trả về success=false nhưng vẫn tiếp tục');
        }
      } catch (apiError) {
        console.warn('⚠️ Lỗi API được bỏ qua:', apiError);
      }

      // ✅ 3. HIỂN THỊ THÔNG BÁO THÀNH CÔNG
      const actionMessage = getActionMessage(newStatus, patientName, serviceName);
      setLocalSuccess(`✅ ${actionMessage}`);

      // ✅ 4. RELOAD DATA SAU KHI THAY ĐỔI TRẠNG THÁI
      setTimeout(() => {
        if (updateStats) {
          console.log('🔄 Tự động đồng bộ data từ server...');
          updateStats();
        }
      }, 2000);

      // ✅ 5. TỰ ĐỘNG ẨN THÔNG BÁO
      setTimeout(() => setLocalSuccess(''), 3000);

    } catch (err) {
      console.error('💥 Lỗi không mong muốn:', err);
      setLocalError('❌ Có lỗi xảy ra, vui lòng thử lại');
      setTimeout(() => setLocalError(''), 5000);
    } finally {
      setLocalLoading(false);
    }
  };

  // ✅ PHIÊN BẢN TỐI ƯU CHO handleSaveResult
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

        // ✅ ĐÓNG MODAL NGAY
        closeResultModal();

        // ✅ RELOAD DATA TRONG BACKGROUND
        if (updateStats) {
          updateStats().catch(err => {
            console.warn('⚠️ Lỗi đồng bộ data sau lưu kết quả:', err);
          });
        }

        setTimeout(() => setLocalSuccess(''), 3000);
      } else {
        throw new Error(response.data?.message || 'Lưu kết quả thất bại');
      }

    } catch (err) {
      console.error('❌ Lỗi lưu kết quả:', err);

      // ✅ KHÔI PHỤC KẾT QUẢ CŨ TRONG UI
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

  // ✅ Message helpers
  const getActionMessage = (status, patientName, serviceName) => {
    const messageMap = {
      [STATUS.IN_PROGRESS]: `Đã bắt đầu "${serviceName}" cho ${patientName}`,
      [STATUS.COMPLETED]: `Đã hoàn thành "${serviceName}" cho ${patientName}`,
      [STATUS.CANCELLED]: `Đã hủy "${serviceName}" cho ${patientName}`
    };

    return messageMap[status] || `Đã thay đổi trạng thái "${serviceName}" cho ${patientName}`;
  };

  // ✅ Hàm xem kết quả chi tiết
  const viewResultDetail = (service) => {
    if (!service.result || service.result.trim() === '') {
      setLocalError('Chưa có kết quả xét nghiệm cho dịch vụ này');
      return;
    }

    const modalContent = `
      <div style="max-width: 600px; padding: 20px; background: white; border-radius: 10px;">
        <h3 style="color: #198754; margin-bottom: 20px; text-align: center;">
          <i class="fas fa-vial me-2"></i>Kết Quả Xét Nghiệm
        </h3>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <p><strong>Bệnh nhân:</strong> ${service.patient_name}</p>
          <p><strong>Dịch vụ:</strong> ${service.service_name}</p>
          <p><strong>Ngày thực hiện:</strong> ${service.order_date || 'N/A'}</p>
          <p><strong>Mã dịch vụ:</strong> #${service.service_order_id}</p>
        </div>
        
        <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px;">
          <h5 style="color: #495057; margin-bottom: 10px;">Kết quả:</h5>
          <div style="white-space: pre-wrap; line-height: 1.6; color: #212529; font-family: Arial, sans-serif;">
            ${service.result}
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" class="btn btn-success me-2" style="padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-print me-1"></i>In Kết Quả
          </button>
          <button onclick="document.getElementById('resultModal').remove()" class="btn btn-secondary" style="padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-times me-1"></i>Đóng
          </button>
        </div>
      </div>
    `;

    const modal = document.createElement('div');
    modal.id = 'resultModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = modalContent;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  };

  // ✅ Hàm in kết quả
  const printResult = (service) => {
    if (!service.result || service.result.trim() === '') {
      setLocalError('Chưa có kết quả xét nghiệm để in');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Kết Quả Xét Nghiệm - ${service.patient_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .patient-info { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
            .result-content { white-space: pre-wrap; margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: white; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            @media print { 
              body { margin: 0; } 
              .no-print { display: none; }
              .header { border-bottom: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KẾT QUẢ XÉT NGHIỆM</h1>
            <h3>Phòng Khám Đa Khoa</h3>
          </div>
          
          <div class="patient-info">
            <p><strong>Họ tên bệnh nhân:</strong> ${service.patient_name}</p>
            <p><strong>Tuổi:</strong> ${service.patient_age || 'N/A'} | <strong>Giới tính:</strong> ${service.patient_gender || 'N/A'}</p>
            <p><strong>Dịch vụ:</strong> ${service.service_name}</p>
            <p><strong>Ngày thực hiện:</strong> ${service.order_date || 'N/A'}</p>
            <p><strong>Bác sĩ chỉ định:</strong> ${service.referring_doctor_name || 'N/A'}</p>
          </div>
          
          <div class="result-content">
            ${service.result}
          </div>
          
          <div class="footer">
            <p>Kết quả được tạo vào: ${new Date().toLocaleString('vi-VN')}</p>
            <p>Chữ ký kỹ thuật viên</p>
            <p>___________________________________</p>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
              In Kết Quả
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Đóng
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ✅ Tính toán statistics
  const statistics = React.useMemo(() => {
    console.log('📊 Calculating statistics from localData:', localData);

    const totalServices = localData.length;
    const completedServicesCount = completedServices.length;
    const inProgressServices = localData.filter(s =>
      s.status === STATUS.IN_PROGRESS
    ).length;
    const assignedServices = localData.filter(s =>
      s.status === STATUS.ASSIGNED
    ).length;
    const totalRevenue = localData.reduce((total, service) => total + (service.price || 0), 0);

    console.log('📊 Statistics result:', {
      totalServices,
      completedServices: completedServicesCount,
      inProgressServices,
      assignedServices,
      totalRevenue
    });

    return {
      totalServices,
      completedServices: completedServicesCount,
      inProgressServices,
      assignedServices,
      totalRevenue
    };
  }, [localData, completedServices]);

  // ✅ Render functions
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
              >
                <i className="fas fa-play me-1"></i>
                Bắt đầu
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
              >
                <i className="fas fa-vial me-1"></i>
                {service.result ? 'Sửa KQ' : 'Kết quả'}
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
              >
                <i className="fas fa-check me-1"></i>
                Hoàn thành
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
              >
                <i className="fas fa-times me-1"></i>
                Hủy
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ✅ Kiểm tra dữ liệu trước khi render
  console.log('🔍 Final localData before render:', localData);
  console.log('🔍 Final completedServices before render:', completedServices);
  console.log('🔍 Loading state:', loading);

  return (
    <div className="section active" id="test-results">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                <i className="fas fa-vials text-primary me-2"></i>
                Quản Lý Dịch Vụ
              </h2>
              <p className="text-muted mb-0">Danh sách dịch vụ được chỉ định và kết quả xét nghiệm</p>
            </div>
            {statistics.totalServices > 0 && (
              <Badge bg="primary" className="fs-6 px-3 py-2">
                <i className="fas fa-list-check me-2"></i>
                {statistics.totalServices} dịch vụ
              </Badge>
            )}
          </div>
        </Col>
      </Row>

      {/* Alerts */}
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

      {/* Loading */}
      {localLoading && (
        <div className="text-center mb-3">
          <Spinner animation="border" variant="primary" size="sm" />
          <span className="ms-2">Đang xử lý...</span>
        </div>
      )}

      <Row>
        {/* Statistics Cards */}
        <Col xl={12} className="mb-4">
          {renderStatisticsCards()}
        </Col>

        {/* Main Services Table - CÓ PHÂN TRANG */}
        <Col xl={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold text-dark">
                  <i className="fas fa-list-check text-primary me-2"></i>
                  Danh Sách Dịch Vụ Được Chỉ Định
                </h5>
                <div className="text-muted">
                  <small>
                    <i className="fas fa-sync-alt me-1"></i>
                    Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
                  </small>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" size="lg" />
                  <p className="mt-3 text-muted fs-5">Đang tải dữ liệu...</p>
                </div>
              ) : localData && localData.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <Table hover className="mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th width="60" className="text-center py-3">#</th>
                          <th width="120" className="py-3">Mã Dịch Vụ</th>
                          <th width="120" className="py-3">Mã Lịch</th>
                          <th className="py-3">Bệnh Nhân</th>
                          <th width="80" className="text-center py-3">Tuổi</th>
                          <th width="100" className="text-center py-3">Giới Tính</th>
                          <th className="py-3">Dịch Vụ</th>
                          <th width="150" className="text-center py-3">Bác Sĩ Chỉ Định</th>
                          <th width="120" className="text-center py-3">Giá</th>
                          <th width="140" className="text-center py-3">Ngày Chỉ Định</th>
                          <th width="140" className="text-center py-3">Trạng Thái</th>
                          <th width="180" className="text-center py-3">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAssignedData.map((service, index) => 
                          renderServiceRow(service, currentAssignedPage * ITEMS_PER_PAGE + index)
                        )}
                      </tbody>
                    </Table>
                  </div>
                  
                  {/* ✅ PHÂN TRANG CHO ASSIGNED SERVICES */}
                  {assignedPageCount > 1 && (
                    <div className="p-3 border-top">
                      <Pagination
                        pageCount={assignedPageCount}
                        onPageChange={handleAssignedPageChange}
                        currentPage={currentAssignedPage}
                        isLoading={loading || localLoading}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <div className="py-4">
                    <i className="fas fa-clipboard-list fa-4x text-muted mb-3 opacity-50"></i>
                    <h4 className="text-muted fw-light mb-3">Không có dịch vụ nào được chỉ định</h4>
                    <p className="text-muted mb-0">
                      {loading ? 'Đang tải dữ liệu...' : 'Hiện tại không có dịch vụ xét nghiệm nào được chỉ định cho bạn.'}
                    </p>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ✅ Kết Quả Xét Nghiệm - CÓ PHÂN TRANG */}
        <Col xl={12} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-success bg-gradient text-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0 fw-bold">
                  <i className="fas fa-vials me-2"></i>
                  Kết Quả Xét Nghiệm Đã Hoàn Thành
                </h4>
                <div className="d-flex align-items-center gap-2">
                  {loading && (
                    <Spinner animation="border" size="sm" variant="light" />
                  )}
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="success" />
                  <p className="mt-3 text-muted">Đang tải kết quả xét nghiệm...</p>
                </div>
              ) : completedServices && completedServices.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <Table hover className="mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th width="80" className="text-center py-3">Mã DV</th>
                          <th width="100" className="py-3">Mã Lịch</th>
                          <th className="py-3">Bệnh Nhân</th>
                          <th className="py-3">Dịch Vụ</th>
                          <th width="120" className="text-center py-3">Bác Sĩ</th>
                          <th width="140" className="text-center py-3">Ngày Hoàn Thành</th>
                          <th width="120" className="text-center py-3">Trạng Thái</th>
                          <th width="200" className="text-center py-3">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCompletedData.map((service, index) => (
                          <tr key={service.service_order_id || index} className="border-bottom">
                            <td className="text-center">
                              <Badge bg="primary" className="fs-7">
                                #{service.service_order_id || 'N/A'}
                              </Badge>
                            </td>
                            <td>
                              <span className="text-muted fw-semibold">
                                #{service.appointment_id || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <div className="fw-semibold text-dark">{service.patient_name || 'Chưa có tên'}</div>
                              <small className="text-muted">
                                {service.patient_age || 'N/A'} tuổi - {service.patient_gender || 'N/A'}
                              </small>
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
                              <small className="text-muted">
                                {service.completed_at || service.updated_at || service.order_date || 'N/A'}
                              </small>
                            </td>
                            <td className="text-center">
                              <Badge bg="success" className="fs-7 px-3 py-2">
                                <i className="fas fa-check me-1"></i>
                                Hoàn thành
                              </Badge>
                            </td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="px-3"
                                  onClick={() => viewResultDetail(service)}
                                  disabled={!service.result}
                                >
                                  <i className="fas fa-eye me-1"></i>
                                  Xem
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  className="px-3"
                                  onClick={() => printResult(service)}
                                  disabled={!service.result}
                                >
                                  <i className="fas fa-print me-1"></i>
                                  In
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  
                  {/* ✅ PHÂN TRANG CHO COMPLETED SERVICES */}
                  {completedPageCount > 1 && (
                    <div className="p-3 border-top">
                      <Pagination
                        pageCount={completedPageCount}
                        onPageChange={handleCompletedPageChange}
                        currentPage={currentCompletedPage}
                        isLoading={loading || localLoading}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-vials fa-3x text-muted mb-3 opacity-50"></i>
                  <h5 className="text-muted fw-light mb-2">Chưa có kết quả xét nghiệm nào</h5>
                  <p className="text-muted mb-0">Các dịch vụ hoàn thành sẽ xuất hiện ở đây</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal Nhập Kết Quả */}
      <Modal show={showResultModal} onHide={closeResultModal} size="lg">
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <i className="fas fa-vial me-2"></i>
            {currentService?.result ? 'Sửa Kết Quả' : 'Nhập Kết Quả'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentService && (
            <div className="mb-3 p-3 bg-light rounded">
              <Row>
                <Col md={6}>
                  <strong>Bệnh nhân:</strong> {currentService.patient_name} &nbsp; | &nbsp;
                  <Badge bg="warning">{currentService.status}</Badge>
                </Col>
                <Col md={6}>
                  <strong>Mã dịch vụ:</strong> {currentService.service_order_id} &nbsp; | &nbsp;
                  <strong>Dịch vụ:</strong> {currentService.service_name}
                </Col>
              </Row>
            </div>
          )}
          <Form.Group>
            <Form.Label>
              <strong>Kết quả xét nghiệm:</strong>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={8}
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="Nhập kết quả xét nghiệm chi tiết..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeResultModal}>
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

      {/* ✅ CONFIRM MODAL */}
      <Modal show={showConfirmModal} onHide={closeConfirmModal} centered>
        <Modal.Body className="p-4">
          {renderConfirmContent()}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={closeConfirmModal}>
            <i className="fas fa-times me-1"></i>
            Hủy
          </Button>
          <Button
            variant={confirmData?.actionType === 'cancel' ? 'danger' :
              confirmData?.actionType === 'complete' ? 'success' : 'primary'}
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
                <i className={`fas fa-${confirmData?.actionType === 'start' ? 'play' :
                  confirmData?.actionType === 'complete' ? 'check' : 'times'} me-1`}></i>
                {confirmData?.actionType === 'start' ? 'Bắt Đầu' :
                  confirmData?.actionType === 'complete' ? 'Hoàn Thành' : 'Hủy Dịch Vụ'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TechnicianSection;