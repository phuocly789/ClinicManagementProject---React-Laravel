import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import instance from '../../axios';
import Loading from '../../Components/Loading/Loading';
import CustomToast from '../../Components/CustomToast/CustomToast';
import { BiSolidDollarCircle, BiSolidCalendar, BiSolidUserCheck, BiSolidTimeFive } from 'react-icons/bi';
Chart.register(...registerables, ChartDataLabels);
import '../../App.css';
// Component con cho thẻ thống kê
const StatCard = ({ icon, label, value, color }) => (
    <div className="stat-card card shadow-sm border-0 h-100">
        <div className="card-body d-flex align-items-center gap-3 p-3">
            <div className={`stat-card__icon stat-card--${color} d-flex align-items-center justify-content-center flex-shrink-0`}>
                {icon}
            </div>
            <div className="d-flex flex-column">
                <small className="text-muted">{label}</small>
                <span className="h5 fw-bold mb-0">{value}</span>
            </div>
        </div>
    </div>
);

const AdminDashboard = () => {
    // ... (Toàn bộ logic state và các hàm không thay đổi)
    const [stats, setStats] = useState(null);
    const [totalRevenue, setTotalRevenue] = useState(null);
    const [lowStockMedicines, setLowStockMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [startDate, setStartDate] = useState(
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
            } else { throw new Error(revenueRes.message || 'Lỗi khi lấy dữ liệu doanh thu'); }
            setLowStockMedicines(lowStockRes.data || []);
        } catch (error) {
            setToast({ type: 'error', message: error.message || 'Không thể tải dữ liệu dashboard!' });
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(startDate, endDate); }, [fetchData, startDate, endDate]);

    const chartData = useMemo(() => ({
        labels: totalRevenue?.byDate?.map((item) => new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })) || [],
        datasets: [{
            label: 'Doanh thu',
            data: totalRevenue?.byDate?.map((item) => item.revenue) || [],
            backgroundColor: 'rgba(59, 113, 202, 0.6)',
            borderColor: 'rgba(59, 113, 202, 1)',
            borderWidth: 1, borderRadius: 4,
        }],
    }), [totalRevenue]);

    useEffect(() => {
        let chartInstance = null;
        const ctx = document.getElementById('revenueChart');
        if (ctx && totalRevenue) {
            chartInstance = new Chart(ctx, {
                type: 'bar', data: chartData,
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { callback: value => new Intl.NumberFormat('vi-VN').format(value) } } },
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: context => `${context.dataset.label}: ${new Intl.NumberFormat('vi-VN').format(context.raw)} VND` } },
                        datalabels: { display: false },
                    },
                },
            });
        }
        return () => {
            if (chartInstance) {
                chartInstance.destroy();
            }
        };
    }, [chartData, totalRevenue]);

    const handleFilter = () => {
        if (new Date(startDate) > new Date(endDate)) {
            setToast({ type: 'error', message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc' });
            return;
        }
        fetchData(startDate, endDate);
    };

    return (
        <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
            {/* Thẻ main-content đã có height: 100vh và d-flex flex-column từ CSS */}

            {toast && (
                <CustomToast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header */}
            <header className="d-flex justify-content-between align-items-center flex-shrink-0">
                <h1 className="h4 mb-0 fw-bold">Dashboard Tổng Quan</h1>
                <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 text-muted">Từ:</label>
                    <input type="date" className="form-control" style={{ width: 'auto' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />

                    <label className="form-label mb-0 text-muted">Đến:</label>
                    <input type="date" className="form-control" style={{ width: 'auto' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />

                    <button className="btn btn-primary" disabled={loading} onClick={handleFilter}>
                        Áp dụng
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <Loading isLoading={loading} />
                </div>
            ) : (
                <>
                    {/* Stat cards */}
                    <div className="stat-cards-grid flex-shrink-0">
                        <StatCard icon={<BiSolidDollarCircle />} label="Tổng Doanh Thu" value={totalRevenue?.totalRevenue ? `${totalRevenue.totalRevenue.toLocaleString('vi-VN')} đ` : '0 đ'} color="blue" />
                        <StatCard icon={<BiSolidCalendar />} label="Lịch Hẹn Hôm Nay" value={stats?.totalAppointmentsToday || 0} color="sky" />
                        <StatCard icon={<BiSolidUserCheck />} label="Lịch Hẹn Đã Khám" value={stats?.completedAppointmentsToday || 0} color="green" />
                        <StatCard icon={<BiSolidTimeFive />} label="Hóa Đơn Chờ" value={stats?.pendingInvoicesCount || 0} color="orange" />
                    </div>

                    {/* Dashboard */}
                    <div className="dashboard-grid">
                        <div className="card shadow-sm border-0 d-flex flex-column">
                            <div className="card-header bg-transparent border-0">
                                <h3 className="h6 mb-0">Biểu Đồ Doanh Thu</h3>
                            </div>
                            <div className="card-body flex-grow-1 p-3">
                                <canvas id="revenueChart"></canvas>
                            </div>
                        </div>

                        <div className="card shadow-sm border-0 table-panel">
                            <div className="card-header bg-transparent border-0">
                                <h3 className="h6 mb-0">Cảnh Báo Tồn Kho (Dưới 200)</h3>
                            </div>
                            <div className="table-responsive-container">
                                <table className="table table-hover table-striped clinic-table mb-0">
                                    <thead>
                                        <tr>
                                            <th className="px-3">Tên Thuốc</th>
                                            <th className="text-end px-3">Hiện có</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStockMedicines.length === 0 ? (
                                            <tr><td colSpan="2" className="text-center p-4 text-muted">Tồn kho an toàn</td></tr>
                                        ) : (
                                            lowStockMedicines.map((med) => (
                                                <tr key={med.MedicineId}>
                                                    <td className="px-3">{med.MedicineName}</td>
                                                    <td className="text-end px-3 fw-bold text-danger">{med.StockQuantity} {med.Unit}</td>
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
    );

};

export default AdminDashboard;