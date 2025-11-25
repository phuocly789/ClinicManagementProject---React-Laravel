// src/components/PaymentSection.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Form, Badge, Button, Container, Alert, Nav, Row, Col } from 'react-bootstrap';
import PaymentMethod from '../Payment/PaymentMethod';
import InvoiceDetailModal from './InvoiceDetailModal';
import { paymentService } from '../../services/paymentService';
import Pagination from '../../Components/Pagination/Pagination';
import Loading from '../../Components/Loading/Loading';
import { printPdfService } from '../../services/printPdfService';
import { AlertTriangle, CreditCard, RotateCcw, History, Eye, CheckCircle, XCircle, Printer } from "lucide-react";

// Constants
const INVOICE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  PROCESSING: 'processing'
};

const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.PENDING]: 'Chờ thanh toán',
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.CANCELLED]: 'Đã hủy',
  [INVOICE_STATUS.PROCESSING]: 'Đang xử lý'
};

const PAYMENT_METHODS = {
  MOMO: 'momo',
  CASH: 'cash',
  BANK_TRANSFER: 'napas',
  INSURANCE: 'insurance'
};

const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.MOMO]: 'MoMo',
  [PAYMENT_METHODS.CASH]: 'Tiền mặt',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Chuyển khoản',
  [PAYMENT_METHODS.INSURANCE]: 'Bảo hiểm'
};

const TAB_KEYS = {
  ALL: 'all',
  PENDING: 'pending',
  PAID: 'paid',
  PAYMENT_HISTORY: 'payment_history',
  CANCELLED: 'cancelled'
};

const ITEMS_PER_PAGE = 10;

// Helper functions
const normalizeStatus = (status) => {
  if (!status) return INVOICE_STATUS.PENDING;
  const statusString = String(status).toLowerCase().trim();
  const statusMap = {
    'chờ thanh toán': INVOICE_STATUS.PENDING,
    'pending': INVOICE_STATUS.PENDING,
    'đã thanh toán': INVOICE_STATUS.PAID,
    'paid': INVOICE_STATUS.PAID,
    'đã hủy': INVOICE_STATUS.CANCELLED,
    'cancelled': INVOICE_STATUS.CANCELLED,
    'đang xử lý': INVOICE_STATUS.PROCESSING,
    'processing': INVOICE_STATUS.PROCESSING
  };
  return statusMap[statusString] || INVOICE_STATUS.PENDING;
};

