import React, { useState } from "react";
import { Card, Button, ListGroup, Badge, ButtonGroup, Collapse } from "react-bootstrap";

const ScheduleSection = ({
  currentSection,
  events,
  currentDate,
  prevMonth,
  nextMonth,
}) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterMode, setFilterMode] = useState("month"); // today | week | month

  // Lấy ngày đầu và cuối tuần hiện tại
  const getWeekRange = (date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

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
      // Lọc theo tháng hiện tại
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();
      filteredEvents = events.filter((event) => {
        const eventDate = new Date(event.date);
        return (
          eventDate.getMonth() === month && eventDate.getFullYear() === year
        );
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
          (a, b) =>
            new Date(`1970-01-01T${a.time}`) -
            new Date(`1970-01-01T${b.time}`)
        ),
      }));
  };

  const groupedEvents = groupEventsByDate();

  return (
    <div
      className={`section ${currentSection === "schedule" ? "active" : ""}`}
      id="schedule"
    >
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
          <h5 className="mb-0">📅 Lịch Làm Việc</h5>
        </Card.Header>

        <Card.Body>
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
          {groupedEvents.length === 0 ? (
            <p className="text-muted text-center mt-4">
              Không có lịch làm việc trong khoảng thời gian này.
            </p>
          ) : (
            groupedEvents.map(({ date, events }) => (
              <Card key={date} className="mb-3 border-0 shadow-sm">
                <Card.Header
                  className="bg-light d-flex justify-content-between align-items-center"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    setSelectedDate(selectedDate === date ? null : date)
                  }
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
                            <small className="text-muted">
                              {event.description}
                            </small>
                          </div>
                          <Badge
                            bg={event.type === "work" ? "success" : "info"}
                          >
                            {event.type === "work"
                              ? "Lịch khám"
                              : "Lịch cá nhân"}
                          </Badge>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                </Collapse>
              </Card>
            ))
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ScheduleSection;
