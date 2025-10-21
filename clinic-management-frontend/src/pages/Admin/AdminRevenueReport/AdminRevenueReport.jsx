import './AdminRevenueReport.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import Loading from '../../../Components/Loading/Loading';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import instance from '../../../axios';
import Pagination from '../../../Components/Pagination/Pagination';

const AdminRevenueReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentDetail, setCurrentDetail] = useState(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  // const [endDate, setEndDate] = useState(
  //   new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  // );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const debounceTimeout = useRef(null);

  // Gọi API để lấy danh sách hóa đơn
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let query = `api/report-revenue/detail-revenue?page=${currentPage}&pageSize=${pageSize}`;
      if (searchQuery) {
        query += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (startDate) {
        query += `&startDate=${startDate}`;
      }
      if (endDate) {
        query += `&endDate=${endDate}`;
      }

      const response = await instance.get(query);

      if (response.success && response.data) {
        setInvoices(response.data.items || []);
        setTotalItems(response.data.totalItems || 0);
        setTotalPages(Math.ceil(response.data.totalItems / pageSize));
      } else {
        setToast({
          type: 'error',
          message: response.message || 'Không thể tải danh sách hóa đơn',
        });
      }
    } catch (error) {
      console.error('❌ Lỗi khi tải hóa đơn:', error);
      setToast({
        type: 'error',
        message: error.message || 'Không thể tải danh sách hóa đơn',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, pageSize,startDate,endDate]);

  // Tải dữ liệu lần đầu
  useEffect(() => {
      fetchInvoices();
    
  }, [currentPage]);

  // Xử lý tìm kiếm với debounce
  const handleSearchInput = (e) => {
    const value = e.target.value;
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 500);
  };

  // Áp dụng bộ lọc
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
    setCurrentPage(1);
    await fetchInvoices();
  };

  // Chuyển trang trước
  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Chuyển trang tiếp theo
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Xuất CSV
  const exportToCsv = async () => {
    try {
      let csv = 'Mã Hóa Đơn,Ngày Hóa Đơn,Bệnh Nhân,Tổng Cộng,Ngày Cuộc Hẹn\n';
      invoices.forEach((item) => {
        const invoiceDate = new Date(item.InvoiceDate).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const appointmentDate = item.AppointmentDate
          ? new Date(item.AppointmentDate).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
          : 'N/A';
        csv += `INV${item.InvoiceId},${invoiceDate},${item.PatientName.replace(/,/g, '')},${item.TotalAmount.toLocaleString(
          'vi-VN'
        )
          },${appointmentDate.replace(/,/g, '')} \n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'DetailedRevenueReport.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({
        type: 'success',
        message: 'Xuất CSV thành công!',
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: `Lỗi xuất CSV: ${error.message} `,
      });
    }
  }

  // Xem chi tiết hóa đơn
  const viewInvoiceDetails = (item) => {
    setCurrentDetail(item);
    setShowDetailModal(true);
  };

  return (
    <div style={{ display: 'flex', margin: 0, backgroundColor: '#f8f9fa', height: '100vh' }}>
      <AdminSidebar />
      <div
        className="main-content"
        style={{ position: 'relative', width: '100%', flexGrow: 1, marginLeft: '5px', padding: '30px' }}
      >
        <header className="header">
          <h1>Báo Cáo Doanh Thu</h1>
          <div style={{ width: '400px' }}>
            <input
              type="text"
              style={{ width: '400px' }}
              className="form-control"
              placeholder="Tìm kiếm hóa đơn (tên bệnh nhân)"
              value={searchQuery}
              onChange={handleSearchInput}
            />
          </div>
        </header>

        {/* Toast thông báo */}
        {toast && (
          <CustomToast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* Bộ lọc */}
        <div className="filter-container mb-3">
          <div className="row">
            <div className="col-md-4 d-flex align-items-center">
              <label htmlFor="startDate">Từ Ngày:</label>
              <input
                type="date"
                className="form-control m-2"
                // style={{ width:'400px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-4 d-flex align-items-center">
              <label htmlFor="endDate">Đến Ngày:</label>
              <input
                type="date"
                className="form-control m-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-md-4 align-self-end d-flex justify-content-end">
              <button className="btn btn-primary me-2" disabled={loading || !startDate || !endDate} onClick={handleFilter}>
                Lọc
              </button>
              <button className="btn btn-secondary" onClick={exportToCsv}>
                Xuất CSV
              </button>
            </div>
          </div>
        </div>

        {/* Bảng danh sách hóa đơn */}
        <div className="table-container" style={{ maxHeight: '65vh' }}>
          <table className="table table-striped">
            <thead>
              <tr>
                <th style={{ width: '135px' }}>Mã Hóa Đơn</th>
                <th style={{ width: '150px' }}>Ngày Hóa Đơn</th>
                <th style={{ width: '220px' }}>Bệnh Nhân</th>
                <th style={{ width: '180px' }}>Tổng Cộng</th>
                <th style={{ width: '150px' }}>Ngày Cuộc Hẹn</th>
                <th style={{ width: '110px' }}>Trạng Thái</th>
                <th style={{ width: '110px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <Loading isLoading={loading} />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="7">Không tìm thấy hóa đơn nào.</td>
                </tr>
              ) : (
                invoices.map((item) => (
                  <tr key={item.InvoiceId}>
                    <td>{`INV${item.InvoiceId} `}</td>
                    <td>{new Date(item.InvoiceDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td>{item.PatientName}</td>
                    <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.TotalAmount)}</td>

                    <td>
                      {item.AppointmentDate
                        ? new Date(item.AppointmentDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                        : 'N/A'}
                    </td>
                    <td>
                      {item.Status === 'Đã thanh toán' ? (
                        <span className="status status-active">Thành Công</span>
                      ) : item.Status === 'Chờ thanh toán' ? (
                        <span className="status status-pending">Chờ Thanh Toán</span>
                      ) : (
                        <span className="status status-inactive">Đã Hủy</span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm"
                        title="Xem chi tiết"
                        onClick={() => viewInvoiceDetails(item)}
                      >
                        <lord-icon
                          src="https://cdn.lordicon.com/knitbwfa.json"
                          trigger="hover"
                          style={{ width: '30px', height: '30px' }}
                        ></lord-icon>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}

        <Pagination
          pageCount={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          currentPage={currentPage}
          isLoading={loading}
        />



        {/* Modal chi tiết */}
        {showDetailModal && currentDetail && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Chi Tiết Hóa Đơn #INV{currentDetail.InvoiceId}</h3>
                <button
                  className="close-button bg-secondary border-0"
                  onClick={() => setShowDetailModal(false)}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Bệnh nhân:</strong> {currentDetail.PatientName}
                </p>
                <p>
                  <strong>Ngày hóa đơn:</strong>{' '}
                  {new Date(currentDetail.InvoiceDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>
                <p>
                  <strong>Ngày cuộc hẹn:</strong>{' '}
                  {currentDetail.AppointmentDate
                    ? new Date(currentDetail.AppointmentDate).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                    : 'N/A'}
                </p>
                <p>
                  <strong>Tổng: </strong>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentDetail.TotalAmount)}

                </p>
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Tên</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDetail.Details.map((d, index) => (
                      <tr key={index}>
                        <td>{d.ServiceId ? 'Dịch vụ' : 'Thuốc'}</td>
                        <td>{d.ServiceName || d.MedicineName || 'N/A'}</td>
                        <td>{d.Quantity}</td>
                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.UnitPrice)}</td>
                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.SubTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRevenueReport;