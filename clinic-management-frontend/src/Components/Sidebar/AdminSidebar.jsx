import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../../App.css";
import { useUser } from "../../context/userContext";

const AdminSidebar = () => {
  const { handleLogout } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Hamburger Button cho mobile */}
      <button
        className="sidebar-toggle-btn d-lg-none"
        onClick={toggleSidebar}
      >
        <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
      </button>

      {/* Overlay cho mobile */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay d-lg-none"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar d-flex flex-column shadow-sm ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header-container">
          <h2 className="sidebar-header text-center fw-bold mb-3">
            Phòng Khám XYZ
          </h2>

          {/* Close button cho mobile */}
          <button
            className="sidebar-close-btn d-lg-none"
            onClick={closeSidebar}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="user-info text-center border-bottom pb-3 mb-3">
          <p className="mb-0 opacity-75">Xin chào,</p>
          <strong>Admin</strong>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav flex-column nav-list">
            <li>
              <NavLink
                to="/admin/dashboard"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-chart-line"></i>
                Dashboard (Thống kê)
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/users"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-users"></i>
                Quản Lý Người Dùng
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/schedule-management"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-calendar-days"></i>
                Quản Lý Lịch Làm Việc
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/services"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-briefcase-medical"></i>
                Quản Lý Dịch Vụ
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/suppliers"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-truck"></i>
                Quản Lý Nhà Cung Cấp
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/medicines"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-pills"></i>
                Quản Lý Thuốc
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/inventory"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-boxes-packing"></i>
                Quản Lý Nhập Kho
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/revenue-report"
                className="nav-item"
                onClick={closeSidebar}
              >
                <i className="fa-solid fa-sack-dollar"></i>
                Báo Cáo Doanh Thu
              </NavLink>
            </li>

            <li className="border-top mt-auto pt-3">
              <button
                onClick={() => {
                  handleLogout();
                  closeSidebar();
                }}
                className="nav-item logout-btn"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Đăng Xuất
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Nội dung trang con */}
      <div className="main-content flex-grow-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminSidebar;