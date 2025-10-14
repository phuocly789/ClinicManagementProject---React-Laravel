import React from 'react';
import { Nav } from 'react-bootstrap';

const DoctorSidebar = ({ currentSection, switchSection }) => {
  const handleNavClick = (sectionId, e) => {
    e.preventDefault();
    switchSection(sectionId);
  };

  const isActive = (sectionId) => currentSection === sectionId;

  return (
    <div
      className="d-flex flex-column text-white vh-100"
      style={{
        width: '250px',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'linear-gradient(to bottom, #28a745, #218838)',
        padding: '20px 10px',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h4 className="fw-bold mb-3">Phòng Khám XYZ</h4>
        <p className="mb-1">Bác sĩ,</p>
        <p className="fw-bold">Trần Thị B</p>
      </div>

      {/* Navigation với Bootstrap Nav */}
      <Nav className="flex-column">
        <Nav.Item className="mb-2">
          <Nav.Link 
            href="#" 
            className={`py-3 px-3 rounded ${isActive('today') ? 'active-nav' : 'inactive-nav'}`}
            onClick={(e) => handleNavClick('today', e)}
          >
            Lịch Khám Hôm Nay
          </Nav.Link>
        </Nav.Item>
        <Nav.Item className="mb-2">
          <Nav.Link 
            href="#" 
            className={`py-3 px-3 rounded ${isActive('schedule') ? 'active-nav' : 'inactive-nav'}`}
            onClick={(e) => handleNavClick('schedule', e)}
          >
            Lịch Làm Việc
          </Nav.Link>
        </Nav.Item>
        <Nav.Item className="mb-2">
          <Nav.Link 
            href="#" 
            className={`py-3 px-3 rounded ${isActive('history') ? 'active-nav' : 'inactive-nav'}`}
            onClick={(e) => handleNavClick('history', e)}
          >
            Lịch Sử Bệnh Nhân
          </Nav.Link>
        </Nav.Item>
        <Nav.Item className="mb-2">
          <Nav.Link 
            href="index.html" 
            className="py-3 px-3 rounded inactive-nav"
          >
            Đăng Xuất
          </Nav.Link>
        </Nav.Item>
      </Nav>
    </div>
  );
};

export default DoctorSidebar;