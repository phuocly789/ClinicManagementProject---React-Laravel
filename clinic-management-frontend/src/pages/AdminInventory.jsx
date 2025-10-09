import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Spinner, Form, Row, Col } from 'react-bootstrap';
import Taskbar from '../Components/Taskbar';
import Pagination from '../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../Components/CustomToast/CustomToast';

const API_BASE_URL = 'http://localhost:8000';

// Load html2pdf.js for PDF export
const loadHtml2Pdf = () => {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  script.async = true;
  document.body.appendChild(script);
  return script;
};

// Regex kiểm tra ký tự đặc biệt và ngôn ngữ code
const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const InventoryList = ({ inventories, isLoading, formatVND, handleShowDeleteModal, handleShowDetail, handleShowEditForm, pageCount, currentPage, handlePageChange, suppliers }) => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Danh Sách Phiếu Nhập Kho</h3>
        <Button variant="primary" onClick={() => handleShowEditForm(null)}>
          + Thêm Phiếu Nhập
        </Button>
      </div>
      <div className="table-responsive" style={{ transition: 'opacity 0.3s ease' }}>
        <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
          <thead>
            <tr>
              <th>Mã Phiếu</th>
              <th>Nhà Cung Cấp</th>
              <th>Ngày Nhập</th>
              <th>Tổng Tiền</th>
              <th>Ghi Chú</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" className="text-center">
                  <Spinner animation="border" variant="primary" />
                </td>
              </tr>
            ) : inventories.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">
                  Trống
                </td>
              </tr>
            ) : (
              inventories.map((inventory) => (
                <tr key={inventory.id}>
                  <td>
                    <a
                      className="text-primary"
                      href="#"
                      onClick={() => handleShowDetail(inventory.id)}
                    >
                      {inventory.id}
                    </a>
                  </td>
                  <td>{suppliers.find(s => s.SupplierId === inventory.supplierId)?.name || 'N/A'}</td>
                  <td>{new Date(inventory.date).toLocaleDateString('vi-VN')}</td>
                  <td>{formatVND(inventory.total)}</td>
                  <td>{inventory.note}</td>
                  <td>
                    <span>
                      <a
                        className="text-success"
                        href="#"
                        onClick={() => handleShowEditForm(inventory)}
                      >
                        Sửa
                      </a>
                    </span>
                    <span className="px-1">/</span>
                    <span>
                      <a
                        className="text-danger"
                        href="#"
                        onClick={() => handleShowDeleteModal(inventory.id)}
                      >
                        Xóa
                      </a>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
      {pageCount > 1 && (
        <Pagination
          pageCount={pageCount}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

const InventoryDetailList = ({ details, isLoading, formatVND }) => {
  return (
    <div>
      <h3>Chi Tiết Phiếu Nhập</h3>
      <div className="table-responsive" style={{ transition: 'opacity 0.3s ease' }}>
        <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
          <thead>
            <tr>
              <th>Mã Phiếu</th>
              <th>Tên Thuốc</th>
              <th>Số Lượng</th>
              <th>Giá Nhập</th>
              <th>Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" className="text-center">
                  <Spinner animation="border" variant="primary" />
                </td>
              </tr>
            ) : details.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">
                  Trống
                </td>
              </tr>
            ) : (
              details.map((detail) => (
                <tr key={detail.id}>
                  <td>{detail.importId}</td>
                  <td>{detail.medicineName}</td>
                  <td>{detail.quantity}</td>
                  <td>{formatVND(detail.price)}</td>
                  <td>{formatVND(detail.subTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

const InventoryForm = ({ isEditMode, inventory, onSubmit, onCancel, isLoading, suppliers }) => {
  const [errors, setErrors] = useState({
    supplierId: '',
    date: '',
    total: '',
    note: '',
  });

  const validateForm = (formData) => {
    const newErrors = {
      supplierId: '',
      date: '',
      total: '',
      note: '',
    };
    let isValid = true;

    // Validate SupplierId
    const supplierId = formData.get('supplierId')?.trim();
    if (!supplierId) {
      newErrors.supplierId = 'Vui lòng chọn nhà cung cấp';
      isValid = false;
    } else if (!suppliers.some(s => s.SupplierId === parseInt(supplierId))) {
      newErrors.supplierId = 'Nhà cung cấp không hợp lệ';
      isValid = false;
    }

    // Validate Date
    const date = formData.get('date')?.trim();
    if (!date) {
      newErrors.date = 'Vui lòng chọn ngày nhập';
      isValid = false;
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.date = 'Ngày nhập không thể là ngày trong tương lai';
        isValid = false;
      }
    }

    // Validate Total
    const total = formData.get('total') ? parseFloat(formData.get('total')) : null;
    if (total === null || isNaN(total)) {
      newErrors.total = 'Vui lòng nhập tổng tiền';
      isValid = false;
    } else if (total < 0) {
      newErrors.total = 'Tổng tiền không thể âm';
      isValid = false;
    } else if (total.toString().replace('.', '').length > 18) {
      newErrors.total = 'Tổng tiền không được vượt quá 18 chữ số';
      isValid = false;
    }

    // Validate Note
    const note = formData.get('note')?.trim();
    if (note && note.length > 500) {
      newErrors.note = 'Ghi chú không được vượt quá 500 ký tự';
      isValid = false;
    } else if (note && (specialCharRegex.test(note) || codePatternRegex.test(note))) {
      newErrors.note = 'Vui lòng không nhập ký tự đặc biệt hoặc ngôn ngữ code';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (validateForm(formData)) {
      onSubmit(e);
    }
  };

  return (
    <div>
      <h3>{isEditMode ? 'Sửa Phiếu Nhập' : 'Thêm Phiếu Nhập'}</h3>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Nhà Cung Cấp</Form.Label>
              <Form.Select
                name="supplierId"
                defaultValue={isEditMode ? inventory?.supplierId : ''}
                isInvalid={!!errors.supplierId}
              >
                <option value="" disabled>Chọn nhà cung cấp</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.SupplierId} value={supplier.SupplierId}>
                    {supplier.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-danger">{errors.supplierId}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Ngày Nhập</Form.Label>
              <Form.Control
                type="date"
                name="date"
                defaultValue={isEditMode ? inventory?.date : ''}
                isInvalid={!!errors.date}
              />
              <Form.Text className="text-danger">{errors.date}</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Tổng Tiền (VNĐ)</Form.Label>
              <Form.Control
                type="number"
                name="total"
                defaultValue={isEditMode ? inventory?.total : ''}
                placeholder="Nhập tổng tiền"
                step="0.01"
                isInvalid={!!errors.total}
              />
              <Form.Text className="text-danger">{errors.total}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Ghi Chú</Form.Label>
              <Form.Control
                as="textarea"
                name="note"
                defaultValue={isEditMode ? inventory?.note : ''}
                placeholder="Nhập ghi chú (tùy chọn)"
                isInvalid={!!errors.note}
              />
              <Form.Text className="text-danger">{errors.note}</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <div className="d-flex justify-content-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : isEditMode ? 'Lưu' : 'Thêm'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

const InventoryDetail = ({ inventory, details, supplier, isLoading, formatVND, onBack }) => {
  const printableAreaRef = useRef(null);

  const printPage = () => {
    window.print();
  };

  const exportPDF = () => {
    const element = printableAreaRef.current;
    const opt = {
      margin: 0.5,
      filename: `PhieuNhapKho_${inventory.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    window.html2pdf().set(opt).from(element).save();
  };

  const styles = {
    dashboardContainer: { display: 'flex' },
    mainContent: { flexGrow: 1, padding: '30px', backgroundColor: '#f8f9fa' },
    header: { marginBottom: '30px' },
    card: { backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '20px', marginBottom: '20px' },
    infoSection: { marginBottom: '20px' },
    infoSectionH3: { marginBottom: '10px' },
    infoItem: { marginBottom: '5px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    thTd: { border: '1px solid #ddd', padding: '12px', textAlign: 'left' },
    th: { backgroundColor: '#f2f2f2' },
    buttonContainer: { marginTop: '20px' },
    button: { padding: '8px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'white', marginRight: '10px' },
    btnPrint: { backgroundColor: '#00448D' },
    btnPrintHover: { backgroundColor: '#003366' },
    btnExportPdf: { backgroundColor: '#28a745' },
    btnExportPdfHover: { backgroundColor: '#218838' },
    btnBack: { backgroundColor: '#6c757d' },
    btnBackHover: { backgroundColor: '#5a6268' },
    printHeader: { display: 'none', textAlign: 'center', marginBottom: '20px' },
    printHeaderH1: { fontSize: '24px', color: '#00448D' },
    '@media print': {
      mainContent: { padding: 0 },
      card: { boxShadow: 'none', border: 'none', padding: '10px' },
      printHeader: { display: 'block' },
      infoSection: { fontSize: '12px' },
      table: { fontSize: '12px' },
      infoItem: { marginBottom: '8px' },
      thTd: { padding: '8px' },
      buttonContainer: { display: 'none' }
    }
  };

  return (
    <div style={styles.mainContent}>
      <header style={styles.header}>
        <h1>Chi Tiết Phiếu Nhập Kho</h1>
      </header>
      <section ref={printableAreaRef} style={styles.card}>
        <div style={styles.printHeader}>
          <h1 style={styles.printHeaderH1}>Phiếu Nhập Kho</h1>
          <p>Phòng Khám XYZ</p>
        </div>
        <div style={styles.infoSection}>
          <h3 style={styles.infoSectionH3}>Thông Tin Nhà Cung Cấp</h3>
          <div style={styles.infoItem}><strong>Tên Nhà Cung Cấp:</strong> {supplier?.name || 'N/A'}</div>
          <div style={styles.infoItem}><strong>Email:</strong> {supplier?.email || 'N/A'}</div>
          <div style={styles.infoItem}><strong>Số Điện Thoại:</strong> {supplier?.phone || 'N/A'}</div>
          <div style={styles.infoItem}><strong>Địa Chỉ:</strong> {supplier?.address || 'N/A'}</div>
          <div style={styles.infoItem}><strong>Mô Tả:</strong> {supplier?.description || 'N/A'}</div>
        </div>
        <div style={styles.infoSection}>
          <h3 style={styles.infoSectionH3}>Thông Tin Phiếu</h3>
          <div style={styles.infoItem}><strong>Mã Phiếu:</strong> {inventory?.id || 'N/A'}</div>
          <div style={styles.infoItem}><strong>Ngày Nhập:</strong> {inventory?.date ? new Date(inventory.date).toLocaleDateString('vi-VN') : 'N/A'}</div>
          <div style={styles.infoItem}><strong>Tổng Tiền:</strong> {formatVND(inventory?.total)}</div>
          <div style={styles.infoItem}><strong>Ghi Chú:</strong> {inventory?.note || 'N/A'}</div>
        </div>
        <h3>Danh Sách Thuốc Đã Nhập</h3>
        <Table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tên Thuốc</th>
              <th style={styles.th}>Số Lượng</th>
              <th style={styles.th}>Giá Nhập</th>
              <th style={styles.th}>Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" style={styles.thTd} className="text-center">
                  <Spinner animation="border" variant="primary" />
                </td>
              </tr>
            ) : details.length === 0 ? (
              <tr>
                <td colSpan="4" style={styles.thTd} className="text-center">
                  Trống
                </td>
              </tr>
            ) : (
              details.map((detail) => (
                <tr key={detail.id}>
                  <td style={styles.thTd}>{detail.medicineName}</td>
                  <td style={styles.thTd}>{detail.quantity}</td>
                  <td style={styles.thTd}>{formatVND(detail.price)}</td>
                  <td style={styles.thTd}>{formatVND(detail.subTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </section>
      <div style={styles.buttonContainer}>
        <Button style={{ ...styles.button, ...styles.btnPrint }} onMouseOver={e => e.target.style.backgroundColor = styles.btnPrintHover.backgroundColor} onMouseOut={e => e.target.style.backgroundColor = styles.btnPrint.backgroundColor} onClick={printPage}>
          In
        </Button>
        <Button style={{ ...styles.button, ...styles.btnExportPdf }} onMouseOver={e => e.target.style.backgroundColor = styles.btnExportPdfHover.backgroundColor} onMouseOut={e => e.target.style.backgroundColor = styles.btnExportPdf.backgroundColor} onClick={exportPDF}>
          Xuất PDF
        </Button>
        <Button style={{ ...styles.button, ...styles.btnBack }} onMouseOver={e => e.target.style.backgroundColor = styles.btnBackHover.backgroundColor} onMouseOut={e => e.target.style.backgroundColor = styles.btnBack.backgroundColor} onClick={onBack}>
          Quay Lại
        </Button>
      </div>
    </div>
  );
};

const AdminInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [details, setDetails] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [currentView, setCurrentView] = useState('list'); // list, add, edit, detail
  const [editInventory, setEditInventory] = useState(null);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const cache = useRef(new Map());
  const debounceRef = useRef(null);

  useEffect(() => {
    const script = loadHtml2Pdf();
    return () => script.remove();
  }, []);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  const hideToast = () => {
    setToast({ show: false, type: 'info', message: '' });
  };

  const fetchSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setSuppliers(data.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      showToast('error', `Lỗi khi tải danh sách nhà cung cấp: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInventories = useCallback(async (page = 1) => {
    if (cache.current.has(page)) {
      const { data, last_page } = cache.current.get(page);
      setInventories(data);
      setPageCount(last_page);
      setCurrentPage(page - 1);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/import-bills?page=${page}`, {
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const paginator = await response.json();
        const mappedData = paginator.data.map(item => ({
          id: item.ImportId,
          supplierId: item.SupplierId,
          date: item.ImportDate,
          total: item.TotalAmount,
          note: item.Notes || '',
        }));
        cache.current.set(page, { data: mappedData, last_page: paginator.last_page });
        setInventories(mappedData);
        setPageCount(paginator.last_page);
        setCurrentPage(page - 1);
      } catch (error) {
        console.error('Error fetching inventories:', error);
        showToast('error', `Lỗi khi tải danh sách phiếu nhập kho: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const fetchInventoryDetails = useCallback(async (importId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/import-bills/${importId}`, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      const mappedInventory = {
        id: data.data.ImportId,
        supplierId: data.data.SupplierId,
        date: data.data.ImportDate,
        total: data.data.TotalAmount,
        note: data.data.Notes || '',
      };
      const mappedDetails = (data.data.import_details || []).map(detail => ({
        id: detail.ImportDetailId,
        importId: detail.ImportId,
        medicineName: detail.medicine?.name || 'N/A',
        quantity: detail.Quantity,
        price: detail.ImportPrice,
        subTotal: detail.SubTotal,
      }));
      setSelectedInventory({
        inventory: mappedInventory,
        supplier: data.data.supplier || {},
        details: mappedDetails
      });
    } catch (error) {
      console.error('Error fetching inventory details:', error);
      showToast('error', `Lỗi khi tải chi tiết phiếu nhập: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCsrfToken = async (retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        }
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith('XSRF-TOKEN='))
          ?.split('=')[1];
        if (!token) {
          throw new Error('CSRF token not found in cookies');
        }
        return decodeURIComponent(token);
      } catch (error) {
        console.error(`Attempt ${attempt} to fetch CSRF token failed:`, error);
        if (attempt === retries) {
          throw new Error(`Không thể lấy CSRF token sau ${retries} lần thử: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  };

  const handleDelete = useCallback(
    async (inventoryId) => {
      try {
        setIsLoading(true);
        const token = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/api/import-bills/${inventoryId}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': token,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
        const result = await response.json();
        showToast('success', result.message || 'Xóa phiếu nhập thành công');
        cache.current.delete(currentPage + 1);
        await fetchInventories(currentPage + 1);
      } catch (error) {
        console.error('Error deleting inventory:', error);
        showToast('error', `Lỗi khi xóa phiếu nhập: ${error.message}`);
      } finally {
        setIsLoading(false);
        setShowDeleteModal(false);
        setInventoryToDelete(null);
      }
    },
    [currentPage, fetchInventories]
  );

  const handleShowDeleteModal = (inventoryId) => {
    setInventoryToDelete(inventoryId);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setInventoryToDelete(null);
  };

  const handleShowEditForm = (inventory) => {
    setEditInventory(inventory);
    setCurrentView('edit');
    if (inventory) {
      fetchInventoryDetails(inventory.id);
    }
  };

  const handleShowDetail = (inventoryId) => {
    setCurrentView('detail');
    fetchInventoryDetails(inventoryId);
  };

  const handleCancelForm = () => {
    try {
      setCurrentView('list');
      setEditInventory(null);
      setDetails([]);
    } catch (error) {
      showToast('error', 'Hủy thất bại');
    }
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedInventory(null);
    setDetails([]);
  };

  const handleAddInventory = async (e) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const formData = new FormData(e.target);
      const data = {
        SupplierId: parseInt(formData.get('supplierId')),
        ImportDate: formData.get('date'),
        TotalAmount: parseFloat(formData.get('total')),
        Notes: formData.get('note') || '',
      };

      const response = await fetch(`${API_BASE_URL}/api/import-bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': token,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      showToast('success', result.message || 'Thêm phiếu nhập thành công');
      cache.current.clear();
      await fetchInventories(1);
      setCurrentView('list');
    } catch (error) {
      console.error('Error adding inventory:', error);
      showToast(
        'error',
        error.message.includes('CSRF token')
          ? 'Thêm thất bại: Không thể lấy CSRF token. Vui lòng kiểm tra backend.'
          : `Thêm thất bại: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInventory = async (e) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const formData = new FormData(e.target);
      const data = {
        SupplierId: parseInt(formData.get('supplierId')),
        ImportDate: formData.get('date'),
        TotalAmount: parseFloat(formData.get('total')),
        Notes: formData.get('note') || '',
      };

      const response = await fetch(`${API_BASE_URL}/api/import-bills/${editInventory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': token,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }
      const result = await response.json();
      showToast('success', result.message || 'Sửa phiếu nhập thành công');
      cache.current.clear();
      await fetchInventories(currentPage + 1);
      setCurrentView('list');
      setEditInventory(null);
    } catch (error) {
      console.error('Error editing inventory:', error);
      showToast(
        'error',
        error.message.includes('CSRF token')
          ? 'Sửa thất bại: Không thể lấy CSRF token. Vui lòng kiểm tra backend.'
          : `Sửa thất bại: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'list') {
      fetchSuppliers();
      fetchInventories(1);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentView, fetchInventories, fetchSuppliers]);

  const handlePageChange = ({ selected }) => {
    const nextPage = selected + 1;
    fetchInventories(nextPage);
  };

  const formatVND = (value) => {
    return Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  return (
    <div style={{ display: 'flex', fontFamily: "'Segoe UI', sans-serif", margin: 0, backgroundColor: '#f8f9fa' }}>
      <Taskbar />
      <div style={{ position: 'relative', width: '100%', flexGrow: 1, marginLeft: '5px', padding: '30px' }}>
        <h1 className="mb-4">Quản Lý Kho</h1>
        {currentView === 'list' && (
          <>
            <InventoryList
              inventories={inventories}
              isLoading={isLoading}
              formatVND={formatVND}
              handleShowDeleteModal={handleShowDeleteModal}
              handleShowDetail={handleShowDetail}
              handleShowEditForm={handleShowEditForm}
              pageCount={pageCount}
              currentPage={currentPage}
              handlePageChange={handlePageChange}
              suppliers={suppliers}
            />
            <InventoryDetailList details={details} isLoading={isLoading} formatVND={formatVND} />
          </>
        )}
        {currentView === 'add' && (
          <InventoryForm
            isEditMode={false}
            onSubmit={handleAddInventory}
            onCancel={handleCancelForm}
            isLoading={isLoading}
            suppliers={suppliers}
          />
        )}
        {currentView === 'edit' && (
          <InventoryForm
            isEditMode={true}
            inventory={editInventory}
            onSubmit={handleEditInventory}
            onCancel={handleCancelForm}
            isLoading={isLoading}
            suppliers={suppliers}
          />
        )}
        {currentView === 'detail' && selectedInventory && (
          <InventoryDetail
            inventory={selectedInventory.inventory}
            details={selectedInventory.details}
            supplier={selectedInventory.supplier}
            isLoading={isLoading}
            formatVND={formatVND}
            onBack={handleBack}
          />
        )}
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa phiếu nhập này?"
          onConfirm={() => handleDelete(inventoryToDelete)}
          onCancel={handleCancelDelete}
        />
        {toast.show && (
          <CustomToast
            type={toast.type}
            message={toast.message}
            onClose={hideToast}
          />
        )}
      </div>
    </div>
  );
};

export default AdminInventory;