import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../../App.css";
import { useUser } from "../../context/userContext";

const TechnicianSidebar = () => {
  const { handleLogout } = useUser();
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <div className="sidebar d-flex flex-column shadow-sm">
        <h2 className="sidebar-header text-center fw-bold mb-3">
          Phòng Khám XYZ
        </h2>

        <div className="user-info text-center border-bottom pb-3 mb-3">
          <p className="mb-0 opacity-75">Xin chào,</p>
          <strong>Kỹ Thuật Viên</strong>
        </div>

        <nav>
          <ul className="nav flex-column nav-list">

            <li>
              <NavLink to="/technician/schedule" className="nav-item">
                <i class="fas fa-calendar-alt"></i>
                Quản Lý Lịch Làm Việc
              </NavLink>
            </li>
            <li>
              <NavLink to="/technician/test-results" className="nav-item">
                <i class="fas fa-vials"></i>                Quản Lý Xét Nghiệm
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

export default TechnicianSidebar;
