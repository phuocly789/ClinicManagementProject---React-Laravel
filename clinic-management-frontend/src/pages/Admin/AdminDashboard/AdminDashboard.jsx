import './AdminDashboard.css';
import { useEffect, useState } from 'react';
// import { Chart, registerables } from 'chart.js';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';

// Chart.register(...registerables);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalRevenue: 125000000,
        completedAppointments: 120,
        pendingInvoices: 8,
        totalAppointments: 150,
    });

    const [lowStockMedicines] = useState([
        { id: 1, name: "Paracetamol 500mg", quantity: 120, unit: "viên" },
        { id: 2, name: "Vitamin C 1000mg", quantity: 80, unit: "viên" },
        { id: 3, name: "Amoxicillin 500mg", quantity: 60, unit: "viên" },
    ]);

    // useEffect(() => {
    //     const ctx = document.getElementById("revenueChart");
    //     if (!ctx) return;

    //     const chart = new Chart(ctx, {
    //         type: 'line',
    //         data: {
    //             labels: ["10/10", "11/10", "12/10", "13/10", "14/10", "15/10", "16/10"],
    //             datasets: [
    //                 {
    //                     label: "Doanh thu (VND)",
    //                     data: [15000000, 18000000, 12000000, 25000000, 20000000, 30000000, 28000000],
    //                     borderColor: "#007bff",
    //                     backgroundColor: "rgba(0,123,255,0.1)",
    //                     fill: true,
    //                     tension: 0.3
    //                 }
    //             ]
    //         },
    //         options: {
    //             responsive: true,
    //             plugins: {
    //                 legend: { display: false },
    //             },
    //             scales: {
    //                 y: { beginAtZero: true }
    //             }
    //         }
    //     });

    //     return () => chart.destroy();
    // }, []);

    return (
        <div style={{ display: 'flex', margin: 0, backgroundColor: '#f8f9fa' }}>
            <AdminSidebar />
            <div className="dashboard-container" style={{ position: 'relative', width: '100%', flexGrow: 1, marginLeft: '5px', padding: '30px' }}>
                <header className="dashboard-header">
                    <h1>Dashboard Tổng Quan (React)</h1>
                </header>

                <div className="stat-cards">
                    <div className="stat-card bg-primary">
                        <i className="fa-solid fa-sack-dollar"></i>
                        <div>
                            <h5>Doanh Thu</h5>
                            <p>{stats.totalRevenue.toLocaleString()} VND</p>
                        </div>
                    </div>

                    <div className="stat-card bg-success">
                        <i className="fa-solid fa-user-check"></i>
                        <div>
                            <h5>Đã Khám</h5>
                            <p>{stats.completedAppointments}</p>
                        </div>
                    </div>

                    <div className="stat-card bg-danger">
                        <i className="fa-solid fa-file-invoice-dollar"></i>
                        <div>
                            <h5>Hóa Đơn Chờ</h5>
                            <p>{stats.pendingInvoices}</p>
                        </div>
                    </div>

                    <div className="stat-card bg-info">
                        <i className="fa-solid fa-calendar-check"></i>
                        <div>
                            <h5>Lịch Hẹn</h5>
                            <p>{stats.totalAppointments}</p>
                        </div>
                    </div>
                </div>

                <div className="dashboard-row">
                    <div className="chart-container card">
                        <h3>Biểu Đồ Doanh Thu</h3>
                        {/* <canvas id="revenueChart"></canvas> */}
                    </div>

                    <div className="inventory-container card">
                        <h3>Cảnh Báo Tồn Kho</h3>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tên Thuốc</th>
                                    <th>Số Lượng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockMedicines.map(med => (
                                    <tr key={med.id}>
                                        <td>{med.name}</td>
                                        <td className={med.quantity < 200 ? "text-danger" : ""}>
                                            {med.quantity} {med.unit}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default AdminDashboard;
