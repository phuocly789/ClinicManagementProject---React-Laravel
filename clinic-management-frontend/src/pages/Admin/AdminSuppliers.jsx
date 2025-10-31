import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Table, Button, Spinner, Form, Row, Col, InputGroup } from 'react-bootstrap';
import Pagination from '../../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../../Components/CustomToast/CustomToast';
import { PencilIcon, Trash, Search, Filter, X } from 'lucide-react';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';

const API_BASE_URL = 'http://localhost:8000';

const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const SupplierList = memo(({
  suppliers,
  isLoading,
  handleShowDeleteModal,
  handleShowEditForm,
  pageCount,
  currentPage,
  handlePageChange,
  applyFilters,
  clearFilters,
  filters,
  setFilters
}) => {
  return (
    <div>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
          Danh Sách Nhà Cung Cấp
        </h3>
        <Button variant="primary" onClick={() => handleShowEditForm(null)}>
          + Thêm Nhà Cung Cấp
        </Button>
      </div>

      {/* FILTER BAR */}
      <div className="mb-4 p-3 bg-light rounded border">
        <Row className="g-3 align-items-center">
          {/* TÌM KIẾM TÊN */}
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text><Search size={16} /></InputGroup.Text>
              <Form.Control
                placeholder="Tìm tên nhà cung cấp..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </InputGroup>
          </Col>

          {/* LỌC EMAIL */}
          <Col md={3}>
            <Form.Control
              placeholder="Lọc theo email..."
              value={filters.email}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            />
          </Col>

          {/* LỌC SỐ ĐIỆN THOẠI */}
          <Col md={3}>
            <Form.Control
              placeholder="Lọc theo số điện thoại..."
              value={filters.phone}
              onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
            />
          </Col>

          {/* NÚT LỌC & XÓA */}
          <Col md={2} className="d-flex gap-1">
            <Button variant="primary" size="sm" onClick={applyFilters} className="flex-fill">
              <Filter size={16} />
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={clearFilters} className="flex-fill">
              <X size={16} />
            </Button>
          </Col>
        </Row>
      </div>

      {/* TABLE */}
      <div className="table-responsive">
        <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
          <thead className="table-light">
            <tr>
              <th>Mã NCC</th>
              <th>Tên Nhà Cung Cấp</th>
              <th>Email</th>
              <th>Số Điện Thoại</th>
              <th>Địa Chỉ</th>
              <th>Mô Tả</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="text-center py-4"><Spinner animation="border" /></td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.SupplierId}>
                  <td><strong>{supplier.SupplierId}</strong></td>
                  <td>{supplier.SupplierName}</td>
                  <td>{supplier.ContactEmail || '—'}</td>
                  <td>{supplier.ContactPhone || '—'}</td>
                  <td>{supplier.Address || '—'}</td>
                  <td title={supplier.Description}>
                    {supplier.Description?.length > 40
                      ? supplier.Description.substring(0, 40) + '...'
                      : supplier.Description || '—'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-success p-0 me-2"
                      onClick={() => handleShowEditForm(supplier)}
                      title="Sửa"
                    >
                      <PencilIcon size={18} />
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-danger p-0"
                      onClick={() => handleShowDeleteModal(supplier.SupplierId)}
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
});

const SupplierForm = memo(({ isEditMode, supplier, onSubmit, onCancel, isLoading }) => {
  const [errors, setErrors] = useState({
    SupplierName: '', ContactEmail: '', ContactPhone: '', Address: '', Description: '',
  });

  const validateForm = useCallback((formData) => {
    const newErrors = {};
    let isValid = true;

    const name = formData.get('SupplierName')?.trim();
    if (!name) {
      newErrors.SupplierName = 'Vui lòng nhập tên nhà cung cấp';
      isValid = false;
    } else if (name.length > 255) {
      newErrors.SupplierName = 'Tên không được vượt quá 255 ký tự';
      isValid = false;
    } else if (specialCharRegex.test(name) || codePatternRegex.test(name)) {
      newErrors.SupplierName = 'Không được chứa ký tự đặc biệt hoặc mã code';
      isValid = false;
    }

    const email = formData.get('ContactEmail')?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.ContactEmail = 'Email không hợp lệ';
      isValid = false;
    }

    const phone = formData.get('ContactPhone')?.trim();
    if (phone && !/^\+?\d{9,15}$/.test(phone)) {
      newErrors.ContactPhone = 'Số điện thoại không hợp lệ';
      isValid = false;
    }

    ['Address', 'Description'].forEach(field => {
      const value = formData.get(field)?.trim();
      const max = field === 'Address' ? 255 : 500;
      if (value && value.length > max) {
        newErrors[field] = `${field === 'Address' ? 'Địa chỉ' : 'Mô tả'} không được vượt quá ${max} ký tự`;
        isValid = false;
      } else if (value && (specialCharRegex.test(value) || codePatternRegex.test(value))) {
        newErrors[field] = 'Không được chứa ký tự đặc biệt hoặc mã code';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (validateForm(formData)) onSubmit(e);
  }, [onSubmit, validateForm]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 className="mb-4">{isEditMode ? 'Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp'}</h2>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Tên Nhà Cung Cấp <span className="text-danger">*</span></Form.Label>
              <Form.Control
                name="SupplierName"
                defaultValue={isEditMode ? supplier?.SupplierName : ''}
                placeholder="Nhập tên"
                isInvalid={!!errors.SupplierName}
              />
              <Form.Control.Feedback type="invalid">{errors.SupplierName}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="ContactEmail"
                type="email"
                defaultValue={isEditMode ? supplier?.ContactEmail : ''}
                placeholder="email@example.com"
                isInvalid={!!errors.ContactEmail}
              />
              <Form.Control.Feedback type="invalid">{errors.ContactEmail}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Số Điện Thoại</Form.Label>
              <Form.Control
                name="ContactPhone"
                defaultValue={isEditMode ? supplier?.ContactPhone : ''}
                placeholder="0901234567"
                isInvalid={!!errors.ContactPhone}
              />
              <Form.Control.Feedback type="invalid">{errors.ContactPhone}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Địa Chỉ</Form.Label>
              <Form.Control
                name="Address"
                defaultValue={isEditMode ? supplier?.Address : ''}
                placeholder="Nhập địa chỉ"
                isInvalid={!!errors.Address}
              />
              <Form.Control.Feedback type="invalid">{errors.Address}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label>Mô Tả</Form.Label>
              <Form.Control
                as="textarea"
                name="Description"
                rows={3}
                defaultValue={isEditMode ? supplier?.Description : ''}
                placeholder="Mô tả nhà cung cấp..."
                isInvalid={!!errors.Description}
              />
              <Form.Control.Feedback type="invalid">{errors.Description}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>Hủy</Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : isEditMode ? 'Lưu' : 'Thêm'}
          </Button>
        </div>
      </Form>
    </div>
  );
});

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
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

  const hideToast = useCallback(() => {
    setToast({ show: false, type: 'info', message: '' });
  }, []);

  // FETCH + CACHE
  const fetchSuppliers = useCallback(async (page = 1, queryString = '') => {
    const cacheKey = `${page}_${queryString}`;
    if (cache.current.has(cacheKey)) {
      const { data, last_page } = cache.current.get(cacheKey);
      setSuppliers(data);
      setPageCount(last_page);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/suppliers?page=${page}${queryString ? '&' + queryString : ''}`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      cache.current.set(cacheKey, { data: res.data, last_page: res.last_page });
      setSuppliers(res.data);
      setPageCount(res.last_page);
      setCurrentPage(page - 1);
    } catch (error) {
      showToast('error', `Lỗi tải dữ liệu: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);


  // ÁP DỤNG LỌC - CHỈ KHI NHẤN NÚT
  const applyFilters = useCallback((updates = {}) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.search) params.append('search', newFilters.search);
    if (newFilters.email) params.append('email', newFilters.email);
    if (newFilters.phone) params.append('phone', newFilters.phone);

    const query = params.toString();
    setFilterParams(query);
    fetchSuppliers(1, query);
  }, [filters, fetchSuppliers]);

  // XÓA LỌC
  const clearFilters = useCallback(() => {
    setFilters({ search: '', email: '', phone: '' });
    setFilterParams('');
    fetchSuppliers(1);
  }, [fetchSuppliers]);
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
    async (supplierId) => {
      try {
        setIsLoading(true);
        const token = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/api/suppliers/${supplierId}`, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
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
        showToast('success', result.message || 'Xóa nhà cung cấp thành công');
        cache.current.delete(currentPage + 1);
        await fetchSuppliers(currentPage + 1);
      } catch (error) {
        console.error('Error deleting supplier:', error);
        showToast('error', `Lỗi khi xóa nhà cung cấp: ${error.message}`);
      } finally {
        setIsLoading(false);
        setShowDeleteModal(false);
        setSupplierToDelete(null);
      }
    },
    [currentPage, fetchSuppliers, getCsrfToken, showToast]
  );

  const handleEditSupplier = useCallback(
    async (e) => {
      try {
        setIsLoading(true);
        const token = await getCsrfToken();
        const formData = new FormData(e.target);
        const data = {
          SupplierName: formData.get('SupplierName'),
          ContactEmail: formData.get('ContactEmail') || null,
          ContactPhone: formData.get('ContactPhone') || null,
          Address: formData.get('Address') || null,
          Description: formData.get('Description') || null,
        };

        const response = await fetch(`${API_BASE_URL}/api/suppliers/${editSupplier.SupplierId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
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
        showToast('success', result.message || 'Sửa nhà cung cấp thành công');
        cache.current.clear();
        await fetchSuppliers(currentPage + 1);
        setCurrentView('list');
        setEditSupplier(null);
      } catch (error) {
        console.error('Error editing supplier:', error);
        showToast('error', error.message.includes('CSRF token')
          ? 'Sửa thất bại: Không thể lấy CSRF token. Vui lòng kiểm tra backend.'
          : `Sửa thất bại: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, editSupplier, fetchSuppliers, getCsrfToken, showToast]
  );

  const handleAddSupplier = useCallback(
    async (e) => {
      try {
        setIsLoading(true);
        const token = await getCsrfToken();
        const formData = new FormData(e.target);
        const data = {
          SupplierName: formData.get('SupplierName'),
          ContactEmail: formData.get('ContactEmail') || null,
          ContactPhone: formData.get('ContactPhone') || null,
          Address: formData.get('Address') || null,
          Description: formData.get('Description') || null,
        };

        const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
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
        showToast('success', result.message || 'Thêm nhà cung cấp thành công');
        cache.current.clear();
        await fetchSuppliers(1);
        setCurrentView('list');
      } catch (error) {
        console.error('Error adding supplier:', error);
        showToast('error', error.message.includes('CSRF token')
          ? 'Thêm thất bại: Không thể lấy CSRF token. Vui lòng kiểm tra backend.'
          : `Thêm thất bại: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSuppliers, getCsrfToken, showToast]
  );

  const handleShowEditForm = useCallback((supplier) => {
    setEditSupplier(supplier);
    setCurrentView(supplier ? 'edit' : 'add');
  }, []);

  const handleCancelForm = useCallback(() => {
    setCurrentView('list');
    setEditSupplier(null);
  }, []);

  const handleShowDeleteModal = useCallback((id) => {
    setSupplierToDelete(id);
    setShowDeleteModal(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setSupplierToDelete(null);
  }, []);

  const handlePageChange = useCallback(({ selected }) => {
    fetchSuppliers(selected + 1, filterParams);
  }, [fetchSuppliers, filterParams]);

  useEffect(() => {
    if (currentView === 'list') fetchSuppliers(1);
  }, [currentView, fetchSuppliers]);

  return (
    <div className="d-flex">
      
      <div className="position-relative w-100 flex-grow-1 ms-5 p-4">
        <h1 className="mb-4" style={{ fontSize: '1.8rem', fontWeight: '600' }}>Quản Lý Nhà Cung Cấp</h1>

        {currentView === 'list' && (
          <SupplierList
            suppliers={suppliers}
            isLoading={isLoading}
            handleShowDeleteModal={handleShowDeleteModal}
            handleShowEditForm={handleShowEditForm}
            pageCount={pageCount}
            currentPage={currentPage}
            handlePageChange={handlePageChange}
            applyFilters={applyFilters}
            clearFilters={clearFilters}
            filters={filters}
            setFilters={setFilters}
          />
        )}
        {currentView === 'add' && (
          <SupplierForm
            isEditMode={false}
            onSubmit={handleAddSupplier}
            onCancel={handleCancelForm}
            isLoading={isLoading}
          />
        )}
        {currentView === 'edit' && (
          <SupplierForm
            isEditMode={true}
            supplier={editSupplier}
            onSubmit={handleEditSupplier}
            onCancel={handleCancelForm}
            isLoading={isLoading}
          />
        )}
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Xác nhận xóa"
          message="Không thể xóa nếu có phiếu nhập kho liên quan."
          onConfirm={() => handleDelete(supplierToDelete)}
          onCancel={handleCancelDelete}
        />
        {toast.show &&
          <CustomToast
            type={toast.type}
            message={toast.message}
            onClose={hideToast}
          />
        }
      </div>
    </div>
  );
};

export default AdminSuppliers;