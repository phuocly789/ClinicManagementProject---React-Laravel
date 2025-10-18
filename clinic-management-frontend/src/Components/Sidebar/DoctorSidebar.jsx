import React from "react";
import "./DoctorSidebar.css";

const DoctorSidebar = ({ currentSection, switchSection }) => {
  const handleClick = (sectionId) => {
    switchSection(sectionId);
  };

  return (
    <aside className="doctor-sidebar">
      <h2 className="clinic-name">Phòng Khám XYZ</h2>
      <div className="user-info">
        <p>Xin chào,</p>
        <strong>Bác sĩ Trần Thị B</strong>
      </div>

      <nav className="nav-menu">
        <ul>
          <li
            className={currentSection === "today" ? "active" : ""}
            onClick={() => handleClick("today")}
          >
            <i className="fa-solid fa-calendar-day"></i> Lịch Khám Hôm Nay
          </li>
          <li
            className={currentSection === "schedule" ? "active" : ""}
            onClick={() => handleClick("schedule")}
          >
            <i className="fa-solid fa-clock"></i> Lịch Làm Việc
          </li>
          <li
            className={currentSection === "history" ? "active" : ""}
            onClick={() => handleClick("history")}
          >
            <i className="fa-solid fa-user-clock"></i> Lịch Sử Bệnh Nhân
          </li>
          <li onClick={() => (window.location.href = "/")}>
            <i className="fa-solid fa-right-from-bracket"></i> Đăng Xuất
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default DoctorSidebar;
