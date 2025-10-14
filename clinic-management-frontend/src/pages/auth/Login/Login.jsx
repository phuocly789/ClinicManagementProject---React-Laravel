import React, { useState } from "react";
import { Spinner } from "react-bootstrap";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Xử lý thay đổi input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // reset lỗi khi user nhập lại
    setErrors({
      ...errors,
      [e.target.name]: "",
    });
  };

  // Validate cơ bản
  const validateForm = () => {
    const newErrors = {};
    const htmlTagRegex = /<[^>]*>/; // Regex phát hiện HTML tag

    // ====== Kiểm tra username ======
    if (!formData.username.trim()) {
      newErrors.username = "Tên đăng nhập không được để trống";
    } else if (formData.username.length < 6) {
      newErrors.username = "Tài khoản không được nhỏ hơn 6 ký tự";
    } else if (formData.username.length > 255) {
      newErrors.username = "Tài khoản không được lớn hơn 255 ký tự";
    } else if (htmlTagRegex.test(formData.username)) {
      newErrors.username = "Tài khoản không được chứa mã HTML";
    }

    // ====== Kiểm tra password ======
    if (!formData.password.trim()) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu không được nhỏ hơn 6 ký tự";
    } else if (formData.password.length > 255) {
      newErrors.password = "Mật khẩu không được lớn hơn 255 ký tự";
    } else if (htmlTagRegex.test(formData.password)) {
      newErrors.password = "Mật khẩu không được chứa mã HTML";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // true nếu không có lỗi
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // setLoading(true);
    // try {
    //   const res = await axios.post("http://localhost:3000/api/login", formData);

    //   if (res.data.success) {
    //     toast.success("Đăng nhập thành công!");
    //     // Ví dụ: lưu token & chuyển hướng
    //     // localStorage.setItem("token", res.data.token);
    //     // window.location.href = "/dashboard";
    //   } else {
    //     toast.error(res.data.message || "Đăng nhập thất bại!");
    //   }
    // } catch (error) {
    //   console.error(error);
    //   toast.error("Lỗi kết nối server!");
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <div className="container-fluid bg-light min-vh-100 d-flex justify-content-center align-items-center">
      <div className="row w-100 justify-content-center">
        <div className="col-11 col-sm-8 col-md-6 col-lg-5 col-xl-4">
          <div
            className="card shadow-lg p-4 p-sm-6"
            style={{ borderRadius: "16px" }}
          >
            <h1 className="fs-2 text-center fw-bold text-primary mb-3">
              Hệ Thống Quản Lý Phòng Khám
            </h1>
            <p className="text-center text-muted mb-4 fs-6">
              Vui lòng đăng nhập để tiếp tục
            </p>

            <form onSubmit={handleSubmit}>
              {/* Username */}
              <div className="mb-4">
                <label htmlFor="username" className="form-label fw-semibold">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  className={`form-control form-control-lg ${
                    errors.username ? "is-invalid" : ""
                  }`}
                  placeholder="Nhập email hoặc số điện thoại"
                  value={formData.username}
                  onChange={handleChange}
                />
                {errors.username && (
                  <div className="invalid-feedback">{errors.username}</div>
                )}
              </div>

              {/* Password */}
              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-semibold">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  className={`form-control form-control-lg ${
                    errors.password ? "is-invalid" : ""
                  }`}
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && (
                  <div className="invalid-feedback">{errors.password}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-100 mb-3 fw-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang xử lý...
                  </>
                ) : (
                  "Đăng Nhập"
                )}
              </button>
            </form>

            <div className="text-center mt-3">
              <a href="#" className="text-decoration-none">
                Quên mật khẩu?
              </a>
              <span className="mx-2 text-muted">|</span>
              <a href="#" className="text-decoration-none">
                Đăng ký tài khoản mới
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
