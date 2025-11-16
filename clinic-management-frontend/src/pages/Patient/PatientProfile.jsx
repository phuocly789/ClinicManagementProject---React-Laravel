import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import dayjs from "dayjs";
import CustomToast from "../../Components/CustomToast/CustomToast";
import patientService from "../../services/patientService";

const PatientProfile = () => {
  const user = useOutletContext();
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const showToast = (type, message) => {
    setToast({ type, message });
  };

  // State cho thông tin cá nhân
  const [profileData, setProfileData] = useState({
    id: "",
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    address: "",
  });

  useEffect(() => {
    console.log("Check user: ", user);
    if (user) {
      setProfileData({
        id: user.id,
        fullName: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        birthDate: user.birthDate
          ? dayjs(user.birthDate.split(".")[0]).format("YYYY-MM-DD")
          : "",
        address: user.address || "",
      });
    }
  }, [user]);

  // State cho đổi mật khẩu
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [otpSent, setOtpSent] = useState(false);

  // Xử lý thay đổi thông tin cá nhân
  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  // ================= VALIDATION =================
  const validateProfile = () => {
    const newErrors = {};
    const { fullName, birthDate, address } = profileData;
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    const htmlTagRegex = /<\/?[^>]+(>|$)/;

    if (!fullName.trim()) newErrors.fullName = "Họ tên không được để trống";
    else if (specialCharRegex.test(fullName))
      newErrors.fullName = "Họ tên không được chứa ký tự đặc biệt";
    else if (htmlTagRegex.test(fullName))
      newErrors.fullName = "Không nhập mã HTML";
    else if (fullName.length > 255)
      newErrors.fullName = "Họ tên không được quá 255 ký tự";

    if (!birthDate) newErrors.birthDate = "Ngày sinh không được để trống";
    else if (dayjs(birthDate).isAfter(dayjs(), "day"))
      newErrors.birthDate = "Không được chọn ngày sinh trong tương lai";

    if (!address.trim()) newErrors.address = "Địa chỉ không được để trống";
    else if (htmlTagRegex.test(address))
      newErrors.address = "Không nhập mã HTML";

    return newErrors;
  };

  const validatePassword = () => {
    const newErrors = {};
    const { currentPassword, otp, newPassword, confirmPassword } = passwordData;
    const htmlTagRegex = /<\/?[^>]+(>|$)/;

    if (!currentPassword.trim())
      newErrors.currentPassword = "Mật khẩu hiện tại không được để trống";
    if (!otp.trim()) newErrors.otp = "Mã OTP không được để trống";
    if (!newPassword.trim())
      newErrors.newPassword = "Mật khẩu mới không được để trống";
    if (!confirmPassword.trim())
      newErrors.confirmPassword = "Xác nhận mật khẩu không được để trống";

    if (newPassword && confirmPassword && newPassword !== confirmPassword)
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";

    if (newPassword && newPassword.length > 255)
      newErrors.newPassword = "Mật khẩu không được quá 255 ký tự";

    if (newPassword && htmlTagRegex.test(newPassword))
      newErrors.newPassword = "Vui lòng không nhập mã HTML";

    return newErrors;
  };

  // Xử lý lưu thông tin cá nhân
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const validationErrors = validateProfile();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    try {
      const payload = {
        full_name: profileData.fullName,
        date_of_birth: profileData.birthDate,
        address: profileData.address,
        phone: profileData.phone,
        email: profileData.email,
      };
      const res = await patientService.updateProfile(profileData.id, payload);
      if (res && res.success === true) {
        showToast("success", "Cập nhật thông tin thành công!");
      }
    } catch (error) {
      showToast("error", "Lỗi server ");
    }
  };

  // Xử lý thay đổi mật khẩu
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  // Gửi mã OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword) {
      setErrors({
        ...errors,
        currentPassword: "Vui lòng nhập mật khẩu hiện tại!",
      });
      return;
    }
    try {
      const res = await patientService.sendEmailVerification({
        email: profileData.email,
        password: passwordData.currentPassword,
      });

      if (res && res.success === false) {
        if (res?.code === 1) {
          setErrors({
            ...errors,
            currentPassword: "Mật khẩu hiện tại không đúng!",
          });
          return;
        }
      }
      if (res && res.success === true) {
        setOtpSent(true);
        showToast(
          "success",
          "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư !"
        );
      }
    } catch (error) {
      const response = error.response?.data;
      if (response?.code === 1) {
        setErrors({
          ...errors,
          currentPassword: "Mật khẩu hiện tại không đúng!",
        });
      } else {
        showToast("error", "Lỗi server");
      }
    }
  };

  // Xác nhận đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const validationErrors = validatePassword();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;
    try {
      const res = await patientService.changePassword({
        email: profileData.email,
        password: passwordData.currentPassword,
        code: passwordData.otp,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword,
      });
      if (res && res.success === true) {
        showToast("success", "Đổi mật khẩu thành công!");
        setPasswordData({
          currentPassword: "",
          otp: "",
          newPassword: "",
          confirmPassword: "",
        });
        setOtpSent(false);
      }
    } catch (error) {
      const response = error.response?.data;
      if (response?.code === 2) {
        showToast("error", "Người dùng không tồn tại!");
      } else if (response?.code === 4) {
        setErrors({
          ...errors,
          otp: "Mã OTP không chính xác. Vui lòng nhập lại mã OTP",
        });
      } else if (response?.code === 5) {
        setErrors({
          ...errors,
          otp: "Mã OTP không chính xác. Vui lòng nhập lại mã OTP",
        });
      } else {
        showToast("error", "Lỗi server");
      }
    }
  };
  return (
    <>
      <div className="bg-light" style={{ padding: "24px 40px" }}>
        {/* Hồ sơ bệnh nhân */}
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-white fw-bold fs-5">
            Hồ sơ bệnh nhân
          </div>
          <div className="card-body" style={{ padding: "30px" }}>
            <h5 className="mb-4 fw-semibold">Thông tin cá nhân</h5>
            <form onSubmit={handleSaveProfile}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Họ và Tên</label>
                <input
                  type="text"
                  className={`form-control ${
                    errors.fullName ? "is-invalid" : ""
                  }`}
                  name="fullName"
                  value={profileData.fullName}
                  onChange={handleProfileChange}
                />
                {errors.fullName && (
                  <div className="invalid-feedback">{errors.fullName}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Email (không thay đổi)
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={profileData.email}
                  disabled
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Số điện thoại</label>
                <input
                  type="text"
                  className="form-control"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  disabled
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Ngày sinh</label>
                <input
                  type="date"
                  className={`form-control ${
                    errors.birthDate ? "is-invalid" : ""
                  }`}
                  name="birthDate"
                  value={profileData.birthDate}
                  onChange={handleProfileChange}
                />
                {errors.birthDate && (
                  <div className="invalid-feedback">{errors.birthDate}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Địa chỉ</label>
                <input
                  type="text"
                  className={`form-control ${
                    errors.address ? "is-invalid" : ""
                  }`}
                  name="address"
                  value={profileData.address}
                  onChange={handleProfileChange}
                />
                {errors.address && (
                  <div className="invalid-feedback">{errors.address}</div>
                )}
              </div>

              <button type="submit" className="btn btn-primary px-4">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>

        {/* Đổi mật khẩu */}
        <div className="card shadow-sm">
          <div className="card-header bg-white fw-bold fs-5">Đổi mật khẩu</div>
          <div className="card-body" style={{ padding: "30px" }}>
            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  className={`form-control ${
                    errors.currentPassword ? "is-invalid" : ""
                  }`}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                {errors.currentPassword && (
                  <div className="invalid-feedback">
                    {errors.currentPassword}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary mb-3 px-4"
                onClick={handleSendOTP}
                disabled={!passwordData.currentPassword}
              >
                {otpSent ? "Gửi lại mã OTP" : "Gửi mã OTP về Email"}
              </button>

              {otpSent && (
                <div className="alert alert-info mb-3">
                  <small>
                    Mã OTP đã được gửi đến email:{" "}
                    <strong>{profileData.email}</strong>
                  </small>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Mã xác thực (OTP)
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.otp ? "is-invalid" : ""}`}
                  name="otp"
                  value={passwordData.otp}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mã từ email"
                />
                {errors.otp && (
                  <div className="invalid-feedback">{errors.otp}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Mật khẩu mới</label>
                <input
                  type="password"
                  className={`form-control ${
                    errors.newPassword ? "is-invalid" : ""
                  }`}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mật khẩu mới"
                />
                {errors.newPassword && (
                  <div className="invalid-feedback">{errors.newPassword}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  className={`form-control ${
                    errors.confirmPassword ? "is-invalid" : ""
                  }`}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập lại mật khẩu mới"
                />
                {errors.confirmPassword && (
                  <div className="invalid-feedback">
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary px-4">
                Xác nhận đổi mật khẩu
              </button>
            </form>
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
};

export default PatientProfile;
