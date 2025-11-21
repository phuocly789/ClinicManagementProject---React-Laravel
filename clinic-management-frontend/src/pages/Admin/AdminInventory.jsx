import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../App.css';
import Pagination from '../../Components/Pagination/Pagination';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import { BiPlus, BiSearch, BiFilter, BiCalendar, BiDollar, BiX, BiDetail, BiAdjust } from 'react-icons/bi';

// Import service
import { getSuppliers, getMedicines, getInventories, getInventoryDetails, addInventory } from '../../services/inventoryService';
import { Edit2Icon, Eye, Settings } from 'lucide-react';

const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

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

const AdminInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [filters, setFilters] = useState({
    search: '',
    supplier_id: '',
    date_from: '',
    date_to: '',
    min_amount: '',
    max_amount: ''
  });
  const [filterParams, setFilterParams] = useState('');
  const [modal, setModal] = useState({ type: null, inventory: null });
  const [formData, setFormData] = useState({
    supplierId: '',
    date: '',
    note: '',
    items: [{ medicineId: '', quantity: 0, importPrice: 0, subTotal: 0 }]
  });
  const [formErrors, setFormErrors] = useState({});
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('import'); // 'import' hoặc 'export'

  const cache = useRef(new Map());

  // Toast
  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);

  const hideToast = () => setToast({ show: false, type: 'info', message: '' });

  // Lấy danh sách phiếu nhập
  const fetchInventories = useCallback(async (page = 1, query = '') => {
    const key = `${page}_${query || 'none'}`;
    if (cache.current.has(key)) {
      const cached = cache.current.get(key);
      setInventories(cached.data);
      setPageCount(cached.last_page);
      setTotalItems(cached.total || 0);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const res = await getInventories(page, query);

      const mappedData = res.data.map(item => ({
        id: item.ImportId,
        supplierId: item.SupplierId,
        date: item.ImportDate,
        total: item.TotalAmount,
        note: item.Notes || '',
        status: item.Status || 'active' // Giả sử có trường status
      }));

      cache.current.set(key, {
        data: mappedData,
        last_page: res.last_page,
        total: res.total || 0
      });
      setInventories(mappedData);
      setPageCount(res.last_page);
      setTotalItems(res.total || 0);
      setCurrentPage(page - 1);
    } catch (err) {
      showToast('error', err.message || 'Lỗi tải dữ liệu phiếu nhập');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Lấy danh sách nhà cung cấp
  const fetchSuppliers = useCallback(async () => {
    if (suppliers.length > 0) return; // Đã có data thì không fetch lại
    try {
      const res = await getSuppliers();
      setSuppliers(res.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      showToast('error', `Lỗi khi tải danh sách nhà cung cấp: ${error.message}`);
    }
  }, [suppliers.length, showToast]);

  // Lấy danh sách thuốc
  const fetchMedicines = useCallback(async () => {
    if (medicines.length > 0) return;
    try {
      const res = await getMedicines();
      setMedicines(res || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      showToast('error', `Lỗi khi tải danh sách thuốc: ${error.message}`);
    }
  }, [medicines.length, showToast]);

  // Lấy chi tiết phiếu nhập
  const fetchInventoryDetails = useCallback(async (importId) => {
    try {
      setIsLoading(true);
      const res = await getInventoryDetails(importId);

      const mappedInventory = {
        id: res.data.ImportId,
        supplierId: res.data.SupplierId,
        date: res.data.ImportDate,
        total: res.data.TotalAmount,
        note: res.data.Notes || '',
        details: res.data.import_details || [],
        status: res.data.Status || 'active'
      };

      const mappedDetails = (res.data.import_details || []).map(detail => ({
        id: detail.ImportDetailId,
        importId: detail.ImportId,
        medicineId: detail.MedicineId,
        medicineName: detail.medicine?.MedicineName || 'N/A',
        quantity: detail.Quantity,
        price: detail.ImportPrice,
        subTotal: detail.SubTotal,
      }));

      const mappedSupplier = res.data.supplier ? {
        SupplierId: res.data.supplier.SupplierId,
        SupplierName: res.data.supplier.SupplierName,
        ContactEmail: res.data.supplier.ContactEmail,
        ContactPhone: res.data.supplier.ContactPhone,
        Address: res.data.supplier.Address,
        Description: res.data.supplier.Description
      } : {};

      return {
        inventory: mappedInventory,
        supplier: mappedSupplier,
        details: mappedDetails
      };
    } catch (error) {
      console.error('Error fetching inventory details:', error);
      showToast('error', `Lỗi khi tải chi tiết phiếu nhập: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Áp dụng bộ lọc
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.supplier_id.trim()) params.append('supplier_id', filters.supplier_id.trim());
    if (filters.date_from.trim()) params.append('date_from', filters.date_from.trim());
    if (filters.date_to.trim()) params.append('date_to', filters.date_to.trim());
    if (filters.min_amount.trim()) params.append('min_amount', filters.min_amount.trim());
    if (filters.max_amount.trim()) params.append('max_amount', filters.max_amount.trim());

    const q = params.toString();
    setFilterParams(q);
    fetchInventories(1, q);
  }, [filters, fetchInventories]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      supplier_id: '',
      date_from: '',
      date_to: '',
      min_amount: '',
      max_amount: ''
    });
    setFilterParams('');
    fetchInventories(1);
  }, [fetchInventories]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setModal({ type: null, inventory: null });
    setFormData({
      supplierId: '',
      date: '',
      note: '',
      items: [{ medicineId: '', quantity: 0, importPrice: 0, subTotal: 0 }]
    });
    setFormErrors({});
    setSelectedInventory(null);
    setAdjustmentType('import');
  };

  const handleOpenModal = async (type, inventory = null) => {
    setModal({ type, inventory });
    setFormErrors({});

    // Chỉ fetch suppliers và medicines nếu chưa có
    if (suppliers.length === 0) await fetchSuppliers();
    if (medicines.length === 0) await fetchMedicines();

    if (type === 'add') {
      setFormData({
        supplierId: '',
        date: '',
        note: '',
        items: [{ medicineId: '', quantity: 0, importPrice: 0, subTotal: 0 }]
      });
    } else if (type === 'detail' && inventory) {
      // Không set loading ở đây, để component tự xử lý
      const fullInventory = await fetchInventoryDetails(inventory.id);
      setSelectedInventory(fullInventory);
    } else if (type === 'adjustment' && inventory) {
      const fullInventory = await fetchInventoryDetails(inventory.id);
      setSelectedInventory(fullInventory);
      // Tự động tạo form điều chỉnh dựa trên phiếu gốc
      if (fullInventory) {
        setFormData({
          supplierId: fullInventory.inventory.supplierId?.toString() || '',
          date: new Date().toISOString().split('T')[0],
          note: `Điều chỉnh từ phiếu nhập #${fullInventory.inventory.id}`,
          items: fullInventory.details.map(detail => ({
            medicineId: detail.medicineId.toString(),
            quantity: 0,
            importPrice: detail.price,
            subTotal: 0,
          }))

        });
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'quantity' || field === 'importPrice') {
        newItems[index].subTotal = (newItems[index].quantity || 0) * (newItems[index].importPrice || 0);
      }

      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { medicineId: '', quantity: 0, importPrice: 0, subTotal: 0 }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.supplierId?.trim()) {
      errors.supplierId = 'Vui lòng chọn nhà cung cấp';
    } else if (!suppliers.some(s => s.SupplierId === parseInt(formData.supplierId))) {
      errors.supplierId = 'Nhà cung cấp không hợp lệ';
    }

    if (!formData.date?.trim()) {
      errors.date = 'Vui lòng chọn ngày nhập';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      if (selectedDate > today) {
        errors.date = 'Ngày nhập không thể là ngày trong tương lai';
      }
    }

    if (!formData.items || !Array.isArray(formData.items) || formData.items.length === 0) {
      errors.items = 'Phải có ít nhất một mục thuốc';
    }

    formData.items.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        if (!errors.items) errors.items = [];
        errors.items[index] = { medicineId: 'Mục thuốc không hợp lệ' };
        return;
      }

      if (!item.medicineId) {
        if (!errors.items) errors.items = [];
        errors.items[index] = { ...errors.items[index], medicineId: 'Vui lòng chọn thuốc' };
      } else if (!medicines.some(m => m.MedicineId === parseInt(item.medicineId))) {
        if (!errors.items) errors.items = [];
        errors.items[index] = { ...errors.items[index], medicineId: 'Thuốc không hợp lệ' };
      }

      if (modal.type === 'adjustment') {
        // Đối với phiếu điều chỉnh, số lượng có thể âm (xuất) hoặc dương (nhập)
        if (item.quantity === undefined || item.quantity === null || item.quantity === '') {
          if (!errors.items) errors.items = [];
          errors.items[index] = { ...errors.items[index], quantity: 'Số lượng điều chỉnh không được để trống' };
        }
      } else {
        // Đối với phiếu nhập thông thường, số lượng phải > 0
        if (!item.quantity || item.quantity <= 0) {
          if (!errors.items) errors.items = [];
          errors.items[index] = { ...errors.items[index], quantity: 'Số lượng phải lớn hơn 0' };
        }
      }

      if (!item.importPrice || item.importPrice <= 0) {
        if (!errors.items) errors.items = [];
        errors.items[index] = { ...errors.items[index], importPrice: 'Giá nhập phải lớn hơn 0' };
      }
    });

    if (formData.note && formData.note.length > 255) {
      errors.note = 'Ghi chú không được vượt quá 255 ký tự';
    } else if (formData.note && (specialCharRegex.test(formData.note) || codePatternRegex.test(formData.note))) {
      errors.note = 'Ghi chú không được chứa ký tự đặc biệt hoặc mã lập trình';
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
    const { type } = modal;

    try {
      const inventoryData = {
        SupplierId: parseInt(formData.supplierId),
        ImportDate: formData.date,
        Notes: formData.note?.trim() || null,
        import_details: formData.items.map(item => ({
          MedicineId: parseInt(item.medicineId),
          Quantity: parseInt(item.quantity),
          ImportPrice: parseFloat(item.importPrice),
        })),
        // Thêm trường để phân biệt phiếu điều chỉnh
        IsAdjustment: type === 'adjustment',
        AdjustmentType: type === 'adjustment' ? adjustmentType : null,
        OriginalImportId: type === 'adjustment' ? modal.inventory.id : null
      };

      await addInventory(inventoryData);

      const successMessage = type === 'adjustment'
        ? `Phiếu ${adjustmentType === 'import' ? 'nhập bù' : 'xuất điều chỉnh'} đã được tạo thành công!`
        : 'Phiếu nhập đã được thêm mới thành công!';

      showToast('success', successMessage);
      handleCloseModal();

      // Làm mới danh sách
      cache.current.clear();
      fetchInventories(1);
    } catch (error) {
      console.error(`Lỗi khi ${type === 'adjustment' ? 'tạo phiếu điều chỉnh' : 'thêm phiếu nhập'}:`, error);
      const errorMessage = error.message.includes('CSRF token')
        ? 'Thất bại: Không thể lấy CSRF token.'
        : `Thất bại: ${error.message.includes('does not exist') ? 'Lỗi cơ sở dữ liệu.' : error.message}`;
      showToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Kiểm tra xem phiếu nhập có thể điều chỉnh không
  const canAdjustInventory = (inventory) => {
    // Logic kiểm tra: không thể điều chỉnh nếu phiếu đã cân kho hoặc đã sử dụng
    // Giả sử có trường status để kiểm tra
    return inventory.status === 'active'; // Chỉ cho phép điều chỉnh phiếu active
  };

  const formatVND = (value) => {
    return Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const getSupplierName = (supplierId) => {
    return suppliers.find(s => s.SupplierId === supplierId)?.SupplierName || 'N/A';
  };

  const getInventoryStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'bg-success', text: 'Active' },
      balanced: { class: 'bg-info', text: 'Đã cân kho' },
      used: { class: 'bg-warning', text: 'Đã sử dụng' },
      adjusted: { class: 'bg-secondary', text: 'Đã điều chỉnh' }
    };

    const config = statusConfig[status] || statusConfig.active;
    return <span className={`badge ${config.class}`}>{config.text}</span>;
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
        return modalLayout(
          'Thêm Phiếu Nhập Mới',
          <form onSubmit={handleFormSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Nhà cung cấp <span className="text-danger">*</span>
                  </label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleFormChange}
                    className={`form-select ${formErrors.supplierId ? 'is-invalid' : ''}`}
                    required
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.SupplierId} value={supplier.SupplierId}>
                        {supplier.SupplierName}
                      </option>
                    ))}
                  </select>
                  {formErrors.supplierId && <div className="invalid-feedback">{formErrors.supplierId}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Ngày nhập <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    className={`form-control ${formErrors.date ? 'is-invalid' : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                  {formErrors.date && <div className="invalid-feedback">{formErrors.date}</div>}
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Ghi chú</label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleFormChange}
                    className={`form-control ${formErrors.note ? 'is-invalid' : ''}`}
                    rows="3"
                    placeholder="Nhập ghi chú (tùy chọn, tối đa 255 ký tự)"
                  />
                  {formErrors.note && <div className="invalid-feedback">{formErrors.note}</div>}
                </div>
              </div>
            </div>

            <h6 className="mt-4 mb-3">Chi Tiết Nhập Kho</h6>
            {formData.items.map((item, index) => (
              <div key={index} className="border rounded p-3 mb-3 position-relative">
                <div className="row g-3">
                  <div className="col-md-5">
                    <div className="mb-3">
                      <label className="form-label">
                        Tên thuốc <span className="text-danger">*</span>
                      </label>
                      <select
                        value={item.medicineId}
                        onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}
                        className={`form-select ${formErrors.items?.[index]?.medicineId ? 'is-invalid' : ''}`}
                        required
                      >
                        <option value="">Chọn thuốc</option>
                        {medicines.map(medicine => (
                          <option key={medicine.MedicineId} value={medicine.MedicineId}>
                            {medicine.MedicineName}
                          </option>
                        ))}
                      </select>
                      {formErrors.items?.[index]?.medicineId && (
                        <div className="invalid-feedback">{formErrors.items[index].medicineId}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Số lượng <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className={`form-control ${formErrors.items?.[index]?.quantity ? 'is-invalid' : ''}`}
                        min="1"
                        required
                      />
                      {formErrors.items?.[index]?.quantity && (
                        <div className="invalid-feedback">{formErrors.items[index].quantity}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">
                        Giá nhập (VNĐ) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.importPrice}
                        onChange={(e) => handleItemChange(index, 'importPrice', parseFloat(e.target.value) || 0)}
                        className={`form-control ${formErrors.items?.[index]?.importPrice ? 'is-invalid' : ''}`}
                        step="0.01"
                        min="0"
                        required
                      />
                      {formErrors.items?.[index]?.importPrice && (
                        <div className="invalid-feedback">{formErrors.items[index].importPrice}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-1 d-flex align-items-end">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <BiX />
                      </button>
                    )}
                  </div>
                </div>
                <div className="row">
                  <div className="col-12">
                    <small className="text-muted">
                      Thành tiền: <strong>{formatVND(item.subTotal)}</strong>
                    </small>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-success btn-sm mb-3"
              onClick={handleAddItem}
              disabled={isLoading}
            >
              <BiPlus size={16} /> Thêm mục
            </button>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Thêm Phiếu Nhập'}
              </button>
            </div>
          </form>,
          null,
          '900px'
        );

      case 'adjustment':
        if (!selectedInventory) {
          return modalLayout(
            'Tạo Phiếu Điều Chỉnh',
            <div className="text-center py-4">
              {/* <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div> */}
              <p className="mt-2">Đang tải Phiếu Điều Chỉnh...</p>
            </div>,
            null,
            '500px'
          );
        }
        console.log('Phiếu điều chỉnh' + medicines.find(m => m.MedicineId === 1)?.MedicineName);
        
        return modalLayout(
          'Tạo Phiếu Điều Chỉnh',
          <form onSubmit={handleFormSubmit}>
            <div className="alert alert-info">
              <small>
                <strong>Điều chỉnh phiếu nhập:</strong> #{selectedInventory.inventory.id} -
                Ngày: {new Date(selectedInventory.inventory.date).toLocaleDateString('vi-VN')} -
                Nhà cung cấp: {selectedInventory.supplier?.SupplierName}
              </small>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Loại điều chỉnh <span className="text-danger">*</span>
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="import">Phiếu nhập bù (Thêm hàng)</option>
                    <option value="export">Phiếu xuất điều chỉnh (Giảm hàng)</option>
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Ngày điều chỉnh <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    className={`form-control ${formErrors.date ? 'is-invalid' : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                  {formErrors.date && <div className="invalid-feedback">{formErrors.date}</div>}
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Ghi chú điều chỉnh</label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleFormChange}
                    className={`form-control ${formErrors.note ? 'is-invalid' : ''}`}
                    rows="3"
                    placeholder="Mô tả lý do điều chỉnh..."
                  />
                  {formErrors.note && <div className="invalid-feedback">{formErrors.note}</div>}
                </div>
              </div>
            </div>

            <h6 className="mt-4 mb-3">Chi Tiết Điều Chỉnh</h6>
            {formData.items.map((item, index) => {
              const originalDetail = selectedInventory.details.find(
                d => d.medicineId === parseInt(item.medicineId)
              );

              return (
                <div key={index} className="border rounded p-3 mb-3 position-relative">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">
                          Tên thuốc <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={medicines.find(m => m.MedicineId === parseInt(item.medicineId))?.MedicineName || 'Đang tải...'}
                          readOnly
                        />
                        <small className="text-muted">
                          Số lượng gốc: {originalDetail?.quantity || 0} | Giá gốc: {formatVND(originalDetail?.price || 0)}
                        </small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Số lượng {adjustmentType === 'import' ? 'thêm' : 'giảm'} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          className={`form-control ${formErrors.items?.[index]?.quantity ? 'is-invalid' : ''}`}
                          min={adjustmentType === 'export' ? undefined : "1"}
                          required
                        />
                        {formErrors.items?.[index]?.quantity && (
                          <div className="invalid-feedback">{formErrors.items[index].quantity}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Giá nhập (VNĐ) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          value={item.importPrice}
                          onChange={(e) => handleItemChange(index, 'importPrice', parseFloat(e.target.value) || 0)}
                          className={`form-control ${formErrors.items?.[index]?.importPrice ? 'is-invalid' : ''}`}
                          step="0.01"
                          min="0"
                          required
                        />
                        {formErrors.items?.[index]?.importPrice && (
                          <div className="invalid-feedback">{formErrors.items[index].importPrice}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-12">
                      <small className="text-muted">
                        Thành tiền: <strong>{formatVND(item.subTotal)}</strong>
                        {originalDetail && (
                          <span className="ms-2">
                            | Tổng gốc: {formatVND(originalDetail.subTotal)}
                          </span>
                        )}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : `Tạo Phiếu ${adjustmentType === 'import' ? 'Nhập Bù' : 'Xuất Điều Chỉnh'}`}
              </button>
            </div>
          </form>,
          null,
          '1000px'
        );

      case 'detail':
        if (!selectedInventory) {
          return modalLayout(
            'Chi Tiết Phiếu Nhập Kho',
            <div className="text-center py-4">
              {/* <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div> */}
              <p className="mt-2">Đang tải chi tiết phiếu nhập...</p>
            </div>,
            null,
            '500px'
          );
        }

        const printableAreaRef = React.createRef();

        const printPage = () => {
          window.print();
        };

        const exportPDF = async () => {
          await loadHtml2Pdf();
          const element = printableAreaRef.current;
          const opt = {
            margin: 0.5,
            filename: `PhieuNhapKho_${selectedInventory.inventory.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
          };
          window.html2pdf().set(opt).from(element).save();
        };

        return modalLayout(
          'Chi Tiết Phiếu Nhập Kho',
          <div>
            {/* Header đẹp */}
            <div className="bg-light rounded p-4 mb-4">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="text-primary mb-2">THÔNG TIN PHIẾU NHẬP</h6>
                  <p className="mb-1"><strong>Mã phiếu:</strong> <span className="text-danger">#{selectedInventory.inventory?.id}</span></p>
                  <p className="mb-1"><strong>Ngày nhập:</strong> {selectedInventory.inventory?.date ? new Date(selectedInventory.inventory.date).toLocaleDateString('vi-VN') : 'N/A'}</p>
                  <p className="mb-1"><strong>Tổng tiền:</strong> <span className="text-success fw-bold">{formatVND(selectedInventory.inventory?.total)}</span></p>
                </div>
                <div className="col-md-6">
                  <h6 className="text-primary mb-2">THÔNG TIN NHÀ CUNG CẤP</h6>
                  <p className="mb-1"><strong>Tên NCC:</strong> {selectedInventory.supplier?.SupplierName || 'N/A'}</p>
                  <p className="mb-1"><strong>Điện thoại:</strong> {selectedInventory.supplier?.ContactPhone || 'N/A'}</p>
                  <p className="mb-0"><strong>Địa chỉ:</strong> {selectedInventory.supplier?.Address || 'N/A'}</p>
                </div>
              </div>
            </div>

            <section ref={printableAreaRef}>
              <div className="print-only text-center mb-4" style={{ display: 'none' }}>
                <h4 style={{ color: '#00448D' }}>Phiếu Nhập Kho</h4>
                <p>Phòng Khám XYZ</p>
              </div>

              <h6 className="mb-3">DANH SÁCH THUỐC NHẬP KHO</h6>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>STT</th>
                      <th>Tên Thuốc</th>
                      <th className="text-center">Số Lượng</th>
                      <th className="text-end">Giá Nhập</th>
                      <th className="text-end">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInventory.details.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      selectedInventory.details.map((detail, index) => (
                        <tr key={detail.id}>
                          <td>{index + 1}</td>
                          <td className="fw-semibold">{detail.medicineName || 'N/A'}</td>
                          <td className="text-center">{detail.quantity}</td>
                          <td className="text-end">{formatVND(detail.price)}</td>
                          <td className="text-end text-success fw-bold">{formatVND(detail.subTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <td colSpan="4" className="text-end fw-bold">TỔNG CỘNG:</td>
                      <td className="text-end fw-bold text-success">{formatVND(selectedInventory.inventory?.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedInventory.inventory?.note && (
                <div className="mt-3">
                  <strong>Ghi chú:</strong> {selectedInventory.inventory.note}
                </div>
              )}
            </section>

            <div className="d-flex gap-2 mt-4">
              <button className="btn btn-primary" onClick={printPage}>
                In
              </button>
              <button className="btn btn-success" onClick={exportPDF}>
                Xuất PDF
              </button>
              {canAdjustInventory(selectedInventory.inventory) && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleOpenModal('adjustment', modal.inventory)}
                >
                  Tạo Điều Chỉnh
                </button>
              )}
            </div>
          </div>,
          <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
            Đóng
          </button>,
          '1100px'
        );

      default:
        return null;
    }
  };

  // Effect load ban đầu
  useEffect(() => {
    fetchInventories(1, filterParams);
    fetchSuppliers();
  }, [fetchInventories, fetchSuppliers, filterParams]);

  return (
    <div className="d-flex">
      <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
        {toast.show && (
          <CustomToast
            type={toast.type}
            message={toast.message}
            onClose={hideToast}
          />
        )}

        <header className="d-flex justify-content-between align-items-center flex-shrink-0">
          <h1 className="h4 mb-0">Quản Lý Kho</h1>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={() => handleOpenModal('add')}
            disabled={isLoading}
          >
            <BiPlus size={18} /> Thêm Phiếu Nhập
          </button>
        </header>

        {/* Bộ lọc */}
        <div className="card shadow-sm border-0 flex-shrink-0">
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="input-group">
                  <span className="input-group-text">
                    <BiSearch />
                  </span>
                  <input
                    type="text"
                    name="search"
                    className="form-control"
                    placeholder="Tìm theo tên nhà cung cấp..."
                    value={filters.search}
                    onChange={handleFilterChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <select
                  name="supplier_id"
                  className="form-select"
                  value={filters.supplier_id}
                  onChange={handleFilterChange}
                  disabled={isLoading}
                >
                  <option value="">Tất cả nhà cung cấp</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.SupplierId} value={supplier.SupplierId}>
                      {supplier.SupplierName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <div className="input-group">
                  <span className="input-group-text">
                    <BiCalendar />
                  </span>
                  <input
                    type="date"
                    name="date_from"
                    className="form-control"
                    value={filters.date_from}
                    onChange={handleFilterChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <div className="input-group">
                  <span className="input-group-text">
                    <BiCalendar />
                  </span>
                  <input
                    type="date"
                    name="date_to"
                    className="form-control"
                    value={filters.date_to}
                    onChange={handleFilterChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="col-md-1">
                <button
                  className="btn btn-primary w-100 h-100"
                  onClick={applyFilters}
                  disabled={isLoading}
                >
                  <BiFilter />
                </button>
              </div>
              <div className="col-md-1">
                <button
                  className="btn btn-outline-secondary w-100 h-100"
                  onClick={clearFilters}
                  disabled={isLoading}
                >
                  <BiX />
                </button>
              </div>
            </div>

            {/* Lọc theo tiền */}
            <div className="row g-3 mt-2">
              <div className="col-md-3">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    <BiDollar />
                  </span>
                  <input
                    type="number"
                    name="min_amount"
                    className="form-control"
                    placeholder="Tổng tiền từ"
                    value={filters.min_amount}
                    onChange={handleFilterChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    <BiDollar />
                  </span>
                  <input
                    type="number"
                    name="max_amount"
                    className="form-control"
                    placeholder="Tổng tiền đến"
                    value={filters.max_amount}
                    onChange={handleFilterChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="card shadow-sm border-0 table-panel">
          {isLoading ? (
            <Loading isLoading={isLoading} />
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
                <h6 className="mb-0 text-muted">
                  Tổng cộng: <strong>{totalItems}</strong> phiếu nhập
                </h6>
                <small className="text-muted">
                  Trang {currentPage + 1} / {pageCount}
                </small>
              </div>

              <div className="table-responsive-container">
                <table className="table table-hover clinic-table mb-0">
                  <thead className="p-4">
                    <tr>
                      <th className="px-4">Mã Phiếu</th>
                      <th>Nhà Cung Cấp</th>
                      <th>Ngày Nhập</th>
                      <th>Tổng Tiền</th>
                      <th>Trạng Thái</th>
                      <th>Ghi Chú</th>
                      <th className="text-center px-4">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventories.length > 0 ? inventories.map(inventory => (
                      <tr key={inventory.id}>
                        <td className="px-4">
                          <span className='user-id'>{`#${inventory.id}`}</span>
                        </td>
                        <td className="fw-semibold">{getSupplierName(inventory.supplierId)}</td>
                        <td>{new Date(inventory.date).toLocaleDateString('vi-VN')}</td>
                        <td className="text-success fw-medium">
                          {formatVND(inventory.total)}
                        </td>
                        <td>
                          {getInventoryStatusBadge(inventory.status)}
                        </td>
                        <td>
                          <div
                            className="text-truncate"
                            style={{ maxWidth: '200px' }}
                            title={inventory.note}
                          >
                            {inventory.note || '—'}
                          </div>
                        </td>
                        <td className="text-center px-4">
                          <div className="d-flex gap-2 justify-content-center">
                            <button
                              className="btn btn-lg btn-light "
                              title="Xem chi tiết"
                              onClick={() => handleOpenModal('detail', inventory)}
                              disabled={isLoading}
                            >
                              <Eye />
                            </button>
                            {canAdjustInventory(inventory) && (
                              <button
                                className="btn btn-lg btn-light text-warning"
                                title="Tạo điều chỉnh"
                                onClick={() => handleOpenModal('adjustment', inventory)}
                                disabled={isLoading}
                              >
                                <Settings/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="text-center p-5 text-muted">
                          <BiSearch size={48} className="mb-3 opacity-50" />
                          <p className="mb-0 fs-5">Không tìm thấy phiếu nhập</p>
                          <small>Thử thay đổi bộ lọc hoặc thêm phiếu nhập mới</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PHÂN TRANG */}
              {pageCount > 1 && (
                <div className="card-footer p-3 border-0 flex-shrink-0">
                  <Pagination
                    pageCount={pageCount}
                    onPageChange={({ selected }) => fetchInventories(selected + 1, filterParams)}
                    currentPage={currentPage}
                    isLoading={isLoading}
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

export default AdminInventory;