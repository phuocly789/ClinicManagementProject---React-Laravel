import React, { useEffect, useState } from "react";
import { Calendar, Clock, X, Eye } from "lucide-react";
import Select from "react-select";
import "bootstrap/dist/css/bootstrap.min.css";
import patientService from "../../services/patientService";
import CustomToast from "../../Components/CustomToast/CustomToast";
import { useOutletContext } from "react-router-dom";
import Pagination from "../../Components/Pagination/Pagination";
export default function PatientManagement() {
  const user = useOutletContext();
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    symptoms: "",
  });
  const pageSize = 3;
  const [current, setCurrent] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [services, setServices] = useState([]);

  const [appointments, setAppointments] = useState([]);

  // Fetch Api
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const getAppointment = async (page = current) => {
    try {
      setIsLoading(true);
      const res = await patientService.historiesAppointments(
        page + 1,
        pageSize
      );
      if (res && res.success) {
        const data = res.data;
        setAppointments(
          data.data.map((item, index) => ({
            id: item.id,
            date: item.date.split("T")[0],
            time: item.time,
            doctor: item.doctor,
            specialty: item.specialty,
            status: item.status,
          }))
        );
        setPageCount(data.totalPages);
        setCurrent(data.current - 1);
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Lỗi server");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    getAppointment(current);
  }, [current]);
  const handlePageChange = ({ selected }) => {
    setCurrent(selected);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    // Validation
    if (!formData.date) newErrors.date = "Vui lòng chọn ngày khám";
    if (!formData.time) newErrors.time = "Vui lòng chọn giờ khám";
    if (!formData.symptoms.trim())
      newErrors.symptoms = "Triệu chứng không được để trống";

    // Ngày giờ không ở quá khứ
    if (formData.date && formData.time) {
      const selectedDT = new Date(`${formData.date}T${formData.time}`);
      if (selectedDT < new Date())
        newErrors.date = "Không thể đặt lịch trong quá khứ";
    }

    // Kiểm tra trùng lịch
    if (formData.date && formData.time) {
      const conflict = appointments.some(
        (apt) => apt.date === formData.date && apt.time === formData.time
      );
      if (conflict) newErrors.time = "Lịch trùng với bệnh nhân khác ";
    }
    if (formData.time) {
      const [hoursStr, minutesStr] = formData.time.split(":");
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      if (minutes !== 0 && minutes !== 30) {
        newErrors.time = "Giờ khám chỉ được chọn phút 00 hoặc 30";
      }

      if (hours < 8 || hours > 17 || (hours === 17 && minutes > 0)) {
        newErrors.time =
          "Chỉ được đặt lịch trong giờ hành chính (08:00 - 17:00)";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Submit form
      const payload = {
        userId: user.id,
        date: formData.date,
        time: formData.time,
        symptoms: formData.symptoms,
      };
      try {
        const res = await patientService.bookingAppointment(payload);
        if (res && res.success === true) {
          showToast("success", res?.message || "Đặt lịch thành công.");
          getAppointment(0);

          setFormData({
            date: "",
            time: "",
            symptoms: "",
          });
        }
      } catch (error) {
        const response = error.response?.data;
        if (response?.code === 2) {
          setErrors({
            ...errors,
            time: response?.message,
          });
        } else if (response?.code === 1) {
          setErrors({
            ...errors,
            date: response?.message,
          });
        } else {
          showToast("error", response?.message || "Lỗi server.");
        }
      }
    }
  };

  const handleCancel = (id) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== id));
  };

  return (
    <>
      <div className="min-vh-100 bg-light py-5">
        <div className="container">
          <h1 className="fw-bold text-dark mb-5">Bảng điều khiển Bệnh nhân</h1>

          <div className="card shadow-sm mb-5">
            <div className="card-body">
              <h2 className="h4 fw-semibold mb-4">Đặt Lịch Khám Mới</h2>
              <form onSubmit={handleSubmit}>
                {/* Service */}
                <div className="mb-3">
                  <label className="form-label">Chọn Dịch Vụ/Chuyên Khoa</label>
                  <Select
                    isDisabled
                    placeholder="Tìm hoặc chọn dịch vụ..."
                    isClearable
                    classNamePrefix="react-select"
                  />
                </div>

                {/* Doctor */}
                <div className="mb-3">
                  <label className="form-label">Chọn Bác Sĩ</label>
                  <Select
                    isDisabled
                    placeholder="Tìm hoặc chọn bác sĩ..."
                    isClearable
                    classNamePrefix="react-select"
                  />
                </div>

                {/* Date */}
                <div className="mb-3">
                  <label className="form-label">Chọn Ngày Khám</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="form-control"
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {errors.date && (
                    <small className="text-danger">{errors.date}</small>
                  )}
                </div>

                {/* Time */}
                {/* Time */}
                <div className="mb-3">
                  <label className="form-label">Chọn Giờ Khám</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="form-control"
                    step="1800" // chỉ cho chọn 00 hoặc 30 phút
                  />
                  {errors.time && (
                    <small className="text-danger">{errors.time}</small>
                  )}
                </div>

                {/* Symptoms */}
                <div className="mb-3">
                  <label className="form-label">Triệu chứng hoặc ghi chú</label>
                  <textarea
                    name="symptoms"
                    value={formData.symptoms}
                    onChange={handleInputChange}
                    rows="4"
                    className="form-control"
                    placeholder="Mô tả triệu chứng hoặc lý do khám..."
                  />
                  {errors.symptoms && (
                    <small className="text-danger">{errors.symptoms}</small>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-medium"
                >
                  Xác Nhận Đặt Lịch
                </button>
              </form>
            </div>
          </div>

          {/* Appointment list */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h4 fw-semibold mb-4">Lịch Sử Các Lịch Hẹn</h2>
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead className="table-light text-center">
                    <tr style={{ backgroundColor: "#f2f2f2" }}>
                      <th>Ngày Khám</th>
                      <th>Giờ</th>
                      <th>Bác Sĩ</th>
                      <th>Chuyên Khoa</th>
                      <th>Trạng Thái</th>
                      <th>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="align-middle">
                        <td>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <Calendar size={16} className="text-secondary" />
                            {apt.date}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            <Clock size={16} className="text-secondary" />
                            {apt.time}
                          </div>
                        </td>
                        <td>{apt?.doctor || "Chờ hệ thống xác nhận"}</td>
                        <td>{apt?.specialty || "Chờ hệ thống xác nhận"}</td>
                        <td>
                          <span
                            className={`badge px-3 py-2 ${
                              apt.status === "Hủy"
                                ? "bg-danger-subtle text-danger"
                                : apt.status === "Đang chờ"
                                ? "bg-warning-subtle text-warning"
                                : apt.status === "Đã khám"
                                ? "bg-success-subtle text-success"
                                : apt.status === "Đã đặt"
                                ? "bg-primary-subtle text-primary"
                                : "bg-secondary-subtle text-secondary"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="flex justify-center items-center text-center">
                          {apt.status === "Đã đặt" && (
                            <button
                              onClick={() => handleCancel(apt.id)}
                              className="btn btn-link text-danger p-0 flex justify-center items-center"
                            >
                              <X size={32} />
                            </button>
                          )}
                          {(apt.status === "Đã khám" ||
                            apt.status === "Đang chờ") && (
                            <button className="btn btn-link text-primary p-0 flex justify-center items-center">
                              <Eye size={32} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {pageCount > 1 && (
              <Pagination
                pageCount={pageCount}
                onPageChange={handlePageChange}
                currentPage={current}
              />
            )}
          </div>
        </div>
      </div>
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
