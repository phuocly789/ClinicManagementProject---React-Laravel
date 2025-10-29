import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Collapse,
  ListGroup,
  Badge,
  ButtonGroup,
} from "react-bootstrap";

const ScheduleSection = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("month"); // today | week | month
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Danh sách lịch làm việc mẫu
  const workSchedule = [
    {
      date: "2025-10-07",
      location: "Phòng Khám Đa Khoa Trung Tâm",
      time: "08:00 - 17:00",
    },
    {
      date: "2025-10-08",
      location: "Phòng Xét Nghiệm Hóa Sinh",
      time: "07:30 - 16:30",
    },
    {
      date: "2025-10-09",
      location: "Phòng Xét Nghiệm Vi Sinh",
      time: "08:00 - 12:00",
    },
    {
      date: "2025-10-10",
      location: "Phòng Xét Nghiệm Huyết Học",
      time: "13:00 - 17:00",
    },
  ];

  // Điều hướng tháng
  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  // Lọc lịch theo tháng hiện tại
  const filteredSchedule = workSchedule.filter((item) => {
    const itemDate = new Date(item.date);
    return (
      itemDate.getMonth() === currentMonth.getMonth() &&
      itemDate.getFullYear() === currentMonth.getFullYear()
    );
  });

  return (
    <div className="section active" id="schedule">
      <Row>
        {/* Thông tin kỹ thuật viên */}
        <Col md={12}>
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h3 className="mb-0">
                <i className="fas fa-user-cog me-2"></i> Thông Tin Kỹ Thuật Viên
              </h3>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Họ tên:</strong> Trần Văn Hùng
                  </p>
                  <p className="mb-2">
                    <strong>Chức vụ:</strong> Kỹ Thuật Viên Thiết Bị Y Tế
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Phòng ban:</strong> Phòng Kỹ Thuật
                  </p>
                  <p className="mb-0">
                    <strong>Ngày vào làm:</strong> 15/03/2023
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Lịch làm việc */}
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-calendar-alt me-2"></i> Lịch Làm Việc
                </h5>
              </div>
            </Card.Header>
            <Card.Body>
              {/* Bộ lọc chế độ xem + điều hướng tháng */}
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <ButtonGroup className="mb-0">
                  <Button
                    variant={viewMode === "today" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("today")}
                    size="sm"
                  >
                    <i className="fas fa-calendar-day me-1"></i> Hôm nay
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("week")}
                    size="sm"
                  >
                    <i className="fas fa-calendar-week me-1"></i> Tuần này
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("month")}
                    size="sm"
                  >
                    <i className="fas fa-calendar me-1"></i> Cả tháng
                  </Button>
                </ButtonGroup>

                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => changeMonth(-1)}
                    className="d-flex align-items-center"
                  >
                    <i className="fas fa-chevron-left me-1"></i> Tháng trước
                  </Button>
                  <strong className="mx-3 fs-6">
                    {currentMonth.toLocaleDateString("vi-VN", {
                      month: "long",
                      year: "numeric"
                    })}
                  </strong>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => changeMonth(1)}
                    className="d-flex align-items-center"
                  >
                    Tháng sau <i className="fas fa-chevron-right ms-1"></i>
                  </Button>
                </div>
              </div>

              {/* Danh sách lịch làm việc */}
              {filteredSchedule.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-calendar-times text-muted fs-1 mb-3 d-block"></i>
                  <p className="text-muted mb-0">
                    Không có lịch làm việc trong tháng này.
                  </p>
                </div>
              ) : (
                <div className="schedule-list">
                  {filteredSchedule.map((item, index) => (
                    <Card key={index} className="mb-3 border-0 shadow-sm">
                      <Card.Header 
                        className="bg-light d-flex justify-content-between align-items-center py-3"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setSelectedDate(
                            selectedDate === item.date ? null : item.date
                          )
                        }
                      >
                        <div className="d-flex align-items-center">
                          <i className="fas fa-calendar-day text-primary me-3 fs-5"></i>
                          <div>
                            <strong className="d-block">
                              {new Date(item.date).toLocaleDateString("vi-VN", {
                                weekday: "long",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </strong>
                            <small className="text-muted">
                              {item.time}
                            </small>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg="primary" className="me-2">
                            Ca làm
                          </Badge>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(
                                selectedDate === item.date ? null : item.date
                              );
                            }}
                            className="d-flex align-items-center"
                          >
                            {selectedDate === item.date ? (
                              <>
                                <i className="fas fa-chevron-up me-1"></i> Thu gọn
                              </>
                            ) : (
                              <>
                                <i className="fas fa-chevron-down me-1"></i> Chi tiết
                              </>
                            )}
                          </Button>
                        </div>
                      </Card.Header>

                      <Collapse in={selectedDate === item.date}>
                        <div>
                          <Card.Body className="py-3">
                            <Row className="align-items-center">
                              <Col md={8}>
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-map-marker-alt text-danger me-3 mt-1"></i>
                                  <div>
                                    <h6 className="mb-1">{item.location}</h6>
                                    <p className="text-muted mb-0">
                                      <i className="fas fa-clock text-success me-2"></i>
                                      {item.time}
                                    </p>
                                  </div>
                                </div>
                              </Col>
                              <Col md={4} className="text-end">
                                <Badge bg="success" className="fs-6">
                                  Đang hoạt động
                                </Badge>
                              </Col>
                            </Row>
                          </Card.Body>
                        </div>
                      </Collapse>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ScheduleSection;