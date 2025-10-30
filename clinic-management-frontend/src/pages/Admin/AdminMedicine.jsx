import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Table, Button, Spinner, Form, Row, Col, Card, Badge, ProgressBar, Alert, Modal, InputGroup } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Pagination from '../../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../../Components/CustomToast/CustomToast';
import { PencilIcon, Trash, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Search, X } from 'lucide-react';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';

const API_BASE_URL = 'http://localhost:8000';

// Mảng tĩnh cho Loại Thuốc
const medicineTypes = [
  'Thuốc viên',
  'Thuốc nước',
  'Thuốc tiêm',
  'Thuốc bột',
  'Thuốc bôi',
  'Thuốc nhỏ mắt',
];

// Mảng tĩnh cho Đơn Vị
const units = [
  'Viên',
  'Chai',
  'Ống',
  'Gói',
  'Tuýp',
  'Lọ',
];

// Required columns cho mapping
const requiredColumns = ['MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity'];

// Available columns cho export và mapping
const availableColumns = [
  { value: 'MedicineId', label: 'Mã Thuốc' },
  { value: 'MedicineName', label: 'Tên Thuốc' },
  { value: 'MedicineType', label: 'Loại Thuốc' },
  { value: 'Unit', label: 'Đơn Vị' },
  { value: 'Price', label: 'Giá Bán' },
  { value: 'StockQuantity', label: 'Tồn Kho' },
  { value: 'Description', label: 'Mô Tả' },
];

