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
  Alert
} from "react-bootstrap";
import technicianService from '../../services/technicianService';

const TechSchedule = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [hasRealData, setHasRealData] = useState(false);

  // ✅ FETCH LỊCH LÀM VIỆC
  const fetchWorkSchedule = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 [TechSchedule] Fetching work schedule...');
      
      const response = await technicianService.getWorkSchedule();
      
      if (response.data?.success) {
        console.log('✅ Work schedule data:', response.data.data);
        
        // ✅ KIỂM TRA NẾU CÓ DỮ LIỆU THẬT
        const hasRealSchedules = response.data.data.schedules && 
                                response.data.data.schedules.length > 0;
        
        setScheduleData(response.data.data);
        setHasRealData(hasRealSchedules);
        
        if (!hasRealSchedules) {
          console.log('ℹ️ No real schedule data found, showing empty state');
        }
      } else {
        setError('Không thể lấy dữ liệu lịch làm việc');
      }

    } catch (err) {
      console.error('❌ [TechSchedule] Error:', err);
      setError('Không thể tải lịch làm việc. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FETCH LỊCH THEO THÁNG
  const fetchMonthlySchedule = async (year, month) => {
    try {
      setLoading(true);
      
      const response = await technicianService.getWorkScheduleByMonth(year, month);
      
      if (response.data?.success) {
        // Chỉ cập nhật nếu có dữ liệu thật
        if (response.data.data && response.data.data.length > 0) {
          setScheduleData(prev => ({
            ...prev,
            schedules: response.data.data
          }));
          setHasRealData(true);
        }
      }
    } catch (err) {
      console.error('❌ [TechSchedule] Monthly schedule error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOAD DATA KHI COMPONENT MOUNT
  useEffect(() => {
    fetchWorkSchedule();
  }, []);

  // ✅ LOAD DATA KHI ĐỔI THÁNG
  useEffect(() => {
    if (currentMonth && hasRealData) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      fetchMonthlySchedule(year, month);
    }
  }, [currentMonth, hasRealData]);

  // Điều hướng tháng
  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  // ✅ LỌC LỊCH THEO THÁNG HIỆN TẠI
  const filteredSchedule = scheduleData?.schedules?.filter((item) => {
    const itemDate = new Date(item.date);
    return (
      itemDate.getMonth() === currentMonth.getMonth() &&
      itemDate.getFullYear() === currentMonth.getFullYear()
    );
  }) || [];

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

  // ✅ HÀM TẠO LỊCH THÁNG (CHỈ KHI CÓ DỮ LIỆU)
  const generateCalendar = () => {
    if (!scheduleData || !hasRealData) return [];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    const currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateString = currentDate.toISOString().split('T')[0];
        const daySchedule = scheduleData.schedules.filter(item => item.date === dateString);
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

  // ✅ RENDER TRẠNG THÁI KHÔNG CÓ DỮ LIỆU
  const renderNoDataState = () => (
    <div className="text-center py-5">
      <div className="py-4">
        <i className="fas fa-calendar-plus text-muted fa-4x mb-3 opacity-50"></i>
        <h4 className="text-muted fw-light mb-3">Chưa có lịch làm việc</h4>
        <p className="text-muted mb-3">
          Hiện tại bạn chưa có lịch làm việc nào được xếp trong tháng {currentMonth.getMonth() + 1}.
        </p>
        <div className="bg-light rounded p-4 mx-auto" style={{maxWidth: '500px'}}>
          <h6 className="text-primary mb-3">
            <i className="fas fa-info-circle me-2"></i>
            Thông tin hữu ích
          </h6>
          <ul className="text-start text-muted">
            <li>Liên hệ quản lý phòng ban để được xếp lịch làm việc</li>
            <li>Lịch làm việc sẽ xuất hiện ở đây sau khi được xếp</li>
            <li>Bạn có thể xem lịch làm việc theo ngày/tuần/tháng</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // ✅ RENDER LOADING
  if (loading && !scheduleData) {
    return (
      <div className="section active" id="schedule">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted fs-5">Đang tải lịch làm việc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section active" id="schedule">
      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

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
                {!hasRealData && (
                  <Badge bg="warning" className="ms-2">
                    <i className="fas fa-clock me-1"></i>
                    Chờ xếp lịch
                  </Badge>
                )}
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {scheduleData?.technician_info ? (
                <Row className="g-4">
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-primary bg-opacity-10 rounded p-3 me-3">
                        <i className="fas fa-id-card text-primary fa-lg"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block">Họ và tên</small>
                        <strong className="text-dark fs-6">{scheduleData.technician_info.full_name}</strong>
                      </div>
                    </div>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-success bg-opacity-10 rounded p-3 me-3">
                        <i className="fas fa-briefcase text-success fa-lg"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block">Chức vụ</small>
                        <strong className="text-dark fs-6">{scheduleData.technician_info.position}</strong>
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
                        <strong className="text-dark fs-6">{scheduleData.technician_info.department}</strong>
                      </div>
                    </div>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-warning bg-opacity-10 rounded p-3 me-3">
                        <i className="fas fa-calendar-plus text-warning fa-lg"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block">Trạng thái lịch làm việc</small>
                        <strong className="text-dark fs-6">
                          {hasRealData ? (
                            <Badge bg="success" className="fs-7">
                              <i className="fas fa-check me-1"></i>
                              Đã xếp lịch
                            </Badge>
                          ) : (
                            <Badge bg="secondary" className="fs-7">
                              <i className="fas fa-clock me-1"></i>
                              Chờ xếp lịch
                            </Badge>
                          )}
                        </strong>
                      </div>
                    </div>
                  </Col>
                </Row>
              ) : (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" variant="primary" />
                  <p className="mt-2 text-muted">Đang tải thông tin...</p>
                </div>
              )}
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
                {hasRealData && scheduleData?.statistics && (
                  <Badge bg="light" text="dark" className="fs-6">
                    <i className="fas fa-list me-1"></i>
                    {scheduleData.statistics.total_schedules} lịch trình
                  </Badge>
                )}
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {/* Loading */}
              {loading && (
                <div className="text-center mb-3">
                  <Spinner animation="border" variant="success" size="sm" />
                  <span className="ms-2">Đang tải dữ liệu...</span>
                </div>
              )}

              {/* Bộ lọc chế độ xem + điều hướng tháng */}
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <ButtonGroup>
                  <Button
                    variant={viewMode === "today" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("today")}
                    size="sm"
                    className="px-3"
                    disabled={!hasRealData}
                  >
                    <i className="fas fa-calendar-day me-2"></i> 
                    Hôm nay
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("week")}
                    size="sm"
                    className="px-3"
                    disabled={!hasRealData}
                  >
                    <i className="fas fa-calendar-week me-2"></i> 
                    Tuần này
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "success" : "outline-primary"}
                    onClick={() => setViewMode("month")}
                    size="sm"
                    className="px-3"
                    disabled={!hasRealData}
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
                    disabled={loading}
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
                    disabled={loading}
                  >
                    Tháng sau 
                    <i className="fas fa-chevron-right ms-2"></i>
                  </Button>
                </div>
              </div>

              {/* ✅ HIỂN THỊ THEO TRẠNG THÁI DỮ LIỆU */}
              {!hasRealData ? (
                // KHÔNG CÓ DỮ LIỆU THẬT
                renderNoDataState()
              ) : viewMode === "month" ? (
                // CHẾ ĐỘ XEM LỊCH THÁNG - CÓ DỮ LIỆU
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
                // CÓ DỮ LIỆU NHƯNG KHÔNG CÓ LỊCH TRONG THÁNG NÀY
                <div className="text-center py-5">
                  <div className="py-4">
                    <i className="fas fa-calendar-times text-muted fa-4x mb-3 opacity-50"></i>
                    <h5 className="text-muted fw-light mb-3">Không có lịch làm việc trong tháng này</h5>
                    <p className="text-muted mb-0">
                      Không có lịch làm việc nào trong tháng {currentMonth.getMonth() + 1}.
                    </p>
                  </div>
                </div>
              ) : (
                // CHẾ ĐỘ XEM DANH SÁCH (HÔM NAY/TUẦN) - CÓ DỮ LIỆU
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
                                      {item.notes && (
                                        <div>
                                          <small className="text-muted d-block">Ghi chú</small>
                                          <strong className="text-dark">
                                            <i className="fas fa-sticky-note text-warning me-2"></i>
                                            {item.notes}
                                          </strong>
                                        </div>
                                      )}
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

              {/* Footer thống kê - CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU */}
              {hasRealData && scheduleData?.statistics && filteredSchedule.length > 0 && (
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
                        <small className="text-muted">
                          <Badge bg="secondary" className="me-1">
                            {filteredSchedule.filter(s => s.status === 'completed').length}
                          </Badge> Đã hoàn thành
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

export default TechSchedule;