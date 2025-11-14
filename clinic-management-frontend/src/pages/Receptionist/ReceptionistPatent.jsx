import React, { useState } from "react";

const ReceptionistPatent = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("Tất cả");
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    // Mock data - Danh sách appointment đã đặt online
    const appointments = [
        {
            id: 1,
            patientId: "BN001",
            patientName: "Nguyễn Văn An",
            phone: "0912345678",
            email: "nguyenvana@email.com",
            dateOfBirth: "15/05/1985",
            gender: "Nam",
            address: "123 Đường Lê Lợi, Quận 1, TP.HCM",
            appointmentTime: "08:30",
            appointmentDate: "15/12/2024",
            doctor: "BS. Trần Văn B",
            department: "Khoa Nội tổng quát",
            room: "Phòng 101",
            status: "Chờ khám",
            notes: "Khám định kỳ",
            priority: false
        },
        {
            id: 2,
            patientId: "BN002",
            patientName: "Trần Thị Mỹ Linh",
            phone: "0923456789",
            email: "tranthimylinh@email.com",
            dateOfBirth: "20/08/1990",
            gender: "Nữ",
            address: "456 Đường Nguyễn Huệ, Quận 1, TP.HCM",
            appointmentTime: "09:15",
            appointmentDate: "15/12/2024",
            doctor: "BS. Lê Thị C",
            department: "Khoa Da liễu",
            room: "Phòng 202",
            status: "Chờ khám",
            notes: "Khám da liễu định kỳ",
            priority: true
        },
        {
            id: 3,
            patientId: "BN003",
            patientName: "Phạm Hùng Dũng",
            phone: "0934567890",
            email: "phamhungdung@email.com",
            dateOfBirth: "10/12/1978",
            gender: "Nam",
            address: "789 Đường Pasteur, Quận 3, TP.HCM",
            appointmentTime: "10:00",
            appointmentDate: "15/12/2024",
            doctor: "BS. Trần Văn B",
            department: "Khoa Nội tổng quát",
            room: "Phòng 101",
            status: "Đã tiếp nhận",
            notes: "Tái khám huyết áp",
            priority: false
        },
        {
            id: 4,
            patientId: "BN004",
            patientName: "Vũ Ngọc Mai",
            phone: "0945678901",
            email: "vungocmai@email.com",
            dateOfBirth: "25/03/1995",
            gender: "Nữ",
            address: "321 Đường Lý Tự Trọng, Quận 1, TP.HCM",
            appointmentTime: "10:30",
            appointmentDate: "15/12/2024",
            doctor: "BS. Nguyễn Văn D",
            department: "Khoa Tai Mũi Họng",
            room: "Phòng 303",
            status: "Chờ khám",
            notes: "Đau họng, sổ mũi",
            priority: false
        },
        {
            id: 5,
            patientId: "BN005",
            patientName: "Lê Minh Tuấn",
            phone: "0956789012",
            email: "leminhtuan@email.com",
            dateOfBirth: "05/11/1982",
            gender: "Nam",
            address: "654 Đường Cách Mạng Tháng 8, Quận 3, TP.HCM",
            appointmentTime: "11:15",
            appointmentDate: "15/12/2024",
            doctor: "BS. Lê Thị C",
            department: "Khoa Da liễu",
            room: "Phòng 202",
            status: "Đã hủy",
            notes: "Bệnh nhân hủy lịch",
            priority: false
        }
    ];

    // Danh sách phòng
    const rooms = [
        { id: 101, name: "Phòng Nội Tổng Quát", doctor: "BS. Trần Văn B" },
        { id: 202, name: "Phòng Da Liễu", doctor: "BS. Lê Thị C" },
        { id: 303, name: "Phòng Tai Mũi Họng", doctor: "BS. Nguyễn Văn D" },
        { id: 404, name: "Phòng Xét nghiệm", doctor: "KTV. Phạm Thị E" }
    ];

    // Lọc appointment theo search term và status
    const filteredAppointments = appointments.filter(appointment => {
        const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            appointment.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            appointment.phone.includes(searchTerm);

        const matchesStatus = filterStatus === "Tất cả" || appointment.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // Xử lý tiếp nhận bệnh nhân
    const handleReceivePatient = (appointment) => {
        setSelectedAppointment(appointment);
        // Trong thực tế, sẽ gọi API để tạo queue ở đây
    };

    // Xử lý tạo queue
    const handleCreateQueue = () => {
        if (selectedAppointment) {
            // Trong thực tế, sẽ gọi API để tạo queue
            alert(`Đã tạo queue cho bệnh nhân ${selectedAppointment.patientName}`);
            setSelectedAppointment(null);
        }
    };

    // Render badge trạng thái
    const renderStatusBadge = (status) => {
        const statusConfig = {
            "Chờ khám": { class: "bg-warning text-dark", icon: "bi-clock" },
            "Đã tiếp nhận": { class: "bg-success text-white", icon: "bi-check-circle" },
            "Đã hủy": { class: "bg-danger text-white", icon: "bi-x-circle" }
        };

        const config = statusConfig[status] || { class: "bg-secondary text-white", icon: "bi-question" };

        return (
            <span className={`badge ${config.class} d-flex align-items-center`}>
                <i className={`bi ${config.icon} me-1`}></i>
                {status}
            </span>
        );
    };

    // Render badge ưu tiên
    const renderPriorityBadge = (priority) => {
        if (!priority) return null;

        return (
            <span className="badge bg-danger ms-2">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                Ưu tiên
            </span>
        );
    };

    return (
        <div className="container-fluid py-4">
            <div className="row">
                {/* Cột danh sách appointment */}
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-primary text-white">
                            <h5 className="card-title mb-0">
                                <i className="bi bi-calendar-check me-2"></i>
                                DANH SÁCH LỊCH HẸN ONLINE
                            </h5>
                        </div>
                        <div className="card-body">
                            {/* Bộ lọc và tìm kiếm */}
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0">
                                            <i className="bi bi-search text-muted"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control border-start-0"
                                            placeholder="Tìm kiếm theo tên, mã BN, số điện thoại..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="d-flex gap-2">
                                        <select
                                            className="form-select"
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                        >
                                            <option value="Tất cả">Tất cả trạng thái</option>
                                            <option value="Chờ khám">Chờ khám</option>
                                            <option value="Đã tiếp nhận">Đã tiếp nhận</option>
                                            <option value="Đã hủy">Đã hủy</option>
                                        </select>
                                        <button className="btn btn-outline-primary">
                                            <i className="bi bi-filter me-1"></i>
                                            Lọc
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Thống kê nhanh */}
                            <div className="row mb-4">
                                <div className="col-12">
                                    <div className="d-flex flex-wrap gap-3">
                                        <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                                            <span className="text-primary fw-bold me-1">{appointments.length}</span>
                                            <span className="text-muted">Tổng lịch hẹn</span>
                                        </div>
                                        <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                                            <span className="text-warning fw-bold me-1">
                                                {appointments.filter(a => a.status === "Chờ khám").length}
                                            </span>
                                            <span className="text-muted">Chờ tiếp nhận</span>
                                        </div>
                                        <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                                            <span className="text-success fw-bold me-1">
                                                {appointments.filter(a => a.status === "Đã tiếp nhận").length}
                                            </span>
                                            <span className="text-muted">Đã tiếp nhận</span>
                                        </div>
                                        <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                                            <span className="text-danger fw-bold me-1">
                                                {appointments.filter(a => a.priority).length}
                                            </span>
                                            <span className="text-muted">Ưu tiên</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Danh sách appointment */}
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '50px' }}>#</th>
                                            <th>Thông tin bệnh nhân</th>
                                            <th style={{ width: '120px' }}>Giờ hẹn</th>
                                            <th>Bác sĩ</th>
                                            <th style={{ width: '120px' }}>Trạng thái</th>
                                            <th style={{ width: '150px' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAppointments.map((appointment, index) => (
                                            <tr key={appointment.id} className={appointment.priority ? "table-warning" : ""}>
                                                <td>
                                                    <div className="fw-bold text-primary">{index + 1}</div>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                                                            style={{ width: '40px', height: '40px', fontSize: '14px', fontWeight: 'bold' }}>
                                                            {appointment.patientName.split(' ').pop().charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="fw-semibold d-flex align-items-center">
                                                                {appointment.patientName}
                                                                {renderPriorityBadge(appointment.priority)}
                                                            </div>
                                                            <div className="text-muted small">
                                                                <div>Mã BN: {appointment.patientId}</div>
                                                                <div>ĐT: {appointment.phone}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-primary bg-light px-2 py-1 rounded d-block text-center">
                                                        {appointment.appointmentTime}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-medium">{appointment.doctor}</div>
                                                    <small className="text-muted">{appointment.department}</small>
                                                </td>
                                                <td>
                                                    {renderStatusBadge(appointment.status)}
                                                </td>
                                                <td>
                                                    {appointment.status === "Chờ khám" && (
                                                        <button
                                                            className="btn btn-sm btn-success d-flex align-items-center"
                                                            onClick={() => handleReceivePatient(appointment)}
                                                        >
                                                            <i className="bi bi-person-check me-1"></i>
                                                            Tiếp nhận
                                                        </button>
                                                    )}
                                                    {appointment.status === "Đã tiếp nhận" && (
                                                        <button className="btn btn-sm btn-outline-success" disabled>
                                                            <i className="bi bi-check2 me-1"></i>
                                                            Đã tiếp nhận
                                                        </button>
                                                    )}
                                                    {appointment.status === "Đã hủy" && (
                                                        <button className="btn btn-sm btn-outline-secondary" disabled>
                                                            <i className="bi bi-x-circle me-1"></i>
                                                            Đã hủy
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredAppointments.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4">
                                                    <div className="text-muted">
                                                        <i className="bi bi-inbox display-4 d-block mb-2"></i>
                                                        Không tìm thấy lịch hẹn nào.
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột thông tin chi tiết và tạo queue */}
                <div className="col-lg-4">
                    {/* Thông tin bệnh nhân chi tiết */}
                    {selectedAppointment ? (
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-success text-white">
                                <h6 className="card-title mb-0">
                                    <i className="bi bi-person-plus me-2"></i>
                                    TIẾP NHẬN BỆNH NHÂN
                                </h6>
                            </div>
                            <div className="card-body">
                                <div className="text-center mb-4">
                                    <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3"
                                        style={{ width: '80px', height: '80px', fontSize: '24px', fontWeight: 'bold' }}>
                                        {selectedAppointment.patientName.split(' ').pop().charAt(0)}
                                    </div>
                                    <h5 className="fw-bold">{selectedAppointment.patientName}</h5>
                                    <p className="text-muted">Mã BN: {selectedAppointment.patientId}</p>
                                </div>

                                <div className="mb-3">
                                    <h6 className="fw-semibold text-primary mb-3">
                                        <i className="bi bi-info-circle me-2"></i>
                                        THÔNG TIN CÁ NHÂN
                                    </h6>
                                    <div className="row small">
                                        <div className="col-6 mb-2">
                                            <strong>Ngày sinh:</strong><br />
                                            {selectedAppointment.dateOfBirth}
                                        </div>
                                        <div className="col-6 mb-2">
                                            <strong>Giới tính:</strong><br />
                                            {selectedAppointment.gender}
                                        </div>
                                        <div className="col-12 mb-2">
                                            <strong>Điện thoại:</strong><br />
                                            {selectedAppointment.phone}
                                        </div>
                                        <div className="col-12 mb-2">
                                            <strong>Email:</strong><br />
                                            {selectedAppointment.email}
                                        </div>
                                        <div className="col-12">
                                            <strong>Địa chỉ:</strong><br />
                                            {selectedAppointment.address}
                                        </div>
                                    </div>
                                </div>

                                <hr />

                                <div className="mb-4">
                                    <h6 className="fw-semibold text-primary mb-3">
                                        <i className="bi bi-calendar-event me-2"></i>
                                        THÔNG TIN LỊCH HẸN
                                    </h6>
                                    <div className="row small">
                                        <div className="col-6 mb-2">
                                            <strong>Ngày khám:</strong><br />
                                            {selectedAppointment.appointmentDate}
                                        </div>
                                        <div className="col-6 mb-2">
                                            <strong>Giờ hẹn:</strong><br />
                                            <span className="fw-bold text-primary">{selectedAppointment.appointmentTime}</span>
                                        </div>
                                        <div className="col-12 mb-2">
                                            <strong>Bác sĩ:</strong><br />
                                            {selectedAppointment.doctor}
                                        </div>
                                        <div className="col-12 mb-2">
                                            <strong>Khoa/phòng:</strong><br />
                                            {selectedAppointment.department} - {selectedAppointment.room}
                                        </div>
                                        <div className="col-12">
                                            <strong>Ghi chú:</strong><br />
                                            {selectedAppointment.notes || "Không có ghi chú"}
                                        </div>
                                    </div>
                                </div>

                                <hr />

                                <div className="mb-4">
                                    <h6 className="fw-semibold text-primary mb-3">
                                        <i className="bi bi-geo-alt me-2"></i>
                                        CHỌN PHÒNG TIẾP NHẬN
                                    </h6>
                                    <select className="form-select">
                                        <option value="">Chọn phòng tiếp nhận...</option>
                                        {rooms.map(room => (
                                            <option key={room.id} value={room.id}>
                                                {room.name} - {room.doctor}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        className="btn btn-success btn-lg"
                                        onClick={handleCreateQueue}
                                    >
                                        <i className="bi bi-check-circle me-2"></i>
                                        XÁC NHẬN TIẾP NHẬN
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setSelectedAppointment(null)}
                                    >
                                        <i className="bi bi-arrow-left me-2"></i>
                                        QUAY LẠI
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-info text-white">
                                <h6 className="card-title mb-0">
                                    <i className="bi bi-info-circle me-2"></i>
                                    HƯỚNG DẪN
                                </h6>
                            </div>
                            <div className="card-body">
                                <div className="alert alert-info">
                                    <h6 className="alert-heading">
                                        <i className="bi bi-lightbulb me-2"></i>
                                        Hướng dẫn sử dụng
                                    </h6>
                                    <ol className="mb-0 small">
                                        <li className="mb-2">Tìm kiếm bệnh nhân theo tên, mã BN hoặc số điện thoại</li>
                                        <li className="mb-2">Lọc theo trạng thái lịch hẹn nếu cần</li>
                                        <li className="mb-2">Nhấn "Tiếp nhận" để xem thông tin chi tiết</li>
                                        <li className="mb-2">Chọn phòng tiếp nhận phù hợp</li>
                                        <li>Nhấn "Xác nhận tiếp nhận" để tạo queue</li>
                                    </ol>
                                </div>

                                <div className="mt-3">
                                    <h6 className="fw-semibold text-primary mb-2">
                                        <i className="bi bi-star-fill me-2"></i>
                                        Chú ý đặc biệt
                                    </h6>
                                    <ul className="list-unstyled small text-muted">
                                        <li className="mb-1">
                                            <i className="bi bi-record-fill text-warning me-2"></i>
                                            Hàng màu vàng: Bệnh nhân ưu tiên
                                        </li>
                                        <li className="mb-1">
                                            <i className="bi bi-clock text-warning me-2"></i>
                                            Chờ khám: Chưa tiếp nhận
                                        </li>
                                        <li className="mb-1">
                                            <i className="bi bi-check-circle text-success me-2"></i>
                                            Đã tiếp nhận: Đã có trong hàng chờ
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Thống kê nhanh */}
                    <div className="card shadow-sm border-0 mt-4">
                        <div className="card-body">
                            <h6 className="fw-semibold text-primary mb-3">
                                <i className="bi bi-graph-up me-2"></i>
                                THỐNG KÊ HÔM NAY
                            </h6>
                            <div className="row text-center">
                                <div className="col-6 mb-3">
                                    <div className="border rounded p-2">
                                        <div className="fw-bold text-primary h5 mb-1">
                                            {appointments.filter(a => a.status === "Đã tiếp nhận").length}
                                        </div>
                                        <small className="text-muted">Đã tiếp nhận</small>
                                    </div>
                                </div>
                                <div className="col-6 mb-3">
                                    <div className="border rounded p-2">
                                        <div className="fw-bold text-warning h5 mb-1">
                                            {appointments.filter(a => a.status === "Chờ khám").length}
                                        </div>
                                        <small className="text-muted">Chờ tiếp nhận</small>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="border rounded p-2">
                                        <div className="fw-bold text-info h5 mb-1">
                                            {appointments.length}
                                        </div>
                                        <small className="text-muted">Tổng lịch hẹn</small>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="border rounded p-2">
                                        <div className="fw-bold text-danger h5 mb-1">
                                            {appointments.filter(a => a.priority).length}
                                        </div>
                                        <small className="text-muted">Ưu tiên</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceptionistPatent;