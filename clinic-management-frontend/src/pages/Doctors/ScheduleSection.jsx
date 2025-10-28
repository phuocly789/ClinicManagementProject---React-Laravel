import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  ListGroup,
  Badge,
  ButtonGroup,
  Collapse,
  Spinner,
  Row,
  Col,
  Modal,
  Container
} from "react-bootstrap";

const API_BASE_URL = "http://localhost:8000";

const ScheduleSection = ({ currentSection, currentDate, prevMonth, nextMonth }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterMode, setFilterMode] = useState("month");
  const [showModal, setShowModal] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const DOCTOR_ID = 4;

  // Fetch lịch bác sĩ ID 4 từ API
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/doctor/schedules/${DOCTOR_ID}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        setEvents(result.data || []);
      } catch (error) {
        console.error("Error fetching schedule:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  // Lấy ngày đầu/cuối tuần hiện tại
  const getWeekRange = (date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  // Group events by date
  const groupEventsByDate = () => {
    let filteredEvents = events;

    if (filterMode === "today") {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      filteredEvents = events.filter((e) => e.date === todayStr);
    } else if (filterMode === "week") {
      const { start, end } = getWeekRange(new Date());
      filteredEvents = events.filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });
    } else {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();
      filteredEvents = events.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate.getMonth() === month && eventDate.getFullYear() === year;
      });
    }

    const grouped = {};
    filteredEvents.forEach((event) => {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    });

    return Object.keys(grouped)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((date) => ({
        date,
        events: grouped[date].sort(
          (a, b) => new Date(`1970-01-01T${a.StartTime}`) - new Date(`1970-01-01T${b.StartTime}`)
        ),
      }));
  };

  const groupedEvents = groupEventsByDate();

  // Mở modal xem chi tiết ngày
  const openModal = (date, dailyEvents) => {
    setSelectedDate(date);
    setSelectedEvents(dailyEvents);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // Tạo header cho các ngày trong tuần
  const renderWeekHeaders = () => {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return (
      <Row className="g-0">
        {days.map((day, idx) => (
          <Col
            key={idx}
            className="text-center fw-bold py-3 border-end bg-light bg-gradient"
          >
            <small className="text-dark">{day}</small>
          </Col>
        ))}
      </Row>
    );
  };

  // Tính toán số ô cho lưới (6 hàng x 7 cột = 42)
  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysInMonth = lastDay.getDate();
    const totalCells = 42; // 6 tuần
    const emptyCellsBefore = startDay; // Số ô trống trước ngày 1 (từ CN)

    const cells = [];

    // Ô trống trước (tháng trước)
    for (let i = 0; i < emptyCellsBefore; i++) {
      cells.push(null);
    }

    // Các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }

    // Ô trống sau để đủ 42 (tháng sau)
    while (cells.length < totalCells) {
      cells.push(null);
    }

    // Lấy ngày hôm nay local
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

    // Chia cells thành 6 hàng (tuần)
    const weeks = [];
    for (let i = 0; i < 6; i++) {
      weeks.push(cells.slice(i * 7, (i + 1) * 7));
    }

    return weeks.map((week, weekIndex) => (
      <Row key={weekIndex} className="g-0 border-bottom">
        {week.map((dayNum, dayIndex) => {
          if (dayNum === null) {
            return (
              <Col
                key={dayIndex}
                className="p-2 border-end bg-light bg-opacity-25"
                style={{ minHeight: '120px' }}
              >
                <div className="h-100 d-flex align-items-center justify-content-center">
                  <small className="text-muted opacity-50">&nbsp;</small>
                </div>
              </Col>
            );
          }

          const currentDateObj = new Date(year, month, dayNum);
          const yearStr = currentDateObj.getFullYear();
          const monthStr = String(currentDateObj.getMonth() + 1).padStart(2, '0');
          const dayStr = String(currentDateObj.getDate()).padStart(2, '0');
          const isoDate = `${yearStr}-${monthStr}-${dayStr}`;
          const dailyEvents = events.filter((e) => e.date === isoDate);
          const isToday = isoDate === todayStr;

          return (
            <Col
              key={dayIndex}
              className={`p-2 border-end d-flex flex-column ${
                isToday ? "bg-primary bg-opacity-10 border-start border-primary border-3" : ""
              } ${
                dailyEvents.length > 0 ? "cursor-pointer" : ""
              }`}
              style={{ minHeight: '120px' }}
              onClick={() => dailyEvents.length > 0 && openModal(isoDate, dailyEvents)}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className={`fw-bold ${
                  isToday ? "text-primary" : "text-dark"
                }`}>
                  {dayNum}
                </span>
                <small className="text-muted text-uppercase">
                  {currentDateObj.toLocaleDateString("vi-VN", { weekday: "narrow" })}
                </small>
              </div>
              
              {dailyEvents.length > 0 ? (
                <div className="flex-grow-1">
                  {dailyEvents.slice(0, 2).map((e, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="bg-white rounded border-0 p-2 shadow-sm">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="fw-semibold text-dark text-truncate">
                            {e.StartTime}
                          </small>
                          <Badge 
                            bg={e.IsAvailable ? "outline-secondary" : "success"} 
                            className="ms-1"
                          >
                            {e.IsAvailable ? "Trống" : "Lịch khám"}
                          </Badge>
                        </div>
                        {e.title && (
                          <small className="text-muted d-block mt-1 text-truncate">
                            {e.title}
                          </small>
                        )}
                      </div>
                    </div>
                  ))}
                  {dailyEvents.length > 2 && (
                    <div className="text-center mt-2">
                      <Badge bg="light" text="dark" className="px-2">
                        +{dailyEvents.length - 2} lịch
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                  <small className="text-muted opacity-75">Trống</small>
                </div>
              )}
            </Col>
          );
        })}
      </Row>
    ));
  };

  if (currentSection !== "schedule") return null;

  return (
    <Container fluid className="py-3">
      <Card className="border-0 shadow-lg">
        <Card.Header className="bg-primary text-white py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="bi bi-calendar3 me-3 fs-4"></i>
              <div>
                <h4 className="mb-0 fw-bold">Lịch Làm Việc</h4>
                <small className="opacity-75">Bác sĩ ID {DOCTOR_ID}</small>
              </div>
            </div>
            <Badge bg="light" text="dark" className="fs-6 px-3 py-2">
              {events.length} lịch
            </Badge>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="lg" />
              <p className="text-muted mt-3 fs-5">Đang tải lịch làm việc...</p>
            </div>
          ) : (
            <>
              {/* Bộ lọc */}
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <ButtonGroup>
                  <Button
                    variant={filterMode === "today" ? "primary" : "outline-primary"}
                    size="sm"
                    onClick={() => setFilterMode("today")}
                  >
                    Hôm nay
                  </Button>
                  <Button
                    variant={filterMode === "week" ? "primary" : "outline-primary"}
                    size="sm"
                    onClick={() => setFilterMode("week")}
                  >
                    Tuần này
                  </Button>
                  <Button
                    variant={filterMode === "month" ? "primary" : "outline-primary"}
                    size="sm"
                    onClick={() => setFilterMode("month")}
                  >
                    Tháng này
                  </Button>
                </ButtonGroup>

                {filterMode === "month" && (
                  <div className="d-flex align-items-center gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={prevMonth}
                      className="d-flex align-items-center justify-content-center border"
                      style={{ width: '40px', height: '40px' }}
                    >
                     &lt; <i className="bi bi-chevron-left"></i>
                    </Button>
                    <h5 className="mb-0 mx-3 text-primary fw-bold">
                      Tháng {currentDate.getMonth() + 1}/{currentDate.getFullYear()}
                    </h5>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={nextMonth}
                      className="d-flex align-items-center justify-content-center border"
                      style={{ width: '40px', height: '40px' }}
                    >
                      &gt;<i className="bi bi-chevron-right"></i> 
                    </Button>
                  </div>
                )}
              </div>

              {/* Danh sách lịch */}
              {filterMode === "month" ? (
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-0">
                    {/* Week Headers */}
                    {renderWeekHeaders()}
                    
                    {/* Calendar Grid */}
                    {renderMonthGrid()}
                  </Card.Body>
                </Card>
              ) : groupedEvents.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x text-muted mb-3" style={{ fontSize: '4rem' }}></i>
                  <h5 className="text-muted">Không có lịch làm việc</h5>
                  <p className="text-muted">Không có lịch làm việc trong khoảng thời gian này</p>
                </div>
              ) : (
                <div className="row g-3">
                  {groupedEvents.map(({ date, events }) => (
                    <div key={date} className="col-12">
                      <Card className="border-0 shadow-sm">
                        <Card.Header 
                          className="bg-light bg-gradient"
                          onClick={() => setSelectedDate(selectedDate === date ? null : date)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-calendar-date text-primary me-3"></i>
                              <div>
                                <h6 className="mb-0 fw-bold text-dark">
                                  {new Date(date).toLocaleDateString("vi-VN", {
                                    weekday: "long",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </h6>
                                <small className="text-muted">
                                  {events.length} lịch làm việc
                                </small>
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(selectedDate === date ? null : date);
                              }}
                              className="d-flex align-items-center justify-content-center rounded-pill"
                              style={{ width: '36px', height: '36px' }}
                            >
                              {selectedDate === date ? (
                                <i className="bi bi-chevron-up text-white"></i>
                              ) : (
                                <i className="bi bi-chevron-down text-white"></i>
                              )}
                              Xem
                            </Button>
                          </div>
                        </Card.Header>

                        <Collapse in={selectedDate === date}>
                          <div>
                            <ListGroup variant="flush">
                              {events.map((event, idx) => (
                                <ListGroup.Item
                                  key={idx}
                                  className="d-flex justify-content-between align-items-center py-3 border-bottom"
                                >
                                  <div className="d-flex align-items-center">
                                    <i className="bi bi-clock text-primary me-3"></i>
                                    <div>
                                      <h6 className="mb-1 fw-semibold">
                                        {event.StartTime || event.time} - {event.EndTime}
                                      </h6>
                                      <small className="text-muted">
                                        {event.title || 'Lịch làm việc'}
                                      </small>
                                    </div>
                                  </div>
                                  <Badge 
                                    bg={event.IsAvailable ? "outline-secondary" : "success"}
                                    className="px-3"
                                  >
                                    {event.IsAvailable ? "Trống" : "Lịch khám"}
                                  </Badge>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          </div>
                        </Collapse>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal chi tiết ngày */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="w-100 text-center">
            <i className="bi bi-calendar-date text-primary me-2"></i>
            Chi tiết ngày {selectedDate && new Date(selectedDate).toLocaleDateString("vi-VN")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {selectedEvents.length > 0 ? (
            <ListGroup variant="flush">
              {selectedEvents.map((event, idx) => (
                <ListGroup.Item key={idx} className="p-4 border-bottom">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-3">
                        <i className="bi bi-clock-fill text-primary me-3 fs-4"></i>
                        <div>
                          <h5 className="mb-1 fw-bold">
                            {event.StartTime || event.tme} - {event.EndTime || event.title}
                          </h5>
                          <Badge bg={event.IsAvailable ? "outline-secondary" : "success"} className="fs-6">
                            {event.IsAvailable ? "Trống" : "Lịch khám"}
                          </Badge>
                        </div>
                      </div>
                      {event.title && (
                        <div className="bg-light rounded p-3">
                          <h6 className="text-muted mb-2">Thông tin:</h6>
                          <p className="mb-0">{event.time}</p>
                          <p className="mb-0">{event.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x text-muted mb-3" style={{ fontSize: '4rem' }}></i>
              <h5 className="text-muted">Không có lịch</h5>
              <p className="text-muted">Không có lịch trong ngày này</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal} className="px-4">
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ScheduleSection;