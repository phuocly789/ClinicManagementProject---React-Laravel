import { Mail, Edit, Trash2, Bell, BellOff, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import axiosInstance from "../../axios";
import Pagination from "../../Components/Pagination/Pagination";
import CustomToast from "../../Components/CustomToast/CustomToast";
import dayjs from "dayjs";

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
          pageSize: pageSize
        }
      });

      if (response && response.success === true) {
        setAppointments(response?.data?.data);
        setPageCount(response?.data?.totalPages);
      }
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data?.message || "Lỗi server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    if (!formData.message.trim()) {
      showToast("error", "Vui lòng nhập nội dung thông báo");
      return;
    }

    try {
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
      showToast("error", error.response?.data?.message || "Lỗi khi tạo thông báo");
    }
  };

  const handleUpdateNotification = async () => {
    if (!formData.message.trim()) {
      showToast("error", "Vui lòng nhập nội dung thông báo");
      return;
    }

    try {
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
      showToast("error", error.response?.data?.message || "Lỗi khi cập nhật thông báo");
    }
  };

  const handleDeleteNotification = async () => {
    try {
      const response = await axiosInstance.delete(`/api/receptionist/notifications/${selectedNotification.id}`);

      if (response.success) {
        showToast("success", "Xóa thông báo thành công");
        setShowDeleteModal(false);
        setSelectedNotification(null);
        getAppointments(current);
      }
    } catch (error) {
      console.error(error);
      showToast("error", error.response?.data?.message || "Lỗi khi xóa thông báo");
    }
  };

  const handleViewDetail = async (appointment) => {
    try {
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
      'Scheduled': { color: '#3b82f6', bgColor: '#dbeafe', text: 'Đã lên lịch' },
      'Sent': { color: '#10b981', bgColor: '#d1fae5', text: 'Đã gửi' },
      'Failed': { color: '#ef4444', bgColor: '#fee2e2', text: 'Thất bại' }
    };

    const config = statusConfig[status] || { color: '#6b7280', bgColor: '#f3f4f6', text: status };

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.color}20`
      }}>
        {config.text}
      </span>
    );
  };

  return (
    <>
      <div
        style={{
          padding: "30px 40px",
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <span
            style={{ fontSize: "28px", marginRight: "10px", color: "#e91e63" }}
          >
            <Mail style={{ width: "32px", height: "32px" }} />
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            Quản Lý Thông Báo Nhắc Lịch Hẹn
          </h4>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "20px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#D9D9D9",
                  borderBottom: "2px solid #333",
                }}
              >
                {[
                  "Tên Bệnh Nhân",
                  "Ngày Hẹn",
                  "Giờ Hẹn",
                  "Bác Sĩ",
                  "Dịch Vụ",
                  "Trạng Thái TB",
                  "Hành Động",
                ].map((title) => (
                  <th
                    key={title}
                    style={{
                      padding: "15px 20px",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#333",
                      borderRight: "1px solid #333",
                    }}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ padding: "20px", textAlign: "center" }}>
                    Đang tải...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: "20px", textAlign: "center" }}>
                    Không có lịch hẹn nào
                  </td>
                </tr>
              ) : (
                appointments.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    <td style={{ padding: "15px 20px", fontSize: "14px", color: "#333" }}>
                      {item.full_name}
                    </td>
                    <td style={{ padding: "15px 20px", fontSize: "14px", color: "#333" }}>
                      {dayjs(item.date).format("DD/MM/YYYY")}
                    </td>
                    <td style={{ padding: "15px 20px", fontSize: "14px", color: "#333" }}>
                      {item.time}
                    </td>
                    <td style={{ padding: "15px 20px", fontSize: "14px", color: "#333" }}>
                      {item.doctor_name}
                    </td>
                    <td style={{ padding: "15px 20px", fontSize: "14px", color: "#333" }}>
                      {item.service_type}
                    </td>
                    <td style={{ padding: "15px 20px", fontSize: "14px", color: "#333" }}>
                      {item.has_notification ?
                        getStatusBadge(item.notification_status) :
                        <span style={{ color: '#666', fontStyle: 'italic' }}>Chưa có thông báo</span>
                      }
                    </td>
                    <td style={{ padding: "15px 20px", textAlign: "left" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                          onClick={() => handleViewDetail(item)}
                          style={{
                            color: "#6c757d",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "5px",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>

                        {item.has_notification ? (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              style={{
                                color: "#007bff",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "5px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              title="Sửa thông báo"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(item)}
                              style={{
                                color: "#dc3545",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "5px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              title="Xóa thông báo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openCreateModal(item)}
                            style={{
                              color: "#28a745",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "5px",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            title="Tạo thông báo"
                          >
                            <Bell size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <Pagination
            pageCount={pageCount}
            onPageChange={handlePageChange}
            currentPage={current}
          />
        )}
      </div>

      {/* Modal tạo thông báo */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Tạo Thông Báo Mới</h3>

            <div style={{ marginBottom: '15px' }}>
              <strong>Bệnh nhân:</strong> {selectedAppointment?.full_name}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Ngày hẹn:</strong> {dayjs(selectedAppointment?.date).format('DD/MM/YYYY')} lúc {selectedAppointment?.time}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nội dung thông báo:
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ message: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="Nhập nội dung thông báo..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleCreateNotification}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Tạo Thông Báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sửa thông báo */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Sửa Thông Báo</h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nội dung thông báo:
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ message: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="Nhập nội dung thông báo..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateNotification}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xóa thông báo */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginBottom: '15px' }}>Xác Nhận Xóa</h3>
            <p style={{ marginBottom: '20px' }}>Bạn có chắc chắn muốn xóa thông báo này?</p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteNotification}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết */}
      {showDetailModal && detailData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Chi Tiết</h3>

            {detailData.appointment ? (
              // Chi tiết thông báo
              <>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Bệnh nhân:</strong> {detailData.appointment.full_name}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Ngày hẹn:</strong> {dayjs(detailData.appointment.date).format('DD/MM/YYYY')}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Giờ hẹn:</strong> {detailData.appointment.time}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Bác sĩ:</strong> {detailData.appointment.doctor_name}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Nội dung:</strong>
                  <div style={{
                    marginTop: '5px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}>
                    {detailData.message}
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Trạng thái:</strong> {getStatusBadge(detailData.status)}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Thời gian gửi:</strong> {dayjs(detailData.sent_at).format('DD/MM/YYYY HH:mm')}
                </div>
              </>
            ) : (
              // Chi tiết lịch hẹn
              <>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Bệnh nhân:</strong> {detailData.full_name}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Số điện thoại:</strong> {detailData.phone}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Email:</strong> {detailData.email || 'N/A'}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Ngày hẹn:</strong> {dayjs(detailData.date).format('DD/MM/YYYY')}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Giờ hẹn:</strong> {detailData.time}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Bác sĩ:</strong> {detailData.doctor_name}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Dịch vụ:</strong> {detailData.service_type}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Phòng:</strong> {detailData.room_name}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Ghi chú:</strong> {detailData.notes || 'Không có ghi chú'}
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <CustomToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}