import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  memo,
  useRef,
} from 'react';
import {
  Table,
  Button,
  Spinner,
  Form,
  Row,
  Col,
  Card,
  Badge,
  ProgressBar,
  Alert,
  Modal,
  InputGroup,
} from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Pagination from '../../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../../Components/CustomToast/CustomToast';
import {
  PencilIcon,
  Trash,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  X,
} from 'lucide-react';

import medicineService from '../../services/medicineService'; // Đường dẫn đúng đến file service

// Các hằng số tĩnh
const medicineTypes = [
  'Thuốc viên',
  'Thuốc nước',
  'Thuốc tiêm',
  'Thuốc bột',
  'Thuốc bôi',
  'Thuốc nhỏ mắt',
];

const units = ['Viên', 'Chai', 'Ống', 'Gói', 'Tuýp', 'Lọ'];

const requiredColumns = ['MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity'];

const availableColumns = [
  { value: 'MedicineId', label: 'Mã Thuốc' },
  { value: 'MedicineName', label: 'Tên Thuốc' },
  { value: 'MedicineType', label: 'Loại Thuốc' },
  { value: 'Unit', label: 'Đơn Vị' },
  { value: 'Price', label: 'Giá Bán' },
  { value: 'StockQuantity', label: 'Tồn Kho' },
  { value: 'ExpiryDate', label: 'Hết Hạn' },
  { value: 'LowStockThreshold', label: 'Ngưỡng Thấp' },
  { value: 'Description', label: 'Mô Tả' },
];

const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

// ==================== COMPONENT DANH SÁCH ====================
const MedicineList = memo(
  ({
    medicines,
    isLoading,
    formatVND,
    handleShowDeleteModal,
    handleShowEditForm,
    pageCount,
    currentPage,
    handlePageChange,
    onDownloadTemplate,
    onShowExportModal,
    onShowImport,
    applyFilters,
    clearFilters,
    filters,
    setFilters,
  }) => {
    return (
      <div>
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Danh Sách Thuốc</h3>
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
              <Col md={4}>
                <InputGroup>
                  <InputGroup.Text><Search size={16} /></InputGroup.Text>
                  <Form.Control
                    placeholder="Tìm tên thuốc..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                </InputGroup>
              </Col>

              <Col md={2}>
                <Form.Select
                  value={filters.type || ''}
                  onChange={(e) => applyFilters({ type: e.target.value })}
                >
                  <option value="">Loại</option>
                  {medicineTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={2}>
                <Form.Select
                  value={filters.unit || ''}
                  onChange={(e) => applyFilters({ unit: e.target.value })}
                >
                  <option value="">Đơn vị</option>
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={3}>
                <InputGroup size="sm">
                  <Form.Control
                    type="number"
                    placeholder="Giá từ"
                    value={filters.min_price || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, min_price: e.target.value }))}
                  />
                  <InputGroup.Text>→</InputGroup.Text>
                  <Form.Control
                    type="number"
                    placeholder="Giá đến"
                    value={filters.max_price || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, max_price: e.target.value }))}
                  />
                </InputGroup>
              </Col>

              <Col md={2}>
                <Form.Check
                  type="switch"
                  label="Tồn thấp"
                  checked={filters.low_stock === '1'}
                  onChange={(e) => setFilters((prev) => ({ ...prev, low_stock: e.target.checked ? '1' : '' }))}
                />
              </Col>

              <Col md={2}>
                <Form.Select
                  value={filters.expiry_status || ''}
                  onChange={(e) => applyFilters({ expiry_status: e.target.value })}
                >
                  <option value="">Hết hạn</option>
                  <option value="expired">Đã hết</option>
                  <option value="soon">Sắp hết (≤30 ngày)</option>
                </Form.Select>
              </Col>

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
                <th>Hết Hạn</th>
                <th>Ngưỡng Thấp</th>
                <th>Mô Tả</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="text-center py-4">
                    <Spinner animation="border" />
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-4 text-muted">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                medicines.map((m) => {
                  const expiry = m.ExpiryDate ? new Date(m.ExpiryDate) : null;
                  const today = new Date();
                  const diffDays = expiry ? Math.ceil((expiry - today) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <tr
                      key={m.MedicineId}
                      className={`
                        ${m.StockQuantity < m.LowStockThreshold ? 'table-warning' : ''}
                        ${diffDays !== null && diffDays < 0 ? 'table-danger' : diffDays !== null && diffDays <= 30 ? 'table-warning' : ''}
                      `.trim()}
                    >
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
                      <td>
                        {m.ExpiryDate
                          ? expiry.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '—'}
                      </td>
                      <td><Badge bg="info">{m.LowStockThreshold}</Badge></td>
                      <td title={m.Description}>
                        {m.Description?.length > 30 ? `${m.Description.substring(0, 30)}...` : m.Description || '—'}
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
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {pageCount > 1 && (
          <Pagination pageCount={pageCount} onPageChange={handlePageChange} currentPage={currentPage} isLoading={isLoading} />
        )}
      </div>
    );
  }
);

// ==================== IMPORT MODAL ====================
const ImportModal = ({
  show,
  onHide,
  onDrop,
  uploadErrors,
  previewData,
  headers,
  mapping,
  onMappingChange,
  onDryRun,
  dryRunResult,
  onConfirmImport,
  isProcessing,
  getRootProps,
  getInputProps,
  importFile,
}) => (
  <Modal show={show} onHide={onHide} size="lg">
    <Modal.Header closeButton>
      <Modal.Title>Import Excel</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Card className="mb-3">
        <Card.Body {...getRootProps({ className: 'dropzone p-4 border-dashed border-2 text-center cursor-pointer' })}>
          <input {...getInputProps()} />
          <Upload size={48} className="mb-2" />
          <p>Kéo thả file hoặc click để chọn (.xlsx, .xls, .csv)</p>
          {uploadErrors.map((err, i) => (
            <Alert key={i} variant="danger">{err}</Alert>
          ))}
        </Card.Body>
      </Card>

      {previewData.length > 0 && (
        <Card className="mb-3">
          <Card.Header>Preview 50 Dòng Đầu</Card.Header>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>#</th>
                  {headers.map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, idx) => (
                  <tr key={idx} className={dryRunResult?.errors?.some((e) => e.row === idx + 2) ? 'table-danger' : ''}>
                    <td>{idx + 1}</td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>
                        {cell}
                        {dryRunResult?.errors?.filter((e) => e.row === idx + 2 && e.attribute === headers[cIdx]).map((e) => (
                          <Badge key={e.errors[0]} bg="danger" className="ms-1" title={e.errors.join(', ')}>
                            <XCircle size={12} />
                          </Badge>
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

      {headers.length > 0 && (
        <Card className="mb-3">
          <Card.Header>Mapping Cột</Card.Header>
          <Table>
            <thead>
              <tr><th>Cột Từ File</th><th>Cột Hệ Thống</th></tr>
            </thead>
            <tbody>
              {headers.map((h) => (
                <tr key={h}>
                  <td>{h}</td>
                  <td>
                    <Form.Select value={mapping[h] || ''} onChange={(e) => onMappingChange(h, e.target.value)}>
                      <option value="">Chọn cột</option>
                      {availableColumns.map((col) => (
                        <option key={col.value} value={col.value}>{col.label}</option>
                      ))}
                    </Form.Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Button variant="info" onClick={onDryRun} disabled={!importFile || isProcessing} className="me-3">
        Dry-run Kiểm Tra
      </Button>

      {dryRunResult && (
        <Card className="mb-3">
          <Card.Header>Kết Quả Dry-run</Card.Header>
          <Card.Body>
            <div className="d-flex gap-3 mb-2">
              <Badge bg="success" className="d-flex align-items-center">
                <CheckCircle size={16} className="me-1" /> Thành công: {dryRunResult.success_count}
              </Badge>
              <Badge bg="danger" className="d-flex align-items-center">
                <XCircle size={16} className="me-1" /> Lỗi: {dryRunResult.error_count}
              </Badge>
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
                  <Alert key={idx} variant="danger" className="small mb-1">
                    Hàng {err.row}: {err.errors.join(', ')} (Cột: {err.attribute})
                  </Alert>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      <Button
        variant="primary"
        onClick={onConfirmImport}
        disabled={!dryRunResult || dryRunResult.success_count === 0 || isProcessing}
      >
        Import
      </Button>
    </Modal.Body>
  </Modal>
);

// ==================== EXPORT MODAL ====================
const ExportModal = ({ show, onHide, onExport, filters, onFilterChange, selectedColumns, onColumnChange }) => (
  <Modal show={show} onHide={onHide} size="lg">
    <Modal.Header closeButton>
      <Modal.Title>Tùy Chọn Export</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Bộ Lọc Loại Thuốc</Form.Label>
            <Form.Select value={filters.MedicineType || ''} onChange={(e) => onFilterChange('MedicineType', e.target.value)}>
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

// ==================== FORM THÊM/SỬA ====================
const MedicineForm = forwardRef(
  ({ isEditMode, medicine, onSubmit, onCancel, isLoading, aiEnabled, setAiEnabled, handleSuggest }, ref) => {
    const [errors, setErrors] = useState({});
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [suggestedData, setSuggestedData] = useState(null);
    const [suggestError, setSuggestError] = useState('');

    useImperativeHandle(ref, () => ({
      openSuggestModal: (data, error = '') => {
        setSuggestedData(data);
        setSuggestError(error);
        setShowSuggestModal(true);
      },
    }));

    const validateForm = useCallback((formData) => {
      const newErrors = {};
      let valid = true;

      const name = formData.get('MedicineName')?.trim();
      if (!name) { newErrors.MedicineName = 'Vui lòng nhập tên thuốc'; valid = false; }
      else if (name.length > 100) { newErrors.MedicineName = 'Tên thuốc không quá 100 ký tự'; valid = false; }
      else if (specialCharRegex.test(name) || codePatternRegex.test(name)) {
        newErrors.MedicineName = 'Không nhập ký tự đặc biệt hoặc code'; valid = false;
      }

      const type = formData.get('MedicineType');
      if (!type || !medicineTypes.includes(type)) { newErrors.MedicineType = 'Loại thuốc không hợp lệ'; valid = false; }

      const unit = formData.get('Unit');
      if (!unit || !units.includes(unit)) { newErrors.Unit = 'Đơn vị không hợp lệ'; valid = false; }

      const price = parseFloat(formData.get('Price'));
      if (isNaN(price) || price < 0) { newErrors.Price = 'Giá bán không hợp lệ'; valid = false; }

      const stock = parseInt(formData.get('StockQuantity'));
      if (isNaN(stock) || stock < 0) { newErrors.StockQuantity = 'Tồn kho không hợp lệ'; valid = false; }

      const threshold = parseInt(formData.get('LowStockThreshold'));
      if (isNaN(threshold) || threshold < 1) { newErrors.LowStockThreshold = 'Ngưỡng thấp phải ≥ 1'; valid = false; }

      const expiry = formData.get('ExpiryDate');
      if (expiry) {
        const d = new Date(expiry);
        if (d < new Date()) { newErrors.ExpiryDate = 'Ngày hết hạn không được trong quá khứ'; valid = false; }
      }

      const desc = formData.get('Description')?.trim();
      if (desc && desc.length > 500) { newErrors.Description = 'Mô tả không quá 500 ký tự'; valid = false; }

      setErrors(newErrors);
      return valid;
    }, []);

    const handleSubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (validateForm(fd)) onSubmit(e);
    };

    const handleApprove = () => {
      if (suggestedData) {
        const typeSelect = document.querySelector('select[name="MedicineType"]');
        const unitSelect = document.querySelector('select[name="Unit"]');
        const descTextarea = document.querySelector('textarea[name="Description"]');

        if (typeSelect) typeSelect.value = suggestedData.type;
        if (unitSelect) unitSelect.value = suggestedData.unit;
        if (descTextarea) descTextarea.value = suggestedData.description || '';
      }
      setShowSuggestModal(false);
    };

    return (
      <div>
        <h3>{isEditMode ? 'Sửa Thuốc' : 'Thêm Thuốc Mới'}</h3>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tên Thuốc</Form.Label>
                <InputGroup>
                  <Form.Control
                    name="MedicineName"
                    type="text"
                    defaultValue={isEditMode ? medicine?.MedicineName : ''}
                    placeholder="Nhập tên thuốc"
                    isInvalid={!!errors.MedicineName}
                  />
                  {aiEnabled && (
                    <Button variant="info" onClick={handleSuggest}>Gợi ý AI</Button>
                  )}
                </InputGroup>
                <Form.Text className="text-danger">{errors.MedicineName}</Form.Text>
                <Form.Check
                  type="switch"
                  label="Bật gợi ý AI"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="mt-2"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Loại Thuốc</Form.Label>
                <Form.Select name="MedicineType" defaultValue={isEditMode ? medicine?.MedicineType : ''} isInvalid={!!errors.MedicineType}>
                  <option value="" disabled>Chọn loại</option>
                  {medicineTypes.map((t) => <option key={t} value={t}>{t}</option>)}
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
                <Form.Label>Ngày Hết Hạn</Form.Label>
                <Form.Control
                  type="date"
                  name="ExpiryDate"
                  defaultValue={isEditMode && medicine?.ExpiryDate ? medicine.ExpiryDate.split('T')[0] : ''}
                  isInvalid={!!errors.ExpiryDate}
                />
                <Form.Text className="text-danger">{errors.ExpiryDate}</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Ngưỡng Tồn Kho Thấp</Form.Label>
                <Form.Control
                  type="number"
                  name="LowStockThreshold"
                  defaultValue={isEditMode ? medicine?.LowStockThreshold : 10}
                  min="1"
                  placeholder="Ví dụ: 10"
                  isInvalid={!!errors.LowStockThreshold}
                />
                <Form.Text className="text-danger">{errors.LowStockThreshold}</Form.Text>
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
            {isLoading ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Thêm mới'}
          </Button>
          <Button variant="secondary" onClick={onCancel} className="ms-2">Hủy</Button>
        </Form>

        {/* Modal gợi ý AI */}
        <Modal show={showSuggestModal} onHide={() => setShowSuggestModal(false)}>
          <Modal.Header closeButton><Modal.Title>Gợi Ý AI</Modal.Title></Modal.Header>
          <Modal.Body>
            {suggestError && <Alert variant="warning">{suggestError}</Alert>}
            {suggestedData && (
              <>
                <p><strong>Loại:</strong> {suggestedData.type}</p>
                <p><strong>Đơn vị:</strong> {suggestedData.unit}</p>
                <p><strong>Mô tả:</strong> {suggestedData.description}</p>
                <p><strong>Cảnh báo:</strong> {suggestedData.warnings || 'Không có'}</p>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSuggestModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleApprove} disabled={!!suggestError}>Áp dụng</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
);

// ==================== COMPONENT CHÍNH ====================
const AdminMedicine = () => {
  const [medicines, setMedicines] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });

  const [currentView, setCurrentView] = useState('list'); // list | add | edit
  const [editMedicine, setEditMedicine] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmImportModal, setShowConfirmImportModal] = useState(false);

  const [filters, setFilters] = useState({
    search: '', type: '', unit: '', min_price: '', max_price: '', low_stock: '', expiry_status: '',
  });
  const [filterParams, setFilterParams] = useState('');

  const [importFile, setImportFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState(availableColumns.map((c) => c.value));

  const [aiEnabled, setAiEnabled] = useState(localStorage.getItem('aiEnabled') !== 'false');

  const cache = useRef(new Map());
  const formRef = useRef(null);

  // Toast
  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);
  const hideToast = () => setToast({ show: false, type: 'info', message: '' });

  // Lấy danh sách thuốc
  const fetchMedicines = useCallback(async (page = 1, query = '') => {
    const key = `${page}_${query || 'none'}`;
    if (cache.current.has(key)) {
      const cached = cache.current.get(key);
      setMedicines(cached.data);
      setPageCount(cached.last_page);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const res = await medicineService.getAll(page, query);
      cache.current.set(key, { data: res.data, last_page: res.last_page });
      setMedicines(res.data);
      setPageCount(res.last_page);
      setCurrentPage(page - 1);
    } catch (err) {
      showToast('error', err.message || 'Lỗi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Áp dụng bộ lọc
  const applyFilters = useCallback((updates = {}) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);

    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => v && params.append(k, v));
    const q = params.toString();
    setFilterParams(q);
    fetchMedicines(1, q);
  }, [filters, fetchMedicines]);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', type: '', unit: '', min_price: '', max_price: '', low_stock: '', expiry_status: '' });
    setFilterParams('');
    fetchMedicines(1);
  }, [fetchMedicines]);

  // Xử lý xóa
  const handleDelete = useCallback(async (id) => {
    try {
      setIsLoading(true);
      const res = await medicineService.delete(id);
      showToast('success', res.message || 'Xóa thành công');

      cache.current.clear();
      const currentApiPage = currentPage + 1;
      const data = await medicineService.getAll(currentApiPage, filterParams);

      if (data.data.length === 0 && data.last_page > 0 && currentApiPage > 1) {
        setCurrentPage(data.last_page - 1);
        fetchMedicines(data.last_page, filterParams);
      } else {
        setMedicines(data.data);
        setPageCount(data.last_page);
      }
    } catch (err) {
      showToast('error', err.message || 'Xóa thất bại');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  }, [currentPage, filterParams, fetchMedicines, showToast]);

  // Thêm / Sửa
  const handleAddMedicine = async (e) => {
    const fd = new FormData(e.target);
    const data = {
      MedicineName: fd.get('MedicineName').trim(),
      MedicineType: fd.get('MedicineType'),
      Unit: fd.get('Unit'),
      Price: parseFloat(fd.get('Price')),
      StockQuantity: parseInt(fd.get('StockQuantity')),
      ExpiryDate: fd.get('ExpiryDate') || null,
      LowStockThreshold: parseInt(fd.get('LowStockThreshold')),
      Description: fd.get('Description')?.trim() || '',
    };

    try {
      setIsLoading(true);
      const res = await medicineService.create(data);
      showToast('success', res.message || 'Thêm thành công');
      cache.current.clear();
      fetchMedicines(1, filterParams);
      setCurrentView('list');
    } catch (err) {
      showToast('error', err.message || 'Thêm thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMedicine = async (e) => {
    const fd = new FormData(e.target);
    const data = {
      MedicineName: fd.get('MedicineName').trim(),
      MedicineType: fd.get('MedicineType'),
      Unit: fd.get('Unit'),
      Price: parseFloat(fd.get('Price')),
      StockQuantity: parseInt(fd.get('StockQuantity')),
      ExpiryDate: fd.get('ExpiryDate') || null,
      LowStockThreshold: parseInt(fd.get('LowStockThreshold')),
      Description: fd.get('Description')?.trim() || '',
    };

    try {
      setIsLoading(true);
      const res = await medicineService.update(editMedicine.MedicineId, data);
      showToast('success', res.message || 'Cập nhật thành công');
      cache.current.clear();
      fetchMedicines(currentPage + 1, filterParams);
      setCurrentView('list');
    } catch (err) {
      showToast('error', err.message || 'Cập nhật thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // Export
  const handleExport = async () => {
    try {
      const blob = await medicineService.exportExcel(filters, selectedColumns);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'medicines.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Export thành công');
      setShowExportModal(false);
    } catch (err) {
      showToast('error', err.message || 'Export thất bại');
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const blob = await medicineService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'medicines_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Tải template thành công');
    } catch (err) {
      showToast('error', err.message || 'Tải template thất bại');
    }
  };

  // Import - Dropzone
  const onDrop = useCallback((accepted, rejected) => {
    setUploadErrors([]);
    if (rejected.length > 0) {
      rejected.forEach((f) => f.errors.forEach((e) => setUploadErrors((prev) => [...prev, e.message])));
      return;
    }
    const file = accepted[0];
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 1) throw new Error('File rỗng');

        const header = rows[0];
        setHeaders(header);
        setPreviewData(rows.slice(1, 51));

        // Auto mapping
        const autoMap = {};
        header.forEach((h) => {
          const lower = h.toString().toLowerCase();
          availableColumns.forEach((col) => {
            if (lower.includes(col.value.toLowerCase())) autoMap[h] = col.value;
          });
        });
        setMapping(autoMap);
      } catch (err) {
        setUploadErrors(['Không thể đọc file Excel']);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] },
    maxSize: 10 * 1024 * 1024,
  });

  // Dry-run
  const handleDryRun = async () => {
    if (!importFile) return showToast('warning', 'Chọn file trước');
    const requiredMapped = requiredColumns.every((c) => Object.values(mapping).includes(c));
    if (!requiredMapped) return showToast('warning', 'Cần map đủ các cột bắt buộc');

    try {
      const data = await medicineService.dryRunImport(importFile, mapping);
      setDryRunResult(data);
      showToast('success', 'Dry-run hoàn tất');
    } catch (err) {
      showToast('error', err.message || 'Dry-run thất bại');
    }
  };

  // Import thực tế
  const handleImport = async () => {
    try {
      await medicineService.importExcel(importFile, mapping);
      showToast('success', 'Import thành công');
      cache.current.clear();
      fetchMedicines(1);
      setShowImportModal(false);
      setShowConfirmImportModal(false);
      // Reset import state
      setImportFile(null);
      setPreviewData([]);
      setHeaders([]);
      setMapping({});
      setDryRunResult(null);
      setUploadErrors([]);
    } catch (err) {
      showToast('error', err.message || 'Import thất bại');
    }
  };

  // AI Suggest
  const handleSuggest = async () => {
    const name = document.querySelector('input[name="MedicineName"]')?.value.trim();
    if (!name) return showToast('warning', 'Nhập tên thuốc trước');

    try {
      setIsLoading(true);
      const data = await medicineService.suggestAI(name);

      let error = '';
      if (!medicineTypes.includes(data.type)) error += 'Loại không hợp lệ. ';
      if (!units.includes(data.unit)) error += 'Đơn vị không hợp lệ. ';

      formRef.current?.openSuggestModal(data, error);
    } catch (err) {
      showToast('error', err.message || 'Gợi ý AI lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect load ban đầu
  useEffect(() => {
    if (currentView === 'list') fetchMedicines(1, filterParams);
  }, [currentView, filterParams, fetchMedicines]);

  const formatVND = (price) => Number(price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  return (
    <div className="d-flex">
      <div className="position-relative w-100 flex-grow-1 ms-5 p-4">
        <h1 className="mb-4">Quản Lý Thuốc</h1>

        {currentView === 'list' && (
          <MedicineList
            medicines={medicines}
            isLoading={isLoading}
            formatVND={formatVND}
            handleShowDeleteModal={(id) => { setMedicineToDelete(id); setShowDeleteModal(true); }}
            handleShowEditForm={(m) => { setEditMedicine(m); setCurrentView(m ? 'edit' : 'add'); }}
            pageCount={pageCount}
            currentPage={currentPage}
            handlePageChange={({ selected }) => fetchMedicines(selected + 1, filterParams)}
            onDownloadTemplate={handleDownloadTemplate}
            onShowExportModal={() => setShowExportModal(true)}
            onShowImport={() => setShowImportModal(true)}
            applyFilters={applyFilters}
            clearFilters={clearFilters}
            filters={filters}
            setFilters={setFilters}
          />
        )}

        {(currentView === 'add' || currentView === 'edit') && (
          <MedicineForm
            ref={formRef}
            isEditMode={currentView === 'edit'}
            medicine={editMedicine}
            onSubmit={currentView === 'add' ? handleAddMedicine : handleEditMedicine}
            onCancel={() => { setCurrentView('list'); setEditMedicine(null); }}
            isLoading={isLoading}
            aiEnabled={aiEnabled}
            setAiEnabled={setAiEnabled}
            handleSuggest={handleSuggest}
          />
        )}

        <ExportModal
          show={showExportModal}
          onHide={() => setShowExportModal(false)}
          onExport={handleExport}
          filters={filters}
          onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
          selectedColumns={selectedColumns}
          onColumnChange={(val, checked) => setSelectedColumns(prev => checked ? [...prev, val] : prev.filter(v => v !== val))}
        />

        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa thuốc này?"
          onConfirm={() => handleDelete(medicineToDelete)}
          onCancel={() => setShowDeleteModal(false)}
        />

        <ImportModal
          show={showImportModal}
          onHide={() => setShowImportModal(false)}
          onDrop={onDrop}
          uploadErrors={uploadErrors}
          previewData={previewData}
          headers={headers}
          mapping={mapping}
          onMappingChange={(h, v) => setMapping(prev => ({ ...prev, [h]: v }))}
          onDryRun={handleDryRun}
          dryRunResult={dryRunResult}
          onConfirmImport={() => setShowConfirmImportModal(true)}
          isProcessing={isLoading}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          importFile={importFile}
        />

        <Modal show={showConfirmImportModal} onHide={() => setShowConfirmImportModal(false)}>
          <Modal.Header closeButton><Modal.Title>Xác nhận Import</Modal.Title></Modal.Header>
          <Modal.Body>Bạn chắc chắn muốn import {dryRunResult?.success_count} bản ghi?</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmImportModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleImport}>Import</Button>
          </Modal.Footer>
        </Modal>

        {toast.show && <CustomToast type={toast.type} message={toast.message} onClose={hideToast} />}
      </div>
    </div>
  );
};

export default AdminMedicine;