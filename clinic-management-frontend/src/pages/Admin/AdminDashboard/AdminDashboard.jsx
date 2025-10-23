import './AdminDashboard.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import instance from '../../../axios';
import Loading from '../../../Components/Loading/Loading';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
Chart.register(...registerables, ChartDataLabels);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [totalRevenue, setTotalRevenue] = useState(null);
    const [lowStockMedicines, setLowStockMedicines] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [startDate, setStartDate] = useState(
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Gọi API low stock
    const getLowStockMedicines = useCallback(async () => {
        const response = await instance.get('api/medicines/low-stock?threshold=200');
        return response;
    }, []);

    // Gọi API thống kê
    const getRevenueStats = useCallback(async (start, end) => {
        if (!start || !end || new Date(start) > new Date(end)) {
            throw new Error('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
        }
        const response = await instance.get(`api/report-revenue/combined?startDate=${start}&endDate=${end}`);
        return response;
    }, []);

    const fetchData = async () => {
        setLoading(true);
        NProgress.start();
        try {
            NProgress.set(0.3);
            const [lowStockData, revenueData] = await Promise.all([
                getLowStockMedicines(),
                getRevenueStats(startDate, endDate),
            ]);
            console.log('Low Stock Data:', lowStockData); // Debug
            console.log('Revenue Data:', revenueData); // Debug
            NProgress.set(0.8);

            // Kiểm tra success của cả hai API
            const errors = [];
            if (!revenueData.success) {
                errors.push(revenueData.message || 'Lỗi khi lấy thống kê doanh thu');
            }
            if (errors.length > 0) {
                throw new Error(errors.join('; '));
            }

            // Cập nhật state nếu cả hai API thành công
            setLowStockMedicines(lowStockData.data);
            setStats({
                totalAppointmentsToday: revenueData.data.totalAppointmentsToday,
                completedAppointmentsToday: revenueData.data.completedAppointmentsToday,
                pendingInvoicesCount: revenueData.data.pendingInvoicesCount,
            });
            setTotalRevenue({
                totalRevenue: revenueData.data.totalRevenue,
                byDate: revenueData.data.revenueByDate,
            });
        } catch (error) {
            console.error('❌ Lỗi khi tải dữ liệu:', error);
            setToast({
                type: 'error',
                message: error.message || 'Không thể tải dữ liệu!',
            });
        } finally {
            setLoading(false);
            NProgress.done();
        }
    };

    // Tải dữ liệu lần đầu khi component mount
    useEffect(() => {
        if (startDate && endDate && new Date(startDate) <= new Date(endDate)) {
            fetchData();
        } else {
            setLoading(false);
            setToast({
                type: 'error',
                message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
            });
        }
    }, []); // Mảng phụ thuộc rỗng để chỉ gọi một lần khi mount

    const chartData = useMemo(
        () => ({
            labels:
                totalRevenue?.byDate?.map((item) =>
                    new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                ) || [],
            datasets: [
                {
                    label: 'Doanh thu (VNĐ)',
                    data: totalRevenue?.byDate?.map((item) => item.revenue) || [],
                    backgroundColor: 'rgba(23, 162, 184, 0.6)',
                    borderColor: 'rgba(23, 162, 184, 1)',
                    borderWidth: 1,
                },
            ],
        }),
        [totalRevenue]
    );

    // Render chart
    useEffect(() => {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Ngày', font: { size: 14, weight: 'bold' } },
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Doanh thu (VNĐ)', font: { size: 14, weight: 'bold' } },
                        ticks: {
                            callback: function (value) {
                                return new Intl.NumberFormat('vi-VN').format(value);
                            },
                        },
                    },
                },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: function (value) {
                            return new Intl.NumberFormat('vi-VN').format(value);
                        },
                        font: { weight: 'bold', size: 12 },
                        color: '#000',
                    },
                },
            },
        });
        return () => chart.destroy();
    }, [chartData]);

    const handleFilter = async () => {
        if (!startDate || !endDate) {
            setToast({
                type: 'error',
                message: 'Vui lòng chọn ngày hợp lệ!',
            });
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setToast({
                type: 'error',
                message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
            });
            return;
        }
        await fetchData();
    };

    return (
        <div style={{ display: 'flex', margin: 0, backgroundColor: '#f8f9fa', height: '100vh' }}>
            <AdminSidebar />
            <div
                className="dashboard-container"
                style={{ position: 'relative', width: '100%', flexGrow: 1, marginLeft: '5px', padding: '30px' }}
            >
                <header className="dashboard-header">
                    <h1>Dashboard Tổng Quan</h1>
                    <div className="date-range-picker">
                        <label htmlFor="startDate">Từ Ngày:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <label htmlFor="endDate">Đến Ngày:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        <button
                            className="btn-success"
                            disabled={loading || !startDate || !endDate}
                            onClick={handleFilter}
                        >
                            Lọc
                        </button>
                    </div>
                </header>
                <hr />
                {loading ? (
                    <Loading isLoading={loading} />
                ) : (
                    <>
                        {stats && totalRevenue && lowStockMedicines ? (
                            <>
                                <div className="stat-cards">
                                    <div className="stat-card bg-primary">
                                        <i className="fa-solid fa-sack-dollar"></i>
                                        <div>
                                            <h5>Doanh Thu</h5>
                                            <p>
                                                {totalRevenue.totalRevenue
                                                    ? totalRevenue.totalRevenue.toLocaleString('vi-VN') + ' VND'
                                                    : '0 VND'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="stat-card bg-success">
                                        <i className="fa-solid fa-user-check"></i>
                                        <div>
                                            <h5>Đã Khám</h5>
                                            <p>{stats.completedAppointmentsToday || 0}</p>
                                        </div>
                                    </div>
                                    <div className="stat-card bg-danger">
                                        <i className="fa-solid fa-file-invoice-dollar"></i>
                                        <div>
                                            <h5>Hóa Đơn Chờ</h5>
                                            <p>{stats.pendingInvoicesCount || 0}</p>
                                        </div>
                                    </div>
                                    <div className="stat-card bg-info">
                                        <i className="fa-solid fa-calendar-check"></i>
                                        <div>
                                            <h5>Lịch Hẹn Hôm Nay</h5>
                                            <p>{stats.totalAppointmentsToday || 0}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="dashboard-row">
                                    <div className="chart-container card">
                                        <div className="card-header">
                                            <h3>Biểu Đồ Doanh Thu</h3>
                                        </div>
                                        <canvas id="revenueChart"></canvas>
                                    </div>
                                    <div className="inventory-container card">
                                        <div className="card-header">
                                            <h3>Cảnh Báo Tồn Kho (Dưới 200)</h3>
                                        </div>
                                        <div className="card-body">
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Tên Thuốc</th>
                                                        <th className="text-end">Số Lượng</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lowStockMedicines.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="2" className="text-center text-muted">
                                                                Không có thuốc nào sắp hết hàng.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        lowStockMedicines.map((med) => (
                                                            <tr key={med.MedicineId}>
                                                                <td>{med.MedicineName}</td>
                                                                <td
                                                                    className={`text-end ${med.StockQuantity < 200 ? 'text-danger fw-bold' : ''
                                                                        }`}
                                                                >
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
                        ) : (
                            <div className="text-center text-muted">
                                Vui lòng nhấn "Lọc" để tải dữ liệu.
                            </div>
                        )}
                    </>
                )}
                {toast && (
                    <CustomToast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;