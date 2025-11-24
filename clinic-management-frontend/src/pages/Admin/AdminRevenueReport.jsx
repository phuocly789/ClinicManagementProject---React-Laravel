import { useCallback, useEffect, useState } from 'react';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import Loading from '../../Components/Loading/Loading';
import CustomToast from '../../Components/CustomToast/CustomToast';
import instance from '../../axios';
import Pagination from '../../Components/Pagination/Pagination';
import { BiSearch, BiExport, BiCalendar, BiUser, BiDollar, BiReceipt } from 'react-icons/bi';
import { FaFileInvoiceDollar, FaUserInjured } from 'react-icons/fa';
import { FiEye } from 'react-icons/fi';
import { BsCalendarDate } from 'react-icons/bs';
import '../../App.css';

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
      statusClass = 'bg-success text-white';
      statusText = 'Thành Công';
      break;
    case 'Chờ thanh toán':
      statusClass = 'bg-warning text-dark';
      statusText = 'Chờ Thanh Toán';
      break;
    default:
      statusClass = 'bg-secondary text-white';
      statusText = 'Đã Hủy';
      break;
  }
  return <span className={`badge rounded-pill fw-semibold ${statusClass}`}>{statusText}</span>;
};

// --- Summary Cards Component ---
const SummaryCards = ({ data }) => {
  const stats = {
    totalRevenue: data?.reduce((sum, item) => sum + (item.TotalAmount || 0), 0) || 0,
    totalInvoices: data?.length || 0,
    paidInvoices: data?.filter(item => item.Status === 'Đã thanh toán').length || 0,
    pendingInvoices: data?.filter(item => item.Status === 'Chờ thanh toán').length || 0,
  };

  
};

