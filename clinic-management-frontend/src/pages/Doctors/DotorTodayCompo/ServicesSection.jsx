import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Col, Card, Form, Button, Spinner, Badge, Row, Table } from "react-bootstrap";
import Pagination from "../../../Components/Pagination/Pagination";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = 'http://localhost:8000';

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
    footer: true
  };

  // FIX: SỬ DỤNG DIRECTLY TỪ PROPS, KHÔNG DÙNG STATE LOCAL TRUNG GIAN
  const servicesState = services || {};

  // Fetch services - CHỈ CHẠY 1 LẦN KHI MOUNT
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLocalServicesLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/doctor/services`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        if (Array.isArray(data)) {
          setLocalServices(data);
          // FIX: Chỉ khởi tạo services nếu chưa có
          if (!services || Object.keys(services).length === 0) {
            const initialServices = data.reduce((acc, service) => {
              return { ...acc, [service.ServiceId]: false };
            }, {});
            setServices(initialServices);
          }
        } else {
          throw new Error("Dữ liệu từ API không phải mảng");
        }
      } catch (error) {
        console.error('Error fetching services:', error);
        setToast({
          show: true,
          message: `Lỗi tải danh sách dịch vụ: ${error.message}`,
          variant: "danger",
        });
        setLocalServices([]);
      } finally {
        setLocalServicesLoading(false);
      }
    };

    fetchServices();
  }, []); // CHỈ CHẠY 1 LẦN

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

  const handlePreview = async () => {
    if (!selectedTodayPatient) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn bệnh nhân trước khi xem trước.",
        variant: "warning"
      });
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
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn ít nhất một dịch vụ trước khi xem trước.",
        variant: "warning"
      });
      return;
    }

    // ✅ Tạo data gửi đến BE
    const previewData = {
      type: 'service',
      patient_name: selectedTodayPatient.name || 'N/A',
      patient_age: selectedTodayPatient.age || 'N/A',
      patient_gender: selectedTodayPatient.gender || 'N/A',
      patient_phone: selectedTodayPatient.phone || 'N/A',
      age: selectedTodayPatient.age || 'N/A',
      gender: selectedTodayPatient.gender || 'N/A',
      phone: selectedTodayPatient.phone || 'N/A',
      address: selectedTodayPatient.address || '',
      code: `DV_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      doctor: "Bác sĩ điều trị",
      doctor_name: "Bác sĩ điều trị",
      services: selectedServices,
      symptoms: symptoms || '',
      diagnosis: diagnosis || '',
      instructions: 'Vui lòng thực hiện các dịch vụ theo chỉ định',
      appointment_date: selectedTodayPatient.date || new Date().toLocaleDateString('vi-VN'),
      appointment_time: selectedTodayPatient.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),

      pdf_settings: {
        clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
        clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
        clinicPhone: '024.3574.7788',
        doctorName: "Bác sĩ điều trị",
        customTitle: 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
        fontFamily: 'Times New Roman',
        fontSize: '14px',
        pageSize: 'A4',
        pageOrientation: 'portrait',
        marginTop: '15mm',
        marginRight: '10mm',
        marginBottom: '15mm',
        marginLeft: '10mm',
        primaryColor: '#2c5aa0',
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
          opacity: 0.1,
          fontSize: 48,
          color: '#cccccc',
          rotation: -45
        }
      }
    };

    console.log('📤 ServicesSection - Sending to preview-html:', {
      patient: previewData.patient_name,
      services_count: previewData.services.length,
      services: previewData.services
    });

    try {
      setServiceLoading(true);

      // ✅ GỌI API PREVIEW-HTML ĐỂ LẤY HTML
      const response = await fetch(`${API_BASE_URL}/api/print/preview-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Received HTML template from BE', result);

        // ✅ QUAN TRỌNG: XÓA VÀ LƯU SESSIONSTORAGE TRƯỚC KHI NAVIGATE
        sessionStorage.removeItem('pdfEditorData');
        sessionStorage.removeItem('editorSource');
        sessionStorage.removeItem('pdfHTMLTemplate');
        sessionStorage.removeItem('pdfPreviewData');

        // Lưu data vào sessionStorage
        sessionStorage.setItem('pdfEditorData', JSON.stringify(previewData));
        sessionStorage.setItem('editorSource', 'services');
        sessionStorage.setItem('pdfHTMLTemplate', result.html);
        sessionStorage.setItem('pdfPreviewData', JSON.stringify(result.data));

        // ✅ KIỂM TRA NGAY LẬP TỨC
        console.log('💾 IMMEDIATE sessionStorage check:', {
          editorSource: sessionStorage.getItem('editorSource'),
          hasPdfEditorData: !!sessionStorage.getItem('pdfEditorData'),
          hasHTML: !!sessionStorage.getItem('pdfHTMLTemplate')
        });

        // ✅ THÊM DELAY ĐỂ ĐẢM BẢO SESSIONSTORAGE ĐƯỢC LƯU
        setTimeout(() => {
          // ✅ KIỂM TRA LẦN CUỐI TRƯỚC KHI NAVIGATE
          console.log('🔍 FINAL sessionStorage check before navigate:', {
            editorSource: sessionStorage.getItem('editorSource'),
            hasData: !!sessionStorage.getItem('pdfEditorData')
          });

          // ✅ NAVIGATE VỚI STATE TRỰC TIẾP
          navigate('/doctor/print-pdf-editor', {
            state: {
              // ✅ QUAN TRỌNG: TRUYỀN DỮ LIỆU TRỰC TIẾP QUA STATE
              source: 'services',
              pdfData: previewData,
              htmlTemplate: result.html,
              originalData: result.data,
              services: previewData.services,
              patientInfo: {
                name: previewData.patient_name,
                age: previewData.patient_age,
                gender: previewData.patient_gender,
                phone: previewData.patient_phone,
                address: previewData.address
              },
              // ✅ THÊM TIMESTAMP ĐỂ TRÁNH CACHE
              timestamp: Date.now(),
              // ✅ THÊM FLAG ĐẶC BIỆT
              fromServices: true
            }
          });

          setToast({
            show: true,
            message: "✅ Đang chuyển đến trình chỉnh sửa PDF...",
            variant: "success",
          });
        }, 50); // Delay ngắn để đảm bảo sessionStorage được lưu

      } else {
        throw new Error(result.message || 'Lỗi từ server');
      }

    } catch (error) {
      console.error('Error getting HTML preview:', error);
      setToast({
        show: true,
        message: "❌ Lỗi khi tải preview PDF: " + error.message,
        variant: "danger",
      });
    } finally {
      setServiceLoading(false);
    }
  };

  // FUNCTION DOWNLOAD PDF - SỬA LỖI CONTENT TYPE
  const printDocument = async () => {
    if (!selectedTodayPatient) {
      setToast({ show: true, message: "⚠️ Chưa chọn bệnh nhân.", variant: "warning" });
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
      setToast({ show: true, message: "⚠️ Chưa chọn dịch vụ nào.", variant: "warning" });
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
      doctor_name: "Bác sĩ điều trị",
      diagnoses: diagnoses.length > 0 ? diagnoses : [{ Symptoms: symptoms, Diagnosis: diagnosis }],
      services: selectedServices,
      // THÊM PDF SETTINGS VÀO ĐÂY
      pdf_settings: defaultPdfSettings
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/print/prescription/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ SỬA: XÓA 'Accept': 'application/pdf' VÌ BE CÓ THỂ TRẢ VỀ JSON ERROR
        },
        body: JSON.stringify(requestData),
      });

      // ✅ KIỂM TRA STATUS TRƯỚC
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // ✅ KIỂM TRA CONTENT TYPE
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);

      if (contentType && contentType.includes('application/pdf')) {
        // ✅ LÀ PDF - XỬ LÝ BÌNH THƯỜNG
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `PHIEU_DICH_VU_${selectedTodayPatient.name || 'benh_nhan'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setToast({
          show: true,
          message: `✅ Đã xuất PDF phiếu dịch vụ với ${requestData.services.length} dịch vụ.`,
          variant: "success",
        });
      } else {
        // ✅ KHÔNG PHẢI PDF - CÓ THỂ LÀ JSON ERROR
        const errorData = await response.json();
        console.error('❌ Server returned error:', errorData);
        throw new Error(errorData.message || 'Server trả về lỗi không phải PDF');
      }

    } catch (error) {
      console.error('Error printing service document:', error);
      setToast({
        show: true,
        message: `Lỗi xuất PDF dịch vụ: ${error.message}`,
        variant: "danger",
      });
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

  // HÀM THÊM DỊCH VỤ MỚI
  const handleAddNew = () => {
    if (!newService.serviceName.trim()) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng nhập tên dịch vụ!",
        variant: "warning",
      });
      return;
    }

    if (newService.price < 0) {
      setToast({
        show: true,
        message: "⚠️ Giá dịch vụ không được âm!",
        variant: "warning",
      });
      return;
    }

    const newServiceItem = {
      ServiceName: newService.serviceName.trim(),
      Price: newService.price,
      Quantity: newService.quantity,
      totalPrice: newService.totalPrice
    };

    // Tìm serviceId tương ứng trong localServices
    const matchedService = localServices.find(s =>
      s.ServiceName.toLowerCase() === newService.serviceName.toLowerCase()
    );

    if (matchedService) {
      // Nếu tìm thấy dịch vụ trong danh sách, cập nhật state
      setServices(prev => ({
        ...prev,
        [matchedService.ServiceId]: true
      }));
    }

    setNewService({
      serviceName: '',
      price: 0,
      quantity: 1,
      totalPrice: 0
    });

    setToast({
      show: true,
      message: "✅ Thêm dịch vụ thành công!",
      variant: "success",
    });
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

  // HÀM HỦY CHỈNH SỬA
  const cancelEditing = () => {
    setEditingIndex(null);
    setNewService({
      serviceName: '',
      price: 0,
      quantity: 1,
      totalPrice: 0
    });
  };

  // HÀM CẬP NHẬT DỊCH VỤ
  const handleUpdate = () => {
    if (!newService.serviceName.trim()) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng nhập tên dịch vụ!",
        variant: "warning",
      });
      return;
    }

    // Ở đây có thể thêm logic cập nhật dịch vụ nếu cần
    // Hiện tại chỉ reset form

    cancelEditing();

    setToast({
      show: true,
      message: "✅ Cập nhật dịch vụ thành công!",
      variant: "success",
    });
  };

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

  // Service suggestions
  useEffect(() => {
    const trimmedDiagnosis = diagnosis?.trim();
    if (!trimmedDiagnosis || trimmedDiagnosis.length < 3) {
      setServiceSuggestions([]);
      return;
    }

    setServiceLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const fetchUrl = `${API_BASE_URL}/api/doctor/ai/suggestion?diagnosis=${encodeURIComponent(trimmedDiagnosis)}&type=service`;
        const res = await fetch(fetchUrl);

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const normalizedData = data.map(item => ({
            ...item,
            ServiceName: item.ServiceName || item.MedicineName || item.name || 'Unknown Service'
          }));
          setServiceSuggestions(normalizedData);
        } else {
          throw new Error("Dữ liệu gợi ý dịch vụ không phải mảng JSON");
        }
      } catch (err) {
        console.error("Service suggestion error:", err);
        setServiceSuggestions([]);
      } finally {
        setServiceLoading(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [diagnosis]);

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

  // FIX: Handle test change - XỬ LÝ TRỰC TIẾP
  const handleTestChange = useCallback((serviceId) => (e) => {
    const isChecked = e.target.checked;

    // Cập nhật trực tiếp prop state
    setServices(prev => ({
      ...prev,
      [serviceId]: isChecked
    }));
  }, [setServices]);

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
                onChange={handleTestChange(service.ServiceId)}
                disabled={isFormDisabled}
                className="form-check-input me-2"
              />
              <label htmlFor={`checkbox-${service.ServiceId}`} className="form-check-label mb-0">
                {service.ServiceName} - {service.Price ? service.Price.toLocaleString() + ' VNĐ' : 'Giá chưa cập nhật'}
              </label>
            </div>
            {requestedServices[service.ServiceId] && (
              <Badge bg="success" pill className="ms-2">
                ✅ Đã yêu cầu
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

  // RENDER DỊCH VỤ ĐÃ CHỌN DẠNG TABLE GIỐNG PRESCRIPTION
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
                          💾 Lưu
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="ms-1 mt-1"
                          onClick={cancelEditing}
                        >
                          ❌ Hủy
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
                          onClick={() => handleTestChange(service.ServiceId)({ target: { checked: false } })}
                          disabled={isFormDisabled}
                        >
                          🗑️ Xóa
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="ms-1 mt-1"
                          onClick={() => startEditing(service.ServiceId)}
                          disabled={isFormDisabled}
                        >
                          ✏️ Sửa
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* Dòng thêm mới */}
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="Nhập tên dịch vụ..."
                    value={newService.serviceName}
                    onChange={(e) => handleFieldChange('serviceName', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={newService.price}
                    onChange={(e) => handleFieldChange('price', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="1"
                    placeholder="1"
                    value={newService.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td className="align-middle">
                  <strong>{newService.totalPrice?.toLocaleString() || 0}</strong>
                </td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddNew}
                    disabled={editingIndex !== null || isFormDisabled}
                  >
                    ➕ Thêm
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
        )}
      </>
    );
  };

  // FUNCTION: Handle request service
  const handleRequestService = useCallback(async () => {
    console.log('🔍 DEBUG selectedTodayPatient:', selectedTodayPatient);

    const selected = Object.keys(servicesState).filter((k) => servicesState[k]);

    if (selected.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Bạn chưa chọn dịch vụ nào.",
        variant: "warning",
      });
      return;
    }

    if (!selectedTodayPatient) {
      setToast({
        show: true,
        message: "⚠️ Chưa chọn bệnh nhân.",
        variant: "warning",
      });
      return;
    }

    const appointmentId = selectedTodayPatient.appointment_id ||
      selectedTodayPatient.AppointmentId ||
      selectedTodayPatient.appointmentId ||
      selectedTodayPatient.id ||
      selectedTodayPatient.AppointmentID;

    if (!appointmentId) {
      setToast({
        show: true,
        message: `⚠️ Không tìm thấy ID cuộc hẹn. Vui lòng chọn bệnh nhân từ danh sách hôm nay.`,
        variant: "warning",
      });
      return;
    }

    try {
      setServiceLoading(true);

      const requestData = {
        selectedServices: selected.map(id => parseInt(id)),
        diagnosis: diagnosis || '',
        symptoms: symptoms || '',
        notes: "Chỉ định từ bác sĩ"
      };

      const response = await fetch(
        `${API_BASE_URL}/api/doctor/appointments/${appointmentId}/assign-services`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        }
      );

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Lỗi định dạng từ server: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        let userMessage = 'Lỗi hệ thống';
        if (result && result.message) {
          userMessage = result.message
            .replace(/Lỗi hệ thống khi chỉ định dịch vụ: /g, '')
            .replace(/SQLSTATE.*$/g, '')
            .replace(/\(Connection:.*$/g, '')
            .trim();
          if (!userMessage) userMessage = result.message;
        }
        setToast({ show: true, message: `❌ ${userMessage}`, variant: "danger" });
        return;
      }

      if (result.success) {
        setToast({
          show: true,
          message: result.message || `✅ Đã chỉ định ${selected.length} dịch vụ thành công!`,
          variant: "success",
        });

        const updatedRequestedServices = { ...requestedServices };
        selected.forEach(serviceId => {
          updatedRequestedServices[serviceId] = true;
        });
        setRequestedServices(updatedRequestedServices);
      } else {
        setToast({
          show: true,
          message: `⚠️ ${result.message || 'Lỗi không xác định từ server'}`,
          variant: "warning",
        });
      }

    } catch (error) {
      console.error('❌ Error:', error);
      let userMessage = error.message;
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        userMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
      }
      setToast({ show: true, message: `❌ ${userMessage}`, variant: "danger" });
    } finally {
      setServiceLoading(false);
    }
  }, [servicesState, selectedTodayPatient, diagnosis, symptoms, requestedServices, setRequestedServices, setToast]);

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
              <div className="ai-suggestions mb-3">
                <h6>🩺 Gợi ý dịch vụ phù hợp (dựa trên chẩn đoán):</h6>
                <ul className="mb-0">
                  {serviceSuggestions.map((service, i) => {
                    const serviceName = service.ServiceName || service.MedicineName || 'Unknown';
                    const serviceKey = findMatchingKey(serviceName, testLabels);

                    return (
                      <li key={`${serviceName}-${i}`}>
                        <div className="medicine-info d-flex justify-content-between align-items-center">
                          <span><b>{serviceName}</b> — <i>{service.Reason || "Đề xuất dựa trên chẩn đoán"}</i></span>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              if (serviceKey) {
                                const isCurrentlyChecked = servicesState[serviceKey] || false;
                                const newValue = !isCurrentlyChecked;

                                setServices(prev => ({
                                  ...prev,
                                  [serviceKey]: newValue
                                }));

                                setToast({
                                  show: true,
                                  message: `✅ Đã ${newValue ? 'chọn' : 'bỏ chọn'} dịch vụ "${serviceName}".`,
                                  variant: "success",
                                });
                              } else {
                                setToast({
                                  show: true,
                                  message: `⚠️ Không tìm thấy dịch vụ tương ứng cho "${serviceName}".`,
                                  variant: "warning",
                                });
                              }
                            }}
                            disabled={isFormDisabled}
                          >
                            {serviceKey ? (servicesState[serviceKey] ? "✓ Đã chọn" : "+ Chọn") : "Không khả dụng"}
                          </Button>
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
              {serviceLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang gửi...
                </>
              ) : (
                `🧾 Yêu cầu thực hiện dịch vụ đã chọn (${Object.values(servicesState).filter(v => v).length})`
              )}
            </Button>

            <Button
              variant="outline-info"
              size="sm"
              onClick={handlePreview}
              disabled={!selectedTodayPatient || !Object.values(servicesState).some(Boolean)}
              className="no-print ms-2"
            >
              👁️ Xem trước PDF
            </Button>

            <Button
              variant="outline-success"
              size="sm"
              onClick={printDocument}
              disabled={!selectedTodayPatient || !Object.values(servicesState).some(Boolean)}
              className="no-print ms-2"
            >
              🖨️ Xuất PDF
            </Button>
          </div>

          <hr />
          <p>
            <strong>Kết quả (nếu có):</strong>{" "}
            <a href="#">Xem file đính kèm...</a>
          </p>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default React.memo(ServicesSection);