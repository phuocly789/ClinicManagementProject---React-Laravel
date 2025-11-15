import { useCallback, useEffect, useState, useMemo } from 'react';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import Loading from '../../Components/Loading/Loading';
import CustomToast from '../../Components/CustomToast/CustomToast';
import instance from '../../axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { BiCalendarPlus, BiPencil, BiSave, BiTrash, BiX, BiXCircle } from 'react-icons/bi';
import { FaUserMd, FaUserNurse, FaUserPlus, FaUserTie } from 'react-icons/fa';
import '../../App.css';

const initialFormState = {
    StaffId: '',
    Role: '',
    WorkDate: new Date().toISOString().split('T')[0],
    StartTime: '08:00',
    EndTime: '17:00',
    IsAvailable: true,
    RoomId: ''
};

const roleOptions = [
    { value: 'Bác sĩ', label: 'Bác sĩ', icon: FaUserMd },
    { value: 'Y tá', label: 'Y tá', icon: FaUserNurse },
    { value: 'Lễ tân', label: 'Lễ tân', icon: FaUserPlus },
    { value: 'Kĩ thuật viên', label: 'Kĩ thuật viên', icon: FaUserTie }
];

const getRoleClass = (role) => {
    switch (role) {
        case 'Bác sĩ': return 'doctor';
        case 'Y tá': return 'nurse';
        case 'Lễ tân': return 'receptionist';
        case 'Kĩ thuật viên': return 'technician';
        default: return 'secondary';
    }
};

const getBootstrapClass = (role) => {
    switch (role) {
        case 'Bác sĩ': return 'primary';
        case 'Y tá': return 'success';
        case 'Lễ tân': return 'warning';
        case 'Kĩ thuật viên': return 'info';
        default: return 'secondary';
    }
};

// Hàm map StaffType từ API sang Role cho form
const mapStaffTypeToRole = (staffType) => {
    switch (staffType) {
        case 'Bác sĩ': return 'Bác sĩ';
        case 'Y tá': return 'Y tá';
        case 'Lễ tân': return 'Lễ tân';
        case 'Kĩ thuật viên': return 'Kĩ thuật viên';
        default: return staffType;
    }
};

