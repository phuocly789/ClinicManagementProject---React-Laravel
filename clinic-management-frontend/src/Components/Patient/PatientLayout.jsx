import React, { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { path } from "../../utils/constant";

const PatientLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("userInfo")) || {
    fullName: "Người dùng",
    email: "user@example.com",
  };

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const menuItems = [
    { path: "/patient/appointment", label: "Đặt Lịch Khám" },
    { path: "/patient/history", label: "Lịch Sử Khám Bệnh" },
    { path: "/patient/results", label: "Kết Quả Xét Nghiệm" },
    { path: "/patient/prescriptions", label: "Đơn Thuốc Của Tôi" },
    { path: "/patient/profile", label: "Hồ sơ cá nhân" },
  ];

  const isActive = (itemPath) => location.pathname.startsWith(itemPath);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="d-flex" style={{ height: "100vh", overflow: "hidden" }}>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none"
          style={{ zIndex: 1040 }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className="bg-primary text-white d-flex flex-column position-fixed top-0 h-100"
        style={{
          width: "250px",
          left: isSidebarOpen ? "0" : "-250px",
          transition: "left 0.3s ease-in-out",
          zIndex: 1050,
        }}
      >
        {/* Logo/Brand */}
        <div className="p-4 border-bottom border-white border-opacity-25 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0">Phòng Khám XYZ</h5>
          <button
            className="btn btn-link text-white d-md-none p-0"
            onClick={closeSidebar}
            style={{ fontSize: "1.5rem", textDecoration: "none" }}
          >
            ×
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-grow-1 py-3 overflow-auto">
          <ul className="nav flex-column gap-1 px-2">
            {menuItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  onClick={closeSidebar}
                  className={`nav-link py-2 px-3 rounded ${
                    isActive(item.path)
                      ? "bg-white text-primary fw-semibold"
                      : "text-white"
                  }`}
                  style={{
                    transition: "all 0.2s",
                    fontSize: "0.95rem",
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-top border-white border-opacity-25">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light w-100 py-2"
          >
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Sidebar for desktop (always visible) */}
      <aside
        className="d-none d-md-flex flex-column position-fixed top-0 start-0 h-100"
        style={{
          width: "250px",
          zIndex: 1030,
          backgroundColor: "#0056A3",
          color: "#fff",
        }}
      >
        {/* Logo/Brand */}
        <div className="p-4 border-bottom border-white border-opacity-25">
          <h5 className="fw-bold mb-0">Phòng Khám XYZ</h5>
        </div>

        {/* Menu Items */}
        <nav className="flex-grow-1 py-3 overflow-auto">
          <ul className="nav flex-column gap-1 px-2">
            {menuItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link py-2 px-3 rounded ${
                    isActive(item.path)
                      ? "bg-primary text-white fw-semibold"
                      : "text-white"
                  }`}
                  style={{
                    transition: "all 0.2s",
                    fontSize: "0.95rem",
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-top border-white border-opacity-25">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light w-100 py-2"
          >
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{
          marginLeft: "0",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <style>
          {`
            @media (min-width: 768px) {
              .flex-grow-1.d-flex.flex-column {
                margin-left: 250px !important;
              }
            }
          `}
        </style>

        {/* Header */}
        <header className="bg-white border-bottom py-3 px-3 px-md-4 shadow-sm">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2 gap-md-3">
              {/* Hamburger Menu (mobile only) */}
              <button
                className="btn btn-link text-primary d-md-none p-0"
                onClick={() => setIsSidebarOpen(true)}
                style={{ fontSize: "1.5rem", textDecoration: "none" }}
              >
                ☰
              </button>

              <h6 className="mb-0 text-secondary d-none d-sm-block">
                {menuItems.find((item) => isActive(item.path))?.label ||
                  "Dashboard"}
              </h6>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small d-none d-sm-inline">
                {user.fullName}
              </span>
              <div
                className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: "35px", height: "35px", flexShrink: 0 }}
              >
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="flex-grow-1 bg-light p-2 p-md-4"
          style={{ overflowY: "auto" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PatientLayout;
