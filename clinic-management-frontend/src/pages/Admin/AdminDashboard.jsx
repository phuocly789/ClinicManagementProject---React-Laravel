import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
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
    BiStats,
    BiCapsule,
    BiUserVoice
} from 'react-icons/bi';
import echo from '../../config/echo';
import '../../App.css';

// Component con cho thẻ thống kê
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

// Component Realtime Stats - CHỈ GIỮ LẠI 4 CARD QUAN TRỌNG
const RealtimeStats = ({ realtimeData }) => {
    if (!realtimeData) return null;

    return (
        <div className="realtime-dashboard compact mb-3">
            <div className="dashboard-header compact-header">
                <h3 className="dashboard-title compact-title">
                    <BiTrendingUp className="me-2 text-primary" />
                    Thống Kê Hôm Nay
                </h3>
                <div className="last-updated compact-updated">
                    <small className="text-muted">
                        Cập nhật: {new Date(realtimeData.updated_at).toLocaleTimeString('vi-VN')}
                    </small>
                </div>
            </div>

            <div className="stats-grid compact-grid">
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
                </div>

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
            </div>
        </div>
    );
};

// Component Historical Stats - BÁO CÁO LỌC THEO NGÀY (GIỮ NGUYÊN)
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
                                maximumFractionDigits: 2
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
                                    maximumFractionDigits: 2
                                }).format(totalRevenue.totalRevenue / totalRevenue.byDate.length)
                                : '0'
                            }
                        </div>
                        <div className="stat-label compact-label">Doanh thu TB/ngày</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component Revenue Forecast - DỰ BÁO DOANH THU AI
