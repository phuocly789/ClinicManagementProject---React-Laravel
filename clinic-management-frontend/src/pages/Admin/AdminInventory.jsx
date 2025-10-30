import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Table, Button, Spinner, Form, Row, Col, InputGroup } from 'react-bootstrap';
import Pagination from '../../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../../Components/CustomToast/CustomToast';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import { Eye, PencilIcon, Trash, Search, Filter, Calendar, DollarSign, X } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <h3>Đã xảy ra lỗi. Vui lòng thử lại.</h3>;
    }
    return this.props.children;
  }
}

const API_BASE_URL = 'http://localhost:8000';

const loadHtml2Pdf = () => {
  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"]');
    if (existingScript) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    script.onload = resolve;
    document.body.appendChild(script);
  });
};

const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const InventoryList = memo(
  ({
    inventories,
    isLoading,
    formatVND,
    handleShowDeleteModal,
    handleShowDetail,
    handleShowAddInventory,
    handleShowEditForm,
    pageCount,
    currentPage,
    handlePageChange,
    suppliers,
    fetchInventories
  }) => {

    // --- FILTER STATES ---
    const [search, setSearch] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    // --- ÁP DỤNG LỌC - CHỈ KHI NHẤN NÚT HOẶC ENTER ---
    const applyFilters = useCallback(() => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (supplierFilter) params.append('supplier_id', supplierFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);

      fetchInventories(1, params.toString());
    }, [
      search,
      supplierFilter,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      fetchInventories,
    ]);

    // --- XÓA LỌC ---
    const clearFilters = useCallback(() => {
      setSearch('');
      setSupplierFilter('');
      setDateFrom('');
      setDateTo('');
      setMinAmount('');
      setMaxAmount('');
      fetchInventories(1);
    }, [fetchInventories]);

    const handleRowClick = useCallback((inventoryId, e) => {
      if (e.target.closest('button')) return;
      handleShowDetail(inventoryId);
    }, [handleShowDetail]);

    return (
      <div>
        {/* HEADER + ADD BUTTON */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
            Danh Sách Phiếu Nhập Kho
          </h3>
          <Button variant="primary" onClick={handleShowAddInventory}>
            + Thêm Phiếu Nhập
          </Button>
        </div>

        {/* FILTER BAR */}
        <div className="mb-4 p-3 bg-light rounded border">
          <Row className="g-3 align-items-end">
            {/* TÌM KIẾM */}
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Tìm tên nhà cung cấp..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>

            {/* NHÀ CUNG CẤP */}
            <Col md={3}>
              <Form.Select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              >
                <option value="">Tất cả nhà cung cấp</option>
                {suppliers.map((s) => (
                  <option key={s.SupplierId} value={s.SupplierId}>
                    {s.SupplierName}
                  </option>
                ))}
              </Form.Select>
            </Col>

            {/* NGÀY TỪ */}
            <Col md={2}>
              <InputGroup>
                <InputGroup.Text>
                  <Calendar size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </InputGroup>
            </Col>

            {/* NGÀY ĐẾN */}
            <Col md={2}>
              <InputGroup>
                <InputGroup.Text>
                  <Calendar size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </InputGroup>
            </Col>

            {/* NÚT LỌC */}
            <Col md={1}>
              <Button variant="primary" onClick={applyFilters} className="w-100">
                <Filter size={16} />
              </Button>
            </Col>
          </Row>

          {/* LỌC TIỀN */}
          <Row className="g-3 mt-2">
            <Col md={3}>
              <InputGroup size="sm">
                <InputGroup.Text>
                  <DollarSign size={14} />
                </InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Tổng tiền từ"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <InputGroup size="sm">
                <InputGroup.Text>
                  <DollarSign size={14} />
                </InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Tổng tiền đến"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="d-flex justify-content-end">
              <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                <X size={16} /> Xóa bộ lọc
              </Button>
            </Col>
          </Row>
        </div>

        {/* TABLE */}
        <div className="table-responsive">
          <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
            <thead className="table-light">
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
                  <td colSpan="6" className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                  </td>
                </tr>
              ) : inventories.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                inventories.map((inventory) => (
                  <tr
                    key={inventory.id}
                    onClick={(e) => handleRowClick(inventory.id, e)}
                    style={{ cursor: 'pointer' }}
                    className="table-row-hover"
                  >
                    <td>
                      <strong>{inventory.id}</strong>
                    </td>
                    <td>
                      {suppliers.find((s) => s.SupplierId === inventory.supplierId)?.SupplierName ||
                        'N/A'}
                    </td>
                    <td>{new Date(inventory.date).toLocaleDateString('vi-VN')}</td>
                    <td>{formatVND(inventory.total)}</td>
                    <td>
                      {inventory.note ? (
                        <span title={inventory.note}>
                          {inventory.note.length > 30
                            ? inventory.note.substring(0, 30) + '...'
                            : inventory.note}
                        </span>
                      ) : (
                        'Không có'
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-info p-0 me-2"
                        onClick={() => handleShowDetail(inventory.id)}
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-success p-0 me-2"
                        onClick={() => handleShowEditForm(inventory)}
                        title="Sửa"
                      >
                        <PencilIcon size={18} />
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0"
                        onClick={() => handleShowDeleteModal(inventory.id)}
                        title="Xóa"
                      >
                        <Trash size={18} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* PAGINATION */}
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
  }
);

const InventoryForm = memo(({ isEditMode, inventory, onSubmit, onCancel, isLoading, suppliers, medicines, formLoading }) => {
  const [items, setItems] = useState(() => {
    if (!isEditMode) {
      return [{ medicineId: '', quantity: 0, importPrice: 0, subTotal: 0 }];
    }
    return inventory?.details?.length > 0
      ? inventory.details.map(detail => ({
        medicineId: detail.medicineId?.toString() || '',
        quantity: detail.quantity || 0,
        importPrice: detail.price || 0,
        subTotal: detail.subTotal || detail.quantity * detail.price || 0,
      }))
      : [{ medicineId: '', quantity: 0, importPrice: 0, subTotal: 0 }];
  });

  const [errors, setErrors] = useState({
    supplierId: '',
    date: '',
    note: '',
    items: items.map(() => ({ medicineId: '', quantity: '', importPrice: '' })),
  });

  useEffect(() => {
    setErrors(prev => ({
      ...prev,
      items: items.map(() => ({ medicineId: '', quantity: '', importPrice: '' })),
    }));
  }, [items.length]);

  const validateForm = useCallback((formData, items) => {
    const newErrors = {
      supplierId: '',
      date: '',
      note: '',
      items: items.map(() => ({ medicineId: '', quantity: '', importPrice: '' })),
    };
    let isValid = true;

    if (!items || !Array.isArray(items) || items.length === 0) {
      newErrors.items = [{ medicineId: 'Phải có ít nhất một mục thuốc' }];
      isValid = false;
    }

    const supplierId = formData.get('supplierId')?.trim();
    if (!supplierId) {
      newErrors.supplierId = 'Vui lòng chọn nhà cung cấp';
      isValid = false;
    } else if (!suppliers.some(s => s.SupplierId === parseInt(supplierId))) {
      newErrors.supplierId = 'Nhà cung cấp không hợp lệ';
      isValid = false;
    }

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

    items.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        newErrors.items[index].medicineId = 'Mục thuốc không hợp lệ';
        isValid = false;
        return;
      }
      if (!item.medicineId) {
        newErrors.items[index].medicineId = 'Vui lòng chọn thuốc';
        isValid = false;
      } else if (!medicines.some(m => m.MedicineId === parseInt(item.medicineId))) {
        newErrors.items[index].medicineId = 'Thuốc không hợp lệ';
        isValid = false;
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors.items[index].quantity = 'Số lượng phải lớn hơn 0';
        isValid = false;
      }
      if (!item.importPrice || item.importPrice <= 0) {
        newErrors.items[index].importPrice = 'Giá nhập phải lớn hơn 0';
        isValid = false;
      }
    });

    const note = formData.get('note')?.trim();
    if (note && note.length > 255) {
      newErrors.note = 'Ghi chú không được vượt quá 255 ký tự';
      isValid = false;
    } else if (note && (specialCharRegex.test(note) || codePatternRegex.test(note))) {
      newErrors.note = 'Ghi chú không được chứa ký tự đặc biệt hoặc mã lập trình';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [medicines, suppliers]);

  const handleAddItem = useCallback(() => {
    setItems(prev => [...prev, { medicineId: '', quantity: 0, importPrice: 0, subTotal: 0 }]);
  }, []);

  const handleRemoveItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'quantity' || field === 'importPrice') {
        newItems[index].subTotal = (newItems[index].quantity || 0) * (newItems[index].importPrice || 0);
      }
      return newItems;
    });
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (validateForm(formData, items)) {
      const totalAmount = items.reduce((sum, item) => sum + (item.subTotal || 0), 0);
      onSubmit(e, items, totalAmount);
    }
  }, [items, onSubmit, validateForm]);

  if (formLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 className="mb-4">{isEditMode ? 'Sửa Phiếu Nhập' : 'Thêm Phiếu Nhập'}</h2>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Nhà Cung Cấp <span className="text-danger">*</span></Form.Label>
              <Form.Select
                name="supplierId"
                defaultValue={isEditMode ? inventory?.supplierId : ''}
                isInvalid={!!errors.supplierId}
              >
                <option value="" disabled>Chọn nhà cung cấp</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.SupplierId} value={supplier.SupplierId}>
                    {supplier.SupplierName}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.supplierId}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Ngày Nhập <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                name="date"
                defaultValue={isEditMode ? inventory?.date?.split('T')[0] : ''}
                isInvalid={!!errors.date}
                max={new Date().toISOString().split('T')[0]}
              />
              <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label>Ghi Chú</Form.Label>
              <Form.Control
                as="textarea"
                name="note"
                defaultValue={isEditMode ? inventory?.note : ''}
                placeholder="Nhập ghi chú (tùy chọn, tối đa 255 ký tự)"
                rows={4}
                isInvalid={!!errors.note}
              />
              <Form.Control.Feedback type="invalid">{errors.note}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <h3 className="mt-4 mb-3">Chi Tiết Nhập Kho</h3>
        {items.map((item, index) => (
          <div key={index} style={{ border: '1px solid #e0e0e0', padding: '15px', marginBottom: '15px', borderRadius: '6px', position: 'relative' }}>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Tên Thuốc <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name={`medicineId[${index}]`}
                    value={item.medicineId}
                    onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}
                    isInvalid={!!errors.items[index]?.medicineId}
                  >
                    <option value="" disabled>Chọn thuốc</option>
                    {medicines.map((medicine) => (
                      <option key={medicine.MedicineId} value={medicine.MedicineId}>
                        {medicine.MedicineName}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.items[index]?.medicineId}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Số Lượng <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name={`quantity[${index}]`}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="0"
                    isInvalid={!!errors.items[index]?.quantity}
                  />
                  <Form.Control.Feedback type="invalid">{errors.items[index]?.quantity}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Giá Nhập (VNĐ) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name={`importPrice[${index}]`}
                    value={item.importPrice}
                    onChange={(e) => handleItemChange(index, 'importPrice', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                    isInvalid={!!errors.items[index]?.importPrice}
                  />
                  <Form.Control.Feedback type="invalid">{errors.items[index]?.importPrice}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-center">
                {items.length > 1 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    style={{ position: 'absolute', top: '10px', right: '10px' }}
                  >
                    Xóa
                  </Button>
                )}
              </Col>
            </Row>
          </div>
        ))}
        <Button
          variant="success"
          onClick={handleAddItem}
          disabled={isLoading}
          className="mb-3"
        >
          + Thêm Mục
        </Button>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Spinner size="sm" /> : isEditMode ? 'Lưu' : 'Thêm Phiếu Nhập'}
          </Button>
        </div>
      </Form>
    </div>
  );
});

