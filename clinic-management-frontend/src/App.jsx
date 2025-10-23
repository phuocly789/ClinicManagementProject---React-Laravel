import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { path } from "./utils/constant";
import LoginPage from "./pages/auth/Login/Login";
import UserManagement from "./pages/user/UserManagement.jsx";
import AdminMedicine from "./pages/Admin/AdminMedicine.jsx";
import AdminInventory from "./pages/Admin/AdminInventory.jsx";
import DoctorDashboard from "./pages/Doctors/DoctorDashboard.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard/AdminDashboard.jsx";
import Register from "./pages/auth/Register/Register.jsx";
import AdminRevenueReport from "./pages/Admin/AdminRevenueReport/AdminRevenueReport.jsx";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/medicines" element={<AdminMedicine />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/" element={<AdminMedicine />} /> {/* Trang mặc định */}
        <Route path="/admin/revenue-report" element={<AdminRevenueReport />} />

        <Route path="/admin/medicines" element={<AdminMedicine />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/" element={<AdminMedicine />} /> {/* Trang mặc địnhs */}

        <Route path={path.LOGIN} element={<LoginPage />} />{" "}
        <Route path={path.REGISTER} element={<Register />} />{" "}
        <Route path="/admin/users" element={<UserManagement />} />
        {/* Trang mặc định */}
        <Route path="/doctor" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
