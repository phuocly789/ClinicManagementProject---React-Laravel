import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../../App.css";
import { useUser } from "../../context/userContext";

const TechnicianSidebar = () => {
  const { user, handleLogout } = useUser();

  // Hàm tạo avatar từ tên
  const getAvatarFromName = (name) => {
    if (!name) return "KT";
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Lấy tên hiển thị
  const displayName = user?.full_name || user?.name || user?.username || 'Kỹ Thuật Viên';

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
                backgroundColor: '#17a2b8',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              {getAvatarFromName(displayName)}
            </div>
          </div>
          <p className="mb-1 opacity-75">Kỹ Thuật Viên</p>
          <strong className="d-block">{displayName}</strong>
          <small className="text-muted">{user?.department || 'Phòng Xét nghiệm'}</small>
        </div>


        <nav>
          <ul className="nav flex-column nav-list">
            <li>
              <NavLink to="/technician/schedule" className="nav-item">
                {/* Avatar thay cho icon lịch */}
                <div 
                  className="nav-avatar d-inline-flex align-items-center justify-content-center me-3"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}
                >
                  {getAvatarFromName(displayName)}
                </div>
                Quản Lý Lịch Làm Việc
              </NavLink>
            </li>

            <li>
              <NavLink to="/technician/test-results" className="nav-item">
                <i className="fas fa-vials"></i>                
                Quản Lý Xét Nghiệm
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

export default TechnicianSidebar;