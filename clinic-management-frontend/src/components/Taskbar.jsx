import React from 'react';
import { Nav } from 'react-bootstrap';

const AdminSidebar = () => {
  return (
    <div
      className="d-flex flex-column text-white vh-100"
      style={{
        width: '250px',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'linear-gradient(to bottom, #003087, #0056b3)',
        padding: '20px 10px',
        overflowY: 'auto',
      }}
    >
      <div className="text-center mb-4">
        <h4 className="fw-bold">Admin Panel</h4>
        <p className="mb-1">Xin chào, Admin</p>
        <p>Xin chào Admin</p>
      </div>
      <Nav className="flex-column">
        <Nav.Link href="#" className="text-white py-2 px-3 mb-2 rounded-0" style={{ background: 'rgba(255, 255, 255, 0)', transition: 'background 0.3s' }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0)')}>
          Dashboard (Thống kê)
        </Nav.Link>
        <Nav.Link href="#" className="text-white py-2 px-3 mb-2 rounded-0" style={{ background: 'rgba(255, 255, 255, 0)', transition: 'background 0.3s' }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0)')}>
          Quản Lý Người Dùng
        </Nav.Link>
        <Nav.Link href="#" className="text-white py-2 px-3 mb-2 rounded-0" style={{ background: 'rgba(255, 255, 255, 0)', transition: 'background 0.3s' }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0)')}>
          Quản Lý Dịch Vụ
        </Nav.Link>
        <Nav.Link href="#" className="text-white py-2 px-3 mb-2 rounded-0" style={{ background: '#0056b3', transition: 'background 0.3s' }}
          onMouseLeave={(e) => (e.target.style.background = '#0056b3')}>
          Quản Lý Thuốc
        </Nav.Link>
        <Nav.Link href="#" className="text-white py-2 px-3 mb-2 rounded-0" style={{ background: 'rgba(255, 255, 255, 0)', transition: 'background 0.3s' }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0)')}>
          Quản Lý Kho
        </Nav.Link>
        <Nav.Link href="#" className="text-white py-2 px-3 mb-2 rounded-0" style={{ background: 'rgba(255, 255, 255, 0)', transition: 'background 0.3s' }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0)')}>
          Quản Lý Nhà Cung Cấp
        </Nav.Link>
        <Nav.Link href="#" className="text-white py-2 px-3 mb-2 rounded-0" style={{ background: 'rgba(255, 255, 255, 0)', transition: 'background 0.3s' }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0)')}>
          Đăng Xuất
        </Nav.Link>
      </Nav>
    </div>
  );
};

export default AdminSidebar;