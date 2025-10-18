  import React, { useState, useEffect } from "react";
  import { Col, Card, Form, Button, Spinner, Badge, Row } from "react-bootstrap"; //  Thêm Row
  import Pagination from "../../../Components/Pagination/Pagination"; //  Import custom Pagination (adjust path if needed)

  const API_BASE_URL = 'http://localhost:8000';

  const ServicesSection = ({
    services,
    setservices,
    requestedservices,
    setRequestedservices,
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
    const [currentPage, setCurrentPage] = useState(0); //  State cho pagination
    const itemsPerPage = 8; //  4 hàng mỗi trang

    //  Tự fetch services on mount
    useEffect(() => {
      const fetchServices = async () => {
        try {
          setLocalServicesLoading(true);
          const response = await fetch(`${API_BASE_URL}/api/doctor/services`);
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          const data = await response.json();
          setLocalServices(data || []);

          //  Initial services nếu chưa có (tất cả false)
          if (Object.keys(services).length === 0) {
            const initialservices = data.reduce((acc, service) => ({ ...acc, [service.ServiceId]: false }), {});
            setservices(initialservices);
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
    }, []); // 🆕 Empty deps để chỉ chạy 1 lần khi mount, tránh refetch nhiều lần do deps thay đổi

    // Dynamic testLabels từ localServices
    const testLabels = localServices.reduce((acc, service) => ({ ...acc, [service.ServiceId]: service.ServiceName }), {});

    // Page count cho pagination
    const pageCount = Math.ceil(localServices.length / itemsPerPage);

    // Slice items cho trang hiện tại
    const currentItems = localServices.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

    // Handle page change
    const handlePageChange = ({ selected }) => {
      setCurrentPage(selected);
    };

    // Hàm match (giữ nguyên)
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
      const overlapScore = commonWords.length / Math.max(wordsSuggested.length, wordsLabel.length);

      return overlapScore;
    };

    const findMatchingKey = (serviceName, testLabels) => {
      if (!serviceName) return null;
      let bestKey = null;
      let bestScore = 0;

      Object.keys(testLabels).forEach(key => {
        const score = matchServiceName(serviceName, testLabels[key]);
        if (score > bestScore) {
          bestScore = score;
          bestKey = key;
        }
      });

      return bestScore > 0.5 ? bestKey : null;
    };

    // Gợi ý dịch vụ dựa trên diagnosis (giữ nguyên)
    useEffect(() => {
      const trimmedDiagnosis = diagnosis?.trim();
      if (!trimmedDiagnosis || trimmedDiagnosis.length < 3) {
        setServiceSuggestions([]);
        return;
      }

      setServiceLoading(true);
      const timeout = setTimeout(async () => {
        const fetchUrl = `${API_BASE_URL}/api/doctor/ai/suggestion?diagnosis=${encodeURIComponent(trimmedDiagnosis)}&type=service`;

        try {
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
          setToast({
            show: true,
            message: `Lỗi gợi ý dịch vụ: ${err.message}`,
            variant: "danger",
          });
          setServiceSuggestions([]);
        } finally {
          setServiceLoading(false);
        }
      }, 800);

      return () => clearTimeout(timeout);
    }, [diagnosis, setToast]);

    const handleTestChange = (serviceId) => (e) => {
      setservices({ ...services, [serviceId]: e.target.checked });
    };

    const handleRequestService = () => {
      const selected = Object.keys(services).filter((k) => services[k]);
      if (selected.length === 0) {
        setToast({
          show: true,
          message: "⚠️ Bạn chưa chọn dịch vụ nào.",
          variant: "warning",
        });
        return;
      }

      const updated = { ...requestedservices };
      selected.forEach((id) => (updated[id] = true));
      setRequestedservices(updated);

      setToast({
        show: true,
        message: "✅ Đã gửi yêu cầu thực hiện dịch vụ cận lâm sàng.",
        variant: "success",
      });
    };

    // Render checkboxes động từ currentItems, chia 2 cột (Row + Col md={6}), 4 items/trang (2 rows mỗi cột)
    const renderServices = () => {
      const half = Math.ceil(currentItems.length / 2);
      const leftColumn = currentItems.slice(0, half);
      const rightColumn = currentItems.slice(half);

      return (
        <Row>
          <Col md={6}>
            {leftColumn.map((service) => (
              <div key={service.ServiceId} className="d-flex justify-content-between align-items-center mb-2">
                <Form.Check
                  type="checkbox"
                  label={`${service.ServiceName} - ${service.Price ? service.Price.toLocaleString() + ' VNĐ' : ''}`}
                  checked={services[service.ServiceId] || false}
                  onChange={handleTestChange(service.ServiceId)}
                  disabled={isFormDisabled}
                />
                {requestedservices[service.ServiceId] && (
                  <Badge bg="success" pill className="ms-2">
                    ✅ Đã yêu cầu
                  </Badge>
                )}
              </div>
            ))}
          </Col>
          <Col md={6}>
            {rightColumn.map((service) => (
              <div key={service.ServiceId} className="d-flex justify-content-between align-items-center mb-2">
                <Form.Check
                  type="checkbox"
                  label={`${service.ServiceName} - ${service.Price ? service.Price.toLocaleString() + ' VNĐ' : ''}`}
                  checked={services[service.ServiceId] || false}
                  onChange={handleTestChange(service.ServiceId)}
                  disabled={isFormDisabled}
                />
                {requestedservices[service.ServiceId] && (
                  <Badge bg="success" pill className="ms-2">
                    ✅ Đã yêu cầu
                  </Badge>
                )}
              </div>
            ))}
          </Col>
        </Row>
      );
    };

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
                                  const isCurrentlyChecked = services[serviceKey];
                                  setservices(prev => ({ ...prev, [serviceKey]: !isCurrentlyChecked }));
                                  setToast({
                                    show: true,
                                    message: `✅ Đã ${!isCurrentlyChecked ? 'chọn' : 'bỏ chọn'} dịch vụ "${serviceName}" (match với ${testLabels[serviceKey]}).`,
                                    variant: "success",
                                  });
                                } else {
                                  setToast({
                                    show: true,
                                    message: `⚠️ Không tìm thấy dịch vụ tương ứng cho "${serviceName}". Vui lòng chọn thủ công.`,
                                    variant: "warning",
                                  });
                                }
                              }}
                            >
                              {serviceKey ? (services[serviceKey] ? "✓ Đã chọn" : "+ Chọn") : "Không khả dụng"}
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
                  {renderServices()} {/*  Render 2 cột với pagination */}
                  <Pagination
                    pageCount={pageCount}
                    onPageChange={handlePageChange}
                    currentPage={currentPage}
                    isLoading={localServicesLoading}
                  /> {/*  Custom Pagination */}
                </>
              )}
            </Form.Group>

            <div className="text-end">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleRequestService}
                disabled={isFormDisabled || Object.values(services).every(v => !v)}
                className="no-print"
              >
                🧾 Yêu cầu thực hiện dịch vụ đã chọn
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => printDocument('service')}
                disabled={!selectedTodayPatient || !Object.values(services).some(Boolean)}
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

  export default ServicesSection;