import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Col, Card, Form, Button, Spinner, Badge, Row } from "react-bootstrap";
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

  // FIX: Tạo local state để quản lý riêng
  const [localServicesState, setLocalServicesState] = useState({});

  // Đồng bộ state từ props khi component mount
  useEffect(() => {
    if (services && Object.keys(services).length > 0) {
      setLocalServicesState(services);
    }
  }, [services]);

  // Fetch services
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
          // FIX: Khởi tạo cả local state và prop state
          if (!services || Object.keys(services).length === 0) {
            const initialServices = data.reduce((acc, service) => {
              return { ...acc, [service.ServiceId]: false };
            }, {});
            setLocalServicesState(initialServices);
            setServices(initialServices);
          } else {
            setLocalServicesState(services);
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
  }, []);

  // FUNCTION PREVIEW PDF - SỬA LẠI GIỐNG CODE TOA THUỐC
  const handlePreview = async () => {
    if (!selectedTodayPatient) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn bệnh nhân trước khi xem trước.",
        variant: "warning"
      });
      return;
    }

    // CHUYỂN ĐỔI services từ object {id: boolean} sang array
    const selectedServices = Object.keys(localServicesState)
      .filter(serviceId => localServicesState[serviceId])
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

    const previewData = {
      type: 'service',
      patient_name: selectedTodayPatient.name || 'N/A',
      age: String(selectedTodayPatient.age || 'N/A'),
      gender: selectedTodayPatient.gender || 'N/A',
      phone: selectedTodayPatient.phone || 'N/A',
      appointment_date: selectedTodayPatient.date
        ? new Date(selectedTodayPatient.date).toLocaleDateString('vi-VN')
        : new Date().toLocaleDateString('vi-VN'),
      appointment_time: selectedTodayPatient.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      doctor_name: "Bác sĩ điều trị",
      services: selectedServices,
      diagnoses: diagnoses || [],
    };

    console.log('📤 Data preview dịch vụ gửi lên BE:', previewData);

    // Lưu data vào sessionStorage để trang mới có thể truy cập - GIỐNG CODE TOA THUỐC
    try {
      sessionStorage.setItem('pdfPreviewData', JSON.stringify(previewData));
      sessionStorage.setItem('prescriptionRows', JSON.stringify(
        selectedServices.map((service, index) => ({
          id: index + 1,
          name: service.ServiceName,
          quantity: service.Quantity || 1,
          dosage: '', // Dịch vụ không có liều dùng
          unitPrice: service.Price || 0,
          totalPrice: (service.Price || 0) * (service.Quantity || 1)
        }))
      ));
      sessionStorage.setItem('selectedPatient', JSON.stringify(selectedTodayPatient));
      sessionStorage.setItem('diagnoses', JSON.stringify(diagnoses));
      sessionStorage.setItem('services', JSON.stringify(selectedServices));

      // Mở trang mới trong tab mới - GIỐNG CODE TOA THUỐC
      const newWindow = window.open('/pdf-editor', '_blank');

      if (!newWindow) {
        setToast({
          show: true,
          message: "⚠️ Trình duyệt đã chặn popup. Vui lòng cho phép popup để mở editor PDF.",
          variant: "warning",
        });
        return;
      }

      setToast({
        show: true,
        message: "✅ Đang mở trình chỉnh sửa PDF trong tab mới...",
        variant: "success",
      });

    } catch (error) {
      console.error('Error opening new window:', error);
      setToast({
        show: true,
        message: "❌ Lỗi khi mở trình chỉnh sửa PDF",
        variant: "danger",
      });
    }
  };

  // FUNCTION DOWNLOAD PDF - GIỮ NGUYÊN
  const printDocument = async () => {
    if (!selectedTodayPatient) {
      setToast({ show: true, message: "⚠️ Chưa chọn bệnh nhân.", variant: "warning" });
      return;
    }

    // Data for service
    const selectedServices = Object.keys(localServicesState)
      .filter(serviceId => localServicesState[serviceId])
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
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/print/prescription/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Tạo blob và download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'PHIEU_DICH_VU.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToast({
        show: true,
        message: `✅ Đã xuất PDF phiếu dịch vụ với ${requestData.services.length} dịch vụ.`,
        variant: "success",
      });

    } catch (error) {
      console.error('Error printing service document:', error);
      setToast({
        show: true,
        message: `Lỗi xuất PDF dịch vụ: ${error.message}`,
        variant: "danger",
      });
    }
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

  // FIX: Handle test change - sử dụng local state
  const handleTestChange = useCallback((serviceId) => (e) => {
    const isChecked = e.target.checked;

    // Cập nhật local state ngay lập tức để UI phản hồi
    setLocalServicesState(prev => {
      const newState = {
        ...prev,
        [serviceId]: isChecked
      };
      return newState;
    });

    // Đồng bộ với prop state
    setServices(prev => {
      const newState = {
        ...prev,
        [serviceId]: isChecked
      };
      return newState;
    });
  }, [setServices]);

  // FUNCTION FIXED: Handle request service - GỌI API CHỈ ĐỊNH DỊCH VỊ
  const handleRequestService = useCallback(async () => {
    console.log('🔍 DEBUG selectedTodayPatient:', selectedTodayPatient);

    const selected = Object.keys(localServicesState).filter((k) => localServicesState[k]);

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

    // TÌM appointment_id TRONG NHIỀU TRƯỜNG CÓ THỂ
    const appointmentId = selectedTodayPatient.appointment_id ||
      selectedTodayPatient.AppointmentId ||
      selectedTodayPatient.appointmentId ||
      selectedTodayPatient.id ||
      selectedTodayPatient.AppointmentID;

    console.log('🔍 DEBUG appointmentId found:', appointmentId);

    if (!appointmentId) {
      console.log('❌ No appointmentId found in:', selectedTodayPatient);
      setToast({
        show: true,
        message: `⚠️ Không tìm thấy ID cuộc hẹn. Vui lòng chọn bệnh nhân từ danh sách hôm nay.`,
        variant: "warning",
      });
      return;
    }

    try {
      setServiceLoading(true);

      console.log('🔄 Đang gửi yêu cầu chỉ định dịch vụ...', {
        appointmentId: appointmentId,
        selectedServices: selected,
        patient: selectedTodayPatient
      });

      // ✅ FIX: CHỈ GỬI selectedServices (backend đã sửa)
      const requestData = {
        selectedServices: selected.map(id => parseInt(id)), // ✅ CHỈ GỬI FIELD NÀY
        diagnosis: diagnosis || '',
        symptoms: symptoms || '',
        notes: "Chỉ định từ bác sĩ"
      };

      console.log('📤 Request data gửi đi:', requestData);

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
      console.log('📥 Backend raw response:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error(`Lỗi định dạng từ server: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error('❌ Backend error:', result);

        // ✅ HIỂN THỊ THÔNG BÁO TỪ BACKEND DỄ ĐỌC
        let userMessage = 'Lỗi hệ thống';

        if (result && result.message) {
          // Lấy message từ backend và làm sạch
          userMessage = result.message
            .replace(/Lỗi hệ thống khi chỉ định dịch vụ: /g, '') // Xóa prefix lỗi
            .replace(/SQLSTATE.*$/g, '') // Xóa thông tin SQL
            .replace(/\(Connection:.*$/g, '') // Xóa connection info
            .trim();

          // Nếu message rỗng sau khi làm sạch, dùng message gốc
          if (!userMessage) {
            userMessage = result.message;
          }
        } else if (response.status === 404) {
          userMessage = 'Không tìm thấy API. Vui lòng kiểm tra kết nối server.';
        } else if (response.status === 500) {
          userMessage = 'Lỗi server. Vui lòng thử lại sau.';
        }

        setToast({
          show: true,
          message: `❌ ${userMessage}`,
          variant: "danger",
        });
        return;
      }

      console.log('✅ Backend success response:', result);

      if (result.success) {
        setToast({
          show: true,
          message: result.message || `✅ Đã chỉ định ${selected.length} dịch vụ thành công!`,
          variant: "success",
        });

        // Cập nhật trạng thái đã yêu cầu
        const updatedRequestedServices = { ...requestedServices };
        selected.forEach(serviceId => {
          updatedRequestedServices[serviceId] = true;
        });
        setRequestedServices(updatedRequestedServices);

      } else {
        // ✅ HIỂN THỊ LỖI TỪ BACKEND (success: false)
        setToast({
          show: true,
          message: `⚠️ ${result.message || 'Lỗi không xác định từ server'}`,
          variant: "warning",
        });
      }

    } catch (error) {
      console.error('❌ Error:', error);

      // ✅ HIỂN THỊ LỖI MẠNG HOẶC LỖI KHÁC
      let userMessage = error.message;

      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        userMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
      } else if (error.message.includes('404')) {
        userMessage = 'Không tìm thấy API. Vui lòng kiểm tra lại đường dẫn.';
      } else if (error.message.includes('500')) {
        userMessage = 'Lỗi server. Vui lòng thử lại sau.';
      }

      setToast({
        show: true,
        message: `❌ ${userMessage}`,
        variant: "danger",
      });
    } finally {
      setServiceLoading(false);
    }
  }, [localServicesState, selectedTodayPatient, diagnosis, symptoms, requestedServices, setRequestedServices, setToast, setServices]);

  // FIX: Render services - sử dụng localServicesState
  const renderServices = useCallback(() => {
    const half = Math.ceil(currentItems.length / 2);
    const leftColumn = currentItems.slice(0, half);
    const rightColumn = currentItems.slice(half);

    const renderServiceColumn = (columnServices) =>
      columnServices.map((service) => {
        // Sử dụng localServicesState thay vì services prop
        const checked = localServicesState[service.ServiceId] || false;

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
  }, [currentItems, localServicesState, requestedServices, isFormDisabled, handleTestChange]);

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
                                const isCurrentlyChecked = localServicesState[serviceKey] || false;
                                const newValue = !isCurrentlyChecked;

                                // Cập nhật cả local và prop state
                                setLocalServicesState(prev => ({
                                  ...prev,
                                  [serviceKey]: newValue
                                }));
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
                          >
                            {serviceKey ? (localServicesState[serviceKey] ? "✓ Đã chọn" : "+ Chọn") : "Không khả dụng"}
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
                {renderServices()}
                <Pagination
                  pageCount={pageCount}
                  onPageChange={handlePageChange}
                  currentPage={currentPage}
                  isFormDisabled={localServicesLoading}
                />
              </>
            )}
          </Form.Group>

          <div className="text-end">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleRequestService}
              disabled={isFormDisabled || !Object.values(localServicesState).some(v => v) || serviceLoading}
              className="no-print"
            >
              {serviceLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang gửi...
                </>
              ) : (
                `🧾 Yêu cầu thực hiện dịch vụ đã chọn (${Object.values(localServicesState).filter(v => v).length})`
              )}
            </Button>

            {/* SỬA NÚT PREVIEW - GIỐNG CODE TOA THUỐC */}
            <Button
              variant="outline-info"
              size="sm"
              onClick={handlePreview}
              disabled={!selectedTodayPatient || !Object.values(localServicesState).some(Boolean)}
              className="no-print ms-2"
            >
              👁️ Xem trước PDF
            </Button>

            <Button
              variant="outline-success"
              size="sm"
              onClick={printDocument}
              disabled={!selectedTodayPatient || !Object.values(localServicesState).some(Boolean)}
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