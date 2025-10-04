import React from 'react';
import { Nav } from 'react-bootstrap';

const AdminSidebar = () => {
  return (
    <div style={{ width: '250px', backgroundColor: '#003087', height: '100vh', padding: '20px' }}>
      <h4 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>Admin Panel</h4>
      <Nav className="flex-column">
        <Nav.Link href="#" style={{ color: 'white' }}>Xin chào, Admin</Nav.Link>
        <Nav.Link href="#" style={{ color: 'white' }}>Dashboard (Thông kê)</Nav.Link>
        <Nav.Link href="#" style={{ color: 'white' }}>Quản Lý Người Dùng</Nav.Link>
        <Nav.Link href="#" style={{ color: 'white' }}>Quản Lý Đích Vụ</Nav.Link>
        <Nav.Link href="#" style={{ color: 'white', backgroundColor: '#0056b3' }}>Quản Lý Thuốc</Nav.Link>
        <Nav.Link href="#" style={{ color: 'white' }}>Quản Lý Kho</Nav.Link>
        <Nav.Link href="#" style={{ color: 'white' }}>Quản Lý Nhà Cung Cấp</Nav.Link>
        <Nav.Link href="#" style={{ color: 'white' }}>Đăng Xuất</Nav.Link>
      </Nav>
    </div>
  );
};

export default AdminSidebar;