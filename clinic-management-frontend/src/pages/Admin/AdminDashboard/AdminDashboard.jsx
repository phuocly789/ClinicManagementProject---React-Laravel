import './AdminDashboard.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import instance from '../../../axios';
import Loading from '../../../Components/Loading/Loading';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import { BiSolidDollarCircle, BiSolidCalendar, BiSolidUserCheck, BiSolidTimeFive } from 'react-icons/bi';
Chart.register(...registerables, ChartDataLabels);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [totalRevenue, setTotalRevenue] = useState(null);
    const [lowStockMedicines, setLowStockMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [startDate, setStartDate] = useState(
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Tải dữ liệu từ các API
    const fetchData = useCallback(async (start, end) => {
        setLoading(true);
        try {
            const [lowStockRes, revenueRes] = await Promise.all([
                instance.get('api/medicines/low-stock?threshold=200'),
                instance.get(`api/report-revenue/combined?startDate=${start}&endDate=${end}`),
            ]);

            if (revenueRes.success) {
                setStats({
                    totalAppointmentsToday: revenueRes.data.totalAppointmentsToday,
                    completedAppointmentsToday: revenueRes.data.completedAppointmentsToday,
                    pendingInvoicesCount: revenueRes.data.pendingInvoicesCount,
                });
                setTotalRevenue({
                    totalRevenue: revenueRes.data.totalRevenue,
                    byDate: revenueRes.data.revenueByDate,
                });
            } else {
                throw new Error(revenueRes.message || 'Lỗi khi lấy dữ liệu doanh thu');
            }

       
                setLowStockMedicines(lowStockRes.data || []);
            

        } catch (error) {
            setToast({ type: 'error', message: error.message || 'Không thể tải dữ liệu dashboard!' });
        } finally {
            setLoading(false);
        }
    }, []);

    // Tải dữ liệu lần đầu
    useEffect(() => {
        fetchData(startDate, endDate);
    }, []);

    // Chuẩn bị dữ liệu cho biểu đồ
    const chartData = useMemo(() => ({
        labels: totalRevenue?.byDate?.map((item) => new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })) || [],
        datasets: [{
            label: 'Doanh thu',
            data: totalRevenue?.byDate?.map((item) => item.revenue) || [],
            backgroundColor: 'rgba(59, 113, 202, 0.6)',
            borderColor: 'rgba(59, 113, 202, 1)',
            borderWidth: 1,
            borderRadius: 4,
        }],
    }), [totalRevenue]);

    // Render biểu đồ
    useEffect(() => {
        const ctx = document.getElementById('revenueChart');
        if (!ctx || !totalRevenue) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => new Intl.NumberFormat('vi-VN').format(value) } },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: context => `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(context.raw)} VND` } },
                    datalabels: { display: false }, // Tắt label trên cột cho gọn
                },
            },
        });
        return () => chart.destroy();
    }, [chartData]);

    const handleFilter = () => {
        if (new Date(startDate) > new Date(endDate)) {
            setToast({ type: 'error', message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc' });
            return;
        }
        fetchData(startDate, endDate);
    };

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <header className="page-header">
                    <h1>Dashboard Tổng Quan</h1>
                    <div className="date-filter">
                        <label htmlFor="startDate">Từ:</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <label htmlFor="endDate">Đến:</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        <button className="btn btn-primary" disabled={loading} onClick={handleFilter}>
                            Áp dụng
                        </button>
                    </div>
                </header>

                {toast && <CustomToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

                {loading ? <Loading isLoading={loading} /> : (
                    <>
                        <div className="stat-cards-grid">
                            <StatCard
                                icon={<BiSolidDollarCircle />}
                                label="Tổng Doanh Thu"
                                value={totalRevenue?.totalRevenue ? `${totalRevenue.totalRevenue.toLocaleString('vi-VN')} VND` : '0 VND'}
                                color="blue"
                            />
                            <StatCard
                                icon={<BiSolidCalendar />}
                                label="Lịch Hẹn Hôm Nay"
                                value={stats?.totalAppointmentsToday || 0}
                                color="sky"
                            />
                            <StatCard
                                icon={<BiSolidUserCheck />}
                                label="Lịch Hẹn Đã Khám"
                                value={stats?.completedAppointmentsToday || 0}
                                color="green"
                            />
                            <StatCard
                                icon={<BiSolidTimeFive />}
                                label="Hóa Đơn Chờ"
                                value={stats?.pendingInvoicesCount || 0}
                                color="orange"
                            />
                        </div>

                        <div className="dashboard-grid">
                            <div className="card-style chart-container">
                                <div className="card-header">
                                    <h3>Biểu Đồ Doanh Thu</h3>
                                </div>
                                <div className="card-body">
                                    <canvas id="revenueChart"></canvas>
                                </div>
                            </div>
                            <div className="card-style inventory-container">
                                <div className="card-header">
                                    <h3>Cảnh Báo Tồn Kho (Dưới 200)</h3>
                                </div>
                                <div className="table-responsive">
                                    <table className="clinic-table">
                                        <thead>
                                            <tr>
                                                <th>Tên Thuốc</th>
                                                <th className="text-end">Hiện có</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lowStockMedicines.length === 0 ? (
                                                <tr><td colSpan="2" className="no-data">Tồn kho an toàn</td></tr>
                                            ) : (
                                                lowStockMedicines.map((med) => (
                                                    <tr key={med.MedicineId}>
                                                        <td>{med.MedicineName}</td>
                                                        <td className="text-end fw-bold text-danger">
                                                            {med.StockQuantity} {med.Unit}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// Component con cho thẻ thống kê, giúp code chính gọn hơn
const StatCard = ({ icon, label, value, color }) => (
    <div className="stat-card">
        <div className={`stat-card__icon stat-card--${color}`}>
            {icon}
        </div>
        <div className="stat-card__info">
            <span className="label">{label}</span>
            <span className="value">{value}</span>
        </div>
    </div>
);


export default AdminDashboard;