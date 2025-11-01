import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Collapse,
  Badge,
  ButtonGroup,
  Spinner,
  Alert,
  Modal
} from "react-bootstrap";

const API_BASE_URL = "http://localhost:8000";

const DoctorSchedule = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("month"); // today | week | month
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const DOCTOR_ID = 4;

  // Fetch lịch bác sĩ
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_BASE_URL}/api/doctor/schedules/${DOCTOR_ID}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        setEvents(result.data || []);
        setSuccess(`✅ Đã tải ${result.data?.length || 0} lịch làm việc`);
        
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error("Error fetching schedule:", error);
        setError('❌ Không thể tải lịch làm việc. Vui lòng thử lại.');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  // Điều hướng tháng
  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  // Hàm lấy đầu tuần (Thứ 2)
  const getWeekStart = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2 là đầu tuần
    return new Date(date.setDate(diff));
  };

  // Lọc events theo view mode
  const getFilteredEvents = () => {
    const today = new Date();
    const todayStr = today.toDateString();

    if (viewMode === "today") {
      return events.filter(e => new Date(e.date).toDateString() === todayStr);
    } else if (viewMode === "week") {
      const weekStart = getWeekStart(new Date(today));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Thứ 2 đến Chủ nhật
      
      return events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });
    } else {
      // Month view - lọc trong component calendar
      return events;
    }
  };

  const filteredEvents = getFilteredEvents();

  // Thống kê
  const totalAppointments = events.length;
  const availableSlots = events.filter(e => e.IsAvailable).length;
  const bookedAppointments = events.filter(e => !e.IsAvailable).length;
  const todayAppointments = events.filter(e => 
    new Date(e.date).toDateString() === new Date().toDateString()
  ).length;

  // Mở modal xem chi tiết
  const openModal = (date, dailyEvents) => {
    setSelectedDate(date);
    setSelectedEvents(dailyEvents);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // Hàm tạo lịch tháng
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Bắt đầu từ Thứ 2 (1) thay vì Chủ nhật (0)
    const startDate = new Date(firstDay);
    const firstDayOfWeek = firstDay.getDay();
    const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    const calendar = [];
    const currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateString = currentDate.toISOString().split('T')[0];
        const daySchedule = events.filter(item => item.date === dateString);
        const isCurrentMonth = currentDate.getMonth() === month;
        
        weekDays.push({
          date: new Date(currentDate),
          dateString,
          isCurrentMonth,
          schedule: daySchedule
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      calendar.push(weekDays);
    }
    
    return calendar;
  };

  const calendar = generateCalendar();
  // Thay đổi thứ tự ngày: Thứ 2 đến Chủ nhật
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const getStatusVariant = (isAvailable) => {
    return isAvailable ? "warning" : "success";
  };

  const getStatusText = (isAvailable) => {
    return isAvailable ? "Trống" : "Đã đặt";
  };

  // Hàm mở chỉ đường (Google Maps)
  const openDirections = () => {
    // Thay bằng địa chỉ phòng khám thực tế
    const clinicAddress = "Phòng+Khám+Đa+Khoa+XYZ,+Hà+Nội";
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${clinicAddress}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="section active" id="schedule">
      <Row className="g-4">
        {/* Thông tin bác sĩ */}
        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary bg-gradient text-white py-3">
              <div className="d-flex align-items-center">
                <i className="fas fa-user-md fa-lg me-3"></i>
                <div>
                  <h4 className="mb-0 fw-bold">Thông Tin Bác Sĩ</h4>
                  <small className="opacity-75">Thông tin cá nhân và chuyên môn</small>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="g-4">
                <Col md={6}>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary bg-opacity-10 rounded p-3 me-3">
                      <i className="fas fa-id-card text-primary fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Họ và tên</small>
                      <strong className="text-dark fs-6">Bác sĩ Trần Thị B</strong>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-success bg-opacity-10 rounded p-3 me-3">
                      <i className="fas fa-briefcase text-success fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Chuyên khoa</small>
                      <strong className="text-dark fs-6">Nội tổng quát</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-info bg-opacity-10 rounded p-3 me-3">
                      <i className="fas fa-stethoscope text-info fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Kinh nghiệm</small>
                      <strong className="text-dark fs-6">8 năm</strong>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-warning bg-opacity-10 rounded p-3 me-3">
                      <i className="fas fa-calendar-plus text-warning fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Mã bác sĩ</small>
                      <strong className="text-dark fs-6">BS-{DOCTOR_ID}</strong>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Thống kê nhanh */}
        <Col md={12}>
          <Row className="g-3">
            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Tổng Lịch</h6>
                      <h2 className="fw-bold text-primary mb-0">{totalAppointments}</h2>
                      <small className="text-muted">Tất cả lịch</small>
                    </div>
                    <div className="bg-primary bg-opacity-10 p-3 rounded">
                      <i className="fas fa-calendar-alt fa-2x text-primary"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Khám Hôm Nay</h6>
                      <h2 className="fw-bold text-success mb-0">{todayAppointments}</h2>
                      <small className="text-muted">Lịch khám hôm nay</small>
                    </div>
                    <div className="bg-success bg-opacity-10 p-3 rounded">
                      <i className="fas fa-user-md fa-2x text-success"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Đã Đặt Lịch</h6>
                      <h2 className="fw-bold text-warning mb-0">{bookedAppointments}</h2>
                      <small className="text-muted">Lịch đã đặt</small>
                    </div>
                    <div className="bg-warning bg-opacity-10 p-3 rounded">
                      <i className="fas fa-clock fa-2x text-warning"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xxl={3} lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-2">Lịch Trống</h6>
                      <h2 className="fw-bold text-info mb-0">{availableSlots}</h2>
                      <small className="text-muted">Có thể đặt lịch</small>
                    </div>
                    <div className="bg-info bg-opacity-10 p-3 rounded">
                      <i className="fas fa-calendar-plus fa-2x text-info"></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Lịch làm việc */}
        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-success bg-gradient text-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <i className="fas fa-calendar-alt fa-lg me-3"></i>
                  <div>
                    <h4 className="mb-0 fw-bold">Lịch Làm Việc</h4>
                    <small className="opacity-75">
                      {viewMode === 'month' ? 'Lịch làm việc tháng' : 
                       viewMode === 'week' ? 'Lịch làm việc tuần (Thứ 2 - Chủ nhật)' : 'Lịch làm việc hôm nay'}
                    </small>
                  </div>
                </div>
                <Badge bg="light" text="dark" className="fs-6">
                  <i className="fas fa-list me-1"></i>
                  {events.length} lịch trình
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {/* Thông báo */}
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                  {success}
                </Alert>
              )}

              {/* Bộ lọc chế độ xem + điều hướng tháng */}
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <ButtonGroup>
                  <Button
                    variant={viewMode === "today" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("today")}
                    size="sm"
                    className="px-3"
                  >
                    <i className="fas fa-calendar-day me-2"></i> 
                    Hôm nay
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("week")}
                    size="sm"
                    className="px-3"
                  >
                    <i className="fas fa-calendar-week me-2"></i> 
                    Tuần này
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("month")}
                    size="sm"
                    className="px-3"
                  >
                    <i className="fas fa-calendar me-2"></i> 
                    Cả tháng
                  </Button>
                </ButtonGroup>

                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => changeMonth(-1)}
                    className="d-flex align-items-center px-3"
                  >
                    <i className="fas fa-chevron-left me-2"></i> 
                    Tháng trước
                  </Button>
                  <div className="bg-light rounded px-4 py-2 mx-2">
                    <strong className="text-primary fs-5">
                      {currentMonth.toLocaleDateString("vi-VN", {
                        month: "long",
                        year: "numeric"
                      })}
                    </strong>
                  </div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => changeMonth(1)}
                    className="d-flex align-items-center px-3"
                  >
                    Tháng sau 
                    <i className="fas fa-chevron-right ms-2"></i>
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" size="lg" />
                  <p className="mt-3 text-muted fs-5">Đang tải lịch làm việc...</p>
                </div>
              ) : (
                <>
                  {/* HIỂN THỊ THEO CHẾ ĐỘ XEM */}
                  {viewMode === "month" ? (
                    // CHẾ ĐỘ XEM LỊCH THÁNG - DẠNG Ô VUÔNG
                    <div className="calendar-month-view">
                      {/* Header các ngày trong tuần (Thứ 2 đến Chủ nhật) */}
                      <div className="row g-0 border-bottom mb-2">
                        {dayNames.map((dayName, index) => (
                          <div key={index} className="col text-center py-2 fw-bold text-muted">
                            {dayName}
                          </div>
                        ))}
                      </div>

                      {/* Các tuần trong tháng */}
                      {calendar.map((week, weekIndex) => (
                        <div key={weekIndex} className="row g-0 border-bottom">
                          {week.map((day, dayIndex) => (
                            <div 
                              key={dayIndex} 
                              className={`col border-end p-2 calendar-day ${
                                !day.isCurrentMonth ? 'bg-light text-muted' : 
                                day.dateString === new Date().toISOString().split('T')[0] ? 'bg-primary bg-opacity-10' : ''
                              }`}
                              style={{ 
                                minHeight: '120px',
                                cursor: day.schedule.length > 0 ? 'pointer' : 'default'
                              }}
                              onClick={() => day.schedule.length > 0 && openModal(day.dateString, day.schedule)}
                            >
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <span className={`fw-semibold ${
                                  day.dateString === new Date().toISOString().split('T')[0] 
                                    ? 'text-primary' 
                                    : ''
                                }`}>
                                  {day.date.getDate()}
                                </span>
                                {day.schedule.length > 0 && (
                                  <Badge bg="success" className="fs-7">
                                    {day.schedule.length}
                                  </Badge>
                                )}
                              </div>

                              {/* Hiển thị lịch trình trong ngày */}
                              <div className="calendar-events">
                                {day.schedule.slice(0, 2).map((event, index) => (
                                  <div 
                                    key={index} 
                                    className="calendar-event mb-1 p-1 rounded small"
                                    style={{
                                      backgroundColor: getStatusVariant(event.IsAvailable) === 'success' 
                                        ? '#d1e7dd' 
                                        : '#fff3cd',
                                      borderLeft: `3px solid var(--bs-${getStatusVariant(event.IsAvailable)})`,
                                      fontSize: '0.7rem'
                                    }}
                                  >
                                    <div className="fw-semibold text-truncate">
                                      {event.StartTime}
                                    </div>
                                    <div className="text-truncate">
                                      {getStatusText(event.IsAvailable)}
                                    </div>
                                  </div>
                                ))}
                                {day.schedule.length > 2 && (
                                  <div className="text-center text-muted small">
                                    +{day.schedule.length - 2} lịch khác
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    // KHÔNG CÓ LỊCH TRÌNH
                    <div className="text-center py-5">
                      <div className="py-4">
                        <i className="fas fa-calendar-times text-muted fa-4x mb-3 opacity-50"></i>
                        <h5 className="text-muted fw-light mb-3">Không có lịch làm việc</h5>
                        <p className="text-muted mb-0">
                          Không có lịch làm việc nào trong khoảng thời gian này.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // CHẾ ĐỘ XEM DANH SÁCH (HÔM NAY/TUẦN)
                    <div className="schedule-list">
                      {filteredEvents.map((event, index) => (
                        <Card key={index} className="border-0 shadow-sm mb-3">
                          <Card.Header 
                            className="bg-white border-bottom-0 py-3"
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              setSelectedDate(
                                selectedDate === event.date ? null : event.date
                              )
                            }
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                                  <i className="fas fa-calendar-day text-primary fa-lg"></i>
                                </div>
                                <div>
                                  <strong className="text-dark d-block fs-6">
                                    {new Date(event.date).toLocaleDateString("vi-VN", {
                                      weekday: "long",
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </strong>
                                  <small className="text-muted">
                                    <i className="fas fa-clock me-1"></i>
                                    {event.StartTime} - {event.EndTime}
                                  </small>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <Badge bg={getStatusVariant(event.IsAvailable)} className="fs-7 px-3 py-2">
                                  {getStatusText(event.IsAvailable)}
                                </Badge>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(
                                      selectedDate === event.date ? null : event.date
                                    );
                                  }}
                                  className="d-flex align-items-center px-3"
                                >
                                  {selectedDate === event.date ? (
                                    <>
                                      <i className="fas fa-chevron-up me-2"></i> 
                                      Thu gọn
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-chevron-down me-2"></i> 
                                      Chi tiết
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </Card.Header>

                          <Collapse in={selectedDate === event.date}>
                            <div>
                              <Card.Body className="bg-light bg-opacity-25 py-4">
                                <Row className="align-items-center">
                                  <Col md={8}>
                                    <div className="d-flex align-items-start">
                                      <div className="bg-info bg-opacity-10 rounded p-2 me-3">
                                        <i className="fas fa-info-circle text-info fa-lg"></i>
                                      </div>
                                      <div>
                                        <h6 className="text-dark mb-2">Chi tiết lịch làm việc</h6>
                                        <div className="d-flex flex-wrap gap-4">
                                          <div>
                                            <small className="text-muted d-block">Thời gian</small>
                                            <strong className="text-dark">
                                              <i className="fas fa-clock text-success me-2"></i>
                                              {event.StartTime} - {event.EndTime}
                                            </strong>
                                          </div>
                                          <div>
                                            <small className="text-muted d-block">Trạng thái</small>
                                            <strong className="text-dark">
                                              <i className="fas fa-circle text-warning me-2"></i>
                                              {getStatusText(event.IsAvailable)}
                                            </strong>
                                          </div>
                                        </div>
                                        {event.title && (
                                          <div className="mt-3">
                                            <small className="text-muted d-block">Ghi chú</small>
                                            <p className="text-dark mb-0">{event.title}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Col>
                                  <Col md={4} className="text-md-end">
                                    <div className="d-flex flex-column gap-2">
                                      <Button 
                                        variant="outline-primary" 
                                        size="sm"
                                        className="d-flex align-items-center justify-content-center"
                                        onClick={openDirections}
                                      >
                                        <i className="fas fa-directions me-2"></i>
                                        Chỉ đường
                                      </Button>
                                      <Button 
                                        variant="outline-success" 
                                        size="sm"
                                        className="d-flex align-items-center justify-content-center"
                                      >
                                        <i className="fas fa-calendar-check me-2"></i>
                                        Xác nhận
                                      </Button>
                                    </div>
                                  </Col>
                                </Row>
                              </Card.Body>
                            </div>
                          </Collapse>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Footer thống kê */}
                  {events.length > 0 && (
                    <div className="mt-4 pt-3 border-top">
                      <Row className="align-items-center">
                        <Col md={6}>
                          <small className="text-muted">
                            <i className="fas fa-info-circle me-2 text-primary"></i>
                            Hiển thị <strong>
                              {viewMode === 'month' ? events.length : filteredEvents.length}
                            </strong> lịch trình
                          </small>
                        </Col>
                        <Col md={6} className="text-md-end">
                          <div className="d-flex justify-content-end gap-3">
                            <small className="text-muted">
                              <Badge bg="success" className="me-1">
                                {bookedAppointments}
                              </Badge> Đã đặt
                            </small>
                            <small className="text-muted">
                              <Badge bg="warning" className="me-1">
                                {availableSlots}
                              </Badge> Còn trống
                            </small>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal chi tiết ngày */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton className="bg-white">
          <Modal.Title className="w-100">
            <i className="fas fa-calendar-day text-primary me-2"></i>
            Chi tiết lịch ngày {selectedDate && new Date(selectedDate).toLocaleDateString("vi-VN")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {selectedEvents.length > 0 ? (
            <div className="p-3">
              {selectedEvents.map((event, idx) => (
                <Card key={idx} className="border-0 shadow-sm mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-clock text-primary me-3 fs-5"></i>
                          <div>
                            <h5 className="mb-1 fw-bold">
                              {event.StartTime} - {event.EndTime}
                            </h5>
                            <Badge 
                              bg={event.IsAvailable ? "warning" : "success"} 
                              className="fs-6"
                            >
                              {event.IsAvailable ? "Trống" : "Đã đặt lịch khám"}
                            </Badge>
                          </div>
                        </div>
                        {event.title && (
                          <div className="bg-light rounded p-3 mt-2">
                            <h6 className="text-muted mb-2">Ghi chú:</h6>
                            <p className="mb-0">{event.title}</p>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        className="ms-3"
                        onClick={openDirections}
                      >
                        <i className="fas fa-directions me-2"></i>
                        Chỉ đường
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-calendar-times fa-4x text-muted mb-3 opacity-50"></i>
              <h5 className="text-muted">Không có lịch</h5>
              <p className="text-muted">Không có lịch trong ngày này</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal} className="px-4">
            <i className="fas fa-times me-2"></i>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DoctorSchedule;