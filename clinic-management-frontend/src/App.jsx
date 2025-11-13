import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { path, USER_ROLE } from "./utils/constant";
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
import PDFEditorPage from "./pages/Doctors/PrintsPDF/PDFPreviewEditor.jsx";
import TechnicianSidebar from "./Components/Sidebar/TechnicianSidebar.jsx";
import TechSchedule from "./pages/Technician/TechSchedule.jsx";
import TechnicianDashboard from "./pages/Technician/TechnicianDashboard.jsx";
import DoctorSchedule from "./pages/Doctors/DoctorSchedule.jsx";
import HistorySection from "./pages/Doctors/HistorySection.jsx";
import TodaySection from "./pages/Doctors/TodaySection.jsx";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute.jsx";
import PatientManagement from "./pages/Patient/PatientManagement.jsx";
import AdminServiceManagement from "./pages/Admin/AdminServiceManagement.jsx";
import PaymentSection from "./pages/Payment/PaymentSection.jsx";
import PaymentResult from "./pages/Payment/PaymentResult.jsx";
function App() {
  return (
    <Routes>
      {/* Home */}
      <Route path={path.HOME} element={<Home />} />
      {/* Admin */}
      <Route path={path.ADMIN.ROOT} element={<AdminSidebar />}>
        <Route path={path.ADMIN.DASHBOARD} element={<AdminDashboard />} />
        <Route
          path={path.ADMIN.REVENUE_REPORT}
          element={<AdminRevenueReport />}
        />
        <Route
          path={path.ADMIN.USER.MANAGEMENT}
          element={<AdminUserManagement />}
        />
        <Route
          path={path.ADMIN.SERVICE.MANAGEMENT}
          element={<AdminServiceManagement />}
        />
        <Route
          path={path.ADMIN.MEDICINE.MANAGEMENT}
          element={<AdminMedicine />}
        />
        <Route path={path.ADMIN.INVENTORY} element={<AdminInventory />} />
        <Route
          path={path.ADMIN.SUPPLIERS.MANAGEMENT}
          element={<AdminSuppliers />}
        />
        <Route
          path={path.ADMIN.MEDICINE.MANAGEMENT}
          element={<AdminMedicine />}
        />

        <Route
          path={path.ADMIN.SCHEDULE.MANAGEMENT}
          element={<AdminScheduleManagement />}
        />
      </Route>
      {/* Doctor */}
      <Route path={path.DOCTOR.ROOT} element={<DoctorSidebar />}>
        <Route index element={<DoctorDashboard />} />
        <Route
          path={path.DOCTOR.TODAY_APPOINTMENTS}
          element={<DoctorDashboard />}
        />
        <Route path={path.DOCTOR.SCHEDULE} element={<DoctorSchedule />} />
        <Route
          path={path.DOCTOR.PATIENT_HISTORY}
          element={<HistorySection />}
        />
        <Route
          path={path.DOCTOR.DOCTOR_PRINT_PDF}
          element={<PDFEditorPage />}
        />
      </Route>
      {/* Patient */}
      <Route path={path.PATIENT.ROOT} element={<PatientLayout />}>
        <Route
          path={path.PATIENT.PROFILE.MANAGEMENT}
          element={<PatientProfile />}
        />
        <Route
          path={path.PATIENT.APPOINTMENT.MANAGEMENT}
          element={<PatientManagement />}
        />
      </Route>
      <Route path={path.LOGIN} element={<LoginPage />} />{" "}
      <Route path={path.REGISTER} element={<Register />} />{" "}
      <Route path={path.VERIFICATION_EMAIL} element={<VerifyEmailPage />} />
      {/* Technician */}
      <Route path={path.TECHNICIAN.ROOT} element={<TechnicianSidebar />}>
        <Route index element={<TechSchedule />} />
        <Route path={path.TECHNICIAN.SCHEDULE} element={<TechSchedule />} />
        <Route
          path={path.TECHNICIAN.TEST_RESULTS}
          element={<TechnicianDashboard />}
        />
      </Route>
      {/* Payment */}
      <Route path={path.PayMent.ROOT} element={<PaymentSection />}>
        <Route index element={<PaymentSection />} />
        <Route path={path.PayMent.PAY_RESULT} element={<PaymentResult />} />
      </Route>
    </Routes>
  );
}

export default App;