const AdminScheduleManagement = () => {
    const [schedules, setSchedules] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [roomList, setRoomList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [scheduleFormData, setScheduleFormData] = useState(initialFormState);

    const fetchRooms = useCallback(async () => {
        try {
            const response = await instance.get('/api/rooms');
            const rooms = response.data || [];
            setRoomList(rooms);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            setToast({
                type: 'error',
                message: error.response?.message || 'Lỗi khi tải danh sách phòng.'
            });
        }
    }, []);

    const fetchStaff = useCallback(async () => {
        try {
            const response = await instance.get('/api/staff');
            const staffFromApi = response.data || [];

            // Transform data từ API sang format cần thiết
            const transformedStaff = staffFromApi.map(staff => ({
                StaffId: staff.StaffId,
                StaffName: staff.user?.FullName || `NV${staff.StaffId}`,
                Role: mapStaffTypeToRole(staff.StaffType),
                StaffType: staff.StaffType,
                Specialty: staff.Specialty,
                LicenseNumber: staff.LicenseNumber,
                FullName: staff.user?.FullName
            }));

            setStaffList(transformedStaff);
        } catch (error) {
            console.error('Error fetching staff:', error);
            // Fallback từ schedules
            const uniqueStaff = schedules.reduce((acc, current) => {
                if (current.StaffId && !acc.find(item => item.StaffId === current.StaffId)) {
                    acc.push({
                        StaffId: current.StaffId,
                        StaffName: current.StaffName || `NV${current.StaffId}`,
                        Role: current.Role
                    });
                }
                return acc;
            }, []);
            setStaffList(uniqueStaff);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await instance.get('/api/schedules');
            const fetchedSchedules = response.data.Items || [];
            setSchedules(fetchedSchedules);

        } catch (error) {
            console.error('Error fetching schedules:', error);
            setToast({
                type: 'error',
                message: error.response?.message || 'Lỗi kết nối máy chủ.'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchRooms();
        fetchStaff();
    }, []);

    const filteredStaffList = useMemo(() => {
        if (scheduleFormData.Role) {
            return staffList.filter(staff => staff.Role === scheduleFormData.Role);
        }
        return staffList;
    }, [scheduleFormData.Role, staffList]);

    const calendarEvents = useMemo(() => {
        return schedules.map(schedule => ({
            id: schedule.ScheduleId?.toString(),
            title: schedule.StaffName || `NV${schedule.StaffId}`,
            start: `${schedule.WorkDate}T${schedule.StartTime || '08:00:00'}`,
            end: `${schedule.WorkDate}T${schedule.EndTime || '17:00:00'}`,
            className: `event-${getRoleClass(schedule.Role)}`,
            extendedProps: { ...schedule }
        }));
    }, [schedules]);

    const handleCloseModals = () => {
        setFormModalOpen(false);
        setDetailModalOpen(false);
        setConfirmModalOpen(false);
        setSelectedEvent(null);
        setScheduleFormData(initialFormState);
    };

    const handleEventClick = (clickInfo) => {
        setSelectedEvent(clickInfo.event);
        setDetailModalOpen(true);
    };

    const handleOpenAddModal = () => {
        setSelectedEvent(null);
        setScheduleFormData(initialFormState);
        setFormModalOpen(true);
    };

    const handleOpenEditModal = (event) => {
        const { extendedProps, start, end } = event;

        const formatTimeForInput = (date) => {
            if (!date) return '08:00';
            return new Date(date).toTimeString().slice(0, 5);
        };

        const formatDateForInput = (date) => {
            if (!date) return new Date().toISOString().split('T')[0];
            return new Date(date).toISOString().split('T')[0];
        };

        setScheduleFormData({
            StaffId: extendedProps.StaffId || '',
            Role: extendedProps.Role || '',
            WorkDate: formatDateForInput(start),
            StartTime: formatTimeForInput(start),
            EndTime: formatTimeForInput(end),
            IsAvailable: extendedProps.IsAvailable !== false,
            RoomId: extendedProps.RoomId || ''
        });
        setSelectedEvent(event);
        setFormModalOpen(true);
    };

    const handleOpenDeleteModal = (event) => {
        setDetailModalOpen(false);
        setSelectedEvent(event);
        setConfirmModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setScheduleFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const isEditing = !!selectedEvent;
        const url = isEditing ? `/api/schedules/${selectedEvent.id}` : '/api/schedules';
        const method = isEditing ? 'put' : 'post';

        try {
            const selectedStaff = staffList.find(staff => staff.StaffId == scheduleFormData.StaffId);
            const submitData = {
                ...scheduleFormData,
                StartTime: scheduleFormData.StartTime.length === 5 ? `${scheduleFormData.StartTime}:00` : scheduleFormData.StartTime,
                EndTime: scheduleFormData.EndTime.length === 5 ? `${scheduleFormData.EndTime}:00` : scheduleFormData.EndTime,
                StaffName: selectedStaff?.StaffName || `NV${scheduleFormData.StaffId}`
            };

            const response = await instance[method](url, submitData);

            if (response.status === 'Success' || response.message) {
                setToast({
                    type: 'success',
                    message: response.message || 'Thao tác thành công!'
                });
                handleCloseModals();
                await fetchData();
            } else {
                throw new Error('Phản hồi từ server không hợp lệ');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setToast({
                type: 'error',
                message: error.response?.message ||
                    error.response?.errors?.[0] ||
                    error.message ||
                    'Thao tác thất bại.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedEvent) return;
        setLoading(true);
        try {
            const response = await instance.delete(`/api/schedules/${selectedEvent.id}`);

            if (response.status === 'Success' || response.message) {
                setToast({
                    type: 'success',
                    message: response.message || 'Xóa thành công!'
                });
                handleCloseModals();
                await fetchData();
            } else {
                throw new Error('Phản hồi từ server không hợp lệ');
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            setToast({
                type: 'error',
                message: error.response?.message ||
                    error.message ||
                    'Lỗi khi xóa.'
            });
        } finally {
            setLoading(false);
        }
    };

    const renderEventContent = (eventInfo) => {
        const { Role } = eventInfo.event.extendedProps;
        const roleIcons = {
            'Bác sĩ': <FaUserMd />,
            'Y tá': <FaUserNurse />,
            'Kĩ thuật viên': <FaUserTie />,
            'Lễ tân': <FaUserPlus />
        };
        return (
            <div className="event-main-content w-100">
                <div className="event-icon">{roleIcons[Role] || <FaUserTie />}</div>
                <div className="event-details">
                    <div className="event-title">{eventInfo.event.title}</div>
                    <div className="event-role">{Role}</div>
                </div>
            </div>
        );
    };

    const RoleIcon = ({ role, size = 18 }) => {
        const IconComponent = roleOptions.find(r => r.value === role)?.icon || FaUserTie;
        return <IconComponent size={size} />;
    };

    const renderModals = () => {
        if (!isFormModalOpen && !isDetailModalOpen && !isConfirmModalOpen) return null;

        return (
            <>
                <div className="modal-backdrop fade show"></div>

                {isFormModalOpen && (
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">
                                        {selectedEvent ? "Cập Nhật Lịch Làm Việc" : "Thêm Lịch Làm Việc Mới"}
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={handleCloseModals}></button>
                                </div>
                                <form onSubmit={handleFormSubmit}>
                                    <div className="modal-body p-4">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Chức vụ <span className="text-danger">*</span></label>
                                                <select
                                                    name="Role"
                                                    value={scheduleFormData.Role}
                                                    onChange={handleFormChange}
                                                    className="form-select form-select-lg border-secondary-subtle"
                                                    required
                                                >
                                                    <option value="">-- Chọn chức vụ --</option>
                                                    {roleOptions.map(role => (
                                                        <option key={role.value} value={role.value}>
                                                            {role.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Nhân viên <span className="text-danger">*</span></label>
                                                <select
                                                    name="StaffId"
                                                    value={scheduleFormData.StaffId}
                                                    onChange={handleFormChange}
                                                    className="form-select form-select-lg border-secondary-subtle"
                                                    required
                                                    disabled={!!selectedEvent || !scheduleFormData.Role}
                                                >
                                                    <option value="">-- Chọn nhân viên --</option>
                                                    {filteredStaffList.map(staff => (
                                                        <option key={staff.StaffId} value={staff.StaffId}>
                                                            {staff.StaffName} - {staff.Role} {staff.Specialty ? `(${staff.Specialty})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {!scheduleFormData.Role && (
                                                    <div className="form-text text-warning">
                                                        Vui lòng chọn chức vụ trước
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Phòng làm việc <span className="text-danger">*</span></label>
                                                <select
                                                    name="RoomId"
                                                    value={scheduleFormData.RoomId}
                                                    onChange={handleFormChange}
                                                    className="form-select form-select-lg border-secondary-subtle"
                                                    required
                                                >
                                                    <option value="">-- Chọn phòng --</option>
                                                    {roomList.map(room => (
                                                        <option key={room.RoomId} value={room.RoomId}>
                                                            {room.RoomName} - {room.Description}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label fw-semibold">Ngày làm việc <span className="text-danger">*</span></label>
                                                <input
                                                    type="date"
                                                    name="WorkDate"
                                                    value={scheduleFormData.WorkDate}
                                                    onChange={handleFormChange}
                                                    className="form-control form-control-lg border-secondary-subtle"
                                                    required
                                                />
                                            </div>

                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Giờ bắt đầu <span className="text-danger">*</span></label>
                                                <input
                                                    type="time"
                                                    name="StartTime"
                                                    value={scheduleFormData.StartTime}
                                                    onChange={handleFormChange}
                                                    className="form-control form-control-lg border-secondary-subtle"
                                                    step="1"
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Giờ kết thúc <span className="text-danger">*</span></label>
                                                <input
                                                    type="time"
                                                    name="EndTime"
                                                    value={scheduleFormData.EndTime}
                                                    onChange={handleFormChange}
                                                    className="form-control form-control-lg border-secondary-subtle"
                                                    step="1"
                                                    required
                                                />
                                            </div>

                                            <div className="col-12">
                                                <div className="form-check form-switch">
                                                    <input
                                                        type="checkbox"
                                                        name="IsAvailable"
                                                        checked={scheduleFormData.IsAvailable}
                                                        onChange={handleFormChange}
                                                        className="form-check-input"
                                                        id="isAvailableCheck"
                                                    />
                                                    <label className="form-check-label fw-semibold" htmlFor="isAvailableCheck">
                                                        {scheduleFormData.IsAvailable ? "🟢 Có mặt" : "🔴 Vắng mặt"}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer border-top-0 bg-light">
                                        <button type="button" className="btn btn-outline-secondary px-4" onClick={handleCloseModals}>
                                            <BiX className="me-2" /> Hủy
                                        </button>
                                        <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                                            <BiSave className="me-2" />
                                            {loading ? 'Đang xử lý...' : (selectedEvent ? "Cập nhật" : "Thêm mới")}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {isDetailModalOpen && selectedEvent && (
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">Chi Tiết Lịch Làm Việc</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={handleCloseModals}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Nhân viên:</span>
                                            <span className="info-value d-flex align-items-center gap-2">
                                                <RoleIcon role={selectedEvent.extendedProps.Role} />
                                                {selectedEvent.extendedProps.StaffName}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Chức vụ:</span>
                                            <span className="info-value">
                                                <span className={`badge bg-${getBootstrapClass(selectedEvent.extendedProps.Role)}`}>
                                                    {selectedEvent.extendedProps.Role}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Phòng:</span>
                                            <span className="info-value">
                                                {roomList.find(room => room.RoomId == selectedEvent.extendedProps.RoomId)?.RoomName || selectedEvent.extendedProps.RoomId || 'Chưa cập nhật'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Ngày làm:</span>
                                            <span className="info-value">
                                                {new Date(selectedEvent.start).toLocaleDateString('vi-VN', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Thời gian:</span>
                                            <span className="info-value">
                                                {`${new Date(selectedEvent.start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedEvent.end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Trạng thái:</span>
                                            <span className="info-value">
                                                {selectedEvent.extendedProps.IsAvailable ?
                                                    <span className="badge bg-success">🟢 Có mặt</span> :
                                                    <span className="badge bg-danger">🔴 Vắng mặt</span>
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top-0 bg-light d-flex justify-content-between">
                                    <div>
                                        <button className="btn btn-outline-danger me-2" onClick={() => handleOpenDeleteModal(selectedEvent)}>
                                            <BiTrash className="me-1" /> Xóa
                                        </button>
                                        <button className="btn btn-outline-warning" onClick={() => handleOpenEditModal(selectedEvent)}>
                                            <BiPencil className="me-1" /> Sửa
                                        </button>
                                    </div>
                                    <button className="btn btn-primary" onClick={handleCloseModals}>
                                        <BiX className="me-1" /> Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isConfirmModalOpen && selectedEvent && (
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-sm">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header bg-danger text-white">
                                    <h5 className="modal-title fw-bold">Xác Nhận Xóa</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={handleCloseModals}></button>
                                </div>
                                <div className="modal-body text-center p-4">
                                    <BiXCircle size={48} className="text-danger mb-3" />
                                    <p className="mb-2">Bạn có chắc muốn xóa lịch làm việc này?</p>
                                    <p className="fw-bold text-primary">{selectedEvent.extendedProps.StaffName}</p>
                                    <p className="text-muted small">
                                        {new Date(selectedEvent.start).toLocaleDateString('vi-VN', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="modal-footer border-top-0 justify-content-center">
                                    <button className="btn btn-outline-secondary me-3" onClick={handleCloseModals}>
                                        Hủy
                                    </button>
                                    <button className="btn btn-danger" onClick={handleDeleteConfirm} disabled={loading}>
                                        {loading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="d-flex w-100">
            <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
                {toast && (
                    <CustomToast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(null)}
                    />
                )}

                <header className="d-flex justify-content-between align-items-center flex-shrink-0 bg-white rounded-3 p-4 shadow-sm border">
                    <div>
                        <h1 className="h3 mb-1 fw-bold text-primary">Quản Lý Lịch Làm Việc</h1>
                        <p className="text-muted mb-0">Quản lý và theo dõi lịch làm việc của nhân viên</p>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <div className="legend d-flex align-items-center gap-2">
                            <span className="badge bg-primary px-3 py-2">👨‍⚕️ Bác sĩ</span>
                            <span className="badge bg-success px-3 py-2">👩‍⚕️ Y tá</span>
                            <span className="badge bg-warning px-3 py-2">💼 Lễ tân</span>
                            <span className="badge bg-info px-3 py-2">🔧 Kĩ thuật viên</span>
                        </div>
                        <button
                            className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 fw-semibold"
                            onClick={handleOpenAddModal}
                            disabled={loading}
                        >
                            <BiCalendarPlus size={18} /> Thêm Lịch Mới
                        </button>
                    </div>
                </header>

                <div className="card shadow-sm border-0 calendar-panel flex-grow-1 position-relative">
                    {loading && <Loading isLoading={loading} />}
                    <div
                        className="card-body p-0"
                        style={{
                            opacity: loading ? 0.5 : 1,
                            height: '100%',
                            transition: 'opacity 0.3s ease'
                        }}
                    >
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrap5Plugin]}
                            themeSystem="bootstrap5"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            initialView="dayGridMonth"
                            locale="vi"
                            height="100%"
                            events={calendarEvents}
                            eventClick={handleEventClick}
                            eventContent={renderEventContent}
                            buttonText={{
                                today: 'Hôm nay',
                                month: 'Tháng',
                                week: 'Tuần',
                                day: 'Ngày'
                            }}
                            dayMaxEvents={3}
                            slotMinTime="06:00:00"
                            slotMaxTime="22:00:00"
                            allDaySlot={false}
                            nowIndicator={true}
                            editable={!loading}
                            selectable={!loading}
                        />
                    </div>
                </div>

                {renderModals()}
            </main>
        </div>
    );
};

export default AdminScheduleManagement;