const InventoryDetail = memo(({ inventory, details, supplier, isLoading, formatVND, onBack }) => {

  if (!inventory) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Đang tải chi tiết phiếu nhập...</p>
      </div>
    );
  } else {
    const printableAreaRef = useRef(null);
    console.log(inventory);
    const printPage = useCallback(() => {
      window.print();
    }, []);

    const exportPDF = useCallback(async () => {
      await loadHtml2Pdf();
      const element = printableAreaRef.current;
      const opt = {
        margin: 0.5,
        filename: `PhieuNhapKho_${inventory.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().set(opt).from(element).save();
    }, [inventory.id]);
    return (
      <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 className="mb-4">Chi Tiết Phiếu Nhập Kho</h3>
        <section ref={printableAreaRef}>
          <div style={{ display: 'none', textAlign: 'center', marginBottom: '20px' }} className="print-only">
            <h1 style={{ fontSize: '24px', color: '#00448D' }}>Phiếu Nhập Kho</h1>
            <p>Phòng Khám XYZ</p>
          </div>
          <div className="mb-4">
            <h4>Thông Tin Nhà Cung Cấp</h4>
            <p><strong>Tên Nhà Cung Cấp:</strong> {supplier?.SupplierName || 'N/A'}</p>
            <p><strong>Email:</strong> {supplier?.ContactEmail || 'N/A'}</p>
            <p><strong>Số Điện Thoại:</strong> {supplier?.ContactPhone || 'N/A'}</p>
            <p><strong>Địa Chỉ:</strong> {supplier?.Address || 'N/A'}</p>
            <p><strong>Mô Tả:</strong> {supplier?.Description || 'Không có'}</p>
          </div>
          <div className="mb-4">
            <h4>Thông Tin Phiếu</h4>
            <p><strong>Mã Phiếu:</strong> {inventory?.id || 'N/A'}</p>
            <p><strong>Ngày Nhập:</strong> {inventory?.date ? new Date(inventory.date).toLocaleDateString('vi-VN') : 'N/A'}</p>
            <p><strong>Tổng Tiền:</strong> {formatVND(inventory?.total)}</p>
            <p><strong>Ghi Chú:</strong> {inventory?.note || 'Không có'}</p>
          </div>
          <h4>Danh Sách Thuốc Đã Nhập</h4>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Tên Thuốc</th>
                <th>Số Lượng</th>
                <th>Giá Nhập</th>
                <th>Thành Tiền</th>
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                details.map((detail) => (
                  <tr key={detail.id}>
                    <td>{detail.medicineName || 'N/A'}</td>
                    <td>{detail.quantity}</td>
                    <td>{formatVND(detail.price)}</td>
                    <td>{formatVND(detail.subTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </section>
        <div className="d-flex gap-2 mt-4">
          <Button variant="primary" onClick={printPage}>
            In
          </Button>
          <Button variant="success" onClick={exportPDF}>
            Xuất PDF
          </Button>
          <Button variant="secondary" onClick={onBack}>
            Quay Lại
          </Button>
        </div>
        <style jsx>{`
          @media print {
            .print-only { display: block !important; }
            .no-print { display: none !important; }
            section { padding: 10px; }
            table { font-size: 12px; }
          }
        `}</style>
      </div>
    );
  }

});

const AdminInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [details, setDetails] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [currentView, setCurrentView] = useState('list');
  const [editInventory, setEditInventory] = useState(null);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const cache = useRef(new Map());
  const debounceRef = useRef(null);
  const [filterParams, setFilterParams] = useState('');

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ show: false, type: 'info', message: '' });
  }, []);

  const fetchSuppliers = useCallback(async () => {
    if (suppliers.length > 0) return;
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/suppliers/all`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setSuppliers(data.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      showToast('error', `Lỗi khi tải danh sách nhà cung cấp: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [suppliers.length, showToast]);

  const fetchMedicines = useCallback(async () => {
    if (medicines.length > 0) return;
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/medicines/all`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setMedicines(data || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      showToast('error', `Lỗi khi tải danh sách thuốc: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [medicines.length, showToast]);

  const fetchInventories = useCallback(async (page = 1, queryString = '') => {
    setFilterParams(queryString);
    const cacheKey = `${page}_${queryString}`;
    if (cache.current.has(cacheKey)) {
      const { data, last_page } = cache.current.get(cacheKey);
      setInventories(data);
      setPageCount(last_page);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/import-bills?page=${page}${queryString ? '&' + queryString : ''}`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const paginator = await response.json();
      const mappedData = paginator.data.map(item => ({
        id: item.ImportId,
        supplierId: item.SupplierId,
        date: item.ImportDate,
        total: item.TotalAmount,
        note: item.Notes || '',
      }));
      cache.current.set(cacheKey, { data: mappedData, last_page: paginator.last_page });
      setInventories(mappedData);
      setPageCount(paginator.last_page);
      setCurrentPage(page - 1);
    } catch (error) {
      console.error('Error fetching inventories:', error);
      showToast('error', `Lỗi khi tải danh sách phiếu nhập kho: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchInventoryDetails = useCallback(async (importId) => {
    try {
      setIsLoading(true);
      setFormLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/import-bills/${importId}`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();

      const mappedInventory = {
        id: data.data.ImportId,
        supplierId: data.data.SupplierId,
        date: data.data.ImportDate,
        total: data.data.TotalAmount,
        note: data.data.Notes || '',
        details: data.data.import_details || [],
      };

      const mappedDetails = (data.data.import_details || []).map(detail => ({
        id: detail.ImportDetailId,
        importId: detail.ImportId,
        medicineId: detail.MedicineId,
        medicineName: detail.medicine?.MedicineName || 'N/A',
        quantity: detail.Quantity,
        price: detail.ImportPrice,
        subTotal: detail.SubTotal,
      }));

      const mappedSupplier = data.data.supplier ? {
        SupplierId: data.data.supplier.SupplierId,
        SupplierName: data.data.supplier.SupplierName,
        ContactEmail: data.data.supplier.ContactEmail,
        ContactPhone: data.data.supplier.ContactPhone,
        Address: data.data.supplier.Address,
        Description: data.data.supplier.Description
      } : {};

      // CHỈ SET KHI CÓ DATA
      setSelectedInventory({
        inventory: mappedInventory,
        supplier: mappedSupplier,
        details: mappedDetails
      });

      setDetails(mappedDetails);
      setEditInventory(mappedInventory);

      return mappedInventory; // trả về để handleShowDetail biết thành công
    } catch (error) {
      console.error('Error fetching inventory details:', error);
      showToast('error', `Lỗi khi tải chi tiết phiếu nhập: ${error.message}`);
      return null; // trả về null → handleShowDetail sẽ quay lại list
    } finally {
      setIsLoading(false);
      setFormLoading(false);
    }
  }, [showToast]);

  const getCsrfToken = useCallback(async (retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith('XSRF-TOKEN='))
          ?.split('=')[1];
        if (!token) throw new Error('CSRF token not found in cookies');
        return decodeURIComponent(token);
      } catch (error) {
        console.error(`Attempt ${attempt} to fetch CSRF token failed:`, error);
        if (attempt === retries) throw new Error(`Không thể lấy CSRF token sau ${retries} lần thử: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }, []);

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
    [currentPage, fetchInventories, getCsrfToken, showToast]
  );

  const handleShowDeleteModal = useCallback((inventoryId) => {
    setInventoryToDelete(inventoryId);
    setShowDeleteModal(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setInventoryToDelete(null);
  }, []);

  const handleShowAddInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([fetchSuppliers(), fetchMedicines()]);
      setEditInventory(null);
      setDetails([]);
      setCurrentView('add');
    } catch (error) {
      console.error('Error preparing add inventory form:', error);
      showToast('error', `Lỗi khi hiển thị form thêm phiếu nhập: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSuppliers, fetchMedicines, showToast]);

  const handleShowEditForm = useCallback(async (inventory) => {
    setFormLoading(true);
    setCurrentView('edit');
    await Promise.all([fetchSuppliers(), fetchMedicines()]);
    const fullInventory = await fetchInventoryDetails(inventory.id);
    if (fullInventory) {
      setEditInventory(fullInventory);
    }
  }, [fetchInventoryDetails, fetchSuppliers, fetchMedicines]);

  const handleShowDetail = useCallback(async (inventoryId) => {
    setIsLoading(true);                 // Hiển thị spinner toàn cục
    setCurrentView('detail');           // Chuyển view (OK, sẽ render spinner)

    try {
      const data = await fetchInventoryDetails(inventoryId);
      if (!data) {
        showToast('error', 'Không tìm thấy phiếu nhập');
        setCurrentView('list');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchInventoryDetails, showToast]);

  const handleCancelForm = useCallback(() => {
    setCurrentView('list');
    setEditInventory(null);
    setDetails([]);
    setFormLoading(false);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentView('list');
    setSelectedInventory(null);
    setDetails([]);
  }, []);

  const handleAddInventory = useCallback(async (e, items) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const formData = new FormData(e.target);
      const data = {
        SupplierId: parseInt(formData.get('supplierId')),
        ImportDate: formData.get('date'),
        Notes: formData.get('note')?.trim() || null,
        import_details: items.map(item => ({
          MedicineId: parseInt(item.medicineId),
          Quantity: parseInt(item.quantity),
          ImportPrice: parseFloat(item.importPrice),
        })),
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
        const errorMessage = errorData.errors
          ? Object.values(errorData.errors).flat().join(', ')
          : errorData.message || `Lỗi HTTP! Status: ${response.status}`;
        throw new Error(errorMessage);
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
          ? 'Thêm thất bại: Không thể lấy CSRF token.'
          : `Thêm thất bại: ${error.message.includes('does not exist') ? 'Lỗi cơ sở dữ liệu.' : error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchInventories, getCsrfToken, showToast]);

  const handleEditInventory = useCallback(async (e, items) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const formData = new FormData(e.target);
      const data = {
        SupplierId: parseInt(formData.get('supplierId')),
        ImportDate: formData.get('date'),
        Notes: formData.get('note')?.trim() || null,
        import_details: items.map(item => ({
          MedicineId: parseInt(item.medicineId),
          Quantity: parseInt(item.quantity),
          ImportPrice: parseFloat(item.importPrice),
        })),
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
        const errorMessage = errorData.errors
          ? Object.values(errorData.errors).flat().join(', ')
          : errorData.message || `Lỗi HTTP! Status: ${response.status}`;
        throw new Error(errorMessage);
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
          ? 'Sửa thất bại: Không thể lấy CSRF token.'
          : `Sửa thất bại: ${error.message.includes('does not exist') ? 'Lỗi cơ sở dữ liệu.' : error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, editInventory, fetchInventories, getCsrfToken, showToast]);

  useEffect(() => {
    if (currentView === 'list') {
      fetchInventories(1);
      fetchSuppliers();
      fetchMedicines();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentView, fetchInventories, fetchSuppliers, fetchMedicines]);

  const handlePageChange = useCallback(({ selected }) => {
    const nextPage = selected + 1;
    console.log('Changing to page:', nextPage, 'with filters:', filterParams); // Debug để check filter có giữ không
    fetchInventories(nextPage, filterParams);
  }, [fetchInventories, filterParams]); // Thêm filterParams vào dependency để update khi thay đổi

  const formatVND = useCallback((value) => {
    return Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  }, []);

  return (
    <div className='d-flex'>
      
      <div className='position-relative w-100 flex-grow-1 ms-5 p-4'>
        <h1 className="mb-4" style={{ fontSize: '1.8rem', fontWeight: '600' }}>Quản Lý Kho</h1>
        {currentView === 'list' && (
          <InventoryList
            inventories={inventories}
            isLoading={isLoading}
            formatVND={formatVND}
            handleShowDeleteModal={handleShowDeleteModal}
            handleShowDetail={handleShowDetail}
            handleShowAddInventory={handleShowAddInventory}
            handleShowEditForm={handleShowEditForm}
            pageCount={pageCount}
            currentPage={currentPage}
            handlePageChange={handlePageChange}
            suppliers={suppliers}
            fetchInventories={fetchInventories}
          />
        )}
        {currentView === 'add' && (
          <ErrorBoundary>
            <InventoryForm
              isEditMode={false}
              onSubmit={handleAddInventory}
              onCancel={handleCancelForm}
              isLoading={isLoading}
              suppliers={suppliers}
              medicines={medicines}
              formLoading={formLoading}
            />
          </ErrorBoundary>
        )}
        {currentView === 'edit' && (
          <ErrorBoundary>
            <InventoryForm
              isEditMode={true}
              inventory={editInventory}
              onSubmit={handleEditInventory}
              onCancel={handleCancelForm}
              isLoading={isLoading}
              suppliers={suppliers}
              medicines={medicines}
              formLoading={formLoading}
            />
          </ErrorBoundary>
        )}
        {currentView === 'detail' && (
          <InventoryDetail
            inventory={selectedInventory?.inventory}
            details={selectedInventory?.details || []}
            supplier={selectedInventory?.supplier}
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