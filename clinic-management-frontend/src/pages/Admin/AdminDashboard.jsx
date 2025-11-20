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
    BiPackage
} from 'react-icons/bi';
import '../../App.css';

// Component con cho thẻ thống kê - CẢI THIỆN UI
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
        <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
            {toast && (
                <CustomToast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header - CẢI THIỆN UI */}
            <header className="d-flex justify-content-between align-items-center flex-shrink-0 pb-3 border-bottom">
                <div>
                    <h1 className="h3 mb-1 fw-bold text-dark">Dashboard Tổng Quan</h1>
                    <p className="text-muted mb-0">Theo dõi hiệu suất và thống kê hệ thống</p>
                </div>
                <div className="d-flex align-items-center gap-3">
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
                <>
                    {/* Stat cards - CẢI THIỆN UI */}
                    <div className="row g-3 mb-4">
                        <div className="col-xl-3 col-md-6">
                            <StatCard
                                icon={<BiSolidDollarCircle size={24} />}
                                label="Tổng Doanh Thu"
                                value={totalRevenue?.totalRevenue ? `${totalRevenue.totalRevenue.toLocaleString('vi-VN')} đ` : '0 đ'}
                                color="primary"
                                trend={12.5}
                            />
                        </div>
                        <div className="col-xl-3 col-md-6">
                            <StatCard
                                icon={<BiSolidCalendar size={24} />}
                                label="Lịch Hẹn Hôm Nay"
                                value={stats?.totalAppointmentsToday || 0}
                                color="info"
                                trend={8.3}
                            />
                        </div>
                        <div className="col-xl-3 col-md-6">
                            <StatCard
                                icon={<BiSolidUserCheck size={24} />}
                                label="Lịch Hẹn Đã Khám"
                                value={stats?.completedAppointmentsToday || 0}
                                color="success"
                                trend={15.2}
                            />
                        </div>
                        <div className="col-xl-3 col-md-6">
                            <StatCard
                                icon={<BiSolidTimeFive size={24} />}
                                label="Hóa Đơn Chờ"
                                value={stats?.pendingInvoicesCount || 0}
                                color="warning"
                                trend={-5.7}
                            />
                        </div>
                    </div>

                    {/* Dashboard Grid - CẢI THIỆN UI */}
                    <div className="row g-4">
                        {/* Biểu đồ doanh thu */}
                        <div className="col-xl-8">
                            <div className="card shadow-sm border-0 h-100">
                                <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                                    <h5 className="mb-0 fw-bold text-dark">
                                        <BiTrendingUp className="me-2 text-primary" />
                                        Biểu Đồ Doanh Thu
                                    </h5>
                                    <span className="badge bg-primary bg-opacity-10 text-primary">
                                        {startDate} → {endDate}
                                    </span>
                                </div>
                                <div className="card-body p-4">
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
                                    <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                        <table className="table table-hover mb-0">
                                            <thead className="table-light">
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
                </>
            )}

            {/* Thêm CSS custom */}
            <style jsx>{`
        .stat-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
        }
        
        .stat-card__icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--icon-bg), var(--icon-bg-dark));
          color: white;
        }
        
        .stat-card--primary { --icon-bg: #0d6efd; --icon-bg-dark: #0b5ed7; }
        .stat-card--info { --icon-bg: #0dcaf0; --icon-bg-dark: #0baccc; }
        .stat-card--success { --icon-bg: #198754; --icon-bg-dark: #146c43; }
        .stat-card--warning { --icon-bg: #ffc107; --icon-bg-dark: #e6ac00; }
        
        .trend-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .rotate-180 {
          transform: rotate(180deg);
        }
        
        .custom-tooltip {
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>
        </main>
    );
};

export default AdminDashboard;