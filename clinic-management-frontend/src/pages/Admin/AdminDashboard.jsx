import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import instance from '../../axios';
import Loading from '../../Components/Loading/Loading';
import CustomToast from '../../Components/CustomToast/CustomToast';
import {
    BiSolidDollarCircle,
    BiSolidCalendar,
    BiSolidUserCheck,
    BiSolidTimeFive,
    BiTrendingUp,
    BiPackage,
    BiCalendar,
    BiStats
} from 'react-icons/bi';
import echo from '../../config/echo';
import '../../App.css';

// Component con cho thẻ thống kê - GIỮ NGUYÊN
const StatCard = ({ icon, label, value, color, trend }) => (
    <div className={`stat-card card border-0 h-100 stat-card--${color}`}>
        <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div className={`stat-card__icon d-flex align-items-center justify-content-center`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`trend-indicator ${trend > 0 ? 'text-success' : 'text-danger'}`}>
                        <BiTrendingUp className={trend > 0 ? '' : 'rotate-180'} />
                        <small>{Math.abs(trend)}%</small>
                    </div>
                )}
            </div>
            <div className="d-flex flex-column">
                <small className="text-muted opacity-75 fw-medium">{label}</small>
                <span className="h4 fw-bold mb-0 text-dark">{value}</span>
            </div>
        </div>
    </div>
);

// Component Realtime Stats - COMPACT
const RealtimeStats = ({ realtimeData }) => {
    if (!realtimeData) return null;

    return (
        <div className="realtime-dashboard compact mb-3">
            <div className="dashboard-header compact-header">
                <h3 className="dashboard-title compact-title">
                    <BiTrendingUp className="me-2 text-primary" />
                    Hôm Nay - Realtime
                </h3>
                <div className="last-updated compact-updated">
                    <small className="text-muted">
                        Cập nhật: {new Date(realtimeData.updated_at).toLocaleTimeString('vi-VN')}
                    </small>
                </div>
            </div>

            <div className="stats-grid compact-grid">
                {/* Waiting Patients */}
                <div className="stat-card compact-card waiting-patients">
                    <div className="stat-icon compact-icon">
                        <BiSolidUserCheck className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="waiting-patients">
                            {realtimeData.waitingPatients || 0}
                        </div>
                        <div className="stat-label compact-label">Đang chờ</div>
                    </div>
                </div>

                {/* Today Appointments */}
                <div className="stat-card compact-card today-appointments">
                    <div className="stat-icon compact-icon">
                        <BiSolidCalendar className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="today-appointments">
                            {realtimeData.todayAppointments || 0}
                        </div>
                        <div className="stat-label compact-label">Lượt khám</div>
                    </div>
                </div>

                {/* Completed Appointments */}
                <div className="stat-card compact-card completed-appointments">
                    <div className="stat-icon compact-icon">
                        <BiSolidUserCheck className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="completed-appointments">
                            {realtimeData.completedAppointments || 0}
                        </div>
                        <div className="stat-label compact-label">Đã khám</div>
                    </div>
                </div>

                {/* Processing Services */}
                <div className="stat-card compact-card processing-services">
                    <div className="stat-icon compact-icon">
                        <BiSolidTimeFive className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="processing-services">
                            {realtimeData.processingServices || 0}
                        </div>
                        <div className="stat-label compact-label">Dịch vụ</div>
                    </div>
                </div>

                {/* Pending Invoices */}
                <div className="stat-card compact-card pending-invoices">
                    <div className="stat-icon compact-icon">
                        <BiSolidTimeFive className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="pending-invoices">
                            {realtimeData.pendingInvoices || 0}
                        </div>
                        <div className="stat-label compact-label">Hóa đơn chờ</div>
                    </div>
                </div>

                {/* Today Revenue */}
                <div className="stat-card compact-card today-revenue">
                    <div className="stat-icon compact-icon">
                        <BiSolidDollarCircle className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="today-revenue">
                            {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                notation: 'compact',
                                maximumFractionDigits: 0
                            }).format(realtimeData.todayRevenue || 0)}
                        </div>
                        <div className="stat-label compact-label">Doanh thu</div>
                    </div>
                    <div className="stat-badge compact-badge">LIVE</div>
                </div>
            </div>
        </div>
    );
};

