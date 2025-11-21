import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../App.css';
import Pagination from '../../Components/Pagination/Pagination';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import {
  BiPlus, BiPencil, BiTrash, BiSearch, BiDownload, BiUpload,
  BiExport, BiImport, BiFilter, BiX, BiCalendar, BiDollar,
  BiPackage, BiCheckShield, BiError
} from 'react-icons/bi';
import * as XLSX from 'xlsx';
import medicineService from '../../services/medicineService';

const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const medicineTypes = [
  'Thuốc viên',
  'Chống viêm không steroid',
  'Kháng sinh',
  'Ức chế bơm proton',
  'Điều trị tiểu đường',
  'Chẹn kênh canxi',
  'Chẹn thụ thể angiotensin',
  'Statin',
  'Chống kết tập tiểu cầu',
  'Thuốc giãn phế quản',
  'Corticosteroid',
  'Hormone tuyến giáp',
  'Lợi tiểu',
  'Chống đông máu',
  'Ức chế men chuyển',
  'An thần',
  'Chống trầm cảm',
  'Chống co giật',
  'Kháng virus',
  'Điều trị ung thư'
];

const units = ['Viên', 'Chai', 'Ống', 'Gói', 'Tuýp', 'Lọ','Hộp'];

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

const requiredColumns = ['MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity'];

const AdminMedicine = () => {
  const [medicines, setMedicines] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [modal, setModal] = useState({ type: null, medicine: null });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    unit: '',
    min_price: '',
    max_price: '',
    low_stock: '',
    expiry_status: ''
  });
  const [filterParams, setFilterParams] = useState('');
  const [formData, setFormData] = useState({
    MedicineName: '',
    MedicineType: '',
    Unit: '',
    Price: '',
    StockQuantity: '',
    ExpiryDate: '',
    LowStockThreshold: '10',
    Description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [nearExpiryCount, setNearExpiryCount] = useState(0);

  // New state for enhanced import/export
  const [previewData, setPreviewData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [uploadErrors, setUploadErrors] = useState([]);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState(availableColumns.map((c) => c.value));
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConfirmImportModal, setShowConfirmImportModal] = useState(false);

  const cache = useRef(new Map());
  const fileInputRef = useRef(null);

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
      setTotalItems(cached.total || 0);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const res = await medicineService.getAll(page, query);
      cache.current.set(key, {
        data: res.data,
        last_page: res.last_page,
        total: res.total || 0
      });
      setMedicines(res.data);
      setPageCount(res.last_page);
      setTotalItems(res.total || 0);
      setCurrentPage(page - 1);

      // Tính toán số lượng cảnh báo
      calculateAlerts(res.data);
    } catch (err) {
      showToast('error', err.message || 'Lỗi tải dữ liệu thuốc');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Tính toán cảnh báo
  const calculateAlerts = (medicinesList) => {
    const lowStock = medicinesList.filter(medicine =>
      medicine.StockQuantity < medicine.LowStockThreshold
    ).length;

    const today = new Date();
    const nearExpiry = medicinesList.filter(medicine => {
      if (!medicine.ExpiryDate) return false;
      const expiry = new Date(medicine.ExpiryDate);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0;
    }).length;

    setLowStockCount(lowStock);
    setNearExpiryCount(nearExpiry);
  };

  // Áp dụng bộ lọc
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.type.trim()) params.append('type', filters.type.trim());
    if (filters.unit.trim()) params.append('unit', filters.unit.trim());
    if (filters.min_price.trim()) params.append('min_price', filters.min_price.trim());
    if (filters.max_price.trim()) params.append('max_price', filters.max_price.trim());
    if (filters.low_stock.trim()) params.append('low_stock', filters.low_stock.trim());
    if (filters.expiry_status.trim()) params.append('expiry_status', filters.expiry_status.trim());

    const q = params.toString();
    setFilterParams(q);
    fetchMedicines(1, q);
  }, [filters, fetchMedicines]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      type: '',
      unit: '',
      min_price: '',
      max_price: '',
      low_stock: '',
      expiry_status: ''
    });
    setFilterParams('');
    setShowAdvancedFilter(false);
    fetchMedicines(1);
  }, [fetchMedicines]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setModal({ type: null, medicine: null });
    setFormData({
      MedicineName: '',
      MedicineType: '',
      Unit: '',
      Price: '',
      StockQuantity: '',
      ExpiryDate: '',
      LowStockThreshold: '10',
      Description: ''
    });
    setFormErrors({});
    setImportFile(null);
    setImportProgress(0);
    // Reset import state
    setPreviewData([]);
    setHeaders([]);
    setMapping({});
    setDryRunResult(null);
    setUploadErrors([]);
    setShowExportModal(false);
    setShowConfirmImportModal(false);
  };

  const handleOpenModal = (type, medicine = null) => {
    setModal({ type, medicine });
    setFormErrors({});

    if (type === 'add') {
      setFormData({
        MedicineName: '',
        MedicineType: '',
        Unit: '',
        Price: '',
        StockQuantity: '',
        ExpiryDate: '',
        LowStockThreshold: '10',
        Description: ''
      });
    } else if (type === 'edit' && medicine) {
      setFormData({
        MedicineName: medicine.MedicineName || '',
        MedicineType: medicine.MedicineType || '',
        Unit: medicine.Unit || '',
        Price: medicine.Price?.toString() || '',
        StockQuantity: medicine.StockQuantity?.toString() || '',
        ExpiryDate: medicine.ExpiryDate ? medicine.ExpiryDate.split('T')[0] : '',
        LowStockThreshold: medicine.LowStockThreshold?.toString() || '10',
        Description: medicine.Description || ''
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.MedicineName?.trim()) {
      errors.MedicineName = 'Tên thuốc là bắt buộc';
    } else if (formData.MedicineName.length > 100) {
      errors.MedicineName = 'Tên thuốc không quá 100 ký tự';
    } else if (specialCharRegex.test(formData.MedicineName) || codePatternRegex.test(formData.MedicineName)) {
      errors.MedicineName = 'Không được chứa ký tự đặc biệt hoặc mã code';
    }

    if (!formData.MedicineType?.trim()) {
      errors.MedicineType = 'Loại thuốc là bắt buộc';
    } else if (!medicineTypes.includes(formData.MedicineType)) {
      errors.MedicineType = 'Loại thuốc không hợp lệ';
    }

    if (!formData.Unit?.trim()) {
      errors.Unit = 'Đơn vị là bắt buộc';
    } else if (!units.includes(formData.Unit)) {
      errors.Unit = 'Đơn vị không hợp lệ';
    }

    if (!formData.Price) {
      errors.Price = 'Giá bán là bắt buộc';
    } else if (parseFloat(formData.Price) < 0) {
      errors.Price = 'Giá bán không hợp lệ';
    }

    if (!formData.StockQuantity) {
      errors.StockQuantity = 'Tồn kho là bắt buộc';
    } else if (parseInt(formData.StockQuantity) < 0) {
      errors.StockQuantity = 'Tồn kho không hợp lệ';
    }

    if (!formData.LowStockThreshold) {
      errors.LowStockThreshold = 'Ngưỡng tồn kho thấp là bắt buộc';
    } else if (parseInt(formData.LowStockThreshold) < 1) {
      errors.LowStockThreshold = 'Ngưỡng tồn kho thấp phải ≥ 1';
    }

    if (formData.ExpiryDate) {
      const expiryDate = new Date(formData.ExpiryDate);
      const today = new Date();
      if (expiryDate < today) {
        errors.ExpiryDate = 'Ngày hết hạn không được trong quá khứ';
      }
    }

    if (formData.Description && formData.Description.length > 500) {
      errors.Description = 'Mô tả không quá 500 ký tự';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Vui lòng kiểm tra lại thông tin nhập vào.');
      return;
    }

    setIsLoading(true);
    const { type, medicine } = modal;
    const isEditing = type === 'edit';

    try {
      const medicineData = {
        MedicineName: formData.MedicineName.trim(),
        MedicineType: formData.MedicineType,
        Unit: formData.Unit,
        Price: parseFloat(formData.Price),
        StockQuantity: parseInt(formData.StockQuantity),
        ExpiryDate: formData.ExpiryDate || null,
        LowStockThreshold: parseInt(formData.LowStockThreshold),
        Description: formData.Description?.trim() || null,
      };

      if (isEditing) {
        await medicineService.update(medicine.MedicineId, medicineData);
      } else {
        await medicineService.create(medicineData);
      }

      showToast('success', `Thuốc đã được ${isEditing ? 'cập nhật' : 'thêm mới'} thành công!`);
      handleCloseModal();

      cache.current.clear();
      fetchMedicines(1, filterParams);
    } catch (error) {
      console.error(`Lỗi khi ${isEditing ? 'cập nhật' : 'thêm'} thuốc:`, error);
      const errorMessage = error.response?.data?.message || `Lỗi khi ${isEditing ? 'cập nhật' : 'thêm'} thuốc`;
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMedicine = async () => {
    if (!modal.medicine) return;

    setIsLoading(true);
    try {
      await medicineService.delete(modal.medicine.MedicineId);
      showToast('success', 'Xóa thuốc thành công!');
      handleCloseModal();

      cache.current.clear();
      fetchMedicines(1, filterParams);
    } catch (error) {
      console.error('Lỗi khi xóa thuốc:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi xóa thuốc';
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sửa hàm handleExportExcel
  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      const response = await medicineService.exportExcel(filters, selectedColumns);

      // Kiểm tra nếu blob là text (lỗi) thì báo
      const text = await response.text();
      if (text.includes('<html') || text.includes('{"message"') || text.includes('error')) {
        showToast('error', 'Lỗi xuất file: ' + text.substring(0, 200));
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh_sach_thuoc_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showToast('success', 'Xuất Excel thành công!');
    } catch (err) {
      showToast('error', 'Xuất Excel thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsLoading(false);
    }
  };

  // Download Template
  const handleDownloadTemplate = async () => {
    try {
      const response = await medicineService.downloadTemplate();

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_import_thuoc.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('success', 'Tải template thành công!');
    } catch (error) {
      console.error('Lỗi khi tải template:', error);
      showToast('error', 'Lỗi khi tải template');
    }
  };

  // Enhanced Import Excel with mapping
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

      if (!validTypes.includes(fileExtension)) {
        showToast('error', 'Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV');
        e.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'File không được vượt quá 10MB');
        e.target.value = '';
        return;
      }

      setImportFile(file);
      setUploadErrors([]);

      // Read and preview file
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
    }
  };

  // Dry-run import
  const handleDryRun = async () => {
    if (!importFile) {
      showToast('warning', 'Chọn file trước');
      return;
    }

    const requiredMapped = requiredColumns.every((c) => Object.values(mapping).includes(c));
    if (!requiredMapped) {
      showToast('warning', 'Cần map đủ các cột bắt buộc: Tên thuốc, Loại thuốc, Đơn vị, Giá bán, Tồn kho');
      return;
    }

    try {
      setIsLoading(true);
      const data = await medicineService.dryRunImport(importFile, mapping);
      setDryRunResult(data);
      showToast('success', 'Dry-run hoàn tất');
    } catch (err) {
      showToast('error', err.message || 'Dry-run thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Import Excel
  const handleImportExcel = async () => {
    if (!importFile) {
      showToast('error', 'Chọn file đi bạn ơi');
      return;
    }

    const requiredMapped = requiredColumns.every((c) => Object.values(mapping).includes(c));
    if (!requiredMapped) {
      showToast('warning', 'Cần map đủ các cột bắt buộc: Tên thuốc, Loại thuốc, Đơn vị, Giá bán, Tồn kho');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      await medicineService.importExcel(importFile, mapping, (percent) => {
        setImportProgress(percent);
      });

      showToast('success', 'Import thành công! Đã thêm mới thuốc.');
      handleCloseModal();
      cache.current.clear();
      fetchMedicines(1, filterParams);
    } catch (error) {
      const msg = error.response?.data?.message ||
        error.response?.data?.error ||
        'Import thất bại. Kiểm tra file và thử lại.';
      showToast('error', msg);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleMappingChange = (header, value) => {
    setMapping(prev => ({ ...prev, [header]: value }));
  };

  const handleColumnChange = (value, checked) => {
    setSelectedColumns(prev =>
      checked ? [...prev, value] : prev.filter(v => v !== value)
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getStockStatus = (stock, threshold) => {
    if (stock < threshold) return { badge: 'bg-danger', text: 'Sắp hết', isLow: true };
    if (stock < threshold * 2) return { badge: 'bg-warning', text: 'Đủ dùng', isLow: false };
    return { badge: 'bg-success', text: 'Dồi dào', isLow: false };
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { badge: 'bg-secondary', text: 'Không có', isExpired: false, isNearExpiry: false };

    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { badge: 'bg-danger', text: 'Đã hết hạn', isExpired: true, isNearExpiry: false };
    if (diffDays <= 30) return { badge: 'bg-warning', text: 'Sắp hết hạn', isExpired: false, isNearExpiry: true };
    return { badge: 'bg-success', text: 'Còn hạn', isExpired: false, isNearExpiry: false };
  };

  // Render modal function
  const renderModal = () => {
    if (!modal.type) return null;

    const modalLayout = (title, body, footer, maxWidth = '700px') => (
      <>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" onClick={handleCloseModal}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">{title}</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">{body}</div>
              {footer && <div className="modal-footer">{footer}</div>}
            </div>
          </div>
        </div>
      </>
    );

    switch (modal.type) {
      case 'add':
      case 'edit':
        const isEditing = modal.type === 'edit';
        return modalLayout(
          isEditing ? 'Cập Nhật Thông Tin Thuốc' : 'Thêm Thuốc Mới',
          <form onSubmit={handleFormSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">
                    Tên thuốc <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="MedicineName"
                    value={formData.MedicineName}
                    onChange={(e) => setFormData(prev => ({ ...prev, MedicineName: e.target.value }))}
                    className={`form-control ${formErrors.MedicineName ? 'is-invalid' : ''}`}
                    placeholder="Nhập tên thuốc..."
                    required
                  />
                  {formErrors.MedicineName && <div className="invalid-feedback">{formErrors.MedicineName}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Loại thuốc <span className="text-danger">*</span>
                  </label>
                  <select
                    name="MedicineType"
                    value={formData.MedicineType || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, MedicineType: e.target.value }))}
                    className={`form-select ${formErrors.MedicineType ? 'is-invalid' : ''}`}
                    required
                  >
                    <option value="">Chọn loại thuốc</option>
                    {medicineTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {formErrors.MedicineType && <div className="invalid-feedback">{formErrors.MedicineType}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Đơn vị <span className="text-danger">*</span>
                  </label>
                  <select
                    name="Unit"
                    value={formData.Unit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, Unit: e.target.value }))}
                    className={`form-select ${formErrors.Unit ? 'is-invalid' : ''}`}
                    required
                  >
                    <option value="">Chọn đơn vị</option>
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  {formErrors.Unit && <div className="invalid-feedback">{formErrors.Unit}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Giá bán (VND) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    name="Price"
                    value={formData.Price}
                    onChange={(e) => setFormData(prev => ({ ...prev, Price: e.target.value }))}
                    className={`form-control ${formErrors.Price ? 'is-invalid' : ''}`}
                    placeholder="Nhập giá bán..."
                    min="0"
                    step="1000"
                    required
                  />
                  {formErrors.Price && <div className="invalid-feedback">{formErrors.Price}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Tồn kho <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    name="StockQuantity"
                    value={formData.StockQuantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, StockQuantity: e.target.value }))}
                    className={`form-control ${formErrors.StockQuantity ? 'is-invalid' : ''}`}
                    placeholder="Nhập số lượng tồn kho..."
                    min="0"
                    required
                  />
                  {formErrors.StockQuantity && <div className="invalid-feedback">{formErrors.StockQuantity}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Ngưỡng tồn kho thấp <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    name="LowStockThreshold"
                    value={formData.LowStockThreshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, LowStockThreshold: e.target.value }))}
                    className={`form-control ${formErrors.LowStockThreshold ? 'is-invalid' : ''}`}
                    placeholder="Nhập ngưỡng tồn kho thấp..."
                    min="1"
                    required
                  />
                  {formErrors.LowStockThreshold && <div className="invalid-feedback">{formErrors.LowStockThreshold}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Ngày hết hạn</label>
                  <input
                    type="date"
                    name="ExpiryDate"
                    value={formData.ExpiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, ExpiryDate: e.target.value }))}
                    className={`form-control ${formErrors.ExpiryDate ? 'is-invalid' : ''}`}
                  />
                  {formErrors.ExpiryDate && <div className="invalid-feedback">{formErrors.ExpiryDate}</div>}
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    name="Description"
                    value={formData.Description}
                    onChange={(e) => setFormData(prev => ({ ...prev, Description: e.target.value }))}
                    className={`form-control ${formErrors.Description ? 'is-invalid' : ''}`}
                    rows="3"
                    placeholder="Nhập mô tả thuốc..."
                  />
                  {formErrors.Description && <div className="invalid-feedback">{formErrors.Description}</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : (isEditing ? 'Cập Nhật' : 'Thêm Mới')}
              </button>
            </div>
          </form>,
          null
        );

      case 'delete':
        return modalLayout(
          'Xác Nhận Xóa',
          <>
            <p>Bạn có chắc chắn muốn xóa thuốc <strong>"{modal.medicine.MedicineName}"</strong>?</p>
            <p className="text-muted small">Hành động này không thể hoàn tác.</p>
          </>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
            <button className="btn btn-danger" onClick={handleDeleteMedicine} disabled={isLoading}>
              {isLoading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
            </button>
          </>,
          '450px'
        );

      case 'import':
        return modalLayout(
          'Import Dữ Liệu Thuốc',
          <div>
            <div className="alert alert-info">
              <h6 className="alert-heading">Hướng dẫn Import</h6>
              <ul className="mb-0 small">
                <li>File phải có định dạng Excel (.xlsx, .xls) hoặc CSV</li>
                <li>Dung lượng file không quá 10MB</li>
                <li>Tải template mẫu để biết cấu trúc dữ liệu</li>
                <li>Dữ liệu sẽ được thêm mới, không cập nhật trùng lặp</li>
              </ul>
            </div>

            <div className="mb-3">
              <label className="form-label">Chọn file để import</label>
              <input
                ref={fileInputRef}
                type="file"
                className="form-control"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isImporting}
              />
              <div className="form-text">
                Chấp nhận: .xlsx, .xls, .csv (tối đa 10MB)
              </div>
            </div>

            {uploadErrors.length > 0 && (
              <div className="alert alert-danger">
                {uploadErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}

            {importFile && (
              <div className="alert alert-success">
                <strong>File đã chọn:</strong> {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}

            {/* Preview Data */}
            {previewData.length > 0 && (
              <div className="mb-3">
                <h6>Preview 50 Dòng Đầu</h6>
                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
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
                                <span key={e.errors[0]} className="badge bg-danger ms-1" title={e.errors.join(', ')}>
                                  ⚠️
                                </span>
                              ))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mapping */}
            {headers.length > 0 && (
              <div className="mb-3">
                <h6>Mapping Cột</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Cột Từ File</th>
                        <th>Cột Hệ Thống</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headers.map((h) => (
                        <tr key={h}>
                          <td>{h}</td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={mapping[h] || ''}
                              onChange={(e) => handleMappingChange(h, e.target.value)}
                            >
                              <option value="">Chọn cột</option>
                              {availableColumns.map((col) => (
                                <option key={col.value} value={col.value}>{col.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dry Run Results */}
            {dryRunResult && (
              <div className="mb-3">
                <h6>Kết Quả Dry-run</h6>
                <div className="d-flex gap-3 mb-2">
                  <span className="badge bg-success d-flex align-items-center">
                    ✅ Thành công: {dryRunResult.success_count}
                  </span>
                  <span className="badge bg-danger d-flex align-items-center">
                    ❌ Lỗi: {dryRunResult.error_count}
                  </span>
                </div>
                <div className="progress mb-2">
                  <div
                    className="progress-bar progress-bar-striped"
                    role="progressbar"
                    style={{
                      width: `${(dryRunResult.success_count / (dryRunResult.success_count + dryRunResult.error_count)) * 100}%`
                    }}
                  >
                    {Math.round((dryRunResult.success_count / (dryRunResult.success_count + dryRunResult.error_count)) * 100)}%
                  </div>
                </div>
                {dryRunResult.errors.length > 0 && (
                  <div>
                    <h6>Lỗi Mẫu (5 đầu):</h6>
                    {dryRunResult.errors.slice(0, 5).map((err, idx) => (
                      <div key={idx} className="alert alert-danger small mb-1">
                        Hàng {err.row}: {err.errors.join(', ')} (Cột: {err.attribute})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isImporting && (
              <div className="mb-3">
                <label className="form-label">Tiến trình import</label>
                <div className="progress">
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${importProgress}%` }}
                  >
                    {importProgress}%
                  </div>
                </div>
              </div>
            )}

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                onClick={handleDownloadTemplate}
                disabled={isImporting}
              >
                <BiDownload className="me-1" /> Tải Template
              </button>
              <button
                className="btn btn-outline-info"
                onClick={handleDryRun}
                disabled={!importFile || isImporting}
              >
                Dry-run Kiểm Tra
              </button>
            </div>
          </div>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal} disabled={isImporting}>
              Hủy
            </button>
            <button
              className="btn btn-success"
              onClick={() => setShowConfirmImportModal(true)}
              disabled={!dryRunResult || dryRunResult.success_count === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Đang Import...
                </>
              ) : (
                <>
                  <BiUpload className="me-1" /> Import Dữ Liệu
                </>
              )}
            </button>
          </>,
          '800px'
        );

      case 'export':
        return modalLayout(
          'Tùy Chọn Export',
          <div>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Bộ Lọc Loại Thuốc</label>
                  <select
                    className="form-select"
                    value={filters.type || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="">Tất cả</option>
                    {medicineTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Chọn Cột</label>
                  <div className="d-flex flex-wrap gap-2">
                    {availableColumns.map((col) => (
                      <div key={col.value} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`col-${col.value}`}
                          checked={selectedColumns.includes(col.value)}
                          onChange={(e) => handleColumnChange(col.value, e.target.checked)}
                          disabled={selectedColumns.length >= 20 && !selectedColumns.includes(col.value)}
                        />
                        <label className="form-check-label small" htmlFor={`col-${col.value}`}>
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <small className="text-muted">Tối đa 20 cột</small>
                </div>
              </div>
            </div>
          </div>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>
              Hủy
            </button>
            <button className="btn btn-success" onClick={handleExportExcel}>
              <BiExport className="me-1" /> Export Excel
            </button>
          </>,
          '700px'
        );

      default:
        return null;
    }
  };

  // Confirm Import Modal
  const renderConfirmImportModal = () => {
    if (!showConfirmImportModal) return null;

    return (
      <>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" onClick={() => setShowConfirmImportModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">Xác nhận Import</h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmImportModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Bạn chắc chắn muốn import {dryRunResult?.success_count} bản ghi?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowConfirmImportModal(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleImportExcel}>Import</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Effect load ban đầu
  useEffect(() => {
    fetchMedicines(1, filterParams);
  }, [fetchMedicines, filterParams]);

  return (
    <div className="d-flex vh-100">
      <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4 overflow-hidden">
        {toast.show && (
          <CustomToast
            type={toast.type}
            message={toast.message}
            onClose={hideToast}
          />
        )}

        {/* Header với thống kê - fixed height */}
        <header className="d-flex justify-content-between align-items-center flex-shrink-0">
          <div>
            <h1 className="h4 mb-1 fw-bold text-dark">Quản Lý Thuốc</h1>
            <div className="d-flex gap-3 text-sm">
              <span className="text-muted">
                <BiPackage className="me-1" /> Tổng: <strong>{totalItems}</strong> thuốc
              </span>
              {lowStockCount > 0 && (
                <span className="text-warning">
                  <BiError className="me-1" /> Sắp hết: <strong>{lowStockCount}</strong>
                </span>
              )}
              {nearExpiryCount > 0 && (
                <span className="text-danger">
                  <BiCalendar className="me-1" /> Sắp hết hạn: <strong>{nearExpiryCount}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-success d-flex align-items-center gap-2"
              onClick={() => setModal({ type: 'export' })}
              disabled={isLoading}
            >
              <BiExport size={18} /> Export Excel
            </button>
            <button
              className="btn btn-info d-flex align-items-center gap-2"
              onClick={() => handleOpenModal('import')}
              disabled={isLoading}
            >
              <BiImport size={18} /> Import
            </button>
            <button
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={() => handleOpenModal('add')}
              disabled={isLoading}
            >
              <BiPlus size={18} /> Thêm Thuốc
            </button>
          </div>
        </header>

        {/* Bộ lọc đơn giản - fixed height */}
        <div className="card shadow-sm border-0 flex-shrink-0">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label small text-muted mb-1">Tìm kiếm thuốc</label>
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <BiSearch className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tên thuốc..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="col-md-3">
                <label className="form-label small text-muted mb-1">Loại thuốc</label>
                <select
                  className="form-select"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  disabled={isLoading}
                >
                  <option value="">Tất cả loại</option>
                  {medicineTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label small text-muted mb-1">Đơn vị</label>
                <select
                  className="form-select"
                  value={filters.unit}
                  onChange={(e) => setFilters(prev => ({ ...prev, unit: e.target.value }))}
                  disabled={isLoading}
                >
                  <option value="">Tất cả đơn vị</option>
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2 d-flex gap-2">
                <button
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={applyFilters}
                  disabled={isLoading}
                >
                  <BiFilter size={16} /> Lọc
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                  disabled={isLoading}
                  title="Lọc nâng cao"
                >
                  <BiSearch size={16} />
                </button>
              </div>
            </div>

            {/* Lọc nâng cao */}
            {showAdvancedFilter && (
              <div className="row g-3 mt-3 pt-3 border-top">
                <div className="col-md-4">
                  <label className="form-label small text-muted mb-1">Khoảng giá</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">
                      <BiDollar />
                    </span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Từ"
                      value={filters.min_price}
                      onChange={(e) => setFilters(prev => ({ ...prev, min_price: e.target.value }))}
                      disabled={isLoading}
                    />
                    <span className="input-group-text">-</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Đến"
                      value={filters.max_price}
                      onChange={(e) => setFilters(prev => ({ ...prev, max_price: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="col-md-3">
                  <label className="form-label small text-muted mb-1">Tình trạng tồn kho</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.low_stock}
                    onChange={(e) => setFilters(prev => ({ ...prev, low_stock: e.target.value }))}
                    disabled={isLoading}
                  >
                    <option value="">Tất cả</option>
                    <option value="1">Sắp hết hàng</option>
                    <option value="0">Đủ hàng</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small text-muted mb-1">Hạn sử dụng</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.expiry_status}
                    onChange={(e) => setFilters(prev => ({ ...prev, expiry_status: e.target.value }))}
                    disabled={isLoading}
                  >
                    <option value="">Tất cả</option>
                    <option value="expired">Đã hết hạn</option>
                    <option value="soon">Sắp hết hạn</option>
                    <option value="valid">Còn hạn</option>
                  </select>
                </div>

                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
                    onClick={clearFilters}
                    disabled={isLoading}
                  >
                    <BiX size={16} /> Xóa lọc
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bảng dữ liệu - chiếm không gian còn lại */}
        <div className="card shadow-sm border-0 flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          {isLoading ? (
            <div className="d-flex align-items-center justify-content-center flex-grow-1">
              <Loading isLoading={isLoading} />
            </div>
          ) : (
            <>
              <div className="card-header bg-white border-0 flex-shrink-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-muted">
                    Danh sách thuốc ({totalItems} kết quả)
                  </h6>
                  <small className="text-muted">
                    Trang {currentPage + 1} / {pageCount}
                  </small>
                </div>
              </div>

              <div className="table-responsive flex-grow-1" style={{ overflow: 'auto' }}>
                <table className="table table-hover mb-0 clinic-table">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Mã</th>
                      <th>Tên Thuốc</th>
                      <th>Loại</th>
                      <th>Đơn Vị</th>
                      <th className="text-end">Giá Bán</th>
                      <th className="text-center">Tồn Kho</th>
                      <th className="text-center">Hết Hạn</th>
                      <th className="text-center">Ngưỡng</th>
                      <th>Mô Tả</th>
                      <th className="text-center pe-4">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.length > 0 ? medicines.map(medicine => {
                      const stockStatus = getStockStatus(medicine.StockQuantity, medicine.LowStockThreshold);
                      const expiryStatus = getExpiryStatus(medicine.ExpiryDate);

                      return (
                        <tr
                          key={medicine.MedicineId}
                          className={`
                          ${stockStatus.isLow ? 'table-warning' : ''}
                          ${expiryStatus.isExpired ? 'table-danger' : expiryStatus.isNearExpiry ? 'table-warning' : ''}
                          table-row-hover
                        `.trim()}
                        >
                          <td className="ps-4">
                            <span className="fw-bold text-primary">#{medicine.MedicineId}</span>
                          </td>
                          <td className="fw-semibold">{medicine.MedicineName}</td>
                          <td>
                            <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                              {medicine.MedicineType}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-secondary bg-opacity-10 text-secondary">
                              {medicine.Unit}
                            </span>
                          </td>
                          <td className="text-end fw-bold text-success">
                            {formatPrice(medicine.Price)}
                          </td>
                          <td className="text-center">
                            <span className={`badge ${stockStatus.badge}`}>
                              {medicine.StockQuantity}
                              {stockStatus.isLow && ' ⚠️'}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={`badge ${expiryStatus.badge}`}>
                              {medicine.ExpiryDate
                                ? new Date(medicine.ExpiryDate).toLocaleDateString('vi-VN')
                                : '—'
                              }
                              {expiryStatus.isExpired && ' ⚠️'}
                              {expiryStatus.isNearExpiry && ' ⏳'}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-warning bg-opacity-10 text-warning">
                              {medicine.LowStockThreshold}
                            </span>
                          </td>
                          <td>
                            <div
                              className="text-truncate"
                              style={{ maxWidth: '200px' }}
                              title={medicine.Description}
                            >
                              {medicine.Description || '—'}
                            </div>
                          </td>
                          <td className="text-center pe-4">
                            <div className="d-flex gap-1 justify-content-center">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                title="Sửa"
                                onClick={() => handleOpenModal('edit', medicine)}
                                disabled={isLoading}
                              >
                                <BiPencil size={14} />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Xóa"
                                onClick={() => handleOpenModal('delete', medicine)}
                                disabled={isLoading}
                              >
                                <BiTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="10" className="text-center p-5 text-muted">
                          <BiSearch size={48} className="mb-3 opacity-50" />
                          <p className="mb-0 fs-5">Không tìm thấy thuốc</p>
                          <small>Thử thay đổi bộ lọc hoặc thêm thuốc mới</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PHÂN TRANG */}
              {pageCount > 1 && (
                <div className="card-footer bg-white border-0 flex-shrink-0">
                  <Pagination
                    pageCount={pageCount}
                    onPageChange={({ selected }) => fetchMedicines(selected + 1, filterParams)}
                    currentPage={currentPage}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {renderModal()}
        {renderConfirmImportModal()}
      </main>
    </div>
  );
};

export default AdminMedicine;