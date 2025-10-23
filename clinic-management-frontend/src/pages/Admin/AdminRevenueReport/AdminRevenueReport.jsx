import './AdminRevenueReport.css';
import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import Loading from '../../../Components/Loading/Loading';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import instance from '../../../axios';
import Pagination from '../../../Components/Pagination/Pagination';

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- Status Component ---
const StatusBadge = ({ status }) => {
  let statusClass = '';
  let statusText = status;

  switch (status) {
    case 'Đã thanh toán':
      statusClass = 'status-success';
      statusText = 'Thành Công';
      break;
    case 'Chờ thanh toán':
      statusClass = 'status-pending';
      statusText = 'Chờ Thanh Toán';
      break;
    default:
      statusClass = 'status-cancelled';
      statusText = 'Đã Hủy';
      break;
  }
  return <span className={`status ${statusClass}`}>{statusText}</span>;
};

const AdminRevenueReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentDetail, setCurrentDetail] = useState(null);

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const fetchInvoices = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        pageSize,
        search: searchQuery,
        startDate,
        endDate,
      });
      const response = await instance.get(`api/report-revenue/detail-revenue?${params.toString()}`);
      if (response.success && response.data) {
        setInvoices(response.data.items || []);
        setTotalItems(response.data.totalItems || 0);
      } else {
        setToast({ type: 'error', message: response.message || 'Không thể tải danh sách hóa đơn' });
      }
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Lỗi khi tải hóa đơn' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, pageSize, startDate, endDate]);

  useEffect(() => {
    fetchInvoices(1);
  }, []); // Chỉ gọi lần đầu

  const handleFilterAction = () => {
    if (new Date(startDate) > new Date(endDate)) {
      setToast({ type: 'error', message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc' });
      return;
    }
    setCurrentPage(1);
    fetchInvoices(1);
  };

  const handleKeyDown = (e) => e.key === 'Enter' && handleFilterAction();
  const handlePageChange = ({ selected }) => {
    const newPage = selected + 1;
    setCurrentPage(newPage);
    fetchInvoices(newPage);
  };

  const exportToCsv = () => {
    // Logic xuất CSV giữ nguyên
    try {
      let csv = 'Mã Hóa Đơn,Ngày Hóa Đơn,Bệnh Nhân,Tổng Cộng,Ngày Cuộc Hẹn,Trạng Thái\n';
      invoices.forEach(item => {
        csv += [
          `INV${item.InvoiceId}`,
          formatDate(item.InvoiceDate),
          `"${item.PatientName.replace(/"/g, '""')}"`,
          item.TotalAmount,
          formatDate(item.AppointmentDate),
          item.Status
        ].join(',') + '\n';
      });
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'BaoCaoDoanhThu.csv';
      link.click();
      setToast({ type: 'success', message: 'Xuất CSV thành công!' });
    } catch (error) {
      setToast({ type: 'error', message: `Lỗi xuất CSV: ${error.message}` });
    }
  };

  const viewInvoiceDetails = (item) => {
    setCurrentDetail(item);
    setShowDetailModal(true);
  };

  return (
    <div className="report-container">
      <AdminSidebar />
      <main className="main-content">
        <header className="page-header">
          <h1>Báo Cáo Doanh Thu</h1>
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo tên bệnh nhân..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </header>

        {toast && <CustomToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <div className="card-style filter-panel">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label htmlFor="startDate" className="form-label">Từ ngày</label>
              <input type="date" id="startDate" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label htmlFor="endDate" className="form-label">Đến ngày</label>
              <input type="date" id="endDate" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="col-md-6 d-flex justify-content-end gap-2">
              <button className="btn btn-primary" disabled={loading} onClick={handleFilterAction}>
               Lọc Dữ Liệu
              </button>
              <button className="btn btn-secondary" onClick={exportToCsv}>
                Xuất CSV
              </button>
            </div>
          </div>
        </div>

        <div className="card-style table-panel">
          {loading ? (
            <div className="loading-container"><Loading isLoading={loading} /></div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="clinic-table">
                  <thead>
                    <tr>
                      <th>Mã HĐ</th>
                      <th>Ngày Lập</th>
                      <th>Bệnh Nhân</th>
                      <th className='text-end'>Tổng Cộng</th>
                      <th>Ngày Hẹn</th>
                      <th className='text-center'>Trạng Thái</th>
                      <th className="text-center">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan="7" className="no-data">Không có dữ liệu</td></tr>
                    ) : (
                      invoices.map(item => (
                        <tr key={item.InvoiceId}>
                          <td><span className='invoice-id'>{`#${item.InvoiceId}`}</span></td>
                          <td>{formatDate(item.InvoiceDate)}</td>
                          <td>{item.PatientName}</td>
                          <td className="text-end fw-semibold">{formatCurrency(item.TotalAmount)}</td>
                          <td>{formatDate(item.AppointmentDate)}</td>
                          <td className='text-center'><StatusBadge status={item.Status} /></td>
                          <td className="text-center">
                            <button className="btn-icon" title="Xem chi tiết" onClick={() => viewInvoiceDetails(item)}>
                              <lord-icon src="https://cdn.lordicon.com/flvisirw.json" trigger="hover" style={{ width: '28px', height: '28px' }}></lord-icon>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination-container">
                  <Pagination pageCount={totalPages} onPageChange={handlePageChange} currentPage={currentPage - 1} />
                </div>
              )}
            </>
          )}
        </div>

        {showDetailModal && currentDetail && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <lord-icon src="https://cdn.lordicon.com/killcvOv.json" trigger="loop" delay="1000" colors="primary:#3B71CA" style={{ width: '32px', height: '32px' }}></lord-icon>
                  <h2>Hóa Đơn Chi Tiết</h2>
                </div>
                <button className="btn-close" onClick={() => setShowDetailModal(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="invoice-info">
                  <div>
                    <span className="label">Bệnh nhân:</span>
                    <span className="value">{currentDetail.PatientName}</span>
                  </div>
                  <div>
                    <span className="label">Ngày lập:</span>
                    <span className="value">{formatDate(currentDetail.InvoiceDate)}</span>
                  </div>
                  <div>
                    <span className="label">Mã hóa đơn:</span>
                    <span className="value strong">{`#INV${currentDetail.InvoiceId}`}</span>
                  </div>
                </div>
                <div className="invoice-details-table">
                  <table className='clinic-table'>
                    <thead>
                      <tr>
                        <th>Dịch vụ / Thuốc</th>
                        <th className='text-center'>Số Lượng</th>
                        <th className='text-end'>Đơn Giá</th>
                        <th className='text-end'>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetail.Details.map((d, index) => (
                        <tr key={index}>
                          <td>
                            <strong>{d.ServiceName || d.MedicineName || 'N/A'}</strong>
                            <small>{d.ServiceId ? 'Dịch vụ' : 'Thuốc'}</small>
                          </td>
                          <td className='text-center'>{d.Quantity}</td>
                          <td className='text-end'>{formatCurrency(d.UnitPrice)}</td>
                          <td className='text-end fw-semibold'>{formatCurrency(d.SubTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="invoice-total">
                  <span className="label">TỔNG CỘNG</span>
                  <span className="total-amount">{formatCurrency(currentDetail.TotalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminRevenueReport;