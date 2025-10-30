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
import AdminSidebar from "./Components/Sidebar/AdminSidebar.jsx";
import DoctorSidebar from "./Components/Sidebar/DoctorSidebar.jsx";
import Home from "./pages/Home.jsx";
import PDFEditorPage from './pages/Doctors/PrintsPDF/PDFPreviewEditor.jsx';
import TechnicianDashboard from "./pages/Technician/TechnicianDashboard.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path={path.HOME} element={<Home />} />
        {/* Admin */}
        <Route path={path.ADMIN.ROOT} element={<AdminSidebar />} >
          <Route path={path.ADMIN.DASHBOARD} element={<AdminDashboard />} />
          <Route path={path.ADMIN.REVENUE_REPORT} element={<AdminRevenueReport />} />
          <Route
            path={path.ADMIN.SCHEDULE.MANAGEMENT}
            element={<AdminScheduleManagement />}
          />
          <Route path={path.ADMIN.USER.MANAGEMENT} element={<AdminUserManagement />} />
          <Route path={path.ADMIN.MEDICINE.MANAGEMENT} element={<AdminMedicine />} />
          <Route path={path.ADMIN.INVENTORY} element={<AdminInventory />} />
          <Route path={path.ADMIN.SUPPLIERS.MANAGEMENT} element={<AdminSuppliers />} />
          <Route path={path.ADMIN.MEDICINE.MANAGEMENT} element={<AdminMedicine />} />
        </Route>

        {/* Receptionist */}
        {/* Doctor */ }
        <Route path={path.DOCTOR.ROOT} element={<DoctorSidebar />} />
          <Route path={path.DOCTOR.DASHBOARD} element={<DoctorDashboard />} />
        {/* Technician */ }
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
        />
        {/* Trang mặc định */}
        <Route path="/pdf-editor" element={<PDFEditorPage />} />
        <Route path="/technician" element={<TechnicianDashboard />} />
      </Routes>
    </BrowserRouter >
  );
}

export default App;
