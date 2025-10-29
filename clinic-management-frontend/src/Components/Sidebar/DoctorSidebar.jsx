import React from "react";

const DoctorSidebar = ({ currentSection, switchSection }) => {
  const handleClick = (sectionId) => {
    switchSection(sectionId);
  };

  const MenuItem = ({ section, icon, text, isLogout = false }) => (
    <div
      className={`d-flex align-items-center py-3 px-3 mb-2 rounded cursor-pointer transition-all ${
        currentSection === section ? "active-menu" : "text-white"
      }`}
      onClick={isLogout ? () => (window.location.href = "/") : () => handleClick(section)}
    >
      <i className={`${icon} me-3`} style={{ width: '20px', textAlign: 'center' }}></i>
      <span className="fw-medium">{text}</span>
    </div>
  );

  return (
    <aside 
      className="position-fixed start-0 top-0 vh-100 z-3 d-flex flex-column"
      style={{
        width: '280px',
        background: 'linear-gradient(to bottom, #28a745, #218838)',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <h2 className="text-white fw-bold text-center mb-4" style={{ fontSize: '1.4rem' }}>
          Phòng Khám XYZ
        </h2>
        
        {/* User Info */}
        <div className="text-center p-3 rounded mb-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <p className="text-white mb-1 small opacity-75">Xin chào,</p>
          <strong className="text-white">Bác sĩ Trần Thị B</strong>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-grow-1 p-3 pt-0">
        <MenuItem 
          section="today"
          icon="fa-solid fa-calendar-day"
          text="Lịch Khám Hôm Nay"
        />
        <MenuItem 
          section="schedule"
          icon="fa-solid fa-clock"
          text="Lịch Làm Việc"
        />
        <MenuItem 
          section="history"
          icon="fa-solid fa-user-clock"
          text="Lịch Sử Bệnh Nhân"
        />
        <MenuItem 
          icon="fa-solid fa-right-from-bracket"
          text="Đăng Xuất"
          isLogout={true}
        />
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        .cursor-pointer {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .cursor-pointer:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          transform: translateX(5px);
        }
        
        .active-menu {
          background: #fff !important;
          color: #218838 !important;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .transition-all {
          transition: all 0.3s ease;
        }
      `}</style>
    </aside>
  );
};

export default DoctorSidebar;