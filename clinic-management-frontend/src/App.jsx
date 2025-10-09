import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import AdminMedicine from './pages/AdminMedicine';
import AdminInventory from './pages/AdminInventory';
import DoctorDashboard from './pages/DoctorDashboard';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/quan-ly-thuoc" element={<AdminMedicine />} />
        <Route path="/quan-ly-kho" element={<AdminInventory />} />
        <Route path="/" element={<AdminMedicine />} /> {/* Trang mặc định */}
        <Route path="/doctor" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;