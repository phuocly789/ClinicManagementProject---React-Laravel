import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useUser } from "../../context/userContext";
import { path } from "../../utils/constant";

const ReceptionSidebar = () => {
    const { user } = useUser();

    return (
        <div className="d-flex" style={{ minHeight: "100vh" }}>
            {/* SIDEBAR */}
            <div className="sidebar d-flex flex-column shadow-sm">
                <h3 className="text-center fw-bold py-3">Phòng Khám XYZ</h3>

                <div className="text-center border-bottom pb-3 mb-3">
                    <p className="mb-0 small text-muted">Xin chào,</p>
                    <strong>{user?.full_name || "Lễ tân"}</strong>
                </div>

                <nav>
                    <ul className="nav flex-column nav-list">
                        <li>
                            <NavLink to={path.RECEPTIONIST.DASHBOARD} className="nav-item">
                                <i className="fa-solid fa-list-check"></i>
                                Hàng Đợi Khám
                            </NavLink>
                        </li>

                        <li>
                            <NavLink to={path.RECEPTIONIST.PATIENT_MANAGEMENT} className="nav-item">
                                <i className="fa-solid fa-user-check"></i>
                                Tiếp Nhận Bệnh Nhân
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/payment" className="nav-item">
                                <i className="fa-solid fa-id-card"></i>
                                Quản lý thah toán
                            </NavLink>
                        </li>

                        <li className="border-top mt-auto pt-3">
                            <NavLink to="/logout" className="nav-item">
                                <i className="fa-solid fa-right-from-bracket"></i>
                                Đăng Xuất
                            </NavLink>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* CONTENT */}
            <div className="flex-grow-1">
                <Outlet />
            </div>
        </div>
    );
};

export default ReceptionSidebar;
