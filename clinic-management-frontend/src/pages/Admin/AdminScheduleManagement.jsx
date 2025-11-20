import { useCallback, useEffect, useState, useMemo } from 'react';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import Loading from '../../Components/Loading/Loading';
import CustomToast from '../../Components/CustomToast/CustomToast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { BiCalendarPlus, BiPencil, BiSave, BiTrash, BiX, BiXCircle, BiUser, BiTime, BiCalendar } from 'react-icons/bi';
import { FaUserMd, FaUserNurse, FaUserPlus, FaUserTie } from 'react-icons/fa';
import '../../App.css';
import axiosInstance from '../../axios';

// QUAY LẠI dùng Role (chuỗi) vì API trả về chuỗi
const initialFormState = {
    StaffId: '',
    Role: '', // DÙNG LẠI Role (chuỗi)
    WorkDate: new Date().toISOString().split('T')[0],
    StartTime: '08:00',
    EndTime: '17:00',
    IsAvailable: true,
    RoomId: ''
};

// Giữ nguyên roleOptions với value là chuỗi
const roleOptions = [
    { value: 'Bác sĩ', label: 'Bác sĩ', icon: FaUserMd, color: 'primary' },
    { value: 'Y tá', label: 'Y tá', icon: FaUserNurse, color: 'success' },
    { value: 'Lễ tân', label: 'Lễ tân', icon: FaUserPlus, color: 'warning' },
    { value: 'Kĩ thuật viên', label: 'Kĩ thuật viên', icon: FaUserTie, color: 'info' }
];

// Sửa hàm getRoleClass để nhận roleName (chuỗi)
const getRoleClass = (roleName) => {
    switch (roleName) {
        case 'Bác sĩ': return 'doctor';
        case 'Y tá': return 'nurse';
        case 'Lễ tân': return 'receptionist';
        case 'Kĩ thuật viên': return 'technician';
        default: return 'secondary';
    }
};

// Sửa hàm getBootstrapClass
const getBootstrapClass = (roleName) => {
    switch (roleName) {
        case 'Bác sĩ': return 'primary';
        case 'Y tá': return 'success';
        case 'Lễ tân': return 'warning';
        case 'Kĩ thuật viên': return 'info';
        default: return 'secondary';
    }
};

