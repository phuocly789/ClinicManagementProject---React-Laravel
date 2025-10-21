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
      <Row className="g-0 border-bottom border-top mb-0">
        {days.map((day, idx) => (
          <Col
            key={idx}
            className="month-grid-col text-center fw-bold text-primary py-2 border-start border-end"
            style={{ minHeight: "40px" }}
          >
            {day}
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

    return cells.map((dayNum, i) => {
      if (dayNum === null) {
        return (
          <Col
            key={i}
            className="month-grid-col p-2 border-start border-end border-bottom bg-light text-muted"
            style={{ minHeight: "100px" }}
          >
            <div className="h-100 d-flex align-items-center justify-content-center">
              <small>&nbsp;</small>
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
          key={i}
          className={`month-grid-col p-2 border-start border-end border-bottom d-flex flex-column ${isToday ? "border-info" : ""} ${dailyEvents.length > 0 ? "border-primary" : ""}`}
          style={{ 
            minHeight: "100px", 
            cursor: dailyEvents.length > 0 ? "pointer" : "default"
          }}
          onClick={() => dailyEvents.length > 0 && openModal(isoDate, dailyEvents)}
        >
          <div className="d-flex justify-content-between align-items-start mb-1">
            <strong className={`mb-0 ${isToday ? "text-primary fw-bold" : ""}`}>{dayNum}</strong>
            <small className="text-muted">
              {currentDateObj.toLocaleDateString("vi-VN", { weekday: "short" })}
            </small>
          </div>
          {dailyEvents.length > 0 ? (
            <div className="flex-grow-1 small overflow-auto">
              {dailyEvents.slice(0, 2).map((e, idx) => (
                <div key={idx} className="mb-1 p-1 bg-light rounded small">
                  <div className="fw-bold text-truncate d-block" title={e.title || `${e.StartTime} - ${e.EndTime}`}>
                    {e.title ? e.title : `${e.StartTime} - ${e.EndTime}`}
                  </div>
                  {e.IsAvailable !== undefined && (
                    <Badge 
                      bg={e.IsAvailable ? "secondary" : "success"} 
                      className="mt-1 small d-block"
                      style={{ fontSize: "0.7em" }}
                    >
                      {e.IsAvailable ? "Trống" : "Lịch khám"}
                    </Badge>
                  )}
                </div>
              ))}
              {dailyEvents.length > 2 && (
                <small className="text-muted d-block">+{dailyEvents.length - 2} lịch khác</small>
              )}
            </div>
          ) : (
            <div className="flex-grow-1 d-flex align-items-end pb-1">
              <small className="text-muted">Không có lịch</small>
            </div>
          )}
        </Col>
      );
    });
  };

  return (
    <div className={`section ${currentSection === "schedule" ? "active" : ""}`} id="schedule">
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
          <h5 className="mb-0">📅 Lịch Làm Việc Bác sĩ ID {DOCTOR_ID}</h5>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted">Đang tải lịch làm việc...</p>
            </div>
          ) : (
            <>
              {/* Bộ lọc */}
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap px-3 pt-3">
                <ButtonGroup className="mb-2">
                  <Button
                    variant={filterMode === "today" ? "primary" : "outline-primary"}
                    onClick={() => setFilterMode("today")}
                  >
                    Hôm nay
                  </Button>
                  <Button
                    variant={filterMode === "week" ? "primary" : "outline-primary"}
                    onClick={() => setFilterMode("week")}
                  >
                    Tuần này
                  </Button>
                  <Button
                    variant={filterMode === "month" ? "primary" : "outline-primary"}
                    onClick={() => setFilterMode("month")}
                  >
                    Cả tháng
                  </Button>
                </ButtonGroup>

                {filterMode === "month" && (
                  <div className="d-flex align-items-center">
                    <Button variant="outline-primary me-2" onClick={prevMonth} size="sm">
                      &lt; Tháng trước
                    </Button>
                    <h6 className="mb-0 mx-3">
                      Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
                    </h6>
                    <Button variant="outline-primary" onClick={nextMonth} size="sm">
                      Tháng sau &gt;
                    </Button>
                  </div>
                )}
              </div>

              {/* Danh sách lịch */}
              {filterMode === "month" ? (
                // 🗓 Dạng lưới cả tháng với 7 cột
                <div className="border rounded overflow-hidden">
                  {renderWeekHeaders()}
                  <Row className="g-0 mb-0">
                    {renderMonthGrid()}
                  </Row>
                </div>
              ) : groupedEvents.length === 0 ? (
                <p className="text-muted text-center mt-4">
                  Không có lịch làm việc trong khoảng thời gian này.
                </p>
              ) : (
                groupedEvents.map(({ date, events }) => (
                  <Card key={date} className="mb-3 border-0 shadow-sm">
                    <Card.Header
                      className="bg-light d-flex justify-content-between align-items-center"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedDate(selectedDate === date ? null : date)}
                    >
                      <strong>
                        {new Date(date).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </strong>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(selectedDate === date ? null : date);
                        }}
                      >
                        {selectedDate === date ? "Ẩn" : "Xem"}
                      </Button>
                    </Card.Header>

                    <Collapse in={selectedDate === date}>
                      <div>
                        <ListGroup variant="flush">
                          {events.map((event, idx) => (
                            <ListGroup.Item
                              key={idx}
                              className="d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <h6 className="mb-1">
                                  🕓 {event.StartTime || event.time} - {event.EndTime || event.title}
                                </h6>
                                <small className="text-muted">
                                  {event.title ? `Tên: ${event.title}` : event.description}
                                </small>
                              </div>
                              <Badge bg={event.IsAvailable ? "secondary" : "success"}>
                                {event.IsAvailable ? "Trống" : "Lịch khám"}
                              </Badge>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    </Collapse>
                  </Card>
                ))
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal chi tiết ngày */}
      <Modal 
        show={showModal} 
        onHide={closeModal} 
        centered 
        size="lg"
        dialogClassName="modal-dialog-centered"
        contentClassName="modal-content-centered"
      >
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="w-100 text-center">
            📅 Chi tiết ngày {selectedDate && new Date(selectedDate).toLocaleDateString("vi-VN")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          {selectedEvents.length > 0 ? (
            <ListGroup className="w-100">
              {selectedEvents.map((e, idx) => (
                <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1 pe-2">
                    <h6 className="mb-1">
                      🕓 {e.StartTime || e.time} - {e.EndTime || e.title}
                    </h6>
                    <small className="text-muted d-block mb-1">
                      {e.title ? `Tên: ${e.title}` : ""} {e.IsAvailable ? "Trống" : "Lịch khám"}
                    </small>
                  </div>
                  <Badge bg={e.IsAvailable ? "secondary" : "success"} className="flex-shrink-0">
                    {e.IsAvailable ? "Trống" : "Lịch khám"}
                  </Badge>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-muted mb-0 text-center">Không có lịch trong ngày này.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top justify-content-center">
          <Button variant="secondary" onClick={closeModal} className="px-4">
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ScheduleSection;