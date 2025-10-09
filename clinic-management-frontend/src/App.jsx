import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import AdminMedicine from './pages/AdminMedicine';
import AdminInventory from './pages/AdminInventory';
import UserManagement from './pages/user/UserManagement.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/medicine" element={<AdminMedicine />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/" element={<AdminMedicine />} /> {/* Trang mặc định */}
         <Route path="/admin/users" element={<UserManagement />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;