// Component Historical Stats - TƯƠNG TỰ REALTIME NHƯNG CHO NHIỀU NGÀY
const HistoricalStats = ({ stats, totalRevenue, dateRange }) => {
    if (!stats || !totalRevenue) return null;

    return (
        <div className="historical-dashboard compact mb-3">
            <div className="dashboard-header compact-header">
                <h3 className="dashboard-title compact-title">
                    <BiCalendar className="me-2 text-info" />
                    Thống Kê Theo Ngày
                </h3>
                <div className="last-updated compact-updated">
                    <small className="text-muted">
                        Khoảng thời gian: {dateRange.startDate} → {dateRange.endDate}
                    </small>
                </div>
            </div>

            <div className="stats-grid compact-grid">
                {/* Total Revenue */}
                <div className="stat-card compact-card total-revenue-historical">
                    <div className="stat-icon compact-icon">
                        <BiSolidDollarCircle className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="total-revenue-historical">
                            {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                notation: 'compact',
                                maximumFractionDigits: 0
                            }).format(totalRevenue?.totalRevenue || 0)}
                        </div>
                        <div className="stat-label compact-label">Tổng doanh thu</div>
                    </div>
                </div>

                {/* Total Appointments */}
                <div className="stat-card compact-card total-appointments">
                    <div className="stat-icon compact-icon">
                        <BiSolidCalendar className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="total-appointments">
                            {stats?.totalAppointmentsToday || 0}
                        </div>
                        <div className="stat-label compact-label">Tổng lịch hẹn</div>
                    </div>
                </div>

                {/* Completed Appointments */}
                <div className="stat-card compact-card completed-appointments-historical">
                    <div className="stat-icon compact-icon">
                        <BiSolidUserCheck className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="completed-appointments-historical">
                            {stats?.completedAppointmentsToday || 0}
                        </div>
                        <div className="stat-label compact-label">Đã khám</div>
                    </div>
                </div>

                {/* Pending Invoices */}
                <div className="stat-card compact-card pending-invoices-historical">
                    <div className="stat-icon compact-icon">
                        <BiSolidTimeFive className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="pending-invoices-historical">
                            {stats?.pendingInvoicesCount || 0}
                        </div>
                        <div className="stat-label compact-label">Hóa đơn chờ</div>
                    </div>
                </div>

                {/* Average Daily Revenue */}
                <div className="stat-card compact-card average-revenue">
                    <div className="stat-icon compact-icon">
                        <BiStats className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="average-revenue">
                            {totalRevenue?.byDate?.length > 0 ?
                                new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                    notation: 'compact',
                                    maximumFractionDigits: 0
                                }).format(totalRevenue.totalRevenue / totalRevenue.byDate.length)
                                : '0'
                            }
                        </div>
                        <div className="stat-label compact-label">Doanh thu TB/ngày</div>
                    </div>
                </div>

                {/* Days Count */}
                <div className="stat-card compact-card days-count">
                    <div className="stat-icon compact-icon">
                        <BiCalendar className="icon" />
                    </div>
                    <div className="stat-content compact-content">
                        <div className="stat-value compact-value" id="days-count">
                            {totalRevenue?.byDate?.length || 0}
                        </div>
                        <div className="stat-label compact-label">Số ngày</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Custom Tooltip cho biểu đồ
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip bg-dark text-white p-3 rounded shadow">
                <p className="mb-1 fw-medium">{`Ngày: ${label}`}</p>
                <p className="mb-0 text-success">
                    {`Doanh thu: ${new Intl.NumberFormat('vi-VN').format(payload[0].value)} VND`}
                </p>
            </div>
        );
    }
    return null;
};

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

    // State mới cho realtime data
    const [realtimeData, setRealtimeData] = useState(null);

    const fetchData = useCallback(async (start, end) => {
        setLoading(true);
        try {
            const [lowStockRes, revenueRes, realtimeRes] = await Promise.all([
                instance.get('api/medicines/low-stock?threshold=200'),
                instance.get(`api/report-revenue/combined?startDate=${start}&endDate=${end}`),
                instance.get('/api/dashboard/stats') // API realtime - HÔM NAY
            ]);

            // XỬ LÝ HISTORICAL DATA (nhiều ngày)
            if (revenueRes.data) {
                setStats({
                    totalAppointmentsToday: revenueRes.data.totalAppointmentsToday,
                    completedAppointmentsToday: revenueRes.data.completedAppointmentsToday,
                    pendingInvoicesCount: revenueRes.data.pendingInvoicesCount,
                });
                setTotalRevenue({
                    totalRevenue: revenueRes.data.totalRevenue,
                    byDate: revenueRes.data.revenueByDate,
                });
            }

            // XỬ LÝ REALTIME DATA (hôm nay)
            setRealtimeData(realtimeRes);
            setLowStockMedicines(lowStockRes.data || []);

        } catch (error) {
            setToast({ type: 'error', message: error.message || 'Không thể tải dữ liệu dashboard!' });
        } finally {
            setLoading(false);
        }
    }, []);

    // Realtime effect - tự động update mỗi 10 giây
    useEffect(() => {
        const fetchRealtimeData = async () => {
            try {
                const realtimeRes = await instance.get('/api/dashboard/stats');
                setRealtimeData(realtimeRes);
            } catch (error) {
                console.error('Error fetching realtime data:', error);
            }
        };

        // Fetch ngay lập tức
        fetchRealtimeData();

        // Setup interval mỗi 10 giây
        const interval = setInterval(fetchRealtimeData, 10000);

        // Listen for realtime events (nếu có broadcast)
        echo.channel('dashboard-stats')
            .listen('.DashboardStatsUpdated', (e) => {
                setRealtimeData(e.stats);
                animateNumbers(e.stats);
            });

        return () => {
            clearInterval(interval);
            echo.leaveChannel('dashboard-stats');
        };
    }, []);

    const animateNumbers = (newStats) => {
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            card.classList.add('stat-updating');
            setTimeout(() => {
                card.classList.remove('stat-updating');
            }, 1000);
        });
    };

    useEffect(() => {
        fetchData(startDate, endDate);
    }, [fetchData, startDate, endDate]);

    // Format data cho Recharts (từ historical data)
    const chartData = useMemo(() => {
        return totalRevenue?.byDate?.map((item) => ({
            date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            revenue: item.revenue,
            fullDate: new Date(item.date).toLocaleDateString('vi-VN')
        })) || [];
    }, [totalRevenue]);

    const handleFilter = () => {
        if (new Date(startDate) > new Date(endDate)) {
            setToast({ type: 'error', message: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc' });
            return;
        }
        fetchData(startDate, endDate);
    };

    return (
        // THAY ĐỔI: Không cố định chiều cao, cho phép scroll
        <main className="main-content flex-grow-1 p-4 d-flex flex-column min-vh-100 ">
            {toast && (
                <CustomToast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header */}
            <header className="d-flex justify-content-between align-items-start flex-shrink-0 pb-3 border-bottom flex-wrap gap-3">
                <div>
                    <h1 className="h3 mb-1 fw-bold text-dark">Dashboard Tổng Quan</h1>
                    <p className="text-muted mb-0">Theo dõi hiệu suất và thống kê hệ thống</p>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-2" style={{ maxWidth: '100%' }}>
                    <div className="d-flex align-items-center gap-2 bg-light rounded p-2">
                        <label className="form-label mb-0 text-muted small">Từ:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm border-0 bg-transparent"
                            style={{ width: '130px' }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="d-flex align-items-center gap-2 bg-light rounded p-2">
                        <label className="form-label mb-0 text-muted small">Đến:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm border-0 bg-transparent"
                            style={{ width: '130px' }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-sm px-3 d-flex align-items-center gap-2"
                        disabled={loading}
                        onClick={handleFilter}
                    >
                        <BiTrendingUp size={16} />
                        Áp dụng
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                    <Loading isLoading={loading} />
                </div>
            ) : (
                    <div className="flex-grow-1 d-flex flex-column" style={{ gap: '1.5rem', overflowX: 'hidden' }}>
                    {/* Realtime Stats Section - HÔM NAY */}
                    <RealtimeStats realtimeData={realtimeData} />

                    {/* Historical Stats Section - THEO NGÀY */}
                    <HistoricalStats
                        stats={stats}
                        totalRevenue={totalRevenue}
                        dateRange={{ startDate, endDate }}
                    />

                    {/* Dashboard Grid */}
                    <div className="row g-4">
                        {/* Biểu đồ doanh thu - HISTORICAL */}
                        <div className="col-xl-8">
                            <div className="card shadow-sm border-0 h-100">
                                <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                                    <h5 className="mb-0 fw-bold text-dark">
                                        <BiTrendingUp className="me-2 text-primary" />
                                        Biểu Đồ Doanh Thu (Theo Ngày)
                                    </h5>
                                    <span className="badge bg-primary bg-opacity-10 text-primary">
                                        {startDate} → {endDate}
                                    </span>
                                </div>
                                <div className="card-body p-3">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#0d6efd" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#6c757d"
                                                fontSize={12}
                                            />
                                            <YAxis
                                                stroke="#6c757d"
                                                fontSize={12}
                                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#0d6efd"
                                                fillOpacity={1}
                                                fill="url(#colorRevenue)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Cảnh báo tồn kho */}
                        <div className="col-xl-4">
                            <div className="card shadow-sm border-0 h-100">
                                <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                                    <h5 className="mb-0 fw-bold text-dark">
                                        <BiPackage className="me-2 text-warning" />
                                        Cảnh Báo Tồn Kho
                                    </h5>
                                    <span className="badge bg-warning bg-opacity-10 text-warning">
                                        Dưới 200
                                    </span>
                                </div>
                                <div className="card-body p-0">
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <table className="table table-hover mb-0">
                                            <thead className="table-light sticky-top">
                                                <tr>
                                                    <th className="px-4 py-3 border-0 fw-medium text-muted">Tên Thuốc</th>
                                                    <th className="text-end px-4 py-3 border-0 fw-medium text-muted">Hiện có</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lowStockMedicines.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="2" className="text-center p-5 text-muted">
                                                            <BiPackage size={32} className="mb-2 opacity-50" />
                                                            <p className="mb-0 fw-medium">Tồn kho an toàn</p>
                                                            <small className="text-muted">Tất cả thuốc đều đủ số lượng</small>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    lowStockMedicines.map((med) => (
                                                        <tr key={med.MedicineId} className="border-bottom">
                                                            <td className="px-4 py-3">
                                                                <div className="d-flex align-items-center">
                                                                    <div className="bg-warning bg-opacity-10 rounded p-2 me-3">
                                                                        <BiPackage size={16} className="text-warning" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="fw-medium text-dark">{med.MedicineName}</span>
                                                                        <small className="d-block text-muted">{med.MedicineType}</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-end px-4 py-3">
                                                                <span className="fw-bold text-danger">{med.StockQuantity}</span>
                                                                <small className="text-muted ms-1">{med.Unit}</small>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminDashboard;