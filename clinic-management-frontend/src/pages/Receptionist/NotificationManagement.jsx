import { Mail, Edit, Trash2, Bell, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "../../axios";
import CustomToast from "../../Components/CustomToast/CustomToast";
import Loading from "../../Components/Loading/Loading";
import dayjs from "dayjs";
import ConfirmDeleteModal from "../../Components/CustomToast/DeleteConfirmModal";
import Pagination from "../../Components/Pagination/Pagination";

export default function NotificationManagement() {
  const [appointments, setAppointments] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [formData, setFormData] = useState({
    message: ""
  });
  const [detailData, setDetailData] = useState(null);

  const pageSize = 10;

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  useEffect(() => {
    getAppointments(current);
  }, [current]);

  const getAppointments = async (page = current) => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/receptionist/notifications', {
        params: {
          current: page + 1,
          pageSize: pageSize,
          
        }
      });

      if (response && response.success === true) {
        const appointmentsData = Array.isArray(response.data.data) ? response.data.data : [];
        setAppointments(appointmentsData);
        setPageCount(response.data.totalPages || 0);
      } else {
        setAppointments([]);
        setPageCount(0);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      showToast("error", error.response?.message || "Lỗi server");
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };


  // THÊM THÔNG BÁO
  const handleCreateNotification = async () => {
    if (!formData.message.trim()) {
      showToast("error", "Vui lòng nhập nội dung thông báo");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.post('/api/receptionist/notifications', {
        appointment_id: selectedAppointment.id,
        message: formData.message
      });

      if (response.success) {
        showToast("success", "Tạo thông báo thành công");
        setShowCreateModal(false);
        setFormData({ message: "" });
        setSelectedAppointment(null);
        getAppointments(current);
      }
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.message || "Lỗi khi tạo thông báo");
    } finally {
      setIsLoading(false);
    }
  };

  // SỬA THÔNG BÁO
  const handleUpdateNotification = async () => {
    if (!formData.message.trim()) {
      showToast("error", "Vui lòng nhập nội dung thông báo");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.put(`/api/receptionist/notifications/${selectedNotification.id}`, {
        message: formData.message
      });

      if (response.success) {
        showToast("success", "Cập nhật thông báo thành công");
        setShowEditModal(false);
        setFormData({ message: "" });
        setSelectedNotification(null);
        getAppointments(current);
      }
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.message || "Lỗi khi cập nhật thông báo");
    } finally {
      setIsLoading(false);
    }
  };

  // XÓA THÔNG BÁO
  const handleDeleteNotification = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.delete(`/api/receptionist/notifications/${selectedNotification.id}`);

      if (response.success) {
        showToast("success", "Xóa thông báo thành công");
        setShowDeleteModal(false);
        setSelectedNotification(null);
        getAppointments(current);
      }
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.message || "Lỗi khi xóa thông báo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (appointment) => {
    try {
      setIsLoading(true);
      if (appointment.has_notification) {
        const response = await axiosInstance.get(`/api/receptionist/notifications/${appointment.notification_id}/detail`);
        if (response.success) {
          setDetailData(response.data);
          setShowDetailModal(true);
        }
      } else {
        const response = await axiosInstance.get(`/api/receptionist/appointments/${appointment.id}/detail`);
        if (response.success) {
          setDetailData(response.data);
          setShowDetailModal(true);
        }
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Lỗi khi lấy thông tin chi tiết");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = (appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      message: `Xin chào ${appointment.full_name}, đây là lời nhắc lịch hẹn khám của bạn vào ${dayjs(appointment.date).format('DD/MM/YYYY')} lúc ${appointment.time}. Vui lòng đến đúng giờ.`
    });
    setShowCreateModal(true);
  };

  const openEditModal = (appointment) => {
    setSelectedNotification({
      id: appointment.notification_id,
      message: appointment.notification_message
    });
    setFormData({
      message: appointment.notification_message
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (appointment) => {
    setSelectedNotification({
      id: appointment.notification_id,
      message: appointment.notification_message
    });
    setShowDeleteModal(true);
  };

  const handlePageChange = ({ selected }) => {
    setCurrent(selected);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Đã lên lịch': { class: 'bg-primary text-white', icon: 'bi-clock', label: 'Đã lên lịch' },
      'Đã gửi': { class: 'bg-success text-white', icon: 'bi-check-circle', label: 'Đã gửi' },
      'Thất bại': { class: 'bg-danger text-white', icon: 'bi-x-circle', label: 'Thất bại' }
    };

    const config = statusConfig[status] || { class: 'bg-secondary text-white', icon: 'bi-question', label: status };

    return (
      <span className={`badge ${config.class} d-flex align-items-center justify-content-center`} style={{ minWidth: "100px" }}>
        <i className={`bi ${config.icon} me-1`}></i>
        {config.label}
      </span>
    );
  };

  // Count statistics
  const totalAppointments = appointments.length;
  const hasNotificationCount = appointments.filter(item => item.has_notification).length;
  const noNotificationCount = appointments.filter(item => !item.has_notification).length;

  // Đảm bảo appointments luôn là array trước khi render
  const displayAppointments = Array.isArray(appointments) ? appointments : [];
  const sortedAppointments = displayAppointments.sort((a, b) => {
    if (a.has_notification !== b.has_notification) {
      return a.has_notification ? 1 : -1;
    }

    const dateA = dayjs(`${a.date} ${a.time}`);
    const dateB = dayjs(`${b.date} ${b.time}`);
    return dateA - dateB;
  });
  return (
    <div className="container-fluid py-4">
      {/* Toast Notification */}
      {toast && (
        <CustomToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Loading Component */}
      <Loading isLoading={isLoading} />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="Xác nhận xóa thông báo"
        message="Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác."
        onConfirm={handleDeleteNotification}
        onCancel={() => setShowDeleteModal(false)}
      />

      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          {/* HEADER */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <div>
              <h4 className="fw-bold text-primary mb-1">
                Quản Lý Thông Báo Nhắc Lịch Hẹn
              </h4>
              <p className="text-muted m-0">
                {dayjs().format('dddd, DD [tháng] MM, YYYY')}
              </p>
            </div>

            <div className="mt-2 mt-md-0">
              <div className="d-flex flex-wrap gap-2">
                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                  <span className="text-primary fw-bold me-1">
                    {totalAppointments}
                  </span>
                  <span className="text-muted">Tổng số</span>
                </div>
                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                  <span className="text-success fw-bold me-1">
                    {hasNotificationCount}
                  </span>
                  <span className="text-muted">Đã có TB</span>
                </div>
                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                  <span className="text-warning fw-bold me-1">
                    {noNotificationCount}
                  </span>
                  <span className="text-muted">Chưa có TB</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-responsive rounded border">
            <table className="table table-hover align-middle clinic-table mb-0">
              <thead className="table-light">
                <tr>
                  <th>Tên Bệnh Nhân</th>
                  <th className="text-center">Ngày Hẹn</th>
                  <th className="text-center">Giờ Hẹn</th>
                  <th>Bác Sĩ</th>
                  <th>Dịch Vụ</th>
                  <th className="text-center">Trạng Thái TB</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {sortedAppointments.length > 0 ? (
                  sortedAppointments.map((item) => (
                    <tr key={item.id} className="table-row-hover">
                      <td>
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                            style={{
                              width: "40px",
                              height: "40px",
                              fontSize: "14px",
                              fontWeight: "bold",
                            }}
                          >
                            {item.full_name?.split(" ").pop()?.charAt(0) || "P"}
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-semibold">
                              {item.full_name}
                            </div>
                            <small className="text-muted">
                              ID: {item.id}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="fw-bold text-primary bg-light px-2 py-1 rounded">
                          {dayjs(item.date).format("DD/MM/YYYY")}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="fw-bold text-primary bg-light px-2 py-1 rounded">
                          {item.time}
                        </span>
                      </td>
                      <td className="fw-medium">{item.doctor_name}</td>
                      <td>
                        <span className="badge bg-info text-dark px-3 py-2">
                          <i className="bi bi-heart-pulse me-1"></i>
                          {item.service_type}
                        </span>
                      </td>
                      <td className="text-center">
                        {item.has_notification ?
                          getStatusBadge(item.notification_status) :
                          <span className="badge bg-secondary text-white d-flex align-items-center justify-content-center" style={{ minWidth: "100px" }}>
                            <i className="bi bi-clock me-1"></i>
                            Chưa có TB
                          </span>
                        }
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-2 justify-content-center flex-wrap">
                          <button
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                            onClick={() => handleViewDetail(item)}
                            title="Xem chi tiết"
                          >
                            <Eye size={16} className="me-1" />
                            Chi tiết
                          </button>

                          {item.has_notification ? (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary d-flex align-items-center"
                                onClick={() => openEditModal(item)}
                                title="Sửa thông báo"
                              >
                                <Edit size={16} className="me-1" />
                                Sửa
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger d-flex align-items-center"
                                onClick={() => openDeleteModal(item)}
                                title="Xóa thông báo"
                              >
                                <Trash2 size={16} className="me-1" />
                                Xóa
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-success d-flex align-items-center"
                              onClick={() => openCreateModal(item)}
                              title="Tạo thông báo"
                            >
                              <Bell size={16} className="me-1" />
                              Tạo TB
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="text-muted">
                        <i className="bi bi-inbox display-4 d-block mb-2"></i>
                        Không có lịch hẹn nào.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination
                pageCount={pageCount}
                onPageChange={handlePageChange}
                currentPage={current}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal tạo thông báo */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tạo Thông Báo Mới</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isLoading}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Bệnh nhân:</strong> {selectedAppointment?.full_name}
                </div>
                <div className="mb-3">
                  <strong>Ngày hẹn:</strong> {dayjs(selectedAppointment?.date).format('DD/MM/YYYY')} lúc {selectedAppointment?.time}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Nội dung thông báo:</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ message: e.target.value })}
                    className="form-control"
                    rows="5"
                    placeholder="Nhập nội dung thông báo..."
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isLoading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateNotification}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Tạo Thông Báo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal sửa thông báo */}
      {showEditModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sửa Thông Báo</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                  disabled={isLoading}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Nội dung thông báo:</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ message: e.target.value })}
                    className="form-control"
                    rows="5"
                    placeholder="Nhập nội dung thông báo..."
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={isLoading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateNotification}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Cập nhật'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết */}
      {showDetailModal && detailData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi Tiết</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {detailData.appointment ? (
                  // Chi tiết thông báo
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <strong>Bệnh nhân:</strong>
                      <div className="text-muted">{detailData.appointment.full_name}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Ngày hẹn:</strong>
                      <div className="text-muted">{dayjs(detailData.appointment.date).format('DD/MM/YYYY')}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Giờ hẹn:</strong>
                      <div className="text-muted">{detailData.appointment.time}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Bác sĩ:</strong>
                      <div className="text-muted">{detailData.appointment.doctor_name}</div>
                    </div>
                    <div className="col-12 mb-3">
                      <strong>Nội dung thông báo:</strong>
                      <div className="bg-light p-3 rounded mt-2 border">
                        {detailData.message}
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Trạng thái:</strong>
                      <div className="mt-1">{getStatusBadge(detailData.status)}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Thời gian gửi:</strong>
                      <div className="text-muted">{dayjs(detailData.sent_at).format('DD/MM/YYYY HH:mm')}</div>
                    </div>
                  </div>
                ) : (
                  // Chi tiết lịch hẹn
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <strong>Bệnh nhân:</strong>
                      <div className="text-muted">{detailData.full_name}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Số điện thoại:</strong>
                      <div className="text-muted">{detailData.phone}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Email:</strong>
                      <div className="text-muted">{detailData.email || 'N/A'}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Ngày hẹn:</strong>
                      <div className="text-muted">{dayjs(detailData.date).format('DD/MM/YYYY')}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Giờ hẹn:</strong>
                      <div className="text-muted">{detailData.time}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Bác sĩ:</strong>
                      <div className="text-muted">{detailData.doctor_name}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Dịch vụ:</strong>
                      <div className="text-muted">{detailData.service_type}</div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Phòng:</strong>
                      <div className="text-muted">{detailData.room_name}</div>
                    </div>
                    <div className="col-12 mb-3">
                      <strong>Ghi chú:</strong>
                      <div className="text-muted">{detailData.notes || 'Không có ghi chú'}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}