// Regex kiểm tra ký tự đặc biệt và ngôn ngữ code
const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const MedicineList = memo(({
  medicines, isLoading, formatVND, handleShowDeleteModal, handleShowEditForm,
  pageCount, currentPage, handlePageChange,
  onDownloadTemplate, onShowExportModal, onShowImport,
  applyFilters, clearFilters, filters, setFilters, debounceRef
}) => {
  return (
    <div>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
          Danh Sách Thuốc
        </h3>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={onDownloadTemplate}>
            <Download size={16} className="me-1" /> Tải Template
          </Button>
          <Button variant="success" onClick={onShowExportModal}>
            <FileSpreadsheet size={16} className="me-1" /> Export
          </Button>
          <Button variant="info" onClick={onShowImport}>
            <Upload size={16} className="me-1" /> Import
          </Button>
          <Button variant="primary" onClick={() => handleShowEditForm(null)}>
            + Thêm Thuốc
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="mb-4 p-3 bg-light border">
        <Form onSubmit={(e) => { e.preventDefault(); applyFilters(); }}>
          <Row className="g-3 align-items-end">
            {/* TÌM KIẾM TÊN - DEBOUNCE */}
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                <Form.Control
                  placeholder="Tìm tên thuốc..."
                  value={filters.search || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilters(prev => ({ ...prev, search: value }));
                    // Debounce: chỉ gọi API sau 500ms không gõ
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                      applyFilters({ search: value });
                    }, 500);
                  }}
                />
              </InputGroup>
            </Col>

            {/* LỌC LOẠI */}
            <Col md={2}>
              <Form.Select
                value={filters.type || ''}
                onChange={(e) => applyFilters({ type: e.target.value })}
              >
                <option value="">Loại</option>
                {medicineTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </Col>

            {/* LỌC ĐƠN VỊ */}
            <Col md={2}>
              <Form.Select
                value={filters.unit || ''}
                onChange={(e) => applyFilters({ unit: e.target.value })}
              >
                <option value="">Đơn vị</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </Form.Select>
            </Col>

            {/* KHOẢNG GIÁ */}
            <Col md={3}>
              <InputGroup size="sm">
                <Form.Control
                  type="number"
                  placeholder="Giá từ"
                  value={filters.min_price || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, min_price: e.target.value }))}
                />
                <InputGroup.Text>→</InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Giá đến"
                  value={filters.max_price || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, max_price: e.target.value }))}
                />
              </InputGroup>
            </Col>

            {/* TỒN KHO THẤP */}
            <Col md={2}>
              <Form.Check
                type="switch"
                label="Tồn thấp"
                checked={filters.low_stock === '1'}
                onChange={(e) => setFilters(prev => ({ ...prev, low_stock: e.target.checked ? '1' : '' }))}
              />
            </Col>

            {/* NÚT TÌM KIẾM & XÓA */}
            <Col md={12} className="d-flex gap-2 mt-2">
              <Button type="submit" variant="primary">
                <Search size={16} className="me-1" /> Tìm kiếm
              </Button>
              <Button variant="outline-danger" onClick={clearFilters}>
                <X size={16} className="me-1" /> Xóa bộ lọc
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* TABLE */}
      <div className="table-responsive">
        <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
          <thead className="table-light">
            <tr>
              <th>Mã</th>
              <th>Tên Thuốc</th>
              <th>Loại</th>
              <th>ĐV</th>
              <th>Giá</th>
              <th>Tồn</th>
              <th>Mô Tả</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8" className="text-center py-4"><Spinner animation="border" /></td></tr>
            ) : medicines.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
            ) : (
              medicines.map((m) => (
                <tr key={m.MedicineId}>
                  <td><strong>{m.MedicineId}</strong></td>
                  <td>{m.MedicineName}</td>
                  <td>{m.MedicineType}</td>
                  <td>{m.Unit}</td>
                  <td>{formatVND(m.Price)}</td>
                  <td>
                    <Badge bg={m.StockQuantity < 100 ? 'danger' : m.StockQuantity < 500 ? 'warning' : 'success'}>
                      {m.StockQuantity}
                    </Badge>
                  </td>
                  <td title={m.Description}>
                    {m.Description?.length > 30 ? m.Description.substring(0, 30) + '...' : m.Description || '—'}
                  </td>
                  <td>
                    <Button variant="link" size="sm" className="text-success p-0 me-2" onClick={() => handleShowEditForm(m)}>
                      <PencilIcon size={18} />
                    </Button>
                    <Button variant="link" size="sm" className="text-danger p-0" onClick={() => handleShowDeleteModal(m.MedicineId)}>
                      <Trash size={18} />
                    </Button>
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
});

const ImportModal = ({ show, onHide, onDrop, uploadErrors, previewData, headers, mapping, onMappingChange, onDryRun, dryRunResult, onConfirmImport, isProcessing, getRootProps, getInputProps, importFile }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Import Excel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Drag & Drop + Preview */}
        <Card className="mb-3">
          <Card.Body {...getRootProps({ className: 'dropzone p-4 border-dashed border-2 text-center cursor-pointer' })}>
            <input {...getInputProps()} />
            <Upload size={48} className="mb-2" />
            <p>Kéo thả file hoặc click để chọn (.xlsx, .xls, .csv)</p>
            {uploadErrors.map(err => <Alert variant="danger" key={err}>{err}</Alert>)}
          </Card.Body>
        </Card>

        {/* Preview Table */}
        {previewData.length > 0 && (
          <Card className="mb-3">
            <Card.Header>Preview 50 Dòng Đầu</Card.Header>
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>#</th>
                    {headers.map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className={dryRunResult?.errors?.some(e => e.row === idx + 2) ? 'table-danger' : ''}>
                      <td>{idx + 1}</td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>
                          {cell}
                          {dryRunResult?.errors?.filter(e => e.row === idx + 2 && e.attribute === headers[cIdx]).map(e => (
                            <Badge bg="danger" className="ms-1" key={e.errors[0]} title={e.errors.join(', ')}><XCircle size={12} /></Badge>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        )}

        {/* Mapping */}
        {headers.length > 0 && (
          <Card className="mb-3">
            <Card.Header>Mapping Cột</Card.Header>
            <Table>
              <thead>
                <tr>
                  <th>Cột Từ File</th>
                  <th>Cột Hệ Thống</th>
                </tr>
              </thead>
              <tbody>
                {headers.map(h => (
                  <tr key={h}>
                    <td>{h}</td>
                    <td>
                      <Form.Select value={mapping[h] || ''} onChange={(e) => onMappingChange(h, e.target.value)}>
                        <option value="">Chọn cột</option>
                        {availableColumns.map(col => <option key={col.value} value={col.value}>{col.label}</option>)}
                      </Form.Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}

        {/* Dry-run Button */}
        <Button variant="info" onClick={onDryRun} disabled={!importFile || isProcessing} className="me-3">
          Dry-run Kiểm Tra
        </Button>

        {/* Dry-run Result */}
        {dryRunResult && (
          <Card className="mb-3">
            <Card.Header>Kết Quả Dry-run</Card.Header>
            <Card.Body>
              <div className="d-flex gap-3 mb-2">
                <Badge bg="success" className="d-flex align-items-center"><CheckCircle size={16} className="me-1" /> Thành công: {dryRunResult.success_count}</Badge>
                <Badge bg="danger" className="d-flex align-items-center"><XCircle size={16} className="me-1" /> Lỗi: {dryRunResult.error_count}</Badge>
              </div>
              <ProgressBar
                now={(dryRunResult.success_count / (dryRunResult.success_count + dryRunResult.error_count)) * 100}
                variant="success"
                label={`${Math.round((dryRunResult.success_count / (dryRunResult.success_count + dryRunResult.error_count)) * 100)}%`}
              />
              {dryRunResult.errors.length > 0 && (
                <div className="mt-3">
                  <h6>Lỗi Mẫu (5 đầu):</h6>
                  {dryRunResult.errors.slice(0, 5).map((err, idx) => (
                    <Alert variant="danger" key={idx} className="small mb-1">
                      Hàng {err.row}: {err.errors.join(', ')} (Cột: {err.attribute})
                    </Alert>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        <Button variant="primary" onClick={onConfirmImport} disabled={!dryRunResult || dryRunResult.success_count === 0 || isProcessing}>
          Import
        </Button>
      </Modal.Body>
    </Modal>
  );
};

const ExportModal = ({ show, onHide, onExport, filters, onFilterChange, selectedColumns, onColumnChange }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Tùy Chọn Export</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Bộ Lọc Loại Thuốc</Form.Label>
              <Form.Select
                value={filters.MedicineType || ''}
                onChange={(e) => onFilterChange('MedicineType', e.target.value)}
              >
                <option value="">Tất cả</option>
                {medicineTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Label>Chọn Cột</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {availableColumns.map((col) => (
                <Form.Check
                  type="checkbox"
                  label={col.label}
                  key={col.value}
                  checked={selectedColumns.includes(col.value)}
                  onChange={(e) => onColumnChange(col.value, e.target.checked)}
                  disabled={selectedColumns.length >= 20 && !selectedColumns.includes(col.value)}
                />
              ))}
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Hủy</Button>
        <Button variant="success" onClick={onExport}>
          <FileSpreadsheet size={16} className="me-1" /> Export Excel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const MedicineForm = memo(({ isEditMode, medicine, onSubmit, onCancel, isLoading }) => {
  const [errors, setErrors] = useState({
    MedicineName: '',
    MedicineType: '',
    Unit: '',
    Price: '',
    StockQuantity: '',
    Description: '',
  });

  const validateForm = useCallback((formData) => {
    const newErrors = {};
    let isValid = true;

    // Validate MedicineName
    const medicineName = formData.get('MedicineName')?.trim();
    if (!medicineName) {
      newErrors.MedicineName = 'Vui lòng nhập tên thuốc';
      isValid = false;
    } else if (medicineName.length > 100) {
      newErrors.MedicineName = 'Tên thuốc không được vượt quá 100 ký tự';
      isValid = false;
    } else if (specialCharRegex.test(medicineName) || codePatternRegex.test(medicineName)) {
      newErrors.MedicineName = 'Vui lòng không nhập ký tự đặc biệt hoặc ngôn ngữ code';
      isValid = false;
    }

    // Validate MedicineType
    const medicineType = formData.get('MedicineType');
    if (!medicineType) {
      newErrors.MedicineType = 'Vui lòng chọn loại thuốc';
      isValid = false;
    } else if (!medicineTypes.includes(medicineType)) {
      newErrors.MedicineType = 'Loại thuốc không hợp lệ';
      isValid = false;
    }

    // Validate Unit
    const unit = formData.get('Unit');
    if (!unit) {
      newErrors.Unit = 'Vui lòng chọn đơn vị thuốc';
      isValid = false;
    } else if (!units.includes(unit)) {
      newErrors.Unit = 'Đơn vị thuốc không hợp lệ';
      isValid = false;
    }

    // Validate Price
    const price = formData.get('Price') ? parseFloat(formData.get('Price')) : null;
    if (price === null || isNaN(price)) {
      newErrors.Price = 'Vui lòng nhập giá bán';
      isValid = false;
    } else if (price < 0) {
      newErrors.Price = 'Giá bán không thể âm';
      isValid = false;
    } else if (price.toString().replace('.', '').length > 18) {
      newErrors.Price = 'Giá thuốc không được vượt quá 18 chữ số';
      isValid = false;
    } else if (price.toString().split('.')[1]?.length > 2) {
      newErrors.Price = 'Giá thuốc không được vượt quá 2 chữ số sau dấu phẩy';
      isValid = false;
    }

    // Validate StockQuantity
    const stockQuantity = formData.get('StockQuantity') ? parseInt(formData.get('StockQuantity')) : null;
    if (stockQuantity === null || isNaN(stockQuantity)) {
      newErrors.StockQuantity = 'Vui lòng nhập số lượng tồn kho';
      isValid = false;
    } else if (stockQuantity < 0) {
      newErrors.StockQuantity = 'Tồn kho không thể âm';
      isValid = false;
    }

    // Validate Description
    const description = formData.get('Description')?.trim();
    if (description && description.length > 500) {
      newErrors.Description = 'Mô tả không được vượt quá 500 ký tự';
      isValid = false;
    } else if (description && (specialCharRegex.test(description) || codePatternRegex.test(description))) {
      newErrors.Description = 'Vui lòng không nhập ký tự đặc biệt hoặc ngôn ngữ code';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (validateForm(formData)) {
      onSubmit(e);
    }
  }, [onSubmit, validateForm]);

  return (
    <div>
      <h3>{isEditMode ? 'Sửa Thuốc' : 'Thêm Thuốc Mới'}</h3>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Tên Thuốc</Form.Label>
              <Form.Control
                type="text"
                name="MedicineName"
                defaultValue={isEditMode ? medicine?.MedicineName : ''}
                placeholder="Nhập tên thuốc"
                isInvalid={!!errors.MedicineName}
              />
              <Form.Text className="text-danger">{errors.MedicineName}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Loại Thuốc</Form.Label>
              <Form.Select
                name="MedicineType"
                defaultValue={isEditMode ? medicine?.MedicineType : ''}
                isInvalid={!!errors.MedicineType}
              >
                <option value="" disabled>Chọn loại thuốc</option>
                {medicineTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-danger">{errors.MedicineType}</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Đơn Vị</Form.Label>
              <Form.Select
                name="Unit"
                defaultValue={isEditMode ? medicine?.Unit : ''}
                isInvalid={!!errors.Unit}
              >
                <option value="" disabled>Chọn đơn vị</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-danger">{errors.Unit}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Giá Bán</Form.Label>
              <Form.Control
                type="number"
                name="Price"
                defaultValue={isEditMode ? medicine?.Price : ''}
                placeholder="Nhập giá bán"
                step="0.01"
                isInvalid={!!errors.Price}
              />
              <Form.Text className="text-danger">{errors.Price}</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Tồn Kho</Form.Label>
              <Form.Control
                type="number"
                name="StockQuantity"
                defaultValue={isEditMode ? medicine?.StockQuantity : ''}
                placeholder="Nhập số lượng tồn kho"
                isInvalid={!!errors.StockQuantity}
              />
              <Form.Text className="text-danger">{errors.StockQuantity}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Mô Tả</Form.Label>
              <Form.Control
                as="textarea"
                name="Description"
                defaultValue={isEditMode ? medicine?.Description : ''}
                placeholder="Nhập mô tả"
                isInvalid={!!errors.Description}
              />
              <Form.Text className="text-danger">{errors.Description}</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <Button variant="primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Đang lưu...' : isEditMode ? 'Sửa' : 'Thêm'}
        </Button>
        <Button variant="secondary" onClick={onCancel} className="ms-2">Hủy</Button>
      </Form>
    </div>
  );
});

const AdminMedicine = () => {
  const [medicines, setMedicines] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [currentView, setCurrentView] = useState('list'); // list, add, edit
  const [editMedicine, setEditMedicine] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const cache = useRef(new Map());
  const debounceRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [previewData, setPreviewData] = useState([]); // 50 dòng đầu
  const [headers, setHeaders] = useState([]); // Auto detect header
  const [dryRunResult, setDryRunResult] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState(availableColumns.map(col => col.value)); // Default all
  const [mapping, setMapping] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmImportModal, setShowConfirmImportModal] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    unit: '',
    min_price: '',
    max_price: '',
    low_stock: '',
    threshold: 100
  });
  const [filterParams, setFilterParams] = useState('');

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);


  const fetchMedicines = useCallback(async (page = 1, queryString = '') => {
    const cacheKey = `${page}_${queryString || 'none'}`;
    if (cache.current.has(cacheKey)) {
      const { data, last_page } = cache.current.get(cacheKey);
      setMedicines(data);
      setPageCount(last_page);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}/api/medicines?page=${page}${queryString ? '&' + queryString : ''}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      cache.current.set(cacheKey, { data: res.data, last_page: res.last_page });
      setMedicines(res.data);
      setPageCount(res.last_page);
      setCurrentPage(page - 1);
    } catch (error) {
      showToast('error', `Lỗi tải dữ liệu: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // ÁP DỤNG LỌC
  const applyFilters = useCallback((updates = {}) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);

    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    const query = params.toString();
    setFilterParams(query);
    fetchMedicines(1, query); // Gọi ngay khi nhấn nút hoặc debounce kết thúc
  }, [filters, fetchMedicines]);

  // XÓA LỌC
  const clearFilters = useCallback(() => {
    const reset = { search: '', type: '', unit: '', min_price: '', max_price: '', low_stock: '', threshold: 100 };
    setFilters(reset);
    setFilterParams('');
    fetchMedicines(1);
  }, []);

  const hideToast = useCallback(() => {
    setToast({ show: false, type: 'info', message: '' });
  }, []);

  const handleShowExportModal = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  const getCsrfToken = useCallback(async (retries = 3) => {
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
          .find(row => row.startsWith('XSRF-TOKEN='))
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
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
      }
    }
  }, []);

  const handleDelete = useCallback(async (medicineId) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/medicines/${medicineId}`, {
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
      showToast('success', result.message || 'Xóa thuốc thành công');
      cache.current.delete(currentPage + 1);
      await fetchMedicines(currentPage + 1);
    } catch (error) {
      console.error('Error deleting medicine:', error);
      showToast('error', `Lỗi khi xóa thuốc: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setMedicineToDelete(null);
    }
  }, [currentPage, fetchMedicines, getCsrfToken, showToast]);

  const handleShowDeleteModal = useCallback((medicineId) => {
    setMedicineToDelete(medicineId);
    setShowDeleteModal(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setMedicineToDelete(null);
  }, []);

  const handleShowEditForm = useCallback((medicine) => {
    setEditMedicine(medicine);
    setCurrentView(medicine ? 'edit' : 'add');
  }, []);

  const handleCancelForm = useCallback(() => {
    setCurrentView('list');
    setEditMedicine(null);
  }, []);

  const handleAddMedicine = useCallback(async (e) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const formData = new FormData(e.target);
      const data = {
        MedicineName: formData.get('MedicineName'),
        MedicineType: formData.get('MedicineType'),
        Unit: formData.get('Unit'),
        Price: parseFloat(formData.get('Price')),
        StockQuantity: parseInt(formData.get('StockQuantity')),
        Description: formData.get('Description') || '',
      };

      const response = await fetch(`${API_BASE_URL}/api/medicines`, {
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
      showToast('success', result.message || 'Thêm thuốc thành công');
      cache.current.clear();
      await fetchMedicines(1);
      setCurrentView('list');
    } catch (error) {
      console.error('Error adding medicine:', error);
      showToast('error', error.message.includes('CSRF token')
        ? 'Thêm thất bại: Không thể lấy CSRF token. Vui lòng kiểm tra backend.'
        : `Thêm thất bại: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMedicines, getCsrfToken, showToast]);

  const handleEditMedicine = useCallback(async (e) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const formData = new FormData(e.target);
      const data = {
        MedicineName: formData.get('MedicineName'),
        MedicineType: formData.get('MedicineType'),
        Unit: formData.get('Unit'),
        Price: parseFloat(formData.get('Price')),
        StockQuantity: parseInt(formData.get('StockQuantity')),
        Description: formData.get('Description') || '',
      };

      const response = await fetch(`${API_BASE_URL}/api/medicines/${editMedicine.MedicineId}`, {
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
      showToast('success', result.message || 'Sửa thuốc thành công');
      cache.current.clear();
      await fetchMedicines(currentPage + 1);
      setCurrentView('list');
      setEditMedicine(null);
    } catch (error) {
      console.error('Error editing medicine:', error);
      showToast('error', error.message.includes('CSRF token')
        ? 'Sửa thất bại: Không thể lấy CSRF token. Vui lòng kiểm tra backend.'
        : `Sửa thất bại: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, editMedicine, fetchMedicines, getCsrfToken, showToast]);

  useEffect(() => {
    if (currentView === 'list') {
      fetchMedicines(1, filterParams);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentView, fetchMedicines, filterParams]);

  const handlePageChange = useCallback(({ selected }) => {
    fetchMedicines(selected + 1, filterParams);
  }, [fetchMedicines, filterParams]);

  const formatVND = useCallback((price) => {
    return Number(price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  }, []);

  // Download Template
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const token = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/medicines/template`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'X-XSRF-TOKEN': token,
        },
        credentials: 'include',
      });
      if (response.status === 404) {
        showToast('error', 'Không tìm thấy file template. Vui lòng liên hệ quản trị viên.');
        return;
      }
      if (response.status === 403) {
        showToast('error', 'Bạn không có quyền tải mẫu này.');
        return;
      }
      if (!response.ok) {
        throw new Error('Tải template thất bại');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'medicines_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Tải template thành công');
    } catch (error) {
      showToast('error', 'Tải file thất bại. Kiểm tra kết nối Internet của bạn.');
    }
  }, [getCsrfToken, showToast]);

  // Export
  const handleExport = useCallback(async () => {
    try {
      const token = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/medicines/export?filters=${JSON.stringify(filters)}&columns=${selectedColumns.join(',')}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'X-XSRF-TOKEN': token,
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        showToast('error', errorData.message || 'Export thất bại');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'medicines.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Export thành công');
      setShowExportModal(false); // Ẩn modal sau khi export
    } catch (error) {
      showToast('error', 'Lỗi export: ' + error.message);
    }
  }, [filters, selectedColumns, getCsrfToken, showToast]);

  // Drop File
  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    setUploadErrors([]);
    if (fileRejections.length > 0) {
      fileRejections.forEach(rej => {
        rej.errors.forEach(err => {
          if (err.code === 'file-too-large') setUploadErrors(prev => [...prev, 'File vượt quá dung lượng tối đa (10MB).']);
          if (err.code === 'file-invalid-type') setUploadErrors(prev => [...prev, 'Định dạng file không hợp lệ. Chỉ chấp nhận Excel (.xlsx, .xls, .csv).']);
        });
      });
      return;
    }
    const file = acceptedFiles[0];
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        if (workbook.SheetNames.length === 0) {
          setUploadErrors(['File không chứa dữ liệu nào để xem trước.']);
          return;
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length < 1) {
          setUploadErrors(['File không chứa dữ liệu nào để xem trước.']);
          return;
        }
        const headerRow = rows[0];
        if (headerRow.length === 0) {
          setUploadErrors(['Không tìm thấy dòng tiêu đề (header). Vui lòng thêm dòng tiêu đề ở hàng đầu tiên.']);
          return;
        }
        setHeaders(headerRow);
        setPreviewData(rows.slice(1, 51)); // 50 dòng data
        // Auto map nếu match
        const autoMapping = {};
        headerRow.forEach((h) => {
          const lowerH = h.toLowerCase();
          availableColumns.forEach(col => {
            if (lowerH.includes(col.value.toLowerCase())) autoMapping[h] = col.value;
          });
        });
        setMapping(autoMapping);
      } catch (err) {
        setUploadErrors(['Không thể đọc nội dung file. Vui lòng kiểm tra lại file Excel của bạn.']);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  // Dry-run
  const handleDryRun = useCallback(async () => {
    if (!importFile) {
      showToast('error', 'Vui lòng chọn file trước khi thực hiện kiểm tra.');
      return;
    }
    // Kiểm tra mapping required
    const mappedRequired = requiredColumns.every(req => Object.values(mapping).includes(req));
    if (!mappedRequired) {
      showToast('error', 'Vui lòng map đầy đủ các cột bắt buộc trước khi kiểm tra.');
      return;
    }

    try {
      const token = await getCsrfToken();
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('mapping', JSON.stringify(mapping));
      const response = await fetch(`${API_BASE_URL}/api/medicines/dry-run`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': token,
        },
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) showToast('error', 'Bạn đã vượt giới hạn thao tác. Vui lòng thử lại sau 5 phút.');
        else if (response.status === 403) showToast('error', 'Bạn không có quyền thực hiện hành động này.');
        else if (response.status === 500) showToast('error', 'Không thể xử lý file do lỗi hệ thống. Vui lòng thử lại sau.');
        else throw new Error(errorData.message || 'Dry-run thất bại');
      }
      const data = await response.json();
      setDryRunResult(data);
      showToast('success', 'Dry-run hoàn tất');
    } catch (error) {
      showToast('error', 'Hệ thống đang xử lý lâu hơn dự kiến. Vui lòng thử lại sau ít phút.');
    }
  }, [importFile, mapping, getCsrfToken, showToast]);

  // Confirm Import
  const handleConfirmImport = useCallback(async () => {
    setShowConfirmImportModal(true);
  }, []);

  // Import
  const handleImport = useCallback(async () => {
    setShowConfirmImportModal(false);
    try {
      const token = await getCsrfToken();
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('mapping', JSON.stringify(mapping));
      const response = await fetch(`${API_BASE_URL}/api/medicines/import`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': token,
        },
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        showToast('error', errorData.message || 'Import thất bại');
        return;
      }
      showToast('success', 'Import thành công');
      cache.current.clear();
      fetchMedicines(1);
      setShowImportModal(false);
      setImportFile(null);
      setPreviewData([]);
      setHeaders([]);
      setDryRunResult(null);
      setMapping({});
      setUploadErrors([]);
    } catch (error) {
      showToast('error', 'Lỗi import: ' + error.message);
    }
  }, [importFile, mapping, getCsrfToken, showToast, fetchMedicines]);

  const handleColumnChange = useCallback((value, checked) => {
    setSelectedColumns(prev => checked ? [...prev, value] : prev.filter(v => v !== value));
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleMappingChange = useCallback((userHeader, systemCol) => {
    setMapping(prev => ({ ...prev, [userHeader]: systemCol }));
  }, []);

  const handleShowImport = useCallback(() => {
    setShowImportModal(true);
  }, []);

  const handleCloseImport = useCallback(() => {
    setShowImportModal(false);
    setImportFile(null);
    setPreviewData([]);
    setHeaders([]);
    setDryRunResult(null);
    setMapping({});
    setUploadErrors([]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, noClick: !showImportModal }); // Chỉ active drop khi modal open

  return (
    <div className="d-flex"> 
      <div className="position-relative w-100 flex-grow-1 ms-5 p-4">
        <h1 className="mb-4">Quản Lý Thuốc</h1>
        {currentView === 'list' && (
          <MedicineList
            medicines={medicines}
            isLoading={isLoading}
            formatVND={formatVND}
            handleShowDeleteModal={handleShowDeleteModal}
            handleShowEditForm={handleShowEditForm}
            pageCount={pageCount}
            currentPage={currentPage}
            handlePageChange={handlePageChange}
            onDownloadTemplate={handleDownloadTemplate}
            onShowExportModal={handleShowExportModal}
            onShowImport={handleShowImport}
            applyFilters={applyFilters}
            clearFilters={clearFilters}
            filters={filters}
            setFilters={setFilters}
            debounceRef={debounceRef}
          />
        )}
        {currentView === 'add' && (
          <MedicineForm
            isEditMode={false}
            onSubmit={handleAddMedicine}
            onCancel={handleCancelForm}
            isLoading={isLoading}
          />
        )}
        {currentView === 'edit' && (
          <MedicineForm
            isEditMode={true}
            medicine={editMedicine}
            onSubmit={handleEditMedicine}
            onCancel={handleCancelForm}
            isLoading={isLoading}
          />
        )}
        <ExportModal
          show={showExportModal}
          onHide={handleCloseExportModal}
          onExport={handleExport}
          filters={filters}
          onFilterChange={handleFilterChange}
          selectedColumns={selectedColumns}
          onColumnChange={handleColumnChange}
        />
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa thuốc này?"
          onConfirm={() => handleDelete(medicineToDelete)}
          onCancel={handleCancelDelete}
        />
        <ImportModal
          show={showImportModal}
          onHide={handleCloseImport}
          onDrop={onDrop}
          uploadErrors={uploadErrors}
          previewData={previewData}
          headers={headers}
          mapping={mapping}
          onMappingChange={handleMappingChange}
          onDryRun={handleDryRun}
          dryRunResult={dryRunResult}
          onConfirmImport={handleConfirmImport}
          isProcessing={isLoading}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          importFile={importFile}
        />
        <Modal show={showConfirmImportModal} onHide={() => setShowConfirmImportModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Xác Nhận Import</Modal.Title>
          </Modal.Header>
          <Modal.Body>Bạn chắc chắn muốn import {dryRunResult?.success_count} bản ghi?</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmImportModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleImport}>Import</Button>
          </Modal.Footer>
        </Modal>
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

export default AdminMedicine;