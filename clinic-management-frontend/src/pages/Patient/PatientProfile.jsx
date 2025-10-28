import React, { useState } from "react";

const PatientProfile = () => {
  // State cho thông tin cá nhân
  const [profileData, setProfileData] = useState({
    fullName: "Nguyễn Văn An",
    email: "an.nguyen@example.com",
    phone: "0912345678",
    birthDate: "1995-08-15",
    address: "123 Đường ABC, Quận 1, TP.HCM",
  });

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

  // Xử lý lưu thông tin cá nhân
  const handleSaveProfile = (e) => {
    e.preventDefault();

    // Validate
    if (
      !profileData.fullName ||
      !profileData.phone ||
      !profileData.birthDate ||
      !profileData.address
    ) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    // Lưu vào localStorage (giả lập API)
    const userInfo = JSON.parse(localStorage.getItem("userInfo")) || {};
    const updatedUser = {
      ...userInfo,
      fullName: profileData.fullName,
      phone: profileData.phone,
      birthDate: profileData.birthDate,
      address: profileData.address,
    };
    localStorage.setItem("userInfo", JSON.stringify(updatedUser));

    alert("Cập nhật thông tin thành công!");
  };

  // Xử lý thay đổi mật khẩu
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  // Gửi mã OTP
  const handleSendOTP = (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      alert("Vui lòng nhập mật khẩu hiện tại!");
      return;
    }

    // Giả lập gửi OTP
    console.log("Gửi OTP đến email:", profileData.email);
    setOtpSent(true);
    alert("Mã OTP đã được gửi đến email của bạn!\n(Mã giả lập: 123456)");
  };

  // Xác nhận đổi mật khẩu
  const handleChangePassword = (e) => {
    e.preventDefault();

    // Validate
    if (!passwordData.currentPassword) {
      alert("Vui lòng nhập mật khẩu hiện tại!");
      return;
    }

    if (!passwordData.otp) {
      alert("Vui lòng nhập mã OTP!");
      return;
    }

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      alert("Vui lòng nhập mật khẩu mới!");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    // Giả lập verify OTP
    if (passwordData.otp !== "123456") {
      alert("Mã OTP không đúng!");
      return;
    }

    // Giả lập đổi mật khẩu thành công
    console.log("Đổi mật khẩu thành công");
    alert("Đổi mật khẩu thành công!");

    // Reset form
    setPasswordData({
      currentPassword: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOtpSent(false);
  };

  return (
    <div className="bg-light" style={{ padding: "24px 40px" }}>
      {/* Hồ sơ bệnh nhân */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-white fw-bold fs-5">Hồ sơ bệnh nhân</div>
        <div className="card-body" style={{ padding: "30px" }}>
          {/* Thông tin cá nhân */}
          <h5 className="mb-4 fw-semibold">Thông tin cá nhân</h5>
          <form onSubmit={handleSaveProfile}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Họ và Tên</label>
              <input
                type="text"
                className="form-control"
                name="fullName"
                value={profileData.fullName}
                onChange={handleProfileChange}
                required
              />
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
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Ngày sinh</label>
              <input
                type="date"
                className="form-control"
                name="birthDate"
                value={profileData.birthDate}
                onChange={handleProfileChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Địa chỉ</label>
              <input
                type="text"
                className="form-control"
                name="address"
                value={profileData.address}
                onChange={handleProfileChange}
                required
              />
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
                className="form-control"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Nhập mật khẩu hiện tại"
                required
              />
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
                className="form-control"
                name="otp"
                value={passwordData.otp}
                onChange={handlePasswordChange}
                placeholder="Nhập mã từ email"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Mật khẩu mới</label>
              <input
                type="password"
                className="form-control"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Nhập mật khẩu mới"
                required
                minLength={6}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                className="form-control"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Nhập lại mật khẩu mới"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary px-4">
              Xác nhận đổi mật khẩu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
