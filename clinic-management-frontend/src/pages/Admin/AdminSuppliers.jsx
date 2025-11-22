import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../App.css';
import Pagination from '../../Components/Pagination/Pagination';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import { BiPlus, BiPencil, BiTrash, BiSearch, BiFilter } from 'react-icons/bi';
import supplierService from '../../services/supplierService';

const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [currentView, setCurrentView] = useState('list');
  const [editSupplier, setEditSupplier] = useState(null);
  const [filters, setFilters] = useState({ search: '', email: '', phone: '' });
  const [filterParams, setFilterParams] = useState('');
  const cache = useRef(new Map());

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);

  const hideToast = () => setToast({ show: false });

  const fetchSuppliers = useCallback(async (page = 1, query = '') => {
    const key = `${page}_${query || 'none'}`;
    if (cache.current.has(key)) {
      const cached = cache.current.get(key);
      setSuppliers(cached.data);
      setPageCount(cached.last_page);
      setTotalItems(cached.total || 0);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const res = await supplierService.getAll(page, query);
      cache.current.set(key, {
        data: res.data,
        last_page: res.last_page,
        total: res.total || 0
      });
      setSuppliers(res.data);
      setPageCount(res.last_page);
      setTotalItems(res.total || 0);
      setCurrentPage(page - 1);
    } catch (err) {
      showToast('error', err.message || 'Lỗi tải dữ liệu nhà cung cấp');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.email.trim()) params.append('email', filters.email.trim());
    if (filters.phone.trim()) params.append('phone', filters.phone.trim());

    const q = params.toString();
    setFilterParams(q);
    fetchSuppliers(1, q);
  }, [filters, fetchSuppliers]);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', email: '', phone: '' });
    setFilterParams('');
    fetchSuppliers(1);
  }, [fetchSuppliers]);

  const handleDelete = useCallback(async (supplier) => {
    try {
      setIsLoading(true);
      const res = await supplierService.delete(supplier.SupplierId);
      showToast('success', res.message || 'Xóa thành công');
      cache.current.clear();
      fetchSuppliers(currentPage + 1 || 1, filterParams);
    } catch (err) {
      showToast('error', err.message || 'Không thể xóa (có thể đang có phiếu nhập kho)');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setSupplierToDelete(null);
    }
  }, [currentPage, filterParams, fetchSuppliers, showToast]);

  const handleAddSupplier = async (formData) => {
    const data = {
      SupplierName: formData.get('SupplierName').trim(),
      ContactEmail: formData.get('ContactEmail')?.trim() || null,
      ContactPhone: formData.get('ContactPhone')?.trim() || null,
      Address: formData.get('Address')?.trim() || null,
      Description: formData.get('Description')?.trim() || null,
    };

    try {
      setIsLoading(true);
      const res = await supplierService.create(data);
      showToast('success', res.message || 'Thêm thành công');
      cache.current.clear();
      fetchSuppliers(1);
      setCurrentView('list');
    } catch (err) {
      showToast('error', err.message || 'Thêm thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSupplier = async (formData) => {
    const data = {
      SupplierName: formData.get('SupplierName').trim(),
      ContactEmail: formData.get('ContactEmail')?.trim() || null,
      ContactPhone: formData.get('ContactPhone')?.trim() || null,
      Address: formData.get('Address')?.trim() || null,
      Description: formData.get('Description')?.trim() || null,
    };

    try {
      setIsLoading(true);
      const res = await supplierService.update(editSupplier.SupplierId, data);
      showToast('success', res.message || 'Cập nhật thành công');
      cache.current.clear();
      fetchSuppliers(currentPage + 1, filterParams);
      setCurrentView('list');
      setEditSupplier(null);
    } catch (err) {
      showToast('error', err.message || 'Cập nhật thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowEditForm = useCallback((supplier) => {
    setEditSupplier(supplier);
    setCurrentView(supplier ? 'edit' : 'add');
  }, []);

  const handleCancelForm = useCallback(() => {
    setCurrentView('list');
    setEditSupplier(null);
  }, []);

  const handleShowDeleteModal = useCallback((supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteModal(true);
  }, []);

  const handlePageChange = useCallback(({ selected }) => {
    fetchSuppliers(selected + 1, filterParams);
  }, [fetchSuppliers, filterParams]);

  useEffect(() => {
    if (currentView === 'list') {
      fetchSuppliers(1, filterParams);
    }
  }, [currentView, filterParams, fetchSuppliers]);

  // Validate form function
  const validateForm = (formData) => {
    const errors = {};
    let valid = true;

    const name = formData.get('SupplierName')?.trim();
    if (!name) {
      errors.SupplierName = 'Vui lòng nhập tên nhà cung cấp';
      valid = false;
    } else if (name.length > 255) {
      errors.SupplierName = 'Tên không được vượt quá 255 ký tự';
      valid = false;
    } else if (specialCharRegex.test(name) || codePatternRegex.test(name)) {
      errors.SupplierName = 'Không được chứa ký tự đặc biệt hoặc mã code';
      valid = false;
    }

    const email = formData.get('ContactEmail')?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.ContactEmail = 'Email không hợp lệ';
      valid = false;
    }

    const phone = formData.get('ContactPhone')?.trim();
    if (phone && !/^\+?\d{9,15}$/.test(phone.replace(/\s/g, ''))) {
      errors.ContactPhone = 'Số điện thoại không hợp lệ (9-15 số)';
      valid = false;
    }

    ['Address', 'Description'].forEach(field => {
      const value = formData.get(field)?.trim();
      const max = field === 'Address' ? 255 : 500;
      if (value && value.length > max) {
        errors[field] = `${field === 'Address' ? 'Địa chỉ' : 'Mô tả'} không quá ${max} ký tự`;
        valid = false;
      }
      if (value && (specialCharRegex.test(value) || codePatternRegex.test(value))) {
        errors[field] = 'Không được chứa ký tự đặc biệt hoặc mã code';
        valid = false;
      }
    });

    return { errors, valid };
  };

  // Render form modal
  const renderFormModal = () => {
    if (currentView !== 'add' && currentView !== 'edit') return null;

    const isEditMode = currentView === 'edit';
    const [errors, setErrors] = useState({});

    const handleFormSubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { errors: formErrors, valid } = validateForm(fd);
      setErrors(formErrors);

      if (valid) {
        if (isEditMode) {
          handleEditSupplier(fd);
        } else {
          handleAddSupplier(fd);
        }
      }
    };

    const modalLayout = (title, body, maxWidth = '700px') => (
      <>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" onClick={handleCancelForm}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">{title}</h5>
                <button type="button" className="btn-close" onClick={handleCancelForm}></button>
              </div>
              <div className="modal-body">{body}</div>
            </div>
          </div>
        </div>
      </>
    );

    return modalLayout(
      isEditMode ? 'Cập Nhật Thông Tin Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới',
      <form onSubmit={handleFormSubmit}>
        <div className="row g-3">
          <div className="col-12">
            <div className="mb-3">
              <label className="form-label">
                Tên nhà cung cấp <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="SupplierName"
                className={`form-control ${errors.SupplierName ? 'is-invalid' : ''}`}
                defaultValue={isEditMode ? editSupplier?.SupplierName : ''}
                placeholder="Nhập tên nhà cung cấp..."
              />
              {errors.SupplierName && <div className="invalid-feedback">{errors.SupplierName}</div>}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="ContactEmail"
                className={`form-control ${errors.ContactEmail ? 'is-invalid' : ''}`}
                defaultValue={isEditMode ? editSupplier?.ContactEmail : ''}
                placeholder="email@example.com"
              />
              {errors.ContactEmail && <div className="invalid-feedback">{errors.ContactEmail}</div>}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Số điện thoại</label>
              <input
                type="text"
                name="ContactPhone"
                className={`form-control ${errors.ContactPhone ? 'is-invalid' : ''}`}
                defaultValue={isEditMode ? editSupplier?.ContactPhone : ''}
                placeholder="0901234567"
              />
              {errors.ContactPhone && <div className="invalid-feedback">{errors.ContactPhone}</div>}
            </div>
          </div>
          <div className="col-12">
            <div className="mb-3">
              <label className="form-label">Địa chỉ</label>
              <input
                type="text"
                name="Address"
                className={`form-control ${errors.Address ? 'is-invalid' : ''}`}
                defaultValue={isEditMode ? editSupplier?.Address : ''}
                placeholder="Nhập địa chỉ..."
              />
              {errors.Address && <div className="invalid-feedback">{errors.Address}</div>}
            </div>
          </div>
          <div className="col-12">
            <div className="mb-3">
              <label className="form-label">Mô tả</label>
              <textarea
                name="Description"
                className={`form-control ${errors.Description ? 'is-invalid' : ''}`}
                rows="3"
                defaultValue={isEditMode ? editSupplier?.Description : ''}
                placeholder="Nhập mô tả nhà cung cấp..."
              />
              {errors.Description && <div className="invalid-feedback">{errors.Description}</div>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleCancelForm} disabled={isLoading}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : (isEditMode ? 'Cập Nhật' : 'Thêm Mới')}
          </button>
        </div>
      </form>
    );
  };

  // Render delete modal
  const renderDeleteModal = () => {
    if (!showDeleteModal) return null;

    return (
      <>
        <div className="modal-backdrop fade show"></div>
        <div className="modal fade show d-block" tabIndex="-1" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">Xác Nhận Xóa</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Bạn có chắc chắn muốn xóa nhà cung cấp <strong>"{supplierToDelete?.SupplierName}"</strong>?</p>
                <p className="text-muted small">Không thể xóa nếu có phiếu nhập kho liên quan.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={() => handleDelete(supplierToDelete)} disabled={isLoading}>
                  {isLoading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                </button>
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
        {toast.show && (
          <CustomToast type={toast.type} message={toast.message} onClose={hideToast} />
        )}

        <header className="d-flex justify-content-between align-items-center flex-shrink-0">
          <h1 className="h4 mb-0">Quản Lý Nhà Cung Cấp</h1>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={() => handleShowEditForm(null)}
            disabled={isLoading}
          >
            <BiPlus size={18} /> Thêm Nhà Cung Cấp
          </button>
        </header>

        {currentView === 'list' && (
          <>
            {/* Bộ lọc - GIỐNG ADMIN SERVICE */}
            <div className="card shadow-sm border-0 flex-shrink-0">
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-4">
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
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <input
                      type="text"
                      name="email"
                      className="form-control"
                      placeholder="Lọc theo email..."
                      value={filters.email}
                      onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      type="text"
                      name="phone"
                      className="form-control"
                      placeholder="Lọc theo số điện thoại..."
                      value={filters.phone}
                      onChange={(e) => setFilters(prev => ({ ...prev, phone: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                      disabled={isLoading}
                    />
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
                      className="btn btn-outline-secondary w-100 h-100"
                      onClick={clearFilters}
                      disabled={isLoading}
                    >
                      Xóa lọc
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bảng dữ liệu - GIỐNG ADMIN SERVICE */}
            <div className="card shadow-sm border-0 table-panel flex-grow-1">
              {isLoading ? (
                <Loading isLoading={isLoading} />
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
                    <h6 className="mb-0 text-muted">
                      Tổng cộng: <strong>{totalItems}</strong> nhà cung cấp
                    </h6>
                    <small className="text-muted">
                      Trang {currentPage + 1} / {pageCount}
                    </small>
                  </div>

                  <div className="table-responsive-container">
                    <table className="table table-hover clinic-table mb-0">
                      <thead className="p-4">
                        <tr>
                          <th className="px-4">Mã NCC</th>
                          <th>Tên Nhà Cung Cấp</th>
                          <th>Email</th>
                          <th>Số Điện Thoại</th>
                          <th>Địa Chỉ</th>
                          <th>Mô Tả</th>
                          <th className="text-center px-4">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.length > 0 ? suppliers.map(supplier => (
                          <tr key={supplier.SupplierId}>
                            <td className="px-4">
                              <span className='user-id'>{`#${supplier.SupplierId}`}</span>
                            </td>
                            <td className="fw-semibold">{supplier.SupplierName}</td>
                            <td>{supplier.ContactEmail || '—'}</td>
                            <td>{supplier.ContactPhone || '—'}</td>
                            <td>
                              <div
                                className="text-truncate"
                                style={{ maxWidth: '150px' }}
                                title={supplier.Address}
                              >
                                {supplier.Address || '—'}
                              </div>
                            </td>
                            <td>
                              <div
                                className="text-truncate"
                                style={{ maxWidth: '200px' }}
                                title={supplier.Description}
                              >
                                {supplier.Description || '—'}
                              </div>
                            </td>
                            <td className="text-center px-4">
                              <div className="d-flex gap-2 justify-content-center">
                                <button
                                  className="btn btn-lg btn-light"
                                  title="Sửa"
                                  onClick={() => handleShowEditForm(supplier)}
                                  disabled={isLoading}
                                >
                                  <BiPencil />
                                </button>
                                <button
                                  className="btn btn-lg btn-light text-danger"
                                  title="Xóa"
                                  onClick={() => handleShowDeleteModal(supplier)}
                                  disabled={isLoading}
                                >
                                  <BiTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="7" className="text-center p-5 text-muted">
                              <BiSearch size={48} className="mb-3 opacity-50" />
                              <p className="mb-0 fs-5">Không tìm thấy nhà cung cấp</p>
                              <small>Thử thay đổi bộ lọc hoặc thêm nhà cung cấp mới</small>
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
                        onPageChange={handlePageChange}
                        currentPage={currentPage}
                        isLoading={isLoading}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {renderFormModal()}
        {renderDeleteModal()}
      </main>
    </div>
  );
};

export default AdminSuppliers;