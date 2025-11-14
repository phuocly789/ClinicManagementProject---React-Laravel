import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../../App.css";
import { useUser } from "../../context/userContext";

const AdminSidebar = () => {
  const {handleLogout } = useUser();
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <div className="sidebar d-flex flex-column shadow-sm">
        <h2 className="sidebar-header text-center fw-bold mb-3">
          Phòng Khám XYZ
        </h2>

        <div className="user-info text-center border-bottom pb-3 mb-3">
          <p className="mb-0 opacity-75">Xin chào,</p>
          <strong>Admin</strong>
        </div>

        <nav>
          <ul className="nav flex-column nav-list">
            <li>
              <NavLink to="/admin/dashboard" className="nav-item">
                <i className="fa-solid fa-chart-line"></i>
                Dashboard (Thống kê)
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/users" className="nav-item">
                <i className="fa-solid fa-users"></i>
                Quản Lý Người Dùng
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/schedule-management" className="nav-item">
                <i className="fa-solid fa-calendar-days"></i>
                Quản Lý Lịch Làm Việc
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/services" className="nav-item">
                <i className="fa-solid fa-briefcase-medical"></i>
                Quản Lý Dịch Vụ
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/suppliers" className="nav-item">
                <i className="fa-solid fa-truck"></i>
                Quản Lý Nhà Cung Cấp
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/medicines" className="nav-item">
                <i className="fa-solid fa-pills"></i>
                Quản Lý Thuốc
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/inventory" className="nav-item">
                <i className="fa-solid fa-boxes-packing"></i>
                Quản Lý Nhập Kho
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/revenue-report" className="nav-item">
                <i className="fa-solid fa-sack-dollar"></i>
                Báo Cáo Doanh Thu
              </NavLink>
            </li>

            <li className="border-top mt-auto pt-3">
              <button
                onClick={handleLogout}
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
      <div className="flex-grow-1 ">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminSidebar;