const AdminRevenueReport = () => {
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
  }, [fetchInvoices]);

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
      link.download = `BaoCaoDoanhThu_${new Date().toISOString().split('T')[0]}.csv`;
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
              <div className="modal-header bg-light">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <FaFileInvoiceDollar className="text-primary" />
                  Hóa Đơn Chi Tiết #{detail.InvoiceId}
                </h5>
                <button type="button" className="btn-close" onClick={() => setModal({ show: false, detail: null })}></button>
              </div>
              <div className="modal-body">
                {/* Patient and Invoice Info */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <BiUser className="text-muted" />
                      <div>
                        <small className="text-muted d-block">Bệnh nhân</small>
                        <span className="fw-semibold">{detail.PatientName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <BiCalendar className="text-muted" />
                      <div>
                        <small className="text-muted d-block">Ngày lập</small>
                        <span className="fw-semibold">{formatDate(detail.InvoiceDate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <BsCalendarDate className="text-muted" />
                      <div>
                        <small className="text-muted d-block">Ngày hẹn</small>
                        <span className="fw-semibold">{formatDate(detail.AppointmentDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Items Table */}
                <div className="table-responsive">
                  <table className='table table-sm table-hover'>
                    <thead className='table-light'>
                      <tr>
                        <th>Dịch vụ / Thuốc</th>
                        <th className='text-center'>Số Lượng</th>
                        <th className='text-end'>Đơn Giá</th>
                        <th className='text-end'>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.Details?.map((d, index) => (
                        <tr key={index}>
                          <td>
                            <div className="fw-semibold">{d.ServiceName || d.MedicineName || 'N/A'}</div>
                            <small className={`badge ${d.ServiceId ? 'bg-info' : 'bg-success'} text-white`}>
                              {d.ServiceId ? 'Dịch vụ' : 'Thuốc'}
                            </small>
                          </td>
                          <td className='text-center align-middle'>{d.Quantity}</td>
                          <td className='text-end align-middle'>{formatCurrency(d.UnitPrice)}</td>
                          <td className='text-end align-middle fw-semibold text-success'>{formatCurrency(d.SubTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Amount */}
                <div className="border-top pt-3 mt-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <StatusBadge status={detail.Status} />
                    </div>
                    <div className="text-end">
                      <small className="text-muted d-block">TỔNG CỘNG</small>
                      <h4 className="text-success fw-bold mb-0">{formatCurrency(detail.TotalAmount)}</h4>
                    </div>
                  </div>
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

        {/* Header */}
        <header className="d-flex justify-content-between align-items-center flex-shrink-0">
          <div>
            <h1 className="h4 mb-1 fw-bold text-dark">Báo Cáo Doanh Thu</h1>
            <p className="text-muted mb-0">Quản lý và theo dõi doanh thu hệ thống</p>
          </div>
          <div className="d-flex gap-2">
            <div className="input-group" style={{ width: '300px' }}>
              <span className="input-group-text bg-white">
                <BiSearch className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên bệnh nhân..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <SummaryCards data={invoices} />

        {/* Filter Card */}
        <div className="card shadow-sm border-0 flex-shrink-0">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label htmlFor="startDate" className="form-label small text-muted mb-1">
                  <BiCalendar className="me-1" />
                  Từ ngày
                </label>
                <input
                  type="date"
                  id="startDate"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label htmlFor="endDate" className="form-label small text-muted mb-1">
                  <BiCalendar className="me-1" />
                  Đến ngày
                </label>
                <input
                  type="date"
                  id="endDate"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="col-md-6 d-flex justify-content-end gap-2">
                <button
                  className="btn btn-primary d-flex align-items-center gap-2"
                  disabled={loading}
                  onClick={handleFilterAction}
                >
                  <BiSearch /> Lọc Dữ Liệu
                </button>
                <button
                  className="btn btn-success d-flex align-items-center gap-2"
                  onClick={exportToCsv}
                  disabled={invoices.length === 0}
                >
                  <BiExport /> Xuất CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card shadow-sm border-0 table-panel">
          {loading ? (
            <Loading isLoading={loading} />
          ) : (
            <>
              <div className="card-header bg-white border-0 py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-muted">
                    Tổng cộng: <strong>{totalItems}</strong> hóa đơn
                  </h6>
                  <small className="text-muted">
                    Trang {currentPage} / {totalPages}
                  </small>
                </div>
              </div>

              <div className="table-responsive-container">
                <table className="table table-hover clinic-table mb-0">
                  <thead className='table-light'>
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
                      <tr>
                        <td colSpan="7" className="text-center p-5 text-muted">
                          <BiSearch size={48} className="mb-3 opacity-50" />
                          <p className="mb-0 fs-5">Không tìm thấy hóa đơn</p>
                          <small>Thử thay đổi bộ lọc hoặc khoảng thời gian</small>
                        </td>
                      </tr>
                    ) : (
                      invoices.map(item => (
                        <tr key={item.InvoiceId}>
                          <td className="px-4">
                            <span className='invoice-id fw-bold'>{`#${item.InvoiceId}`}</span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <BiCalendar size={14} className="text-muted" />
                              {formatDate(item.InvoiceDate)}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <BiUser size={14} className="text-muted" />
                              {item.PatientName}
                            </div>
                          </td>
                          <td className="text-end fw-bold text-success">
                            {formatCurrency(item.TotalAmount)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <BsCalendarDate size={14} className="text-muted" />
                              {formatDate(item.AppointmentDate)}
                            </div>
                          </td>
                          <td className='text-center'>
                            <StatusBadge status={item.Status} />
                          </td>
                          <td className="text-center px-4">
                            <button
                              className="btn btn-light btn-lg"
                              title="Xem chi tiết"
                              onClick={() => setModal({ show: true, detail: item })}
                            >
                              <FiEye className="text-primary" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="card-footer p-3 border-0 bg-white">
                  <Pagination
                    pageCount={totalPages}
                    onPageChange={handlePageChange}
                    forcePage={currentPage - 1}
                  />
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