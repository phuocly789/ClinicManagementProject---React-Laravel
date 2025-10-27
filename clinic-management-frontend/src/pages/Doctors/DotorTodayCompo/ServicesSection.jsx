import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Col, Card, Form, Button, Spinner, Badge, Row } from "react-bootstrap";
import Pagination from "../../../Components/Pagination/Pagination";

const API_BASE_URL = 'http://localhost:8000';

const ServicesSection = ({
  services,
  setServices,
  requestedServices,
  setRequestedServices,
  diagnosis,
  isFormDisabled,
  setToast,
  printDocument,
  selectedTodayPatient,
}) => {
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
    console.log('DEBUG - Checkbox changed:', serviceId, isChecked);
    
    // Cập nhật local state ngay lập tức để UI phản hồi
    setLocalServicesState(prev => {
      const newState = {
        ...prev,
        [serviceId]: isChecked
      };
      console.log('DEBUG - New LOCAL services state:', newState);
      return newState;
    });

    // Đồng bộ với prop state
    setServices(prev => {
      const newState = {
        ...prev,
        [serviceId]: isChecked
      };
      console.log('DEBUG - New PROP services state:', newState);
      return newState;
    });
  }, [setServices]);

  // Handle request service
  const handleRequestService = useCallback(() => {
    const selected = Object.keys(localServicesState).filter((k) => localServicesState[k]);
    console.log('DEBUG - Selected services from LOCAL state:', selected);
    
    if (selected.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Bạn chưa chọn dịch vụ nào.",
        variant: "warning",
      });
      return;
    }

    const updated = { ...requestedServices };
    selected.forEach((id) => (updated[id] = true));
    setRequestedServices(updated);

    setToast({
      show: true,
      message: `✅ Đã gửi yêu cầu thực hiện ${selected.length} dịch vụ cận lâm sàng.`,
      variant: "success",
    });
  }, [localServicesState, requestedServices, setRequestedServices, setToast]);

  // FIX: Render services - sử dụng localServicesState
  const renderServices = useCallback(() => {
    const half = Math.ceil(currentItems.length / 2);
    const leftColumn = currentItems.slice(0, half);
    const rightColumn = currentItems.slice(half);

    const renderServiceColumn = (columnServices) => 
      columnServices.map((service) => {
        // Sử dụng localServicesState thay vì services prop
        const checked = localServicesState[service.ServiceId] || false;
        console.log(`DEBUG - Rendering service ${service.ServiceId}:`, checked);
        
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

  // Debug logs
  useEffect(() => {
    console.log('DEBUG - LocalServicesState updated:', localServicesState);
    console.log('DEBUG - Services prop updated:', services);
  }, [localServicesState, services]);

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
              disabled={isFormDisabled || !Object.values(localServicesState).some(v => v)}
              className="no-print"
            >
              🧾 Yêu cầu thực hiện dịch vụ đã chọn ({Object.values(localServicesState).filter(v => v).length})
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => printDocument('service')}
              disabled={!selectedTodayPatient || !Object.values(localServicesState).some(Boolean)}
              className="no-print ms-2"
            >
              🖨️ Xuất chỉ định dịch vụ
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