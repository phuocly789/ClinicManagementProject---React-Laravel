import './AdminDashboard.css';
import { useEffect, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import instance from '../../../axios';
// import Loading from '../../../Components/Loading/Loading';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import Loading from '../../../Components/Loading/Loading';
Chart.register(...registerables);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalRevenue: 125000000,
        completedAppointments: 120,
        pendingInvoices: 8,
        totalAppointments: 150,
    });

    const [lowStockMedicines, setLowStockMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);


    useEffect(() => {
        const fetchLowStockMedicines = async () => {
            try {
                const response = await instance.get('/medicines/low-stock');
                setLowStockMedicines(response.data);
                // setToast({ type: "success", message: "Tải dữ liệu thành công" })
            } catch (error) {
                console.error("Lỗi khi tải thuốc:", error);
                setToast({ type: "error", message: "Không thể tải danh sách thuốc!" });
            } finally {
                setLoading(false);
            }
        };
        fetchLowStockMedicines();
    }, []);



    useEffect(() => {
        const ctx = document.getElementById("revenueChart");
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ["10/10", "11/10", "12/10", "13/10", "14/10", "15/10", "16/10"],
                datasets: [
                    {
                        label: "Doanh thu (VND)",
                        data: [15000000, 18000000, 12000000, 25000000, 20000000, 30000000, 28000000],
                        borderColor: "#007bff",
                        backgroundColor: "rgba(0,123,255,0.1)",
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        return () => chart.destroy();
    }, []);

    return (
        <div style={{ display: 'flex', margin: 0, backgroundColor: '#f8f9fa' }}>
            <AdminSidebar />
            <div className="dashboard-container" style={{ position: 'relative', width: '100%', flexGrow: 1, marginLeft: '5px', padding: '30px' }}>
                <header className="dashboard-header">
                    <h1>Dashboard Tổng Quan</h1>
                    <div className='date-range-picker'>
                        <label htmlFor="startDate">Từ Ngày:</label>
                        <input type="date" />
                        <label htmlFor="endDate">Đến Ngày:</label>
                        <input type="date" />
                        <button className='btn-success' disabled={setLoading}>Lọc</button>
                    </div>
                
                </header>
<hr />
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
                        <div class="card-header">
                            <h3>Biểu Đồ Doanh Thu</h3>
                        </div>
                        <canvas id="revenueChart"></canvas>
                    </div>

                    <div className="inventory-container card">
                        <div class="card-header">
                            <h3>Cảnh Báo Tồn Kho (Dưới 100)</h3>
                        </div>
                        <div class="card-body">
                            {(lowStockMedicines == null) &&
                                <p>Đang tải...</p>
                            }
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Tên Thuốc</th>
                                        <th class="text-end">Số Lượng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && <tr><Loading  isLoading={loading}/></tr>}
                                    {!loading && (
                                        lowStockMedicines.length === 0 ? (
                                            <tr>
                                                <td colSpan="2" className="text-center text-muted">
                                                    Không có thuốc nào sắp hết hàng.
                                                </td>
                                            </tr>
                                        ) : (
                                            lowStockMedicines.map((med) => (
                                                <tr key={med.MedicineId}>
                                                    <td>{med.MedicineName}</td>
                                                    <td className={`text-end ${med.StockQuantity < 200 ? "text-danger" : ""}`}>
                                                        {med.StockQuantity} {med.Unit}
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                    )}

                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {toast && (
                    <CustomToast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(null)} />
                )}
            </div>
        </div>

    );
};

export default AdminDashboard;