const RevenueForecast = ({ forecastData }) => {
    if (!forecastData || !forecastData.historical || !forecastData.forecast) {
        return (
            <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold text-dark">
                        <BiTrendingUp className="me-2 text-primary" />
                        Dự Báo Doanh Thu 
                    </h5>
                    <span className="badge bg-primary bg-opacity-10 text-primary">
                        Machine Learning
                    </span>
                </div>
                <div className="card-body d-flex align-items-center justify-content-center">
                    <div className="text-center text-muted">
                        <BiTrendingUp size={48} className="mb-3 opacity-50" />
                        <p>Đang tải dữ liệu dự báo...</p>
                    </div>
                </div>
            </div>
        );
    }

    const chartData = [
        ...forecastData.historical.map((item, index) => ({
            name: `T${index + 1}`,
            revenue: item.revenue,
            type: 'historical',
            fullLabel: `Tháng ${item.month}/${item.year}`
        })),
        {
            name: 'DỰ BÁO',
            revenue: forecastData.forecast.predicted_revenue,
            type: 'forecast',
            fullLabel: `Dự báo tháng tới`
        }
    ];

    const COLORS = {
        historical: '#0d6efd',
        forecast: '#ff6b35'
    };

    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 fw-bold text-dark">
                    <BiTrendingUp className="me-2 text-primary" />
                    Dự Báo Doanh Thu
                </h5>
                <span className="badge bg-primary bg-opacity-10 text-primary">
                    Machine Learning
                </span>
            </div>
            <div className="card-body">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="name"
                            stroke="#6c757d"
                            fontSize={12}
                        />
                        <YAxis
                            stroke="#6c757d"
                            fontSize={12}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                            formatter={(value) => [
                                new Intl.NumberFormat('vi-VN').format(value) + ' VND',
                                'Doanh thu'
                            ]}
                            labelFormatter={(label, items) => {
                                const item = items[0];
                                return item.payload.fullLabel || label;
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey="revenue"
                            name="Doanh thu"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.type === 'forecast' ? COLORS.forecast : COLORS.historical}
                                    stroke={entry.type === 'forecast' ? COLORS.forecast : COLORS.historical}
                                    strokeWidth={entry.type === 'forecast' ? 2 : 1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Thông tin dự báo */}
                <div className="mt-3 p-3 bg-light rounded">
                    <div className="row text-center">
                        <div className="col-6">
                            <small className="text-muted d-block">Doanh thu dự báo</small>
                            <strong className="text-success">
                                {new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND'
                                }).format(forecastData.forecast.predicted_revenue)}
                            </strong>
                        </div>
                        <div className="col-6">
                            <small className="text-muted d-block">Độ tin cậy</small>
                            <strong className="text-info">
                                {(forecastData.forecast.confidence * 100).toFixed(1)}%
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component Prescription Analytics - THỐNG KÊ ĐƠN THUỐC
const PrescriptionAnalytics = ({ analyticsData }) => {
    if (!analyticsData || !analyticsData.success) {
        return (
            <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold text-dark">
                        <BiCapsule className="me-2 text-success" />
                        Phân Tích Đơn Thuốc
                    </h5>
                    <span className="badge bg-success bg-opacity-10 text-success">
                        Analytics
                    </span>
                </div>
                <div className="card-body d-flex align-items-center justify-content-center">
                    <div className="text-center text-muted">
                        <BiCapsule size={48} className="mb-3 opacity-50" />
                        <p>Đang tải dữ liệu phân tích...</p>
                    </div>
                </div>
            </div>
        );
    }

    const { topMedicines, topDoctors, bestSellingMedicines } = analyticsData;

    // Dữ liệu cho biểu đồ top thuốc
    const medicineChartData = topMedicines.slice(0, 5).map(med => ({
        name: med.MedicineName.length > 15 ? med.MedicineName.substring(0, 15) + '...' : med.MedicineName,
        quantity: med.total_quantity,
        fullName: med.MedicineName
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip bg-dark text-white p-3 rounded shadow">
                    <p className="mb-1 fw-medium">{`Thuốc: ${payload[0].payload.fullName}`}</p>
                    <p className="mb-0 text-success">
                        {`Số lượng: ${new Intl.NumberFormat('vi-VN').format(payload[0].value)}`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 fw-bold text-dark">
                    <BiCapsule className="me-2 text-success" />
                    Phân Tích Đơn Thuốc
                </h5>
                <span className="badge bg-success bg-opacity-10 text-success">
                    Analytics
                </span>
            </div>
            <div className="card-body">
                <div className="row">
                    {/* Biểu đồ top thuốc */}
                    <div className="col-md-6 mb-4">
                        <h6 className="fw-bold text-muted mb-3">Top 5 Thuốc Kê Nhiều Nhất</h6>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={medicineChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="quantity"
                                >
                                    {medicineChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top bác sĩ */}
                    <div className="col-md-6 mb-4">
                        <h6 className="fw-bold text-muted mb-3">Top Bác Sĩ Kê Đơn</h6>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {topDoctors.slice(0, 5).map((doctor, index) => (
                                <div key={doctor.StaffId} className="d-flex align-items-center justify-content-between p-2 border-bottom">
                                    <div className="d-flex align-items-center">
                                        <span className="badge bg-primary me-2">{index + 1}</span>
                                        <div>
                                            <div className="fw-medium text-dark small">{doctor.FullName}</div>
                                            <small className="text-muted">{doctor.Specialty}</small>
                                        </div>
                                    </div>
                                    <span className="badge bg-light text-dark">{doctor.prescription_count} đơn</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Thuốc bán chạy */}
                    <div className="col-12">
                        <h6 className="fw-bold text-muted mb-3">Thuốc Bán Chạy Nhất</h6>
                        <div className="table-responsive">
                            <table className="table table-sm table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th className="fw-medium text-muted">Tên thuốc</th>
                                        <th className="fw-medium text-muted text-end">Số lượng bán</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bestSellingMedicines.slice(0, 5).map((medicine, index) => (
                                        <tr key={medicine.MedicineId}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <span className={`badge ${index === 0 ? 'bg-warning' :
                                                            index === 1 ? 'bg-secondary' : 'bg-info'
                                                        } me-2`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="fw-medium text-dark">{medicine.MedicineName}</span>
                                                </div>
                                            </td>
                                            <td className="text-end fw-bold text-primary">
                                                {new Intl.NumberFormat('vi-VN').format(medicine.total_sold)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Custom Tooltip cho biểu đồ doanh thu
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip bg-white text-dark p-3 rounded shadow">
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

    // State mới cho 2 chức năng mới
    const [realtimeData, setRealtimeData] = useState(null);
    const [revenueForecast, setRevenueForecast] = useState(null);
    const [prescriptionAnalytics, setPrescriptionAnalytics] = useState(null);

    const fetchData = useCallback(async (start, end) => {
        setLoading(true);
        try {
            const [lowStockRes, revenueRes, realtimeRes, forecastRes, analyticsRes] = await Promise.all([
                instance.get('api/medicines/low-stock?threshold=200'),
                instance.get(`api/report-revenue/combined?startDate=${start}&endDate=${end}`),
                instance.get('/api/dashboard/stats'),
                // API mới cho 2 chức năng
                instance.get('/api/revenue-forecast'), // Dự báo doanh thu
                instance.get('/api/prescription-analytics') // Phân tích đơn thuốc
            ]);

            // XỬ LÝ HISTORICAL DATA (BÁO CÁO LỌC THEO NGÀY)
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

            // XỬ LÝ REALTIME DATA
            setRealtimeData(realtimeRes.data || realtimeRes);
            setLowStockMedicines(lowStockRes.data || []);

            // XỬ LÝ DỮ LIỆU MỚI
            setRevenueForecast(forecastRes);
            setPrescriptionAnalytics(analyticsRes);

        } catch (error) {
            console.error('Error fetching data:', error);
            setToast({
                type: 'error',
                message: error.response?.data?.message || error.message || 'Không thể tải dữ liệu dashboard!'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Load lần đầu
        const loadInitial = async () => {
            try {
                const res = await instance.get('/api/dashboard/stats');
                setRealtimeData(res.data || res);
            } catch (err) {
                console.error('Error loading initial data:', err);
            }
        };
        loadInitial();

        // Chỉ lắng nghe broadcast - không cần interval nữa
        const channel = echo.channel('dashboard-stats')
            .listen('DashboardStatsUpdated', (e) => {
                console.log('Realtime Dashboard Updated!', e.stats);
                setRealtimeData(e.stats);
            });

        return () => {
            channel.stopListening('DashboardStatsUpdated');
            echo.leaveChannel('dashboard-stats');
        };
    }, []);

    useEffect(() => {
        fetchData(startDate, endDate);
    }, [fetchData, startDate, endDate]);

    // Format data cho Recharts
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
        <main className="main-content flex-grow-1 p-4 d-flex flex-column min-vh-100">
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
                    {/* Realtime Stats Section - CHỈ 4 CARD QUAN TRỌNG */}
                    <RealtimeStats realtimeData={realtimeData} />

                    {/* Historical Stats Section - BÁO CÁO LỌC THEO NGÀY (GIỮ NGUYÊN) */}
                    <HistoricalStats
                        stats={stats}
                        totalRevenue={totalRevenue}
                        dateRange={{ startDate, endDate }}
                    />

                    {/* Dashboard Grid */}
                    <div className="row g-4">
                        {/* Biểu đồ doanh thu lịch sử */}
                        <div className="col-xl-6">
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

                        {/* Dự báo doanh thu AI */}
                        <div className="col-xl-6">
                            <RevenueForecast forecastData={revenueForecast} />
                        </div>

                        {/* Phân tích đơn thuốc */}
                        <div className="col-xl-8">
                            <PrescriptionAnalytics analyticsData={prescriptionAnalytics} />
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
                                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
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