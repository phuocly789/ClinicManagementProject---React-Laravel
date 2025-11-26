import React, { useState, useEffect } from "react";
import axiosInstance from "../../axios";
import Select from "react-select";
import { createEchoClient } from "../../utils/echo";
import notificationSound from "../../assets/notification.mp3";
import Pagination from "../../Components/Pagination/Pagination";

const ConfirmDeleteModal = ({
  isOpen,
  title = "Xác nhận xóa",
  message = "Bạn có chắc chắn muốn xóa mục này?",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className={`modal ${isOpen ? 'show d-block' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
          </div>
          <div className="modal-body">
            <p className="text-muted">{message}</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Thoát
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
const ReceptionistDashboard = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [echo, setEcho] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    patient: null,
  });
  const [loading, setLoading] = useState(false);

  // Initialize WebSocket
  // Initialize WebSocket
  useEffect(() => {
    let echoClient = null;
    let mounted = true;

    const initWebSocket = () => {
      if (!mounted) return;

      echoClient = createEchoClient();
      setEcho(echoClient);

      // ✅ Log để debug
      console.log("📡 Subscribing to channel: receptionist");

      // Listen to receptionist channel
      echoClient
        .channel("receptionist")
        .listen(".queue.status.updated", (event) => {
          if (!mounted) return;
          console.log("✅ Receptionist received event:", event);
          handleReceptionistQueueUpdate(event);
        })
        .error((error) => {
          console.error("❌ Channel subscription error:", error);
        });
    };

    initWebSocket();

    return () => {
      mounted = false;
      if (echoClient) {
        console.log("🔌 Disconnecting WebSocket");
        echoClient.disconnect();
      }
    };
  }, []);

  // Handle real-time queue updates from doctor
  const handleReceptionistQueueUpdate = (event) => {
    console.log("Queue update event:", event);

    const { receptionist, action } = event;

    if (!receptionist) return;

    // ✅ CHỈ CẬP NHẬT TRẠNG THÁI, KHÔNG XÓA
    setQueue((prevQueue) => {
      const existingIndex = prevQueue.findIndex(
        (item) => item.QueueId === receptionist.QueueId
      );

      if (existingIndex !== -1) {
        const updatedQueue = [...prevQueue];
        updatedQueue[existingIndex] = {
          ...updatedQueue[existingIndex],
          Status: receptionist.Status, // Chỉ update Status
          QueuePosition: receptionist.QueuePosition,
        };
        return updatedQueue;
      }

      return prevQueue;
    });

    // ✅ Hiển thị thông báo phù hợp
    if (action === "completed") {
      console.log("Check action: ", action);
      showNotification(
        `Bác sĩ đã hoàn tất khám cho bệnh nhân ${receptionist.PatientName}`,
        "success"
      );
      playNotificationSound();
    } else if (action === "updated") {
      showNotification(
        `Trạng thái của ${receptionist.PatientName} đã được cập nhật`,
        "info"
      );
    }
  };

  // Fetch rooms and initial queue data
  useEffect(() => {
    fetchRooms();
    fetchAllQueues();
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio(notificationSound);
      audio.play().catch(() => { });
      audio.pause();
      audio.currentTime = 0;

      // Chỉ cần chạy 1 lần
      document.removeEventListener("click", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      const response = await axiosInstance.get("/api/receptionist/rooms");
      setRooms(response.data || []);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      showNotification("Lỗi khi tải danh sách phòng", "warning");
    }
  };

  // Fetch all queues for today
  const fetchAllQueues = async () => {
    setLoading(true);
    try {
      const queueResponse = await axiosInstance.get(`/api/receptionist/queue`);
      const roomQueues = queueResponse.data || [];
      // Add room information to each queue item
      const queuesWithRoomInfo = roomQueues.map((item) => ({
        ...item,
        room: item.RoomId,
        roomName: item.RoomName,
        doctor: item.DoctorName || `BS. ${item.RoomName}`,
        color: getRoomColor(item.RoomId),
      }));
      setQueue(queuesWithRoomInfo);
    } catch (error) {
      console.error("Error fetching queues:", error);
      showNotification("Lỗi khi tải danh sách hàng chờ", "warning");
    } finally {
      setLoading(false);
    }
  };

  // Fetch queue by room
  const fetchQueueByRoom = async (roomId) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `/api/receptionist/queue/${roomId}`
      );
      const roomQueues = response.data || [];
      // Add room information to each queue item
      const queuesWithRoomInfo = roomQueues.map((queue) => ({
        ...queue,
        room: roomId,
        roomName: queue.RoomName,
        doctor: queue.DoctorName || `BS. ${queue.RoomName}`,
        color: getRoomColor(roomId),
      }));
      setQueue(queuesWithRoomInfo);
    } catch (error) {
      console.error("Error fetching queue:", error);
      showNotification("Lỗi khi tải danh sách hàng chờ", "warning");
    } finally {
      setLoading(false);
    }
  };

  // Get room color (you can customize this based on your room data)
  const getRoomColor = (roomId) => {
    const colors = [
      "primary",
      "success",
      "warning",
      "info",
      "secondary",
      "danger",
    ];
    return colors[roomId % colors.length];
  };

  // Filter and sort queue
  const filteredQueue = queue
    .filter((item) => {
      const roomMatch = selectedRoom ? item.room === selectedRoom.RoomId : true;
      const searchMatch = item.PatientName?.toLowerCase().includes(
        searchTerm.toLowerCase()
      );
      return roomMatch && searchMatch;
    })
    .sort((a, b) => {
      // Sort by status priority: Đang khám -> Đang chờ -> Đã khám
      const statusOrder = {
        "Đang khám": 1,
        "Đang chờ": 2,
        "Đã khám": 3,
        Hủy: 4,
      };
      return (
        statusOrder[a.Status] - statusOrder[b.Status] ||
        a.QueuePosition - b.QueuePosition
      );
    });

  // Show notification
  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };
  //pagination
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedRoom]);

  // 2. Tính toán dữ liệu cho trang hiện tại
  const pageCount = Math.ceil(filteredQueue.length / ITEMS_PER_PAGE);
  const offset = currentPage * ITEMS_PER_PAGE;
  const currentItems = filteredQueue.slice(offset, offset + ITEMS_PER_PAGE);

  // 3. Hàm xử lý khi chuyển trang
  const handlePageChange = ({ selected }) => {
    setCurrentPage(selected);
  };

  // Handle room selection
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    if (room) {
      fetchQueueByRoom(room.RoomId);
    } else {
      fetchAllQueues();
    }
  };
  // Kiểm tra xem phòng có đang bận (có người đang khám) hay không
  const isRoomOccupied = (roomId) => {
    return queue.some(
      (item) => item.room === roomId && item.Status === "Đang khám"
    );
  };
  // Handle call patient
  const handleCallPatient = async (queueId) => {
    const patient = queue.find((p) => p.QueueId === queueId);
    if (!patient) return;

    // Check phòng bận ở Frontend (UX)
    if (isRoomOccupied(patient.room)) {
      showNotification(`Phòng ${patient.roomName} đang có người khám!`, "warning");
      return;
    }

    try {
      await axiosInstance.put(`/api/receptionist/queue/${queueId}/status`, { Status: "Đang khám" });

      // Thành công -> Update UI
      setQueue(prev => prev.map(item => item.QueueId === queueId ? { ...item, Status: "Đang khám" } : item));
      showNotification(`Đã gọi ${patient.PatientName} vào khám`, "success");

    } catch (error) {
      console.error("Error calling patient:", error);

      const errorMsg = error.response?.data?.message || "";

      if (error.response?.status === 400 &&
        (errorMsg.includes("đang được gọi") || errorMsg.includes("đang được khám"))) {

        showNotification("Bệnh nhân này vừa được người khác gọi vào khám!", "info");

        // Tự động cập nhật UI sang trạng thái Đang khám để đồng bộ
        setQueue(prev => prev.map(item => item.QueueId === queueId ? { ...item, Status: "Đang khám" } : item));

      } else if (errorMsg.includes("Phòng này đang có người khám")) {
        showNotification(errorMsg, "warning");
      } else {
        showNotification("Lỗi khi gọi bệnh nhân", "warning");
      }
    }
  };

  // Handle cancel appointment
  const handleCancelAppointment = (queueId) => {
    const patient = queue.find((p) => p.QueueId === queueId);
    setDeleteModal({
      isOpen: true,
      patient: { ...patient, queueId },
      message: `Bạn có chắc chắn muốn hủy lịch khám của bệnh nhân ${patient.PatientName}?`,
    });
  };

  // Confirm cancel appointment
  const confirmCancelAppointment = async () => {
    if (deleteModal.patient) {
      try {
        await axiosInstance.put(
          `/api/receptionist/queue/${deleteModal.patient.queueId}/status`,
          {
            Status: "Hủy",
          }
        );

        setQueue((prevQueue) =>
          prevQueue.filter(
            (item) => item.QueueId !== deleteModal.patient.queueId
          )
        );
        showNotification(
          `Đã hủy lịch khám của ${deleteModal.patient.PatientName}`,
          "warning"
        );
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        // 1. Lấy message từ backend gửi về (nếu có)
        const errorMsg = error.response?.data?.message || "Lỗi khi hủy lịch khám";

        // 2. Kiểm tra nếu là lỗi 400 (Lỗi logic do mình chặn ở backend)
        if (error.response?.status === 400) {

          // Hiện đúng thông báo backend gửi (VD: "Lịch khám này đã được hủy...")
          showNotification(errorMsg, "info");

          // 3. Logic tự động cập nhật UI cho đồng bộ
          // Nếu backend bảo là "đã hủy" hoặc "đã khám" rồi, thì ở frontend mình cũng nên xóa/cập nhật nó đi
          // để người dùng không bấm nhầm lần nữa
          if (errorMsg.toLowerCase().includes("hủy") || errorMsg.toLowerCase().includes("đã được hủy")) {
            setQueue((prevQueue) =>
              prevQueue.filter((item) => item.QueueId !== deleteModal.patient.queueId)
            );
          }
        } else {
          // Các lỗi khác (500, mạng...)
          showNotification(errorMsg, "warning");
        }
      }
    }
    setDeleteModal({ isOpen: false, patient: null });
  };


  // Handle toggle priority
  const handleTogglePriority = async (queueId) => {
    try {
      await axiosInstance.put(`/api/receptionist/queue/${queueId}/prioritize`);

      // Refresh the queue data after prioritizing
      if (selectedRoom) {
        fetchQueueByRoom(selectedRoom.RoomId);
      } else {
        fetchAllQueues();
      }

      const patient = queue.find((p) => p.QueueId === queueId);
      showNotification(`Đã ưu tiên cho ${patient.PatientName}`, "warning");
    } catch (error) {
      console.error("Error prioritizing patient:", error);
      if (error.response?.data?.message) {
        showNotification(error.response.data.message, "warning");
      } else {
        showNotification("Lỗi khi đánh dấu ưu tiên", "warning");
      }
    }
  };

  // Check if patient can be prioritized (only waiting patients)
  const canPrioritize = (status) => {
    return status === "Đang chờ";
  };

  // Render status badge
  const renderStatus = (status) => {
    const statusMap = {
      "Đã khám": {
        class: "bg-success text-white",
        icon: "bi-check-circle-fill",
        label: "Hoàn thành",
      },
      "Đang khám": {
        class: "bg-primary text-white",
        icon: "bi-activity",
        label: "Đang khám",
      },
      "Đang chờ": {
        class: "bg-warning text-dark",
        icon: "bi-clock",
        label: "Chờ khám",
      },
      Hủy: {
        class: "bg-danger text-white",
        icon: "bi-x-circle-fill",
        label: "Đã hủy",
      },
    };
    const statusInfo = statusMap[status] || {
      class: "bg-secondary text-white",
      icon: "bi-question",
      label: status,
    };

    return (
      <span
        className={`badge ${statusInfo.class} d-flex align-items-center justify-content-center`}
        style={{ minWidth: "100px" }}
      >
        <i className={`bi ${statusInfo.icon} me-1`}></i>
        {statusInfo.label}
      </span>
    );
  };

  // Count patients by status
  const countByStatus = (status) => {
    return filteredQueue.filter((item) => item.Status === status).length;
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio(notificationSound);
      audio.play().catch((err) => console.log("Audio play failed:", err));
    } catch (error) {
      console.log("Notification sound error:", error);
    }
  };

  // Count priority patients (first in queue)
  const priorityCount = filteredQueue.filter(
    (item) => item.QueuePosition === 1 && item.Status === "Đang chờ"
  ).length;

  return (
    <div className="container-fluid py-4">
      {/* Notification */}
      {notification.show && (
        <div
          className={`alert alert-${notification.type} alert-dismissible fade show position-fixed top-0 end-0 m-3`}
          style={{ zIndex: 1050, minWidth: "300px" }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <span>
              <i
                className={`bi ${notification.type === "success"
                  ? "bi-check-circle"
                  : notification.type === "warning"
                    ? "bi-exclamation-triangle"
                    : "bi-info-circle"
                  } me-2`}
              ></i>
              {notification.message}
            </span>
            <button
              type="button"
              className="btn-close"
              onClick={() =>
                setNotification({ show: false, message: "", type: "" })
              }
            ></button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận hủy lịch khám"
        message={deleteModal.message}
        onConfirm={confirmCancelAppointment}
        onCancel={() => setDeleteModal({ isOpen: false, patient: null })}
      />

      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          {/* HEADER */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <div>
              <h4 className="fw-bold text-primary mb-1">
                Quản lý hàng chờ khám bệnh
              </h4>
              <p className="text-muted m-0">{formattedDate}</p>
            </div>

            <div className="mt-2 mt-md-0">
              <div className="d-flex flex-wrap gap-2">
                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                  <span className="text-primary fw-bold me-1">
                    {filteredQueue.length}
                  </span>
                  <span className="text-muted">Tổng số</span>
                </div>
                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                  <span className="text-warning fw-bold me-1">
                    {countByStatus("Đang chờ")}
                  </span>
                  <span className="text-muted">Đang chờ</span>
                </div>
                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                  <span className="text-danger fw-bold me-1">
                    {priorityCount}
                  </span>
                  <span className="text-muted">Ưu tiên</span>
                </div>
                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                  <span className="text-success fw-bold me-1">
                    {countByStatus("Đã khám")}
                  </span>
                  <span className="text-muted">Đã khám</span>
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="row mb-4">
            <div className="col-md-6 mb-3 mb-md-0">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Tìm kiếm bệnh nhân..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="col-md-6 z-5">
              <Select
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (provided) => ({
                    ...provided,
                    zIndex: 9999,
                  }),
                }}
                options={[
                  { value: null, label: "Tất cả phòng" },
                  ...rooms.map((room) => ({
                    value: room.RoomId,
                    label: room.RoomName,
                    data: room,
                  })),
                ]}
                onChange={(selected) => {
                  if (selected?.value === null) {
                    handleRoomSelect(null);
                  } else {
                    handleRoomSelect(selected.data);
                  }
                }}
                value={
                  selectedRoom
                    ? {
                      value: selectedRoom.RoomId,
                      label: selectedRoom.RoomName,
                    }
                    : { value: null, label: "Tất cả phòng" }
                }
                isSearchable
                placeholder="Chọn phòng khám..."
                className="basic-single"
                classNamePrefix="select"
              />
            </div>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Đang tải dữ liệu...</p>
            </div>
          )}

          {/* TABLE */}
          {!loading && (
            <div className="table-responsive rounded border">
              <table className="table table-hover align-middle clinic-table mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: "50px" }}>
                      <i className="bi bi-star-fill text-warning"></i>
                    </th>
                    <th className="text-center" style={{ width: "60px" }}>
                      STT
                    </th>
                    <th>Tên Bệnh Nhân</th>
                    <th className="text-center" style={{ width: "100px" }}>
                      Giờ Đặt
                    </th>
                    <th>Bác Sĩ</th>
                    <th className="text-center" style={{ width: "150px" }}>
                      Phòng
                    </th>
                    <th className="text-center" style={{ width: "140px" }}>
                      Trạng Thái
                    </th>
                    <th className="text-center" style={{ width: "220px" }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                      <tr
                        key={item.QueueId}
                        className={`table-row-hover ${item.Status === "Đang khám" ? "table-active" : ""
                          } ${item.QueuePosition === 1 && item.Status === "Đang chờ"
                            ? "border-start border-danger border-3"
                            : ""
                          }`}
                      >
                        <td className="text-center">
                          {canPrioritize(item.Status) && (
                            <button
                              className={`btn btn-sm p-0 ${item.QueuePosition === 1
                                ? "text-warning"
                                : "text-muted opacity-50"
                                }`}
                              onClick={() => handleTogglePriority(item.QueueId)}
                              title={
                                item.QueuePosition === 1
                                  ? "Đã ưu tiên"
                                  : "Đánh dấu ưu tiên"
                              }
                              disabled={item.QueuePosition === 1}
                            >
                              <i
                                className={`bi ${item.QueuePosition === 1
                                  ? "bi-star-fill"
                                  : "bi-star"
                                  }`}
                                style={{ fontSize: "1.2rem" }}
                              ></i>
                            </button>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="fw-bold text-primary">
                            {item.QueuePosition || index + 1}
                          </div>
                        </td>
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
                              {item.PatientName?.split(" ").pop()?.charAt(0) ||
                                "P"}
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-semibold">
                                {item.PatientName}
                              </div>
                              <small className="text-muted">
                                ID: {item.PatientId}
                              </small>
                            </div>
                            {item.QueuePosition === 1 &&
                              item.Status === "Đang chờ" && (
                                <span className="badge bg-danger ms-2">
                                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                  Ưu tiên
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="fw-bold text-primary bg-light px-2 py-1 rounded">
                            {item.QueueTime
                              ? item.QueueTime.substring(0, 5)
                              : "--:--"}
                          </span>
                        </td>
                        <td className="fw-medium">{item.doctor}</td>
                        <td className="text-center">
                          <span
                            className={`badge bg-${item.color}-soft px-3 py-2`}
                          >
                            <i className="bi bi-geo-alt me-1"></i>
                            {item.roomName}
                          </span>
                        </td>
                        <td className="text-center">
                          {renderStatus(item.Status)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-2 justify-content-center flex-wrap">
                            {item.Status === "Đang chờ" && (
                              <>
                                {/* Kiểm tra phòng bận ngay tại dòng render */}
                                {(() => {
                                  const roomBusy = isRoomOccupied(item.room);
                                  return (
                                    <button
                                      className={`btn btn-sm ${roomBusy ? 'btn-secondary' : 'btn-success'} d-flex align-items-center`}
                                      onClick={() => handleCallPatient(item.QueueId)}
                                      disabled={roomBusy} // Disable nút nếu phòng bận
                                      title={roomBusy ? "Phòng đang bận" : "Gọi vào khám"}
                                    >
                                      <i className="bi bi-telephone me-1"></i>
                                      {roomBusy ? "Đang bận" : "Gọi khám"}
                                    </button>
                                  );
                                })()}

                                <button
                                  className="btn btn-sm btn-outline-danger d-flex align-items-center"
                                  onClick={() => handleCancelAppointment(item.QueueId)}
                                >
                                  <i className="bi bi-x-circle me-1"></i> Hủy
                                </button>
                              </>
                            )}
                            {item.Status === "Đang khám" && (
                              <span className="text-primary fst-italic">
                                <i className="bi bi-hourglass-split me-1"></i>
                                Đang đợi bác sĩ...
                              </span>
                            )}
                            {item.Status === "Đã khám" && (
                              <button
                                className="btn btn-sm btn-outline-success d-flex align-items-center"
                                disabled
                              >
                                <i className="bi bi-check2-all me-1"></i> Đã
                                khám
                              </button>
                            )}
                            {item.Status === "Hủy" && (
                              <button
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                                disabled
                              >
                                <i className="bi bi-x-circle me-1"></i> Đã hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="text-muted">
                          <i className="bi bi-inbox display-4 d-block mb-2"></i>
                          {selectedRoom
                            ? "Không có bệnh nhân nào trong phòng này."
                            : "Không tìm thấy bệnh nhân nào."}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {filteredQueue.length > 0 && (
            <Pagination
              pageCount={pageCount}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              isLoading={loading}
            />
          )}
        </div>
      </div>

      {/* Priority Legend */}
      <div className="card mt-3 border-0 bg-light">
        <div className="card-body py-3">
          <div className="row align-items-center">
            <div className="col-md-6 mb-2 mb-md-0">
              <div className="d-flex align-items-center justify-content-center justify-content-md-start">
                <i className="bi bi-info-circle text-primary me-2"></i>
                <small className="text-muted fw-semibold">
                  Hướng dẫn sử dụng:
                </small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-md-end">
                <span className="d-flex align-items-center">
                  <i className="bi bi-star-fill text-warning me-1"></i>
                  <small className="text-muted">
                    Nhấn ngôi sao để ưu tiên lên đầu hàng chờ
                  </small>
                </span>
                <span className="d-flex align-items-center">
                  <div
                    className="border-start border-danger border-3 me-2"
                    style={{ height: "16px" }}
                  ></div>
                  <small className="text-muted">
                    Viền đỏ = bệnh nhân ưu tiên (vị trí đầu)
                  </small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default ReceptionistDashboard;
