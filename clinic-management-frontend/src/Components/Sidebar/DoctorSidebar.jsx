// src/components/Sidebar/DoctorSidebar.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { path } from "../../utils/constant";

const DoctorSidebar = () => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <div 
        className="d-flex flex-column text-white vh-100 position-fixed"
        style={{
          width: '280px',
          background: 'linear-gradient(to bottom, #28a745, #218838)',
          padding: '2rem 1rem',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h4 className="fw-bold mb-3" style={{ fontSize: '1.4rem' }}>Phòng Khám XYZ</h4>
          <div className="p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <p className="mb-1 small opacity-75">Bác Sĩ,</p>
            <p className="fw-bold mb-0">Trần Thị B</p>
          </div>
        </div>

        {/* Navigation với React Router NavLink */}
        <nav className="flex-column flex-grow-1 d-flex">
          <div className="nav flex-column flex-grow-1">
            <div className="nav-item mb-2">
              <NavLink 
                to={`${path.DOCTOR.ROOT}/${path.DOCTOR.TODAY_APPOINTMENTS}`}
                className={({ isActive }) => 
                  `nav-link py-3 px-3 rounded d-flex align-items-center transition-all ${
                    isActive ? 'active-doctor-nav text-dark' : 'text-white'
                  }`
                }
                style={({ isActive }) => ({ 
                  background: isActive ? '#fff' : 'transparent',
                  border: 'none',
                  textDecoration: 'none'
                })}
              >
                <i className="fa-solid fa-calendar-day me-3" style={{ width: '20px' }}></i>
                <span className="fw-medium">Lịch Khám Hôm Nay</span>
              </NavLink>
            </div>
            
            <div className="nav-item mb-2">
              <NavLink 
                to={`${path.DOCTOR.ROOT}/${path.DOCTOR.SCHEDULE}`}
                className={({ isActive }) => 
                  `nav-link py-3 px-3 rounded d-flex align-items-center transition-all ${
                    isActive ? 'active-doctor-nav text-dark' : 'text-white'
                  }`
                }
                style={({ isActive }) => ({ 
                  background: isActive ? '#fff' : 'transparent',
                  border: 'none',
                  textDecoration: 'none'
                })}
              >
                <i className="fa-solid fa-clock me-3" style={{ width: '20px' }}></i>
                <span className="fw-medium">Lịch Làm Việc</span>
              </NavLink>
            </div>
            
            <div className="nav-item mb-2">
              <NavLink 
                to={`${path.DOCTOR.ROOT}/${path.DOCTOR.PATIENT_HISTORY}`}
                className={({ isActive }) => 
                  `nav-link py-3 px-3 rounded d-flex align-items-center transition-all ${
                    isActive ? 'active-doctor-nav text-dark' : 'text-white'
                  }`
                }
                style={({ isActive }) => ({ 
                  background: isActive ? '#fff' : 'transparent',
                  border: 'none',
                  textDecoration: 'none'
                })}
              >
                <i className="fa-solid fa-user-clock me-3" style={{ width: '20px' }}></i>
                <span className="fw-medium">Lịch Sử Bệnh Nhân</span>
              </NavLink>
            </div>
            
            {/* Logout */}
            <div className="nav-item mt-auto">
              <NavLink 
                to="/logout"
                className="nav-link py-3 px-3 rounded d-flex align-items-center text-white transition-all"
                style={{ 
                  background: 'transparent', 
                  border: 'none',
                  textDecoration: 'none'
                }}
              >
                <i className="fa-solid fa-right-from-bracket me-3" style={{ width: '20px' }}></i>
                <span className="fw-medium">Đăng Xuất</span>
              </NavLink>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content với Outlet */}
      <div 
        className="flex-grow-1 bg-light"
        style={{ marginLeft: '280px', minHeight: '100vh' }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorSidebar;