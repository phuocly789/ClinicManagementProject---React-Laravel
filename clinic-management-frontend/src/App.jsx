
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
import DoctorDashboard from './pages/Doctors/DoctorDashboard.jsx';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/medicine" element={<AdminMedicine />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/" element={<AdminMedicine />} /> {/* Trang mặc địnhs */}

        <Route path={path.LOGIN} element={<LoginPage />} />{" "}
        <Route path="/admin/users" element={<UserManagement />} />
        {/* Trang mặc định */}
        <Route path="/doctor" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
