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
      const today = new Date().toISOString().split("T")[0];
      filteredEvents = events.filter((e) => e.date === today);
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
          (a, b) => new Date(`1970-01-01T${a.time}`) - new Date(`1970-01-01T${b.time}`)
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

  return (
    <div className={`section ${currentSection === "schedule" ? "active" : ""}`} id="schedule">
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
          <h5 className="mb-0">📅 Lịch Làm Việc Bác sĩ ID {DOCTOR_ID}</h5>
        </Card.Header>

        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted">Đang tải lịch làm việc...</p>
            </div>
          ) : (
            <>
              {/* Bộ lọc */}
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
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
                    <Button variant="outline-primary me-2" onClick={prevMonth}>
                      &lt; Tháng trước
                    </Button>
                    <h6 className="mb-0 mx-3">
                      Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
                    </h6>
                    <Button variant="outline-primary" onClick={nextMonth}>
                      Tháng sau &gt;
                    </Button>
                  </div>
                )}
              </div>

              {/* Danh sách lịch */}
              {filterMode === "month" ? (
                // 🗓 Dạng lưới cả tháng
                <Row className="border">
                  {Array.from({ length: 42 }).map((_, i) => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const startDay = firstDay.getDay() || 7;
                    const currentDay = i - startDay + 2;
                    const current = new Date(year, month, currentDay);
                    const isCurrentMonth = current.getMonth() === month;
                    const isoDate = current.toISOString().split("T")[0];
                    const dailyEvents = events.filter((e) => e.date === isoDate);

                    return (
                      <Col
                        key={i}
                        xs={12}
                        sm={6}
                        md={2}
                        lg={2}
                        className={`p-2 border ${
                          isCurrentMonth ? "bg-white" : "bg-light text-muted"
                        }`}
                        style={{ minHeight: "120px", cursor: "pointer" }}
                        onClick={() => dailyEvents.length > 0 && openModal(isoDate, dailyEvents)}
                      >
                        <div className="d-flex justify-content-between">
                          <strong>{currentDay > 0 ? currentDay : ""}</strong>
                        </div>
                        {dailyEvents.length > 0 ? (
                          <div className="mt-2">
                            {dailyEvents.map((e, idx) => (
                              <div key={idx} className="small mb-1">
                                🕒 {e.StartTime} - {e.EndTime} <br />
                                <Badge bg={e.IsAvailable ? "success" : "secondary"}>
                                  {e.IsAvailable ? "Available" : "Busy"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <small className="text-muted">Không có lịch</small>
                        )}
                      </Col>
                    );
                  })}
                </Row>
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
                        onClick={() =>
                          setSelectedDate(selectedDate === date ? null : date)
                        }
                      >
                        {selectedDate === date ? "Ẩn" : "Xem"}
                      </Button>
                    </Card.Header>

                    <Collapse in={selectedDate === date}>
                      <div>
                        <ListGroup variant="flush">
                          {events.map((event) => (
                            <ListGroup.Item
                              key={event.id}
                              className="d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <h6 className="mb-1">
                                  🕓 {event.time} - {event.title}
                                </h6>
                                <small className="text-muted">{event.description}</small>
                              </div>
                              <Badge bg={event.type === "work" ? "success" : "info"}>
                                {event.type === "work" ? "Lịch khám" : "Lịch cá nhân"}
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
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            📅 Chi tiết ngày {selectedDate && new Date(selectedDate).toLocaleDateString("vi-VN")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvents.length > 0 ? (
            <ListGroup>
              {selectedEvents.map((e, idx) => (
                <ListGroup.Item key={idx}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">
                        🕓 {e.StartTime} - {e.EndTime}
                      </h6>
                      <small className="text-muted">
                        {e.IsAvailable ? "Có sẵn" : "Bận"}
                      </small>
                    </div>
                    <Badge bg={e.IsAvailable ? "success" : "secondary"}>
                      {e.IsAvailable ? "Available" : "Busy"}
                    </Badge>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-muted mb-0">Không có lịch trong ngày này.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ScheduleSection;
