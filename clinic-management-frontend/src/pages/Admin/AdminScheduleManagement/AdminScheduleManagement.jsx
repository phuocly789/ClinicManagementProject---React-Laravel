import './AdminScheduleManagement.css';
import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import Loading from '../../../Components/Loading/Loading';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import instance from '../../../axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import { BiCalendarPlus, BiPencil, BiSave, BiTrash, BiX, BiXCircle } from 'react-icons/bi';
// Thêm icon cho các vai trò
import { FaUserMd, FaUserNurse, FaUserPlus, FaUserTie } from 'react-icons/fa';

const initialFormState = {
    StaffId: '',
    WorkDate: new Date().toISOString().split('T')[0],
    StartTime: '08:00:00',
    EndTime: '17:00:00',
    IsAvailable: true,
};

const AdminScheduleManagement = () => {
    const [schedules, setSchedules] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [scheduleFormData, setScheduleFormData] = useState(initialFormState);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // SỬA LẠI API ENDPOINT
            const response = await instance.get('/api/schedules');
            // SỬA LẠI LOGIC XỬ LÝ RESPONSE
            if (response && response.status === 'Success') {
                const fetchedSchedules = response.data.Items || [];
                setSchedules(fetchedSchedules);

                const uniqueStaff = fetchedSchedules.reduce((acc, current) => {
                    if (!acc.find(item => item.StaffId === current.StaffId)) {
                        acc.push({ StaffId: current.StaffId, StaffName: current.StaffName, Role: current.Role });
                    }
                    return acc;
                }, []);
                setStaffList(uniqueStaff);
            } else {
                throw new Error(response.message || 'Không tải được lịch.');
            }
        } catch (error) {
            setToast({ type: 'error', message: error.message || 'Lỗi kết nối máy chủ.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    const colorRole = {
        'Bác sĩ': 'doctor',
        'Y tá': 'nurse',
        'Lễ tân': 'receptionist',
        'Kĩ thuật viên': 'technician'
    }
    const calendarEvents = schedules.map(s => ({
        id: s.ScheduleId,
        title: s.StaffName,
        start: `${s.WorkDate}T${s.StartTime}`,
        end: `${s.WorkDate}T${s.EndTime}`,
        // Thêm className để dễ dàng style bằng CSS
        className: `event-${colorRole[s.Role]}`,
        extendedProps: { ...s }
    }));

    const handleCloseModals = () => {
        setFormModalOpen(false);
        setDetailModalOpen(false);
        setConfirmModalOpen(false);
        setSelectedEvent(null);
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
        handleCloseModals();
        const { extendedProps, startStr, endStr } = event;

        const startTime = startStr.split('T')[1].substring(0, 8);
        const endTime = endStr.split('T')[1].substring(0, 8);

        setScheduleFormData({
            StaffId: extendedProps.StaffId,
            WorkDate: startStr.split('T')[0],
            StartTime: startTime,
            EndTime: endTime,
            IsAvailable: extendedProps.IsAvailable,
        });
        setSelectedEvent(event);
        setFormModalOpen(true);
    };

    const handleOpenDeleteModal = (event) => {
        setSelectedEvent(event);
        // handleCloseModals();
        // setDetailModalOpen(true);
        setConfirmModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setScheduleFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const isEditing = !!selectedEvent;
        const url = isEditing ? `/api/schedules/${selectedEvent.id}` : '/api/schedules';
        const method = isEditing ? 'put' : 'post';

        try {
            // SỬA LẠI LOGIC XỬ LÝ RESPONSE
            const response = await instance[method](url, scheduleFormData);
            if (response && response.status === 'Success') {
                setToast({ type: 'success', message: response.message });
                handleCloseModals();
                fetchData();
            } else {
                throw new Error(response.message || 'Thao tác thất bại.');
            }
        } catch (error) {
            const errorMessage = error.response?.errors
                ? Object.values(error.response.errors).flat().join(' ')
                : (error.response?.message || error.message || 'Lỗi không xác định.');
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedEvent) return;
        setLoading(true);
        try {
            // SỬA LẠI LOGIC XỬ LÝ RESPONSE
            const response = await instance.delete(`/api/schedules/${selectedEvent.id}`);
            if (response && response.status === 'Success') {
                setToast({ type: 'success', message: response.message });
                handleCloseModals();
                fetchData();
            } else {
                throw new Error(response.message || 'Xóa thất bại.');
            }
        } catch (error) {
            setToast({ type: 'error', message: error.response?.message || 'Lỗi khi xóa.' });
        } finally {
            setLoading(false);
        }
    };

    // HÀM RENDER GIAO DIỆN SỰ KIỆN MỚI
    const renderEventContent = (eventInfo) => {
        const { Role } = eventInfo.event.extendedProps;
        const roleIcons = {
            'Bác sĩ': <FaUserMd />,
            'Y tá': <FaUserNurse />,
            'Kĩ thuật viên': <FaUserTie />,
            'Lễ tân': <FaUserPlus />
        };
        return (
            <div className="event-main-content w-100 p-1">
                <div className={`event-icon`}>{roleIcons[Role] || <FaUserTie />}</div>
                <div className="event-details">
                    <div className="event-title">{eventInfo.event.title}</div>
                    <div className="event-role">{Role}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="schedule-layout">
            <AdminSidebar />
            <main className="main-content">
                <header className="page-header">
                    <h1>Quản Lý Lịch Làm Việc</h1>
                    <div className="d-flex align-items-center gap-3">
                        <div className="legend">
                            <span className="badge bg-doctor">Bác sĩ</span>
                            <span className="badge bg-nurse">Y tá</span>
                            <span className="badge bg-receptionist">Lễ tân</span>
                            <span className="badge bg-technicians">Kĩ thuật viên</span>
                        </div>
                        <button className="btn btn-primary" onClick={handleOpenAddModal}>
                            <BiCalendarPlus className="icon" /> Thêm Lịch Mới
                        </button>
                    </div>
                </header>

                {toast && <CustomToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

                <div className="card-style calendar-container">
                    <Loading isLoading={loading} />  
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, bootstrap5Plugin]}
                            themeSystem="bootstrap5"
                            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridDay' }}
                            initialView="dayGridMonth"
                            locale="vi"
                            height="100%"
                            events={calendarEvents}
                            eventClick={handleEventClick}
                            // SỬ DỤNG eventContent ĐỂ CUSTOMIZE GIAO DIỆN
                            eventContent={renderEventContent}
                        />
                    
                </div>

                {/* --- CÁC MODAL GIỮ NGUYÊN CẤU TRÚC NHƯNG SẼ ĐƯỢC CSS LÀM ĐẸP --- */}
                {/* MODAL THÊM / SỬA LỊCH */}
                {isFormModalOpen && (
                    <div className="modal-overlay" onClick={handleCloseModals}>
                        <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">{selectedEvent ? "Cập Nhật Lịch" : "Thêm Lịch Mới"}</h2>
                                <button className="btn-close" onClick={handleCloseModals}>&times;</button>
                            </div>
                            <form onSubmit={handleFormSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Nhân viên:</label>
                                        <select name="StaffId" value={scheduleFormData.StaffId} onChange={handleFormChange} className="form-control" required disabled={!!selectedEvent}>
                                            <option value="">-- Chọn nhân viên --</option>
                                            {staffList.map(staff => <option key={staff.StaffId} value={staff.StaffId}>{staff.StaffName} ({staff.Role})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Ngày làm:</label><input type="date" name="WorkDate" value={scheduleFormData.WorkDate} onChange={handleFormChange} className="form-control" required /></div>
                                    <div className="row">
                                        <div className="col-md-6 form-group"><label>Bắt đầu:</label><input type="time" name="StartTime" value={scheduleFormData.StartTime} onChange={handleFormChange} className="form-control" step="1" required /></div>
                                        <div className="col-md-6 form-group"><label>Kết thúc:</label><input type="time" name="EndTime" value={scheduleFormData.EndTime} onChange={handleFormChange} className="form-control" step="1" required /></div>
                                    </div>
                                    <div className="form-check mt-3 d-flex justify-content-between">
                                        <input type="checkbox" name="IsAvailable" checked={scheduleFormData.IsAvailable} onChange={handleFormChange} className="form-check-input" style={{ width:'20px' }} id="isAvailableCheck" />
                                        <label className="form-check-label" htmlFor="isAvailableCheck">Có mặt</label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline" onClick={handleCloseModals}><BiXCircle className="icon" /> Hủy</button>
                                    <button type="submit" className="btn btn-primary"><BiSave className="icon" /> Lưu</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL XEM CHI TIẾT */}
                {isDetailModalOpen && selectedEvent && (
                    <div className="modal-overlay" onClick={handleCloseModals}>
                        <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2 className="modal-title">Chi Tiết Lịch Làm Việc</h2><button className="btn-close" onClick={handleCloseModals}>&times;</button></div>
                            <div className="modal-body">
                                <div className="info-row"><span className="label">Nhân viên:</span> <span className="value">{selectedEvent.extendedProps.StaffName}</span></div>
                                <div className="info-row"><span className="label">Chức vụ:</span> <span className="value">{selectedEvent.extendedProps.Role}</span></div>
                                <div className="info-row"><span className="label">Ngày làm:</span> <span className="value">{new Date(selectedEvent.startStr).toLocaleDateString('vi-VN')}</span></div>
                                <div className="info-row"><span className="label">Thời gian:</span> <span className="value">{`${new Date(selectedEvent.startStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedEvent.endStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}</span></div>
                                <div className="info-row"><span className="label">Trạng thái:</span> <span className="value">{selectedEvent.extendedProps.IsAvailable ? "Có mặt" : "Vắng"}</span></div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline" onClick={handleCloseModals}><BiX className="icon" /> Đóng</button>
                                <button className="btn btn-secondary" onClick={() => handleOpenEditModal(selectedEvent)}><BiPencil className="icon" /> Sửa</button>
                                <button className="btn btn-danger" onClick={() => handleOpenDeleteModal(selectedEvent)}><BiTrash className="icon" /> Xóa</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL XÁC NHẬN XÓA */}
                {isConfirmModalOpen && selectedEvent && (
                    <div className="modal-overlay" onClick={handleCloseModals}>
                        <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2 className="modal-title">Xác Nhận Xóa</h2><button className="btn-close" onClick={handleCloseModals}>&times;</button></div>
                            <div className="modal-body">
                                <p>Bạn có chắc chắn muốn xóa lịch làm việc của <strong>{selectedEvent.extendedProps.StaffName}</strong> vào ngày <strong>{new Date(selectedEvent.startStr).toLocaleDateString('vi-VN')}</strong>?</p>
                                <p className="text-muted small">Hành động này không thể hoàn tác.</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={handleCloseModals}>Hủy</button>
                                <button className="btn btn-danger" onClick={handleDeleteConfirm}>Xác Nhận Xóa</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminScheduleManagement;