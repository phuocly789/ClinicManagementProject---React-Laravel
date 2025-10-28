import React from "react";
import { NavLink } from "react-router-dom";
import "./AdminSidebar.css";

const AdminSidebar = () => {
  return (
    <div className="sidebar">
      <h2 className="sidebar-header">Phòng Khám XYZ</h2>

      <div className="user-info">
        <p>Xin chào,</p>
        <strong>Admin</strong>
      </div>

      <nav>
        <ul className="nav-list">
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
            <NavLink to="/admin/supplier" className="nav-item">
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

          <li className="logout">
            <NavLink to="/logout" className="nav-item">
              <i className="fa-solid fa-right-from-bracket"></i>
              Đăng Xuất
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default AdminSidebar;
