<<<<<<< HEAD
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import AdminMedicine from "./pages/AdminMedicine";
import AdminInventory from "./pages/AdminInventory";
import { path } from "./utils/constant";
import LoginPage from "./pages/auth/Login/Login";
import UserManagement from './pages/user/UserManagement.jsx';
=======
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import AdminMedicine from './pages/AdminMedicine';
import AdminInventory from './pages/AdminInventory';
import DoctorDashboard from './pages/DoctorDashboard';
>>>>>>> Thuat/Doctor-Appointment
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/medicine" element={<AdminMedicine />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/" element={<AdminMedicine />} /> {/* Trang mặc định */}
<<<<<<< HEAD
        <Route path={path.LOGIN} element={<LoginPage />} />{" "}
        <Route path="/admin/users" element={<UserManagement />} />


        {/* Trang mặc định */}
=======
        <Route path="/doctor" element={<DoctorDashboard />} />
>>>>>>> Thuat/Doctor-Appointment
      </Routes>
    </BrowserRouter>
  );
}

export default App;
