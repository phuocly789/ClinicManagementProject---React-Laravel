// src/components/Sidebar/DoctorSidebar.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { path } from "../../utils/constant";
import "../../App.css";
import { useUser } from "../../context/userContext";

const DoctorSidebar = () => {
  const { user, handleLogout } = useUser();

  // Hàm tạo avatar từ tên
  const getAvatarFromName = (name) => {
    if (!name) return "BS";
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Lấy tên hiển thị
  const displayName = user?.full_name || user?.name || user?.username || 'Bác Sĩ';

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <div className="sidebar d-flex flex-column shadow-sm">
        <h2 className="sidebar-header text-center fw-bold mb-3">
          Phòng Khám XYZ
        </h2>

        {/* User Info với Avatar */}
        <div className="user-info text-center border-bottom pb-3 mb-3">
          <div className="avatar-container mb-2">
            <div 
              className="avatar-circle d-inline-flex align-items-center justify-content-center"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#28a745',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              {getAvatarFromName(displayName)}
            </div>
          </div>
          <p className="mb-1 opacity-75">Bác Sĩ</p>
          <strong className="d-block">{displayName}</strong>
          <small className="text-muted">{user?.specialty || 'Chuyên khoa'}</small>
        </div>

        <nav>
          <ul className="nav flex-column nav-list">
            <li>
              <NavLink 
                to={`${path.DOCTOR.ROOT}/${path.DOCTOR.TODAY_APPOINTMENTS}`}
                className="nav-item"
              >
                <i className="fa-solid fa-calendar-day"></i>
                Lịch Khám Hôm Nay
              </NavLink>
            </li>
            
            <li>
              <NavLink 
                to={`${path.DOCTOR.ROOT}/${path.DOCTOR.SCHEDULE}`}
                className="nav-item"
              >
                {/* Thay icon clock bằng avatar nhỏ */}
                <div 
                  className="nav-avatar d-inline-flex align-items-center justify-content-center me-3"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#28a745',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}
                >
                  {getAvatarFromName(displayName)}
                </div>
                Lịch Làm Việc
              </NavLink>
            </li>
            
            <li>
              <NavLink 
                to={`${path.DOCTOR.ROOT}/${path.DOCTOR.PATIENT_HISTORY}`}
                className="nav-item"
              >
                <i className="fa-solid fa-user-clock"></i>
                Lịch Sử Bệnh Nhân
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
      <div className="flex-grow-1">
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorSidebar;