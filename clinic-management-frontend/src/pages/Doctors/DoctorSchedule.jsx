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
import doctorService from '../../services/doctorService';

const DoctorSchedule = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [hasRealData, setHasRealData] = useState(false);

  // State cho modal xem tất cả lịch trong ngày
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDaySchedules, setSelectedDaySchedules] = useState([]);
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

  // Fetch lịch làm việc
  const fetchWorkSchedule = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 [DoctorSchedule] Fetching work schedule...');

      const response = await doctorService.getWorkSchedule();
      console.log('📊 [DoctorSchedule] Full API response:', response);

      if (response.data) {
        const data = response.data;
        console.log('✅ [DoctorSchedule] Data received:', data);

        // Kiểm tra dữ liệu thật
        const hasRealSchedules = data.schedules && data.schedules.length > 0;

        setScheduleData(data);
        setHasRealData(hasRealSchedules);

        console.log('🔍 [DoctorSchedule] Data check:', {
          hasRealSchedules,
          schedulesCount: data.schedules?.length || 0,
          hasDoctorInfo: !!data.doctor_info,
          hasStatistics: !!data.statistics
        });

      } else {
        console.warn('⚠️ [DoctorSchedule] No data in response');
        setError('Không có dữ liệu lịch làm việc');
        setHasRealData(false);
      }

    } catch (err) {
      console.error('❌ [DoctorSchedule] Error:', err);
      setError('Không thể tải lịch làm việc. Vui lòng thử lại sau.');
      setHasRealData(false);
    } finally {
      setLoading(false);
    }
  };

  // Load data khi component mount
  useEffect(() => {
    fetchWorkSchedule();
  }, []);

  // Hàm mở modal xem chi tiết ngày
  const handleDayClick = (day) => {
    if (day.schedule.length > 0) {
      setSelectedDaySchedules(day.schedule);
      setSelectedDayInfo({
        date: day.date,
        dateString: day.dateString,
        formattedDate: day.date.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      });
      setShowDayDetail(true);
    }
  };

  // Hàm đóng modal
  const handleCloseDayDetail = () => {
    setShowDayDetail(false);
    setSelectedDaySchedules([]);
    setSelectedDayInfo(null);
  };

  // Lấy danh sách schedules
  const getSchedulesArray = () => {
    if (!scheduleData || !scheduleData.schedules) return [];
    return scheduleData.schedules;
  };

  // ✅ HÀM LỌC LỊCH THEO VIEW MODE
  const getFilteredSchedules = () => {
    const allSchedules = getSchedulesArray();

    if (viewMode === "today") {
      // Lọc lịch cho ngày hôm nay
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      console.log('📅 Today filter:', { todayString, allSchedulesCount: allSchedules.length });

      return allSchedules.filter(item => item.date === todayString);

    } else if (viewMode === "week") {
      // Lọc lịch cho tuần hiện tại
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Chủ Nhật đầu tuần
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Thứ Bảy cuối tuần

      console.log('📅 Week filter:', {
        startOfWeek: startOfWeek.toISOString().split('T')[0],
        endOfWeek: endOfWeek.toISOString().split('T')[0],
        today: today.toISOString().split('T')[0]
      });

      return allSchedules.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startOfWeek && itemDate <= endOfWeek;
      });

    } else {
      // Lọc lịch theo tháng hiện tại (viewMode === "month")
      return allSchedules.filter((item) => {
        const itemDate = new Date(item.date);
        return (
          itemDate.getMonth() === currentMonth.getMonth() &&
          itemDate.getFullYear() === currentMonth.getFullYear()
        );
      });
    }
  };

  const filteredSchedule = getFilteredSchedules();

  console.log('📋 Current view:', {
    viewMode,
    filteredCount: filteredSchedule.length,
    currentMonth: currentMonth.toLocaleDateString('vi-VN')
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

  // ✅ HÀM TẠO LỊCH THÁNG - SỬA TIMEZONE
  const generateCalendar = () => {
    if (!hasRealData) return [];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    console.log('📅 Generating calendar for:', { year, month: month + 1 });

    // Tạo ngày với timezone cụ thể
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));

    // Ngày bắt đầu calendar (Chủ Nhật đầu tiên)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const calendar = [];
    const currentDate = new Date(startDate);

    console.log('📅 Calendar dates:', {
      firstDay: firstDay.toISOString(),
      lastDay: lastDay.toISOString(),
      startDate: startDate.toISOString()
    });

    // Tạo 6 tuần
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        // Sử dụng UTC để tránh timezone issues
        const dateString = currentDate.toISOString().split('T')[0];

        // ✅ So sánh date string chính xác
        const daySchedule = getSchedulesArray().filter(item => {
          console.log('🔍 Comparing dates:', {
            scheduleDate: item.date,
            currentDate: dateString,
            match: item.date === dateString
          });
          return item.date === dateString;
        });

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

    console.log('📅 Final calendar check:', {
      schedules: getSchedulesArray().map(s => ({ date: s.date, location: s.location })),
      foundInCalendar: calendar.flat().filter(day => day.schedule.length > 0)
    });

    return calendar;
  };

  const calendar = generateCalendar();
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Điều hướng tháng
  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  // ✅ SỬA LẠI: KHI CHUYỂN VIEW MODE, TỰ ĐỘNG CHUYỂN VỀ THÁNG HIỆN TẠI NẾU LÀ "HÔM NAY" HOẶC "TUẦN NÀY"
  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);

    if (newViewMode === "today" || newViewMode === "week") {
      // Chuyển về tháng hiện tại khi xem hôm nay/tuần này
      setCurrentMonth(new Date());
    }
  };

  // Component Modal hiển thị chi tiết ngày
  const DayDetailModal = () => (
    <Modal show={showDayDetail} onHide={handleCloseDayDetail} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <i className="fas fa-calendar-day me-2"></i>
          Lịch làm việc ngày {selectedDayInfo?.formattedDate}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {selectedDaySchedules.length === 0 ? (
          <div className="text-center py-4">
            <i className="fas fa-calendar-times text-muted fa-3x mb-3"></i>
            <h5 className="text-muted">Không có lịch làm việc</h5>
          </div>
        ) : (
          <div className="schedule-list">
            {selectedDaySchedules.map((schedule, index) => (
              <Card key={index} className="border-0 shadow-sm mb-3">
                <Card.Body className="p-4">
                  <Row className="align-items-center">
                    <Col md={8}>
                      <div className="d-flex align-items-start">
                        <div className={`bg-${getStatusVariant(schedule.status)} bg-opacity-10 rounded p-3 me-3`}>
                          <i className={`fas fa-calendar-check text-${getStatusVariant(schedule.status)} fa-lg`}></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="text-dark mb-2">{schedule.location}</h6>

                          <div className="row g-3">
                            <Col sm={6}>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-clock text-success me-2"></i>
                                <div>
                                  <small className="text-muted d-block">Thời gian</small>
                                  <strong className="text-dark">{schedule.time}</strong>
                                </div>
                              </div>
                            </Col>

                            <Col sm={6}>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-tag text-info me-2"></i>
                                <div>
                                  <small className="text-muted d-block">Loại hình</small>
                                  <strong className="text-dark">{schedule.type}</strong>
                                </div>
                              </div>
                            </Col>
                            <Col sm={6}>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-tag text-info me-2"></i>
                                <div>
                                  <small className="text-muted d-block">Phòng</small>
                                  <strong className="text-dark">{schedule.room_name}</strong>
                                </div>
                              </div>
                            </Col>

                            <Col sm={6}>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-user-clock text-warning me-2"></i>
                                <div>
                                  <small className="text-muted d-block">Trạng thái</small>
                                  <Badge bg={getStatusVariant(schedule.status)}>
                                    {getStatusText(schedule.status)}
                                  </Badge>
                                </div>
                              </div>
                            </Col>

                            <Col sm={6}>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-id-badge text-primary me-2"></i>
                                <div>
                                  <small className="text-muted d-block">Mã lịch</small>
                                  <strong className="text-dark">#{schedule.schedule_id}</strong>
                                </div>
                              </div>
                            </Col>

                            {schedule.notes && (
                              <Col sm={12}>
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-sticky-note text-secondary me-2 mt-1"></i>
                                  <div>
                                    <small className="text-muted d-block">Ghi chú</small>
                                    <strong className="text-dark">{schedule.notes}</strong>
                                  </div>
                                </div>
                              </Col>
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
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="d-flex align-items-center justify-content-center"
                        >
                          <i className="fas fa-info-circle me-2"></i>
                          Chi tiết
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className="w-100">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Tổng cộng: <strong>{selectedDaySchedules.length}</strong> lịch trình
            </small>
            <Button variant="secondary" onClick={handleCloseDayDetail}>
              <i className="fas fa-times me-2"></i>
              Đóng
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );

  // ✅ RENDER TRẠNG THÁI KHÔNG CÓ DỮ LIỆU THEO VIEW MODE
  // ✅ RENDER TRẠNG THÁI KHÔNG CÓ DỮ LIỆU THEO VIEW MODE
  const renderNoDataState = () => {
    let message = "";
    let subMessage = "";

    if (viewMode === "today") {
      const today = new Date();
      const todayString = today.toLocaleDateString("vi-VN");

      message = `Hôm nay (${todayString}) không có lịch làm việc nào`;
      subMessage = "Bạn có thể liên hệ quản lý để được xếp lịch làm việc.";

    } else if (viewMode === "week") {
      message = "Tuần này không có lịch làm việc nào";
      subMessage = "Hãy kiểm tra lại lịch làm việc của bạn.";
    } else {
      message = `Hiện tại bạn chưa có lịch làm việc nào được xếp trong tháng ${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}.`;
      subMessage = "Vui lòng liên hệ quản lý để được xếp lịch.";
    }

    return (
      <div className="text-center py-5">
        <div className="py-4">
          <i className="fas fa-calendar-plus text-muted fa-4x mb-3 opacity-50"></i>
          <h4 className="text-muted fw-light mb-3">{message}</h4>
          <p className="text-muted mb-3">{subMessage}</p>
          <Button
            variant="primary"
            onClick={fetchWorkSchedule}
            disabled={loading}
            className="me-2"
          >
            <i className="fas fa-sync me-2"></i>
            Tải lại dữ liệu
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => setViewMode("month")}
          >
            <i className="fas fa-calendar me-2"></i>
            Xem toàn bộ lịch
          </Button>
        </div>
      </div>
    );
  };
  // Render loading
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

      {/* Modal xem chi tiết ngày */}
      <DayDetailModal />

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
                {hasRealData && (
                  <Badge bg="success" className="ms-2">
                    <i className="fas fa-check me-1"></i>
                    Đã xếp lịch ({getSchedulesArray().length})
                  </Badge>
                )}
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {scheduleData?.doctor_info ? (
                <Row className="g-4">
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-primary bg-opacity-10 rounded p-3 me-3">
                        <i className="fas fa-id-card text-primary fa-lg"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block">Họ và tên</small>
                        <strong className="text-dark fs-6">{scheduleData.doctor_info.full_name}</strong>
                      </div>
                    </div>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-success bg-opacity-10 rounded p-3 me-3">
                        <i className="fas fa-briefcase text-success fa-lg"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block">Chuyên khoa</small>
                        <strong className="text-dark fs-6">{scheduleData.doctor_info.specialization}</strong>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-info bg-opacity-10 rounded p-3 me-3">
                        <i className="fas fa-building text-info fa-lg"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block">Phòng khám</small>
                        <strong className="text-dark fs-6">{scheduleData.doctor_info.department}</strong>
                      </div>
                    </div>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-warning bg-opacity-10 rounded p-3 me-3">
                        <i className="fas fa-calendar-check text-warning fa-lg"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block">Tổng số lịch</small>
                        <strong className="text-dark fs-6">
                          <Badge bg="primary" className="fs-7">
                            {scheduleData.statistics?.total_schedules || 0} lịch trình
                          </Badge>
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
                    {filteredSchedule.length} lịch {viewMode === 'today' ? 'hôm nay' : viewMode === 'week' ? 'tuần này' : 'trong tháng'}
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
                    onClick={() => handleViewModeChange("today")}
                    size="sm"
                    className="px-3"
                    disabled={!hasRealData}
                  >
                    <i className="fas fa-calendar-day me-2"></i>
                    Hôm nay
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "success" : "outline-primary"}
                    onClick={() => handleViewModeChange("week")}
                    size="sm"
                    className="px-3"
                    disabled={!hasRealData}
                  >
                    <i className="fas fa-calendar-week me-2"></i>
                    Tuần này
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "success" : "outline-primary"}
                    onClick={() => handleViewModeChange("month")}
                    size="sm"
                    className="px-3"
                    disabled={!hasRealData}
                  >
                    <i className="fas fa-calendar me-2"></i>
                    Cả tháng
                  </Button>
                </ButtonGroup>

                {/* Chỉ hiển thị điều hướng tháng khi ở chế độ xem tháng */}
                {viewMode === "month" && (
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
                      {filteredSchedule.length > 0 && (
                        <div className="small text-success">
                          <i className="fas fa-check-circle me-1"></i>
                          {filteredSchedule.length} lịch trình
                        </div>
                      )}
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
                )}
              </div>

              {/* Hiển thị theo trạng thái dữ liệu */}
              {!hasRealData ? (
                renderNoDataState()
              ) : viewMode === "month" ? (
                // Chế độ xem lịch tháng - có dữ liệu
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
                      {week.map((day, dayIndex) => {
                        const today = new Date();
                        const isToday = day.date.toDateString() === today.toDateString();

                        return (
                          <div
                            key={dayIndex}
                            className={`col border-end p-2 calendar-day ${!day.isCurrentMonth ? 'bg-light text-muted' :
                              isToday ? 'bg-primary bg-opacity-10' : ''
                              } ${day.schedule.length > 0 ? 'has-schedule' : ''}`}
                            style={{
                              minHeight: '120px',
                              cursor: day.schedule.length > 0 ? 'pointer' : 'default',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => handleDayClick(day)}
                            onMouseEnter={(e) => {
                              if (day.schedule.length > 0) {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (day.schedule.length > 0) {
                                e.currentTarget.style.backgroundColor = '';
                              }
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <span className={`fw-semibold ${isToday ? 'text-primary' :
                                !day.isCurrentMonth ? 'text-muted' : 'text-dark'
                                }`}>
                                {day.date.getDate()}
                              </span>
                              {day.schedule.length > 0 && (
                                <Badge
                                  bg="success"
                                  className="fs-7"
                                  style={{ cursor: 'pointer' }}
                                  title={`${day.schedule.length} lịch trình - Nhấn để xem chi tiết`}
                                >
                                  {day.schedule.length}
                                </Badge>
                              )}
                            </div>

                            {/* Hiển thị lịch trình trong ngày (chỉ preview) */}
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
                                  <div className="fw-semibold text-truncate" title={schedule.time}>
                                    {schedule.time}
                                  </div>
                                  <div className="fw-semibold text-truncate" title='Phòng:'>
                                    {schedule.room_name}
                                  </div>
                                  <div className="text-truncate" title={schedule.location}>
                                    {schedule.location}
                                  </div>
                                </div>
                              ))}
                              {day.schedule.length > 2 && (
                                <div
                                  className="text-center text-primary small fw-semibold"
                                  style={{ cursor: 'pointer' }}
                                  title="Nhấn để xem thêm"
                                >
                                  +{day.schedule.length - 2} lịch khác
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : filteredSchedule.length === 0 ? (
                renderNoDataState()
              ) : (
                // Chế độ xem danh sách (Hôm nay/Tuần này)
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
                                      <div>
                                        <small className="text-muted d-block">Phòng</small>
                                        <strong className="text-dark">
                                          <i class="fas fa-hospital-alt text-info"></i>                                          {item.room_name}
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

              {/* Footer thống kê */}
              {hasRealData && scheduleData?.statistics && filteredSchedule.length > 0 && (
                <div className="mt-4 pt-3 border-top">
                  <Row className="align-items-center">
                    <Col md={6}>
                      <small className="text-muted">
                        <i className="fas fa-info-circle me-2 text-primary"></i>
                        Hiển thị <strong>{filteredSchedule.length}</strong> lịch trình {
                          viewMode === 'today' ? 'hôm nay' :
                            viewMode === 'week' ? 'trong tuần này' :
                              `trong tháng ${currentMonth.getMonth() + 1}`
                        }
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

export default DoctorSchedule;