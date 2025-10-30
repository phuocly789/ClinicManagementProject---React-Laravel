// src/components/TechnicianSidebar.jsx
import React from 'react';
import { Nav } from 'react-bootstrap';

const TechnicianSidebar = ({ currentSection, switchSection }) => {
  const handleNavClick = (sectionId, e) => {
    e.preventDefault();
    switchSection(sectionId);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    window.location.href = "/";
  };

  const isActive = (sectionId) => currentSection === sectionId;

  return (
    <div
      className="d-flex flex-column text-white vh-100"
      style={{
        width: '280px',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'linear-gradient(to bottom, #4e8cb1, #795548)',
        padding: '2rem 1rem',
        overflowY: 'auto',
        zIndex: 1000,
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h4 className="fw-bold mb-3" style={{ fontSize: '1.4rem' }}>Phòng Khám XYZ</h4>
        <div className="p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <p className="mb-1 small opacity-75">Kỹ Thuật Viên,</p>
          <p className="fw-bold mb-0">Trần Văn Hùng</p>
        </div>
      </div>

      {/* Navigation với Bootstrap Nav */}
      <Nav className="flex-column flex-grow-1">
        <Nav.Item className="mb-2">
          <Nav.Link 
            href="#" 
            className={`py-3 px-3 rounded d-flex align-items-center transition-all ${
              isActive('schedule') ? 'active-tech-nav' : 'text-white'
            }`}
            onClick={(e) => handleNavClick('schedule', e)}
            style={{ 
              background: isActive('schedule') ? '#fff' : 'transparent',
              border: 'none'
            }}
          >
            <i className="fa-solid fa-calendar-day me-3" style={{ width: '20px' }}></i>
            <span className="fw-medium">Lịch Làm Việc</span>
          </Nav.Link>
        </Nav.Item>
        
        <Nav.Item className="mb-2">
          <Nav.Link 
            href="#" 
            className={`py-3 px-3 rounded d-flex align-items-center transition-all ${
              isActive('test-results') ? 'active-tech-nav' : 'text-white'
            }`}
            onClick={(e) => handleNavClick('test-results', e)}
            style={{ 
              background: isActive('test-results') ? '#fff' : 'transparent',
              border: 'none'
            }}
          >
            <i className="fa-solid fa-flask me-3" style={{ width: '20px' }}></i>
            <span className="fw-medium">Kết Quả Xét Nghiệm</span>
          </Nav.Link>
        </Nav.Item>
        
        <Nav.Item className="mb-2 mt-auto">
          <Nav.Link 
            href="#" 
            className="py-3 px-3 rounded d-flex align-items-center text-white transition-all logout-nav"
            onClick={handleLogout}
            style={{ background: 'transparent', border: 'none' }}
          >
            <i className="fa-solid fa-right-from-bracket me-3" style={{ width: '20px' }}></i>
            <span className="fw-medium">Đăng Xuất</span>
          </Nav.Link>
        </Nav.Item>
      </Nav>

     
    </div>
  );
};

export default TechnicianSidebar;