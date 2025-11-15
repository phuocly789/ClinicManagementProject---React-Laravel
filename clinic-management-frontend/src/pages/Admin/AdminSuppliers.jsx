import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Table, Button, Spinner, Form, Row, Col, InputGroup } from 'react-bootstrap';
import Pagination from '../../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../../Components/CustomToast/CustomToast';
import { PencilIcon, Trash, Search, Filter, X } from 'lucide-react';

import supplierService from '../../services/supplierService';

const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

// ==================== DANH SÁCH ====================
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
          Danh Sách Nhà Cung Cấp
        </h3>
        <Button variant="primary" onClick={() => handleShowEditForm(null)}>
          + Thêm Nhà Cung Cấp
        </Button>
      </div>

      <div className="mb-4 p-3 bg-light rounded border">
        <Row className="g-3 align-items-center">
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text><Search size={16} /></InputGroup.Text>
              <Form.Control
                placeholder="Tìm tên nhà cung cấp..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Control
              placeholder="Lọc theo email..."
              value={filters.email}
              onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              placeholder="Lọc theo số điện thoại..."
              value={filters.phone}
              onChange={(e) => setFilters(prev => ({ ...prev, phone: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </Col>
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
              suppliers.map((s) => (
                <tr key={s.SupplierId}>
                  <td><strong>{s.SupplierId}</strong></td>
                  <td>{s.SupplierName}</td>
                  <td>{s.ContactEmail || '—'}</td>
                  <td>{s.ContactPhone || '—'}</td>
                  <td>{s.Address || '—'}</td>
                  <td title={s.Description}>
                    {s.Description?.length > 40 ? s.Description.substring(0, 40) + '...' : s.Description || '—'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button variant="link" size="sm" className="text-success p-0 me-2"
                      onClick={() => handleShowEditForm(s)} title="Sửa">
                      <PencilIcon size={18} />
                    </Button>
                    <Button variant="link" size="sm" className="text-danger p-0"
                      onClick={() => handleShowDeleteModal(s.SupplierId)} title="Xóa">
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

// ==================== FORM THÊM/SỬA ====================
const SupplierForm = memo(({ isEditMode, supplier, onSubmit, onCancel, isLoading }) => {
  const [errors, setErrors] = useState({});

  const validateForm = useCallback((formData) => {
    const newErrors = {};
    let valid = true;

    const name = formData.get('SupplierName')?.trim();
    if (!name) {
      newErrors.SupplierName = 'Vui lòng nhập tên nhà cung cấp';
      valid = false;
    } else if (name.length > 255) {
      newErrors.SupplierName = 'Tên không được vượt quá 255 ký tự';
      valid = false;
    } else if (specialCharRegex.test(name) || codePatternRegex.test(name)) {
      newErrors.SupplierName = 'Không được chứa ký tự đặc biệt hoặc mã code';
      valid = false;
    }

    const email = formData.get('ContactEmail')?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.ContactEmail = 'Email không hợp lệ';
      valid = false;
    }

    const phone = formData.get('ContactPhone')?.trim();
    if (phone && !/^\+?\d{9,15}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.ContactPhone = 'Số điện thoại không hợp lệ (9-15 số)';
      valid = false;
    }

    ['Address', 'Description'].forEach(field => {
      const value = formData.get(field)?.trim();
      const max = field === 'Address' ? 255 : 500;
      if (value && value.length > max) {
        newErrors[field] = `${field === 'Address' ? 'Địa chỉ' : 'Mô tả'} không quá ${max} ký tự`;
        valid = false;
      }
      if (value && (specialCharRegex.test(value) || codePatternRegex.test(value))) {
        newErrors[field] = 'Không được chứa ký tự đặc biệt hoặc mã code';
        valid = false;
      }
    });

    setErrors(newErrors);
    return valid;
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (validateForm(fd)) onSubmit(fd);
  };

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

// ==================== COMPONENT CHÍNH ====================
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

  const hideToast = () => setToast({ show: false });

  const fetchSuppliers = useCallback(async (page = 1, query = '') => {
    const key = `${page}_${query || 'none'}`;
    if (cache.current.has(key)) {
      const cached = cache.current.get(key);
      setSuppliers(cached.data);
      setPageCount(cached.last_page);
      setCurrentPage(page - 1);
      return;
    }

    try {
      setIsLoading(true);
      const res = await supplierService.getAll(page, query);
      cache.current.set(key, { data: res.data, last_page: res.last_page });
      setSuppliers(res.data);
      setPageCount(res.last_page);
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

  const handleDelete = useCallback(async (id) => {
    try {
      setIsLoading(true);
      const res = await supplierService.delete(id);
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

  const handlePageChange = useCallback(({ selected }) => {
    fetchSuppliers(selected + 1, filterParams);
  }, [fetchSuppliers, filterParams]);

  useEffect(() => {
    if (currentView === 'list') {
      fetchSuppliers(1, filterParams);
    }
  }, [currentView, filterParams, fetchSuppliers]);

  return (
    <div className="d-flex">
      <div className="position-relative w-100 flex-grow-1 ms-5 p-4">
        <h1 className="mb-4" style={{ fontSize: '1.8rem', fontWeight: '600' }}>
          Quản Lý Nhà Cung Cấp
        </h1>

        {currentView === 'list' && (
          <SupplierList
            suppliers={suppliers}
            isLoading={isLoading}
            handleShowDeleteModal={(id) => { setSupplierToDelete(id); setShowDeleteModal(true); }}
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

        {(currentView === 'add' || currentView === 'edit') && (
          <SupplierForm
            isEditMode={currentView === 'edit'}
            supplier={editSupplier}
            onSubmit={currentView === 'add' ? handleAddSupplier : handleEditSupplier}
            onCancel={handleCancelForm}
            isLoading={isLoading}
          />
        )}

        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Xác nhận xóa"
          message="Không thể xóa nếu có phiếu nhập kho liên quan."
          onConfirm={() => handleDelete(supplierToDelete)}
          onCancel={() => setShowDeleteModal(false)}
        />

        {toast.show && (
          <CustomToast type={toast.type} message={toast.message} onClose={hideToast} />
        )}
      </div>
    </div>
  );
};

export default AdminSuppliers;