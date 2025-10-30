import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Collapse,
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
      type: "Làm việc toàn thời gian",
      status: "active"
    },
    {
      date: "2025-10-08",
      location: "Phòng Xét Nghiệm Hóa Sinh",
      time: "07:30 - 16:30",
      type: "Làm việc toàn thời gian",
      status: "active"
    },
    {
      date: "2025-10-09",
      location: "Phòng Xét Nghiệm Vi Sinh",
      time: "08:00 - 12:00",
      type: "Làm việc bán thời gian",
      status: "upcoming"
    },
    {
      date: "2025-10-10",
      location: "Phòng Xét Nghiệm Huyết Học",
      time: "13:00 - 17:00",
      type: "Làm việc bán thời gian",
      status: "upcoming"
    },
    {
      date: "2025-10-15",
      location: "Phòng Xét Nghiệm Tổng Quát",
      time: "09:00 - 18:00",
      type: "Làm việc toàn thời gian",
      status: "upcoming"
    },
    {
      date: "2025-10-20",
      location: "Phòng Khám Đa Khoa Trung Tâm",
      time: "08:00 - 17:00",
      type: "Làm việc toàn thời gian",
      status: "upcoming"
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

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'upcoming': return 'warning';
      case 'completed': return 'secondary';
      default: return 'primary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Đang hoạt động';
      case 'upcoming': return 'Sắp diễn ra';
      case 'completed': return 'Đã hoàn thành';
      default: return 'Đang lên lịch';
    }
  };

  // Hàm tạo lịch tháng
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Ngày đầu tiên của tháng
    const firstDay = new Date(year, month, 1);
    // Ngày cuối cùng của tháng
    const lastDay = new Date(year, month + 1, 0);
    // Ngày bắt đầu của lịch (có thể là ngày cuối tháng trước)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    const currentDate = new Date(startDate);
    
    // Tạo 6 tuần (42 ngày) để đủ hiển thị
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateString = currentDate.toISOString().split('T')[0];
        const daySchedule = workSchedule.filter(item => item.date === dateString);
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
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="section active" id="schedule">
      <Row className="g-4">
        {/* Thông tin kỹ thuật viên */}
        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary bg-gradient text-white py-3">
              <div className="d-flex align-items-center">
                <i className="fas fa-user-cog fa-lg me-3"></i>
                <div>
                  <h4 className="mb-0 fw-bold">Thông Tin Kỹ Thuật Viên</h4>
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
                      <strong className="text-dark fs-6">Trần Văn Hùng</strong>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-success bg-opacity-10 rounded p-3 me-3">
                      <i className="fas fa-briefcase text-success fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Chức vụ</small>
                      <strong className="text-dark fs-6">Kỹ Thuật Viên Thiết Bị Y Tế</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-info bg-opacity-10 rounded p-3 me-3">
                      <i className="fas fa-building text-info fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Phòng ban</small>
                      <strong className="text-dark fs-6">Phòng Kỹ Thuật</strong>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-warning bg-opacity-10 rounded p-3 me-3">
                      <i className="fas fa-calendar-plus text-warning fa-lg"></i>
                    </div>
                    <div>
                      <small className="text-muted d-block">Ngày vào làm</small>
                      <strong className="text-dark fs-6">15/03/2023</strong>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
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
                       viewMode === 'week' ? 'Lịch làm việc tuần' : 'Lịch làm việc hôm nay'}
                    </small>
                  </div>
                </div>
                <Badge bg="light" text="dark" className="fs-6">
                  <i className="fas fa-list me-1"></i>
                  {filteredSchedule.length} lịch trình
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
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

              {/* HIỂN THỊ THEO CHẾ ĐỘ XEM */}
              {viewMode === "month" ? (
                // CHẾ ĐỘ XEM LỊCH THÁNG - DẠNG Ô VUÔNG
                <div className="calendar-month-view">
                  {/* Header các ngày trong tuần */}
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
                          onClick={() => day.schedule.length > 0 && setSelectedDate(
                            selectedDate === day.dateString ? null : day.dateString
                          )}
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
                            {day.schedule.slice(0, 2).map((schedule, index) => (
                              <div 
                                key={index} 
                                className="calendar-event mb-1 p-1 rounded small"
                                style={{
                                  backgroundColor: getStatusVariant(schedule.status) === 'success' 
                                    ? '#d1e7dd' 
                                    : getStatusVariant(schedule.status) === 'warning'
                                    ? '#fff3cd'
                                    : '#e2e3e5',
                                  borderLeft: `3px solid var(--bs-${getStatusVariant(schedule.status)})`,
                                  fontSize: '0.7rem'
                                }}
                              >
                                <div className="fw-semibold text-truncate">
                                  {schedule.time}
                                </div>
                                <div className="text-truncate">
                                  {schedule.location}
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
              ) : filteredSchedule.length === 0 ? (
                // KHÔNG CÓ LỊCH TRÌNH
                <div className="text-center py-5">
                  <div className="py-4">
                    <i className="fas fa-calendar-times text-muted fa-4x mb-3 opacity-50"></i>
                    <h5 className="text-muted fw-light mb-3">Không có lịch làm việc</h5>
                    <p className="text-muted mb-0">
                      Không có lịch làm việc nào trong tháng này.
                    </p>
                  </div>
                </div>
              ) : (
                // CHẾ ĐỘ XEM DANH SÁCH (HÔM NAY/TUẦN)
                <div className="schedule-list">
                  {filteredSchedule.map((item, index) => (
                    <Card key={index} className="border-0 shadow-sm mb-3">
                      <Card.Header 
                        className="bg-white border-bottom-0 py-3"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setSelectedDate(
                            selectedDate === item.date ? null : item.date
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
                                {new Date(item.date).toLocaleDateString("vi-VN", {
                                  weekday: "long",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </strong>
                              <small className="text-muted">
                                <i className="fas fa-clock me-1"></i>
                                {item.time}
                              </small>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-3">
                            <Badge bg={getStatusVariant(item.status)} className="fs-7 px-3 py-2">
                              {getStatusText(item.status)}
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
                              className="d-flex align-items-center px-3"
                            >
                              {selectedDate === item.date ? (
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

                      <Collapse in={selectedDate === item.date}>
                        <div>
                          <Card.Body className="bg-light bg-opacity-25 py-4">
                            <Row className="align-items-center">
                              <Col md={8}>
                                <div className="d-flex align-items-start">
                                  <div className="bg-danger bg-opacity-10 rounded p-2 me-3">
                                    <i className="fas fa-map-marker-alt text-danger fa-lg"></i>
                                  </div>
                                  <div>
                                    <h6 className="text-dark mb-2">{item.location}</h6>
                                    <div className="d-flex flex-wrap gap-4">
                                      <div>
                                        <small className="text-muted d-block">Thời gian</small>
                                        <strong className="text-dark">
                                          <i className="fas fa-clock text-success me-2"></i>
                                          {item.time}
                                        </strong>
                                      </div>
                                      <div>
                                        <small className="text-muted d-block">Loại hình</small>
                                        <strong className="text-dark">
                                          <i className="fas fa-tag text-info me-2"></i>
                                          {item.type}
                                        </strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Col>
                              <Col md={4} className="text-md-end">
                                <div className="d-flex flex-column gap-2">
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    className="d-flex align-items-center justify-content-center"
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
              {filteredSchedule.length > 0 && (
                <div className="mt-4 pt-3 border-top">
                  <Row className="align-items-center">
                    <Col md={6}>
                      <small className="text-muted">
                        <i className="fas fa-info-circle me-2 text-primary"></i>
                        Hiển thị <strong>{filteredSchedule.length}</strong> lịch trình trong tháng
                      </small>
                    </Col>
                    <Col md={6} className="text-md-end">
                      <div className="d-flex justify-content-end gap-3">
                        <small className="text-muted">
                          <Badge bg="success" className="me-1">
                            {filteredSchedule.filter(s => s.status === 'active').length}
                          </Badge> Đang hoạt động
                        </small>
                        <small className="text-muted">
                          <Badge bg="warning" className="me-1">
                            {filteredSchedule.filter(s => s.status === 'upcoming').length}
                          </Badge> Sắp diễn ra
                        </small>
                      </div>
                    </Col>
                  </Row>
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