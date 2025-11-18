// src/components/InvoiceDetailModal.jsx
import React, { useState } from 'react';
import { Modal, Button, Row, Col, Badge, Table, Card, Spinner, Alert } from 'react-bootstrap';
import { Printer, Download, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InvoiceDetailModal = ({ show, onHide, invoice }) => {
  console.log('🔍 InvoiceDetailModal received:', invoice);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const [printSuccess, setPrintSuccess] = useState('');
  const navigate = useNavigate();

  // FIXED: Xử lý nhiều cấu trúc data khác nhau
  let invoiceData = null;

  if (invoice) {
    if (invoice.success !== undefined) {
      invoiceData = invoice.data || invoice;
    } else if (invoice.id) {
      invoiceData = invoice;
    } else {
      invoiceData = invoice.data || invoice;
    }
  }

  console.log('📄 Processed invoice data:', invoiceData);

  // Hàm in hóa đơn - ĐÃ SỬA ĐÚNG CẤU TRÚC CHO BE
  const handlePrintInvoice = async () => {
    try {
      setPrinting(true);
      setPrintError('');
      setPrintSuccess('');

      console.log('🖨️ Calling Laravel PDF API...', invoiceData);

      if (!invoiceData) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      const { services, prescriptions } = getServicesAndMedicinesFromInvoice(invoice);

      // ✅ SỬA: Gửi đúng cấu trúc data mà BE expect
      const printData = {
        type: 'payment', // ✅ ĐÚNG - dùng 'payment' cho hóa đơn thanh toán
        patient_name: invoiceData.patient_name || 'THÔNG TIN BỆNH NHÂN',
        age: String(invoiceData.patient_age || 'N/A'), // ✅ ĐÚNG - string
        gender: invoiceData.patient_gender || 'N/A', // ✅ ĐÚNG
        phone: invoiceData.patient_phone || 'N/A',
        appointment_date: invoiceData.date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: 'Hoàn tất',
        doctor_name: 'Hệ thống',  

        // ✅ QUAN TRỌNG: Đúng cấu trúc services (KHÔNG CÓ prescriptions)
        services: services,
        prescriptions: prescriptions,

        // ✅ QUAN TRỌNG: Đúng cấu trúc payment data
        payment_method: invoiceData.payment_method,
        payment_status: 'Đã thanh toán',
        discount: 0,
        invoice_code: invoiceData.code || `INV_${invoiceData.id}`,

        // ✅ THÊM các trường mới cho payment
        total_amount: invoiceData.total || 0,
        transaction_id: invoiceData.transaction_id,
        order_id: invoiceData.order_id,

        // ✅ THÊM diagnoses nếu có
        diagnoses: ['Khám và điều trị'],

        // ✅ PDF SETTINGS - đúng cấu trúc
        pdf_settings: {
          customTitle: 'HÓA ĐƠN THANH TOÁN',
          clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
          clinicAddress: 'Số 123 Đường ABC, Quận 1, TP.HCM',
          clinicPhone: '028 1234 5678',
          fontFamily: 'Arial',
          doctorName: 'Hệ thống'
        }
      };

      console.log('📤 Sending to Laravel PDF API:', printData);

      // ✅ GỌI ĐÚNG ENDPOINT
      const response = await fetch('http://localhost:8000/api/print/prescription/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(printData),
      });

      console.log('📥 API Response status:', response.status);

      if (response.ok) {
        const blob = await response.blob();
        console.log('📄 Received PDF blob:', blob);

        // Tạo URL và tải file PDF
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HOA_DON_${invoiceData.code || invoiceData.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setPrintSuccess('✅ Đã tải xuống PDF hóa đơn thành công!');
        console.log('✅ PDF downloaded successfully');

      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);

        // Parse lỗi chi tiết
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || errorData.errors?.type?.[0] || 'Lỗi không xác định');
        } catch {
          throw new Error(errorText || `Lỗi server: ${response.status}`);
        }
      }

    } catch (error) {
      console.error('❌ Print invoice error:', error);
      setPrintError('Lỗi khi in hóa đơn: ' + error.message);
    } finally {
      setPrinting(false);
    }
  };

  // FUNCTION PREVIEW PDF - GIỐNG SERVICES SECTION
  const handlePreview = async () => {
    if (!invoiceData) {
      setPrintError('Không có dữ liệu hóa đơn');
      return;
    }
    const { services, prescriptions } = getServicesAndMedicinesFromInvoice(invoice);

    const previewData = {
      type: 'payment',
      patient_name: invoiceData.patient_name || 'THÔNG TIN BỆNH NHÂN',
      age: String(invoiceData.patient_age || 'N/A'),
      gender: invoiceData.patient_gender || 'N/A',
      phone: invoiceData.patient_phone || 'N/A',
      appointment_date: invoiceData.date || new Date().toLocaleDateString('vi-VN'),
      appointment_time: 'Hoàn tất',
      doctor_name: 'Hệ thống',
      services: services,
      prescriptions: prescriptions,
      payment_method: invoiceData.payment_method,
      payment_status: 'Đã thanh toán',
      discount: 0,
      invoice_code: invoiceData.code || `INV_${invoiceData.id}`,
      total_amount: invoiceData.total || 0,
      transaction_id: invoiceData.transaction_id,
      order_id: invoiceData.order_id,
      diagnoses: ['Khám và điều trị'],
      // THÊM CÁC TRƯỜNG CẦN THIẾT CHO VIỆC CHỈNH SỬA
      appointment_id: invoiceData.appointment_id,
      patient_id: invoiceData.patient_id,
      originalData: {
        invoiceData: { ...invoiceData },
        services: services,
        prescriptions: prescriptions
      },
      timestamp: Date.now(),
      // PDF SETTINGS
      pdf_settings: {
        customTitle: 'HÓA ĐƠN THANH TOÁN',
        clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
        clinicAddress: 'Số 123 Đường ABC, Quận 1, TP.HCM',
        clinicPhone: '028 1234 5678',
        fontFamily: 'Arial',
        doctorName: 'Hệ thống'
      }
    };

    console.log('📤 Data preview hóa đơn gửi đến editor:', previewData);

    try {
      // XÓA DỮ LIỆU CŨ TRƯỚC KHI LƯU MỚI
      sessionStorage.removeItem('pdfEditorData');
      sessionStorage.removeItem('shouldRefreshOnReturn');
      sessionStorage.removeItem('editorSource');

      // Lưu data MỚI NHẤT vào sessionStorage
      sessionStorage.setItem('pdfEditorData', JSON.stringify(previewData));
      sessionStorage.setItem('shouldRefreshOnReturn', 'true');
      sessionStorage.setItem('editorSource', 'invoice');

      // CHUYỂN HƯỚNG TRONG CÙNG TAB
      navigate('/payment/payment-pdf-editor', {
        state: {
          pdfData: previewData,
          source: 'invoice',
          timestamp: Date.now()
        }
      });

      setPrintSuccess('✅ Đang chuyển đến trình chỉnh sửa PDF...');

    } catch (error) {
      console.error('Error navigating to PDF editor:', error);
      setPrintError('❌ Lỗi khi chuyển đến trình chỉnh sửa PDF');
    }
  };

  // Hàm xem trước PDF (HTML Preview) - MỞ TRONG TAB MỚI
  const handlePreviewPDF = async () => {
    try {
      setPrinting(true);
      setPrintError('');

      if (!invoiceData) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      const { services, prescriptions } = getServicesAndMedicinesFromInvoice(invoice);

      const previewData = {
        type: 'payment',
        patient_name: invoiceData.patient_name || 'THÔNG TIN BỆNH NHÂN',
        age: String(invoiceData.patient_age || 'N/A'),
        gender: invoiceData.patient_gender || 'N/A',
        phone: invoiceData.patient_phone || 'N/A',
        appointment_date: invoiceData.date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: 'Hoàn tất',
        doctor_name: 'Hệ thống',
        services: services,
        prescriptions: prescriptions,
        payment_method: invoiceData.payment_method,
        payment_status: 'Đã thanh toán',
        discount: 0,
        invoice_code: invoiceData.code || `INV_${invoiceData.id}`,
        total_amount: invoiceData.total || 0,
        transaction_id: invoiceData.transaction_id,
        order_id: invoiceData.order_id,
        diagnoses: ['Khám và điều trị'],
        pdf_settings: {
          customTitle: 'HÓA ĐƠN THANH TOÁN',
          clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
          clinicAddress: 'Số 123 Đường ABC, Quận 1, TP.HCM',
          clinicPhone: '028 1234 5678',
          fontFamily: 'Arial',
          doctorName: 'Hệ thống'
        }
      };

      console.log('👁️ Sending preview data:', previewData);

      // Gọi API preview HTML
      const response = await fetch('http://localhost:8000/api/print/preview-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(previewData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Mở preview trong tab mới
          const newWindow = window.open('', '_blank');
          newWindow.document.write(result.html);
          newWindow.document.close();

          setPrintSuccess('✅ Đã mở xem trước PDF trong tab mới!');
        } else {
          throw new Error(result.message || 'Lỗi xem trước');
        }
      } else {
        const errorText = await response.text();
        throw new Error(errorText || `Lỗi server: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Preview PDF error:', error);
      setPrintError('Lỗi khi xem trước PDF: ' + error.message);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Chờ thanh toán': return <Badge bg="warning">Chờ thanh toán</Badge>;
      case 'Đã thanh toán': return <Badge bg="success">Đã thanh toán</Badge>;
      case 'Đã hủy': return <Badge bg="danger">Đã hủy</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  if (!invoiceData) {
    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết hóa đơn</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center text-muted py-4">
            <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
            <p>Không có dữ liệu hóa đơn</p>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  const {
    code = 'N/A',
    patient_name = 'N/A',
    patient_phone = 'N/A',
    patient_id,
    date = 'N/A',
    total = 0,
    status = 'N/A',
    payment_method,
    transaction_id,
    order_id,
    paid_at,
    appointment_id,
    invoice_details = []
  } = invoiceData;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>
          <i className="fas fa-receipt me-2 text-primary"></i>
          Chi tiết hóa đơn {code}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Thông báo in */}
        {printError && (
          <Alert variant="danger" className="mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {printError}
          </Alert>
        )}

        {printSuccess && (
          <Alert variant="success" className="mb-3">
            <i className="fas fa-check me-2"></i>
            {printSuccess}
          </Alert>
        )}

        {/* Thông tin cơ bản */}
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white">
            <h6 className="mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Thông tin hóa đơn
            </h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="fw-medium text-muted">Mã hóa đơn:</td>
                      <td>
                        <Badge bg="primary" className="fs-6">{code}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Ngày tạo:</td>
                      <td className="fw-medium">{date}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Trạng thái:</td>
                      <td>{getStatusBadge(status)}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Tổng tiền:</td>
                      <td className="fw-bold text-success fs-5">
                        {total?.toLocaleString('vi-VN')} VNĐ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
              <Col md={6}>
                <table className="table table-borderless table-sm">
                  <tbody>
                    <tr>
                      <td width="40%" className="fw-medium text-muted">Bệnh nhân:</td>
                      <td className="fw-medium">{patient_name}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Số điện thoại:</td>
                      <td>{patient_phone}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Mã bệnh nhân:</td>
                      <td>BN{String(patient_id).padStart(4, '0')}</td>
                    </tr>
                    <tr>
                      <td className="fw-medium text-muted">Mã cuộc hẹn:</td>
                      <td>
                        {appointment_id ? `LH${String(appointment_id).padStart(4, '0')}` : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Thông tin thanh toán */}
        {status === 'Đã thanh toán' && (
          <Card className="mb-4 border-success">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">
                <i className="fas fa-credit-card me-2"></i>
                Thông tin thanh toán
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr>
                        <td width="50%" className="fw-medium text-muted">Phương thức:</td>
                        <td className="fw-medium">
                          {getPaymentMethodText(payment_method)}
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium text-muted">Mã giao dịch:</td>
                        <td>
                          <code className="text-primary">{transaction_id || 'N/A'}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Col>
                <Col md={6}>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr>
                        <td width="50%" className="fw-medium text-muted">Mã đơn hàng:</td>
                        <td>
                          <code>{order_id || 'N/A'}</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium text-muted">Thời gian thanh toán:</td>
                        <td className="fw-medium text-success">
                          {paid_at || 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Chi tiết dịch vụ */}
        {invoice_details && invoice_details.length > 0 ? (
          <Card>
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Chi tiết dịch vụ & thuốc
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Loại</th>
                    <th>Tên</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice_details.map((detail, index) => {
                    const isService = !!detail.service;
                    const itemName = isService
                      ? detail.service?.ServiceName
                      : detail.medicine?.MedicineName;
                    const unitPrice = detail.UnitPrice || detail.unit_price || 0;
                    const quantity = detail.Quantity || detail.quantity || 1;
                    const subtotal = detail.SubTotal || (unitPrice * quantity);

                    return (
                      <tr key={detail.InvoiceDetailId || index}>
                        <td>{index + 1}</td>
                        <td>
                          <Badge bg={isService ? 'primary' : 'success'}>
                            {isService ? 'Dịch vụ' : 'Thuốc'}
                          </Badge>
                        </td>
                        <td className="fw-medium">
                          {itemName || 'N/A'}
                        </td>
                        <td>{unitPrice.toLocaleString('vi-VN')} VNĐ</td>
                        <td>{quantity}</td>
                        <td className="fw-bold text-success">
                          {subtotal.toLocaleString('vi-VN')} VNĐ
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="table-secondary fw-bold">
                    <td colSpan="5" className="text-end">Tổng cộng:</td>
                    <td className="text-success fs-6">
                      {total?.toLocaleString('vi-VN')} VNĐ
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ) : (
          <div className="text-center py-4 text-muted">
            <i className="fas fa-info-circle fa-2x mb-3"></i>
            <p>Không có chi tiết dịch vụ nào cho hóa đơn này</p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <X size={18} className="me-1" />
          Đóng
        </Button>

        {status === 'Đã thanh toán' && (
          <div className="d-flex gap-2">
            <Button
              variant="outline-info"
              onClick={handlePreviewPDF}
              disabled={printing}
              className="d-flex align-items-center"
            >
              {printing ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <Eye size={18} className="me-1" />
              )}
              Xem trước
            </Button>

            <Button
              variant="outline-warning"
              onClick={handlePreview}
              disabled={printing}
              className="d-flex align-items-center"
            >
              <i className="fas fa-edit me-1"></i>
              Chỉnh sửa PDF
            </Button>

            <Button
              variant="primary"
              onClick={handlePrintInvoice}
              disabled={printing}
              className="d-flex align-items-center"
            >
              {printing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang tạo PDF...
                </>
              ) : (
                <>
                  <Printer size={18} className="me-1" />
                  Tải PDF
                </>
              )}
            </Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default InvoiceDetailModal;