// Component chính
const PaymentSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(TAB_KEYS.ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [printing, setPrinting] = useState(false);

  // State cho Custom Confirm
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [pendingTab, setPendingTab] = useState(null);

  // Hàm lấy tên tab
  const getTabName = (tabKey) => {
    const tabNames = {
      [TAB_KEYS.ALL]: 'Tất cả hóa đơn',
      [TAB_KEYS.PENDING]: 'Chờ thanh toán',
      [TAB_KEYS.PAID]: 'Đã thanh toán',
      [TAB_KEYS.CANCELLED]: 'Đã hủy',
      [TAB_KEYS.PAYMENT_HISTORY]: 'Lịch sử thanh toán'
    };
    return tabNames[tabKey] || tabKey;
  };

  // QUAN TRỌNG: Hàm xác định trạng thái hiển thị - FIXED
  const getDisplayStatus = (invoice) => {
    if (!invoice) return { status: INVOICE_STATUS.PENDING, paymentMethod: null };

    const normalizedStatus = normalizeStatus(invoice.status);
    const hasOrderId = invoice.order_id && invoice.order_id !== 'null' && invoice.order_id !== '';
    const hasPaymentMethod = invoice.payment_method && invoice.payment_method !== 'null' && invoice.payment_method !== '';

    // QUAN TRỌNG: Chỉ hiển thị "Đang xử lý" nếu có OrderId VÀ status là PENDING
    // VÀ thời gian cập nhật chưa quá 30 phút (tránh hiển thị sai cho các hóa đơn cũ)
    if (hasOrderId && normalizedStatus === INVOICE_STATUS.PENDING) {
      const updatedTime = new Date(invoice.updated_at || invoice.created_at);
      const now = new Date();
      const diffMinutes = (now - updatedTime) / (1000 * 60);

      // Nếu quá 30 phút vẫn còn OrderId -> coi như bị kẹt, hiển thị "Chờ thanh toán"
      if (diffMinutes > 30) {
        return {
          status: INVOICE_STATUS.PENDING,
          paymentMethod: null,
          isStuck: true
        };
      }

      return {
        status: INVOICE_STATUS.PROCESSING,
        paymentMethod: invoice.payment_method
      };
    }

    // Nếu không có OrderId và status là PENDING -> chờ thanh toán
    if (!hasOrderId && normalizedStatus === INVOICE_STATUS.PENDING) {
      return {
        status: INVOICE_STATUS.PENDING,
        paymentMethod: null
      };
    }

    // Các trường hợp khác
    return {
      status: normalizedStatus,
      paymentMethod: hasPaymentMethod ? invoice.payment_method : null
    };
  };

  // Hàm lấy badge trạng thái
  const getStatusBadge = (invoice) => {
    const displayStatus = getDisplayStatus(invoice);

    switch (displayStatus.status) {
      case INVOICE_STATUS.PENDING:
        return <Badge bg="warning"> Chờ thanh toán</Badge>;
      case INVOICE_STATUS.PAID:
        return <Badge bg="success"> Đã thanh toán</Badge>;
      case INVOICE_STATUS.CANCELLED:
        return <Badge bg="danger">Đã hủy</Badge>;
      case INVOICE_STATUS.PROCESSING:
        return <Badge bg="info"> Đang xử lý</Badge>;
      default:
        return <Badge bg="secondary">{invoice.status}</Badge>;
    }
  };

  // Hàm lấy badge phương thức thanh toán
  const getPaymentMethodBadge = (invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    const paymentMethod = displayStatus.paymentMethod;

    if (displayStatus.status === INVOICE_STATUS.PROCESSING) {
      return <Badge bg="info">🔄 Đang xử lý</Badge>;
    }

    if (!paymentMethod) {
      return <Badge bg="secondary">Chưa thanh toán</Badge>;
    }

    switch (paymentMethod) {
      case PAYMENT_METHODS.MOMO:
        return <Badge bg="primary"><i class="fas fa-mobile-alt text-danger"></i> MoMo</Badge>;
      case PAYMENT_METHODS.CASH:
        return <Badge bg="success"> <i class="fas fa-money-bill text-warning"></i> Tiền mặt</Badge>;
      case PAYMENT_METHODS.BANK_TRANSFER:
        return <Badge bg="info"><i class="fas fa-credit-card text-primary"></i> Thẻ napas</Badge>;
      case PAYMENT_METHODS.INSURANCE:
        return <Badge bg="warning"> Bảo hiểm</Badge>;
      default:
        return <Badge bg="light" text="dark">{paymentMethod}</Badge>;
    }
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm.trim() || undefined
      };

      if (statusFilter) {
        filters.status = statusFilter;
      } else {
        const tabToStatusMap = {
          [TAB_KEYS.PENDING]: INVOICE_STATUS.PENDING,
          [TAB_KEYS.PAID]: INVOICE_STATUS.PAID,
          [TAB_KEYS.CANCELLED]: INVOICE_STATUS.CANCELLED,
        };
        if (tabToStatusMap[activeTab]) {
          filters.status = tabToStatusMap[activeTab];
        }
      }

      const response = activeTab === TAB_KEYS.PAYMENT_HISTORY
        ? await paymentService.getPaymentHistory(filters)
        : await paymentService.getInvoices(filters);

      if (response?.data) {
        let invoicesData = [];
        let paginationData = {};

        if (response.data.success) {
          invoicesData = response.data.data?.invoices || response.data.data || [];
          paginationData = response.data.data?.pagination || {};
        } else if (Array.isArray(response.data)) {
          invoicesData = response.data;
        } else if (response.data.invoices) {
          invoicesData = response.data.invoices;
          paginationData = response.data.pagination || {};
        } else {
          invoicesData = response.data;
        }

        setInvoices(invoicesData);
        setTotalItems(paginationData.total || invoicesData.length || 0);

        if (invoicesData.length === 0 && !response.data.message) {
          setError('Không có dữ liệu hóa đơn');
        }
      } else {
        setError('Dữ liệu trả về không hợp lệ');
        setInvoices([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error('Fetch invoices error:', err);
      setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu');
      setInvoices([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // Reset hóa đơn bị kẹt
  const handleResetStuckInvoices = async () => {
    try {
      setResetting(true);
      const response = await paymentService.resetStuckInvoices();

      if (response.data.success) {
        setSuccess(`✅ ${response.data.message}`);
        // Refresh danh sách
        fetchInvoices();
      } else {
        setError('❌ Reset thất bại: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Reset stuck invoices error:', error);
      setError('❌ Lỗi khi reset hóa đơn: ' + (error.response?.data?.message || error.message));
    } finally {
      setResetting(false);
    }
  };

  // Reset manual một hóa đơn cụ thể
  const handleResetSingleInvoice = async (invoice) => {
    try {
      setResetting(true);
      const response = await paymentService.resetPayment(invoice.id);

      if (response.data.success) {
        setSuccess(`✅ Đã reset hóa đơn ${invoice.code}`);
        // Refresh danh sách
        fetchInvoices();
      } else {
        setError('❌ Reset thất bại');
      }
    } catch (error) {
      console.error('Reset single invoice error:', error);
      setError('❌ Lỗi khi reset hóa đơn');
    } finally {
      setResetting(false);
    }
  };

  // Hàm in hóa đơn cho từng bệnh nhân đã thanh toán - GIỐNG InvoiceDetailModal
  // ✅ Hàm in hóa đơn - THÊM ĐẦY ĐỦ PDF SETTINGS
  const handlePrintInvoice = async (invoice) => {
    try {
      setPrinting(true);
      setError('');
      setSuccess('');

      console.log('🖨️ Calling Laravel PDF API...', invoice);

      if (!invoice) {
        throw new Error('Không có dữ liệu hóa đơn');
      }

      // ✅ Lấy dữ liệu services và prescriptions ĐÚNG CẤU TRÚC
      const { services, prescriptions } = getServicesAndMedicinesFromInvoice(invoice);

      console.log('📋 Processed data for PDF:', {
        services,
        prescriptions,
        hasServices: services.length > 0,
        hasPrescriptions: prescriptions.length > 0
      });

      // ✅ THÊM ĐẦY ĐỦ PDF SETTINGS THEO VALIDATION CỦA BE
      const printData = {
        type: 'payment',
        patient_name: invoice.patient_name || 'THÔNG TIN BỆNH NHÂN',
        age: String(invoice.patient_age || 'N/A'),
        gender: invoice.patient_gender || 'N/A',
        phone: invoice.patient_phone || 'N/A',
        appointment_date: invoice.date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: 'Hoàn tất',
        doctor_name: 'Hệ thống',
        paid_at: invoice.paid_at || new Date().toLocaleString('vi-VN'),

        // ✅ QUAN TRỌNG: Gửi đúng cấu trúc prescriptions và services
        prescriptions: prescriptions,
        services: services,

        // Payment data
        payment_method: invoice.payment_method || 'cash',
        payment_status: 'Đã thanh toán',
        discount: 0,
        invoice_code: invoice.code || `INV_${invoice.id}`,
        total_amount: invoice.total || 0,

        // ✅ QUAN TRỌNG: THÊM ĐẦY ĐỦ PDF SETTINGS THEO VALIDATION
        pdf_settings: {
          // 🔥 CÁC TRƯỜNG BẮT BUỘC THEO VALIDATION
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
          doctorName: 'Hệ thống',
          customTitle: 'HÓA ĐƠN THANH TOÁN',

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
        }
      };

      console.log('📤 Sending to Laravel PDF API:', {
        ...printData,
        pdf_settings: '...' // Ẩn pdf_settings trong log để dễ đọc
      });

      // Gọi API
      const result = await printPdfService.printPDF(printData);
      console.log('✅ PDF Service Result:', result);
      setSuccess(`✅ Đã tải xuống PDF hóa đơn ${invoice.code} thành công! File: ${result.fileName}`)
       console.log('✅ PDF downloaded successfully via service');

    } catch (error) {
      console.error('❌ Print invoice error:', error);
      setError('❌ Lỗi khi in hóa đơn: ' + error.message);
    } finally {
      setPrinting(false);
    }

  };

  // ✅ Hàm lấy services và prescriptions từ invoice - SỬA ĐÚNG CẤU TRÚC
  const getServicesAndMedicinesFromInvoice = (invoice) => {
    const services = [];
    const prescriptions = []; // ĐỔI TÊN: medicines -> prescriptions

    console.log('🔍 Raw invoice details:', invoice.invoice_details);

    // Phân loại services và prescriptions từ invoice_details
    if (invoice.invoice_details && invoice.invoice_details.length > 0) {
      invoice.invoice_details.forEach((detail, index) => {
        const unitPrice = detail.UnitPrice || detail.unit_price || 0;
        const quantity = detail.Quantity || detail.quantity || 1;

        console.log(`📋 Processing detail ${index}:`, {
          hasService: !!detail.service,
          hasMedicine: !!detail.medicine,
          serviceId: detail.ServiceId,
          medicineId: detail.MedicineId
        });

        // ✅ SERVICE: Có ServiceId HOẶC có service object
        if (detail.ServiceId || detail.service) {
          const serviceName = detail.service?.ServiceName || 'Dịch vụ khám';

          services.push({
            ServiceName: serviceName,
            Price: unitPrice,
            Quantity: quantity,
            // KHÔNG gửi Amount, BE sẽ tự tính
          });

          console.log(`🩺 Added service: ${serviceName}`);

        }
        // ✅ PRESCRIPTION: Có MedicineId HOẶC có medicine object
        else if (detail.MedicineId || detail.medicine) {
          const medicineName = detail.medicine?.MedicineName || 'Thuốc';

          // ✅ SỬA: Tạo prescription object ĐÚNG CẤU TRÚC BE CẦN
          prescriptions.push({
            MedicineName: medicineName,
            Price: unitPrice,
            Quantity: quantity,
            Usage: 'Theo chỉ định'
            // KHÔNG gửi Amount, BE sẽ tự tính
          });

          console.log(`💊 Added prescription: ${medicineName}`);
        }
      });
    }

    // ✅ Nếu không có dịch vụ chi tiết, tạo một dịch vụ tổng
    if (services.length === 0 && invoice.total) {
      services.push({
        ServiceName: "Phí khám và điều trị",
        Price: invoice.total,
        Quantity: 1,
      });
    }

    console.log('🛠️ Final processed data for PDF:', {
      services,
      prescriptions, // ĐỔI TÊN: medicines -> prescriptions
      servicesCount: services.length,
      prescriptionsCount: prescriptions.length
    });

    return { services, prescriptions }; // ĐỔI TÊN: medicines -> prescriptions
  };

  // ✅ Hàm chuyển đổi payment method - GIỐNG InvoiceDetailModal
  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'momo': return 'MoMo';
      case 'cash': return 'Tiền mặt';
      case 'bank_transfer': return 'Chuyển khoản';
      case 'insurance': return 'Bảo hiểm';
      case 'napas': return 'Thẻ ATM';
      default: return method || 'Tiền mặt';
    }
  };

  // Effects
  useEffect(() => {
    fetchInvoices();
  }, [currentPage, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchInvoices();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Auto refresh mỗi 30 giây cho các hóa đơn đang xử lý
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        const hasProcessingInvoices = invoices.some(inv =>
          getDisplayStatus(inv).status === INVOICE_STATUS.PROCESSING
        );
        if (hasProcessingInvoices) {
          fetchInvoices();
        }
      }, 30000); // 30 giây

      return () => clearInterval(interval);
    }
  }, [autoRefresh, invoices]);

  // Handlers
  const handleViewDetail = async (invoice) => {
    try {
      const result = await paymentService.getInvoiceDetail(invoice.id);
      if (result?.data && (result.data.success || result.data.id)) {
        setSelectedInvoiceDetail(result.data);
        setShowDetailModal(true);
      } else {
        setError('Không thể tải chi tiết hóa đơn');
      }
    } catch (err) {
      console.error('View detail error:', err);
      setError('Không thể tải chi tiết hóa đơn');
    }
  };

  const handleInitiatePayment = (invoice) => {
    const displayStatus = getDisplayStatus(invoice);

    // KHÔNG cho phép thanh toán nếu đang xử lý (trừ khi bị kẹt)
    if (displayStatus.status === INVOICE_STATUS.PROCESSING && !displayStatus.isStuck) {
      setError('Hóa đơn đang trong quá trình thanh toán. Vui lòng chờ hoặc reset nếu bị kẹt.');
      return;
    }

    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    // Refresh data sau khi đóng modal
    setTimeout(() => {
      fetchInvoices();
    }, 1000);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedInvoiceDetail(null);
  };

  const handleRetry = () => {
    fetchInvoices();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Cập nhật handleTabChange để confirm cho tất cả tab chuyển đổi
  const handleTabChange = (tabKey) => {
    // Hiển thị confirm cho tất cả các lần chuyển tab
    if (activeTab !== tabKey) {
      setPendingTab(tabKey);
      setConfirmAction('switch_tab');
      setConfirmData(getTabName(tabKey));
      setShowConfirm(true);
    }
  };

  // Confirm action handlers
  const showConfirmDialog = (action, data = null) => {
    setConfirmAction(action);
    setConfirmData(data);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);

    switch (confirmAction) {
      case 'reset_single':
        await handleResetSingleInvoice(confirmData);
        break;
      case 'reset_all':
        await handleResetStuckInvoices();
        break;
      case 'payment':
        handleInitiatePayment(confirmData);
        break;
      case 'view_detail':
        await handleViewDetail(confirmData);
        break;
      case 'switch_tab':
        // Thực hiện chuyển tab sau khi confirm
        setActiveTab(pendingTab);
        setStatusFilter('');
        setCurrentPage(1);
        setPendingTab(null);
        break;
      case 'print_invoice':
        await handlePrintInvoice(confirmData); // ✅ GỌI HÀM IN MỚI
        break;
      default:
        break;
    }

    setConfirmAction(null);
    setConfirmData(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setConfirmAction(null);
    setConfirmData(null);
    setPendingTab(null);
  };

  // Kiểm tra có thể thanh toán - FIXED
  const canPay = (invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    const hasNoOrderId = !invoice.order_id || invoice.order_id === 'null' || invoice.order_id === '';

    // Có thể thanh toán nếu:
    // 1. Trạng thái là PENDING (bao gồm cả bị kẹt)
    // 2. Không có OrderId HOẶC bị kẹt (có OrderId nhưng quá 30 phút)
    // 3. Không phải tab CANCELLED hoặc PAYMENT_HISTORY
    return (displayStatus.status === INVOICE_STATUS.PENDING || displayStatus.isStuck) &&
      (hasNoOrderId || displayStatus.isStuck) &&
      activeTab !== TAB_KEYS.CANCELLED &&
      activeTab !== TAB_KEYS.PAYMENT_HISTORY;
  };

  // Kiểm tra có thể in - CHỈ cho in khi đã thanh toán
  const canPrint = (invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    return displayStatus.status === INVOICE_STATUS.PAID;
  };

  // Kiểm tra có bị kẹt không
  const isStuckInvoice = (invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    return displayStatus.isStuck;
  };

  // Memoized values
  const invoiceCounts = useMemo(() => {
    const stuckCount = invoices.filter(inv => isStuckInvoice(inv)).length;
    const processingCount = invoices.filter(inv =>
      getDisplayStatus(inv).status === INVOICE_STATUS.PROCESSING && !isStuckInvoice(inv)
    ).length;

    return {
      [INVOICE_STATUS.PENDING]: invoices.filter(inv => getDisplayStatus(inv).status === INVOICE_STATUS.PENDING).length,
      [INVOICE_STATUS.PAID]: invoices.filter(inv => getDisplayStatus(inv).status === INVOICE_STATUS.PAID).length,
      [INVOICE_STATUS.CANCELLED]: invoices.filter(inv => getDisplayStatus(inv).status === INVOICE_STATUS.CANCELLED).length,
      [INVOICE_STATUS.PROCESSING]: processingCount,
      stuck: stuckCount,
      payment_history: invoices.length,
      total: totalItems
    };
  }, [invoices, totalItems]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const getPaginationInfo = () => {
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    return `Hiển thị ${startItem}-${endItem} của ${totalItems} hóa đơn`;
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Config cho confirm dialog
  const getConfirmConfig = () => {
    const configs = {
      payment: {
        icon: <CreditCard size={40} />,
        title: "Xác Nhận Thanh Toán",
        message: `Bạn có chắc muốn thanh toán hóa đơn ${confirmData?.code}?`,
        description: `Số tiền: ${confirmData?.total?.toLocaleString('vi-VN')} VNĐ\nBệnh nhân: ${confirmData?.patient_name}`,
        confirmText: "Tiếp Tục Thanh Toán",
        variant: "primary"
      },
      view_detail: {
        icon: <Eye size={40} />,
        title: "Xem Chi Tiết Hóa Đơn",
        message: `Bạn có chắc muốn xem chi tiết hóa đơn ${confirmData?.code}?`,
        description: `Bệnh nhân: ${confirmData?.patient_name}`,
        confirmText: "Xem Chi Tiết",
        variant: "info"
      },
      switch_tab: {
        icon: <History size={40} />,
        title: "Chuyển Tab",
        message: `Bạn có chắc muốn chuyển từ tab "${getTabName(activeTab)}" sang "${confirmData}"?`,
        description: "Dữ liệu chưa lưu có thể bị mất nếu bạn chuyển tab.",
        confirmText: "Chuyển Tab",
        variant: "warning"
      },
      reset_single: {
        icon: <RotateCcw size={40} />,
        title: "Reset Hóa Đơn",
        message: `Bạn có chắc muốn reset hóa đơn ${confirmData?.code}?`,
        description: "Hóa đơn sẽ được đặt lại trạng thái 'Chờ thanh toán' và bạn có thể thực hiện thanh toán lại.",
        confirmText: "Reset Hóa Đơn",
        variant: "warning"
      },
      reset_all: {
        icon: <AlertTriangle size={40} />,
        title: "Reset Tất Cả Hóa Đơn Bị Kẹt",
        message: `Bạn có chắc muốn reset ${invoiceCounts.stuck} hóa đơn bị kẹt?`,
        description: "Tất cả hóa đơn bị kẹt sẽ được đặt lại trạng thái 'Chờ thanh toán'.",
        confirmText: `Reset ${invoiceCounts.stuck} Hóa Đơn`,
        variant: "danger"
      },
      print_invoice: {
        icon: <Printer size={40} />,
        title: "In Hóa Đơn",
        message: `Bạn có chắc muốn in hóa đơn ${confirmData?.code}?`,
        description: `Bệnh nhân: ${confirmData?.patient_name}\nSố tiền: ${confirmData?.total?.toLocaleString('vi-VN')} VNĐ`,
        confirmText: "In PDF",
        variant: "primary"
      }
    };

    return configs[confirmAction] || {
      icon: <AlertTriangle size={40} />,
      title: "Xác Nhận",
      message: "Bạn có chắc muốn thực hiện hành động này?",
      description: "",
      confirmText: "Xác Nhận",
      variant: "primary"
    };
  };

  const confirmConfig = getConfirmConfig();
  const variantStyles = {
    primary: "bg-primary-subtle text-primary-emphasis border border-primary",
    warning: "bg-warning-subtle text-warning-emphasis border border-warning",
    info: "bg-info-subtle text-info-emphasis border border-info",
    danger: "bg-danger-subtle text-danger-emphasis border border-danger"
  };

  return (
    <Container fluid className="py-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center">
            <i className="fas fa-credit-card fa-lg me-3"></i>
            <div>
              <h5 className="mb-0 fw-bold">QUẢN LÝ THANH TOÁN</h5>
              <small className="opacity-75">Quản lý và theo dõi tất cả giao dịch thanh toán</small>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="warning"
              size="sm"
              onClick={() => showConfirmDialog('reset_all')}
              disabled={resetting || invoiceCounts.stuck === 0}
            >
              <i className={`fas fa-redo-alt me-1 ${resetting ? 'fa-spin' : ''}`}></i>
              {resetting ? 'Đang reset...' : 'Reset HĐ kẹt'}
            </Button>
            <Button variant="light" size="sm" onClick={handleRetry} disabled={loading}>
              <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {/* Success Alert */}
          {success && (
            <Alert variant="success" className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-check-circle me-2"></i>
                <span>{success}</span>
              </div>
              <Button variant="outline-success" size="sm" onClick={() => setSuccess('')}>
                <i className="fas fa-times me-1"></i>
                Đóng
              </Button>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <span>{error}</span>
              </div>
              <Button variant="outline-danger" size="sm" onClick={() => setError('')}>
                <i className="fas fa-times me-1"></i>
                Đóng
              </Button>
            </Alert>
          )}

          {/* TAB BAR */}
          <Nav variant="tabs" className="mb-4 border-bottom-0" activeKey={activeTab} onSelect={handleTabChange}>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.ALL} className="fw-semibold">
                <i className="fas fa-list me-2"></i>
                Tất cả hóa đơn
                <Badge bg="secondary" className="ms-2">{invoiceCounts.total}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.PENDING} className="fw-semibold">
                <i className="fas fa-clock me-2"></i>
                Chờ thanh toán
                <Badge bg="warning" className="ms-2">{invoiceCounts[INVOICE_STATUS.PENDING]}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.PAID} className="fw-semibold">
                <i className="fas fa-check-circle me-2"></i>
                Đã thanh toán
                <Badge bg="success" className="ms-2">{invoiceCounts[INVOICE_STATUS.PAID]}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={TAB_KEYS.PAYMENT_HISTORY} className="fw-semibold">
                <i className="fas fa-history me-2"></i>
                Lịch sử thanh toán
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Filter bar */}
          <Row className="mb-4 g-3">
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="  Tìm kiếm theo mã HD, tên bệnh nhân, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value={INVOICE_STATUS.PENDING}> Chờ thanh toán</option>
                <option value={INVOICE_STATUS.PAID}> Đã thanh toán</option>
                <option value={INVOICE_STATUS.PROCESSING}> Đang xử lý</option>
                <option value={INVOICE_STATUS.CANCELLED}> Đã hủy</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button
                variant="primary"
                onClick={() => setCurrentPage(1)}
                disabled={loading}
                className="w-100"
              >
                <i className="fas fa-search me-1"></i>
                Tìm kiếm
              </Button>
            </Col>
          </Row>

          {/* Auto refresh toggle */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center">
              <Form.Check
                type="switch"
                id="auto-refresh-switch"
                label="Tự động làm mới"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="me-3"
              />
              <small className="text-muted fw-semibold">
                {getPaginationInfo()}
              </small>
            </div>
            <div className="d-flex gap-2">
              {invoiceCounts.stuck > 0 && (
                <small className="text-danger">
                  <i className="fas fa-exclamation-triangle me-1"></i>
                  Bị kẹt: <Badge bg="danger">{invoiceCounts.stuck}</Badge>
                </small>
              )}
              {invoiceCounts[INVOICE_STATUS.PROCESSING] > 0 && (
                <small className="text-info">
                  Đang xử lý: <Badge bg="info">{invoiceCounts[INVOICE_STATUS.PROCESSING]}</Badge>
                </small>
              )}
            </div>
          </div>

          {/* Loading và Data */}
          {loading ? (
            <Loading isLoading={true} text="Đang tải dữ liệu hóa đơn..." />
          ) : (
            <>
              {invoices.length > 0 ? (
                <>
                  <div className="table-responsive border rounded">
                    <Table hover className="mb-0">
                      <thead className="table-primary">
                        <tr>
                          <th width="12%" className="py-3 border-end">MÃ HÓA ĐƠN</th>
                          <th width="18%" className="py-3 border-end">BỆNH NHÂN</th>
                          <th width="12%" className="py-3 border-end">NGÀY LẬP</th>
                          <th width="13%" className="py-3 border-end">TỔNG TIỀN</th>
                          <th width="13%" className="py-3 border-end">TRẠNG THÁI</th>
                          <th width="12%" className="py-3 border-end">HÌNH THỨC</th>
                          <th width="20%" className="py-3 text-center">THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => {
                          const displayStatus = getDisplayStatus(invoice);
                          const isStuck = isStuckInvoice(invoice);

                          return (
                            <tr key={invoice.id} className={`border-bottom ${isStuck ? 'table-warning' : ''}`}>
                              <td className="border-end">
                                <strong className="text-primary">{invoice.code}</strong>
                                {isStuck && (
                                  <i className="fas fa-exclamation-triangle text-danger ms-1" title="Hóa đơn bị kẹt"></i>
                                )}
                              </td>
                              <td className="border-end">
                                <div className="fw-semibold">{invoice.patient_name}</div>
                                <small className="text-muted">{invoice.patient_phone}</small>
                              </td>
                              <td className="border-end">{invoice.date}</td>
                              <td className="border-end fw-bold text-success">
                                {invoice.total?.toLocaleString('vi-VN')} VNĐ
                              </td>
                              <td className="border-end">
                                {getStatusBadge(invoice)}
                                {isStuck && (
                                  <div className="mt-1">
                                    <Badge bg="danger" className="small">Bị kẹt</Badge>
                                  </div>
                                )}
                              </td>
                              <td className="border-end">
                                {getPaymentMethodBadge(invoice)}
                              </td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm" role="group">
                                  <Button
                                    variant="outline-primary"
                                    onClick={() => showConfirmDialog('view_detail', invoice)}
                                    size="sm"
                                    className="me-1"
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    Chi tiết
                                  </Button>

                                  {/* Nút in - CHỈ hiện khi đã thanh toán */}
                                  {canPrint(invoice) && (
                                    <Button
                                      variant="outline-info"
                                      onClick={() => showConfirmDialog('print_invoice', invoice)}
                                      size="sm"
                                      className="me-1"
                                      disabled={printing}
                                    >
                                      <i className={`fas fa-print me-1 ${printing ? 'fa-spin' : ''}`}></i>
                                      {printing ? 'Đang in...' : 'In PDF'}
                                    </Button>
                                  )}

                                  {canPay(invoice) && (
                                    <Button
                                      variant="success"
                                      onClick={() => showConfirmDialog('payment', invoice)}
                                      size="sm"
                                      className="me-1"
                                    >
                                      <i className="fas fa-credit-card me-1"></i>
                                      Thanh toán
                                    </Button>
                                  )}
                                  {displayStatus.status === INVOICE_STATUS.PROCESSING && !isStuck && (
                                    <Button
                                      variant="outline-info"
                                      size="sm"
                                      disabled
                                      className="me-1"
                                    >
                                      <i className="fas fa-spinner fa-spin me-1"></i>
                                      Đang xử lý
                                    </Button>
                                  )}
                                  {(displayStatus.status === INVOICE_STATUS.PROCESSING || isStuck) && (
                                    <Button
                                      variant="outline-warning"
                                      size="sm"
                                      onClick={() => showConfirmDialog('reset_single', invoice)}
                                      disabled={resetting}
                                      title="Reset hóa đơn này"
                                    >
                                      <i className={`fas fa-redo-alt me-1 ${resetting ? 'fa-spin' : ''}`}></i>
                                      Reset
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                      <Pagination
                        pageCount={totalPages}
                        onPageChange={(selected) => handlePageChange(selected.selected + 1)}
                        currentPage={currentPage - 1}
                        isLoading={loading}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-receipt fa-4x text-muted mb-3"></i>
                  <h5 className="text-muted mb-2">Không có hóa đơn nào</h5>
                  <p className="text-muted mb-3">Hãy tạo hóa đơn mới hoặc kiểm tra lại bộ lọc</p>
                  <Button variant="primary" onClick={handleRetry}>
                    <i className="fas fa-sync-alt me-1"></i>
                    Tải lại
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modals */}
      <PaymentMethod
        show={showPaymentModal}
        onHide={handleClosePaymentModal}
        invoice={selectedInvoice}
        onPaymentSuccess={handleClosePaymentModal}
      />

      <InvoiceDetailModal
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        invoice={selectedInvoiceDetail}
      />

      {/* Custom Confirm Dialog */}
      {showConfirm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={handleCancelConfirm}
        >
          <div
            className={`mx-auto px-4 py-4 rounded-3 shadow-lg ${variantStyles[confirmConfig.variant]}`}
            style={{ maxWidth: "32rem", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCancelConfirm}
              className="position-absolute top-0 end-0 btn btn-link text-secondary p-2"
              style={{ textDecoration: "none" }}
              disabled={resetting || printing}
            >
              <XCircle size={20} />
            </button>

            {/* Icon & Title */}
            <div className="text-center mb-3">
              <div className={`text-${confirmConfig.variant} mb-3`}>
                {confirmConfig.icon}
              </div>
              <h4 className="fw-bold mb-2">{confirmConfig.title}</h4>
            </div>

            {/* Message */}
            <div className="text-center mb-3">
              <p className="fw-medium mb-2">{confirmConfig.message}</p>
              {confirmConfig.description && (
                <div className="text-muted small">
                  {confirmConfig.description.split('\n').map((line, index) => (
                    <p key={index} className="mb-1">{line}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-2 justify-content-center mt-4">
              <Button
                variant="secondary"
                onClick={handleCancelConfirm}
                disabled={resetting || printing}
              >
                <i className="fas fa-times me-1"></i>
                Hủy
              </Button>
              <Button
                variant={confirmConfig.variant}
                onClick={handleConfirm}
                disabled={resetting || printing}
              >
                <i className={`fas fa-check me-1 ${resetting || printing ? 'fa-spin' : ''}`}></i>
                {resetting ? 'Đang xử lý...' : printing ? 'Đang in...' : confirmConfig.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default PaymentSection;