// Hàm map roleName sang roleId để filter staff (nếu cần)
const mapRoleNameToRoleId = (roleName) => {
    switch (roleName) {
        case 'Lễ tân': return '3';
        case 'Bác sĩ': return '4';
        case 'Kĩ thuật viên': return '5';
        case 'Y tá': return '6';
        default: return '';
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
            const response = await axiosInstance.get('/api/rooms');
            const rooms = response.data;
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
            const response = await axiosInstance.get('/api/staff');
            const staffFromApi = response.data;

            const transformedStaff = staffFromApi.map(staff => {
                // Map StaffType số sang tên role
                let roleName = 'Không xác định';
                switch (parseInt(staff.StaffType)) {
                    case 3: roleName = 'Lễ tân'; break;
                    case 4: roleName = 'Bác sĩ'; break;
                    case 5: roleName = 'Kĩ thuật viên'; break;
                    case 6: roleName = 'Y tá'; break;
                    default: roleName = 'Không xác định';
                }

                return {
                    StaffId: staff.StaffId,
                    StaffName: staff.user?.FullName || `NV${staff.StaffId}`,
                    Role: roleName, // DÙNG Role (chuỗi)
                    StaffType: staff.StaffType,
                    Specialty: staff.Specialty,
                    LicenseNumber: staff.LicenseNumber,
                    FullName: staff.user?.FullName
                };
            });

            setStaffList(transformedStaff);
        } catch (error) {
            console.error('Error fetching staff:', error);
            // Fallback từ schedules
            const uniqueStaff = schedules.reduce((acc, current) => {
                if (current.StaffId && !acc.find(item => item.StaffId === current.StaffId)) {
                    acc.push({
                        StaffId: current.StaffId,
                        StaffName: current.StaffName || `NV${current.StaffId}`,
                        Role: current.Role || 'Không xác định'
                    });
                }
                return acc;
            }, []);
            setStaffList(uniqueStaff);
        }
    }, [schedules]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/api/schedules');
            const fetchedSchedules = response.data.Items;
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
    }, []);

    useEffect(() => {
        if (schedules.length > 0) {
            fetchStaff();
        }
    }, [schedules]);

    // SỬA: Filter staff theo Role (chuỗi)
    const filteredStaffList = useMemo(() => {
   
        console.log('staff lítttttttttttt'+staffList);
        
        if (scheduleFormData.Role) {
            return staffList.filter(staff => staff.StaffType === scheduleFormData.Role);
        }
        return staffList;
    }, [scheduleFormData.Role, staffList]);

    const calendarEvents = useMemo(() => {
        return schedules.map(schedule => {
            let date = schedule.WorkDate;
            if (typeof date === 'string' && date.includes('T')) {
                date = date.split('T')[0];
            }

            // DEBUG: Log để xem dữ liệu thực tế
            console.log('Schedule data:', schedule);

            return {
                id: schedule.ScheduleId?.toString(),
                title: schedule.StaffName || `NV${schedule.StaffId}`,
                start: `${date}T${schedule.StartTime || '08:00:00'}`,
                end: `${date}T${schedule.EndTime || '17:00:00'}`,
                className: `event-${getRoleClass(schedule.Role)}`, // DÙNG schedule.Role (chuỗi)
                extendedProps: {
                    ...schedule,
                    Role: schedule.Role // Đảm bảo có Role trong extendedProps
                }
            };
        });
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

        // SỬA: Dùng Role (chuỗi) từ extendedProps
        setScheduleFormData({
            StaffId: extendedProps.StaffId || '',
            Role: extendedProps.Role || '', // DÙNG Role (chuỗi)
            WorkDate: formatDateForInput(start),
            StartTime: formatTimeForInput(start),
            EndTime: formatTimeForInput(end),
            IsAvailable: extendedProps.IsAvailable !== false,
            RoomId: extendedProps.RoomId || ''
        });
        setDetailModalOpen(false);
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
            // CHUẨN BỊ DATA - KHÔNG gửi Role vì API không cần
            const submitData = {
                StaffId: scheduleFormData.StaffId,
                WorkDate: scheduleFormData.WorkDate,
                StartTime: scheduleFormData.StartTime.length === 5 ? `${scheduleFormData.StartTime}:00` : scheduleFormData.StartTime,
                EndTime: scheduleFormData.EndTime.length === 5 ? `${scheduleFormData.EndTime}:00` : scheduleFormData.EndTime,
                IsAvailable: scheduleFormData.IsAvailable,
                RoomId: scheduleFormData.RoomId
            };

            const response = await axiosInstance[method](url, submitData);

            if (response.data?.status === 'Success' || response.status === 'Success' || response.message) {
                setToast({
                    type: 'success',
                    message: response.data?.message || response.message || 'Thao tác thành công!'
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
                message: error.response?.data?.message ||
                    error.response?.message ||
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
            const response = await axiosInstance.delete(`/api/schedules/${selectedEvent.id}`);

            if (response.data?.status === 'Success' || response.status === 'Success' || response.message) {
                setToast({
                    type: 'success',
                    message: response.data?.message || response.message || 'Xóa thành công!'
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
                message: error.response?.data?.message ||
                    error.response?.message ||
                    error.message ||
                    'Lỗi khi xóa.'
            });
        } finally {
            setLoading(false);
        }
    };

    const renderEventContent = (eventInfo) => {
        const roleName = eventInfo.event.extendedProps.Role;

        const roleIcons = {
            'Bác sĩ': <FaUserMd className="text-primary" />,
            'Y tá': <FaUserNurse className="text-success" />,
            'Kĩ thuật viên': <FaUserTie className="text-info" />,
            'Lễ tân': <FaUserPlus className="text-warning" />
        };

        return (
            <div className="event-main-content">
                <div className="event-icon">{roleIcons[roleName] || <FaUserTie />}</div>
                <div className="event-details">
                    <div className="event-title">{eventInfo.event.title}</div>
                    <div className="event-role">{roleName}</div>
                </div>
            </div>
        );
    };

    const RoleIcon = ({ role, size = 18 }) => {
        const IconComponent = roleOptions.find(r => r.value === role)?.icon || FaUserTie;
        return <IconComponent size={size} />;
    };

    // PHẦN RENDER MODALS GIỮ NGUYÊN, chỉ cần đảm bảo dùng Role (chuỗi)

    const renderModals = () => {
        if (!isFormModalOpen && !isDetailModalOpen && !isConfirmModalOpen) return null;

        return (
            <>
                <div className="modal-backdrop fade show"></div>

                {isFormModalOpen && (
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header bg-primary text-white border-0">
                                    <h5 className="modal-title fw-bold">
                                        {selectedEvent ? "Cập Nhật Lịch Làm Việc" : "Thêm Lịch Làm Việc Mới"}
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={handleCloseModals}></button>
                                </div>
                                <form onSubmit={handleFormSubmit}>
                                    <div className="modal-body p-4">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Chức vụ <span className="text-danger">*</span></label>
                                                <select
                                                    name="Role" // DÙNG Role (chuỗi)
                                                    value={scheduleFormData.Role}
                                                    onChange={handleFormChange}
                                                    className="form-select"
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

                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Nhân viên <span className="text-danger">*</span></label>
                                                <select
                                                    name="StaffId"
                                                    value={scheduleFormData.StaffId}
                                                    onChange={handleFormChange}
                                                    className="form-select"
                                                    required
                                                    disabled={!!selectedEvent || !scheduleFormData.Role}
                                                >
                                                    <option value="">-- Chọn nhân viên --</option>
                                                    {filteredStaffList.map(staff => (
                                                        <option key={staff.StaffId} value={staff.StaffId}>
                                                            {staff.StaffName} - {staff.StaffType} {staff.Specialty ? `(${staff.Specialty})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {!scheduleFormData.Role && (
                                                    <div className="form-text text-warning">
                                                        Vui lòng chọn chức vụ trước
                                                    </div>
                                                )}
                                            </div>

                                            {/* Các trường khác giữ nguyên */}
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Phòng làm việc <span className="text-danger">*</span></label>
                                                <select
                                                    name="RoomId"
                                                    value={scheduleFormData.RoomId}
                                                    onChange={handleFormChange}
                                                    className="form-select"
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

                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold">Ngày làm việc <span className="text-danger">*</span></label>
                                                <input
                                                    type="date"
                                                    name="WorkDate"
                                                    value={scheduleFormData.WorkDate}
                                                    onChange={handleFormChange}
                                                    className="form-control"
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
                                                    className="form-control"
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
                                                    className="form-control"
                                                    required
                                                />
                                            </div>

                                            <div className="col-12">
                                                <div className="form-check form-switch mt-2">
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
                                    <div className="modal-footer border-top">
                                        <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModals}>
                                            <BiX className="me-2" /> Hủy
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
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
                                <div className="modal-header bg-primary text-white border-0">
                                    <h5 className="modal-title fw-bold">Chi Tiết Lịch Làm Việc</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={handleCloseModals}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <div className="d-flex align-items-center gap-3 p-3 bg-light rounded">
                                                <RoleIcon role={selectedEvent.extendedProps.Role} size={24} />
                                                <div>
                                                    <div className="fw-bold text-dark">{selectedEvent.extendedProps.StaffName}</div>
                                                    <span className={`badge bg-${getBootstrapClass(selectedEvent.extendedProps.Role)}`}>
                                                        {selectedEvent.extendedProps.Role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label text-muted small mb-1">Phòng làm việc</label>
                                            <div className="fw-semibold">
                                                {selectedEvent.extendedProps.RoomName || 'Chưa cập nhật'}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label text-muted small mb-1">Ngày làm việc</label>
                                            <div className="fw-semibold">
                                                {new Date(selectedEvent.start).toLocaleDateString('vi-VN', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label text-muted small mb-1">Thời gian</label>
                                            <div className="fw-semibold">
                                                {`${new Date(selectedEvent.start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedEvent.end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label text-muted small mb-1">Trạng thái</label>
                                            <div>
                                                {selectedEvent.extendedProps.IsAvailable ?
                                                    <span className="badge bg-success">🟢 Có mặt</span> :
                                                    <span className="badge bg-danger">🔴 Vắng mặt</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top">
                                    <div className="d-flex gap-2 w-100 justify-content-between">
                                        <div>
                                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleOpenDeleteModal(selectedEvent)}>
                                                <BiTrash className="me-1" /> Xóa
                                            </button>
                                            <button className="btn btn-outline-warning btn-sm ms-2" onClick={() => handleOpenEditModal(selectedEvent)}>
                                                <BiPencil className="me-1" /> Sửa
                                            </button>
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={handleCloseModals}>
                                            <BiX className="me-1" /> Đóng
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Modal giữ nguyên */}
                {/* THÊM MODAL XÁC NHẬN XÓA */}
                {isConfirmModalOpen && selectedEvent && (
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-sm">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header bg-danger text-white border-0 justify-content-center">
                                    <BiXCircle size={24} />
                                </div>
                                <div className="modal-body text-center p-4">
                                    <h6 className="fw-bold mb-3">Xác Nhận Xóa</h6>
                                    <p className="text-muted mb-3 small">Bạn có chắc muốn xóa lịch làm việc này?</p>
                                    <div className="bg-light rounded p-3 mb-3">
                                        <div className="fw-bold text-primary">{selectedEvent.extendedProps.StaffName}</div>
                                        <div className="text-muted small">
                                            {new Date(selectedEvent.start).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top justify-content-center">
                                    <button className="btn btn-outline-secondary btn-sm" onClick={handleCloseModals}>
                                        Hủy
                                    </button>
                                    <button className="btn btn-danger btn-sm ms-2" onClick={handleDeleteConfirm} disabled={loading}>
                                        {loading ? 'Đang xóa...' : 'Xóa'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    // PHẦN RETURN GIỮ NGUYÊN

    return (
        <div className="d-flex">
            <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
                {toast && (
                    <CustomToast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(null)}
                    />
                )}

                {/* Header */}
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <h1 className="h4 fw-bold text-dark mb-1">Quản Lý Lịch Làm Việc</h1>
                        <p className="text-muted mb-0">Quản lý và theo dõi lịch làm việc của nhân viên</p>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex gap-2">
                            {roleOptions.map(role => (
                                <span key={role.value} className={`badge bg-${role.color} d-flex align-items-center gap-1 px-2 py-1`}>
                                    <role.icon size={12} />
                                    <small>{role.label}</small>
                                </span>
                            ))}
                        </div>
                        <button
                            className="btn btn-primary d-flex align-items-center gap-2"
                            onClick={handleOpenAddModal}
                            disabled={loading}
                        >
                            <BiCalendarPlus size={16} />
                            Thêm Lịch
                        </button>
                    </div>
                </div>

                {/* Calendar */}
                <div className="card border-0 shadow-sm flex-grow-1">
                    <div className="card-body p-0 position-relative">
                        {loading && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 z-3">
                                <Loading isLoading={loading} />
                            </div>
                        )}
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

                <style jsx>{`
                    .event-main-content {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 2px 4px;
                    }
                    
                    .event-icon {
                        font-size: 12px;
                        flex-shrink: 0;
                    }
                    
                    .event-details {
                        flex-grow: 1;
                        min-width: 0;
                    }
                    
                    .event-title {
                        font-weight: 600;
                        font-size: 11px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        line-height: 1.2;
                    }
                    
                    .event-role {
                        font-size: 9px;
                        opacity: 0.8;
                        line-height: 1;
                    }

                    .fc .fc-toolbar {
                        padding: 1rem;
                        margin-bottom: 0;
                    }

                    .fc .fc-toolbar-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                    }

                    .fc .fc-button {
                        padding: 0.375rem 0.75rem;
                        font-size: 0.875rem;
                    }

                    .fc .fc-event {
                        border: none;
                        padding: 2px 4px;
                    }

                `}</style>
            </main>
        </div>
    );
};

export default AdminScheduleManagement;