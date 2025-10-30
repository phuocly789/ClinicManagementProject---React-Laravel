import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import Loading from '../../Components/Loading/Loading';
import CustomToast from '../../Components/CustomToast/CustomToast';
import instance from '../../axios';
import Pagination from '../../Components/Pagination/Pagination';
import { BiSearch, BiExport } from 'react-icons/bi';
import { FaFileInvoiceDollar } from 'react-icons/fa';
import { FiEye } from 'react-icons/fi';
import '../../App.css';
// --- Helper Functions (Không đổi) ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- Status Component (Đã cập nhật với BS5) ---
const StatusBadge = ({ status }) => {
  let statusClass = '';
  let statusText = status;

  switch (status) {
    case 'Đã thanh toán':
      statusClass = 'bg-success-soft';
      statusText = 'Thành Công';
      break;
    case 'Chờ thanh toán':
      statusClass = 'bg-warning-soft';
      statusText = 'Chờ Thanh Toán';
      break;
    default:
      statusClass = 'bg-secondary-soft';
      statusText = 'Đã Hủy';
      break;
  }
  return <span className={`badge rounded-pill fw-semibold ${statusClass}`}>{statusText}</span>;
};

const AdminRevenueReport = () => {
  // ... (Toàn bộ logic state và hàm xử lý giữ nguyên như cũ)
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [modal, setModal] = useState({ show: false, detail: null });

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const fetchInvoices = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize, search: searchQuery, startDate, endDate });
      const response = await instance.get(`api/report-revenue/detail-revenue?${params.toString()}`);
      setInvoices(response.data.items || []);
      setTotalItems(response.data.totalItems || 0);
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Lỗi khi tải hóa đơn' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, pageSize, startDate, endDate]);

  useEffect(() => {
    fetchInvoices(1);
  }, []);

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
    try {
      let csv = 'Mã Hóa Đơn,Ngày Hóa Đơn,Bệnh Nhân,Tổng Cộng,Ngày Cuộc Hẹn,Trạng Thái\n';
      invoices.forEach(item => {
        csv += [`#${item.InvoiceId}`, formatDate(item.InvoiceDate), `"${item.PatientName.replace(/"/g, '""')}"`, item.TotalAmount, formatDate(item.AppointmentDate), item.Status].join(',') + '\n';
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

  const renderModal = () => {
    if (!modal.show || !modal.detail) return null;
    const detail = modal.detail;

    return (
      <>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" onClick={() => setModal({ show: false, detail: null })}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FaFileInvoiceDollar className="text-primary" />
                  Hóa Đơn Chi Tiết
                </h5>
                <button type="button" className="btn-close btn-warning" onClick={() => setModal({ show: false, detail: null })}></button>
              </div>
              <div className="modal-body">
                <div className="bg-light p-3 rounded border mb-4">
                  <div className="row">
                    <div className="col-md-6">
                      <small className="text-muted d-block">Bệnh nhân</small>
                      <span className="fw-semibold">{detail.PatientName}</span>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted d-block">Ngày lập</small>
                      <span className="fw-semibold">{formatDate(detail.InvoiceDate)}</span>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted d-block">Mã hóa đơn</small>
                      <span className="fw-bold text-primary">{`#${detail.InvoiceId}`}</span>
                    </div>
                  </div>
                </div>

                <table className='table table-sm'>
                  <thead><tr><th>Dịch vụ / Thuốc</th><th className='text-center'>Số Lượng</th><th className='text-end'>Đơn Giá</th><th className='text-end'>Thành Tiền</th></tr></thead>
                  <tbody>
                    {detail.Details.map((d, index) => (
                      <tr key={index}>
                        <td>
                          <div className="fw-semibold">{d.ServiceName || d.MedicineName || 'N/A'}</div>
                          <small className="text-muted">{d.ServiceId ? 'Dịch vụ' : 'Thuốc'}</small>
                        </td>
                        <td className='text-center align-middle'>{d.Quantity}</td>
                        <td className='text-end align-middle'>{formatCurrency(d.UnitPrice)}</td>
                        <td className='text-end align-middle fw-semibold'>{formatCurrency(d.SubTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="invoice-total d-flex justify-content-end align-items-baseline gap-3">
                  <span className="h6 text-muted mb-0">TỔNG CỘNG</span>
                  <span className="invoice-total-amount">{formatCurrency(detail.TotalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="d-flex">
      <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
        {toast && <CustomToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <header className="d-flex justify-content-between align-items-center flex-shrink-0">
          <h1 className="h4 mb-0">Báo Cáo Doanh Thu</h1>
          <div className="col-md-4">
            <input type="text" className="form-control" placeholder="Tìm theo tên bệnh nhân..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} />
          </div>
        </header>

        <div className="card shadow-sm border-0 flex-shrink-0">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-md-3"><label htmlFor="startDate" className="form-label small text-muted">Từ ngày</label><input type="date" id="startDate" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="col-md-3"><label htmlFor="endDate" className="form-label small text-muted">Đến ngày</label><input type="date" id="endDate" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <div className="col-md-6 d-flex justify-content-end gap-2">
                <button className="btn btn-primary d-flex align-items-center gap-2" disabled={loading} onClick={handleFilterAction}><BiSearch /> Lọc Dữ Liệu</button>
                <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={exportToCsv}><BiExport /> Xuất CSV</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 table-panel">
          {loading ? (<Loading isLoading={loading} />) : (
            <>
              <div className="table-responsive-container">
                <table className="table table-hover clinic-table mb-0">
                  <thead className='p-4'>
                    <tr>
                      <th className="px-4">Mã HĐ</th>
                      <th>Ngày Lập</th>
                      <th>Bệnh Nhân</th>
                      <th className='text-end'>Tổng Cộng</th>
                      <th>Ngày Hẹn</th>
                      <th className='text-center'>Trạng Thái</th>
                      <th className="text-center px-4">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan="7" className="text-center p-5 text-muted">Không có dữ liệu</td></tr>
                    ) : (
                      invoices.map(item => (
                        <tr key={item.InvoiceId}>
                          <td className="px-4"><span className='invoice-id'>{`#${item.InvoiceId}`}</span></td>
                          <td>{formatDate(item.InvoiceDate)}</td>
                          <td>{item.PatientName}</td>
                          <td className="text-end fw-semibold">{formatCurrency(item.TotalAmount)}</td>
                          <td>{formatDate(item.AppointmentDate)}</td>
                          <td className='text-center'><StatusBadge status={item.Status} /></td>
                          <td className="text-center px-4">
                            <button className="btn btn-light btn-lg" title="Xem chi tiết" onClick={() => setModal({ show: true, detail: item })}>
                              <FiEye />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="card-footer p-3 border-0 flex-shrink-0">
                  <Pagination pageCount={totalPages} onPageChange={handlePageChange} forcePage={currentPage - 1} />
                </div>
              )}
            </>
          )}
        </div>

        {renderModal()}
      </main>
    </div>
  );
};

export default AdminRevenueReport;