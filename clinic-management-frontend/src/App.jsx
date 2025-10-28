import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { path } from "./utils/constant";
import LoginPage from "./pages/auth/Login/Login";
import AdminMedicine from "./pages/Admin/AdminMedicine.jsx";
import AdminInventory from "./pages/Admin/AdminInventory.jsx";
import DoctorDashboard from "./pages/Doctors/DoctorDashboard.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import Register from "./pages/auth/Register/Register.jsx";
import AdminRevenueReport from "./pages/Admin/AdminRevenueReport.jsx";
import AdminScheduleManagement from "./pages/Admin/AdminScheduleManagement.jsx";
import AdminUserManagement from "./pages/Admin/AdminUserManagement.jsx";
import AdminSuppliers from "./pages/Admin/AdminSuppliers";
import VerifyEmailPage from "./pages/auth/VerifyEmail/EmailVerification.jsx";
import PatientProfile from "./pages/Patient/PatientProfile.jsx";
import PatientLayout from "./Components/Patient/PatientLayout.jsx";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/revenue-report" element={<AdminRevenueReport />} />
        <Route
          path="/admin/schedule-management"
          element={<AdminScheduleManagement />}
        />
        <Route path="/admin/users" element={<AdminUserManagement />} />
        <Route path="/admin/medicines" element={<AdminMedicine />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/supplier" element={<AdminSuppliers />} />
        <Route path="/" element={<AdminMedicine />} /> {/* Trang mặc địnhs */}
        {/* Patient */}
        <Route path={path.PATIENT.ROOT} element={<PatientLayout />}>
          <Route
            path={path.PATIENT.PROFILE.MANAGEMENT}
            element={<PatientProfile />}
          />
          {/* <Route path={path.PATIENT.BOOKING} element={<PatientBooking />} />
          <Route path={path.PATIENT.HISTORY} element={<PatientHistory />} /> */}
        </Route>
        <Route path={path.LOGIN} element={<LoginPage />} />{" "}
        <Route path={path.REGISTER} element={<Register />} />{" "}
        <Route
          path={path.VERIFICATION_EMAIL}
          element={<VerifyEmailPage />}
        ></Route>
        {/* Trang mặc định */}
        <Route path="/doctor" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
