import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Table, Button, Spinner, Form, Row, Col } from 'react-bootstrap';
import Pagination from '../../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../../Components/CustomToast/CustomToast';
import { PencilIcon, Trash } from 'lucide-react';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';

const API_BASE_URL = 'http://localhost:8000';

// Regex kiểm tra ký tự đặc biệt và mã code
const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const SupplierList = memo(({ suppliers, isLoading, handleShowDeleteModal, handleShowEditForm, pageCount, currentPage, handlePageChange }) => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Danh Sách Nhà Cung Cấp</h3>
        <Button variant="primary" onClick={() => handleShowEditForm(null)}>Thêm Nhà Cung Cấp</Button>
      </div>
      <div className="table-responsive" style={{ transition: 'opacity 0.3s ease' }}>
        <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
          <thead>
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
              <tr>
                <td colSpan="7" className="text-center">
                  <Spinner animation="border" variant="primary" />
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">
                  Trống
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.SupplierId}>
                  <td>{supplier.SupplierId}</td>
                  <td>{supplier.SupplierName}</td>
                  <td>{supplier.ContactEmail}</td>
                  <td>{supplier.ContactPhone}</td>
                  <td>{supplier.Address}</td>
                  <td>{supplier.Description}</td>
                  <td>
                    <span>
                      <a
                        className="text-success"
                        href="#"
                        onClick={() => handleShowEditForm(supplier)}
                      >
                        <PencilIcon />
                      </a>
                    </span>
                    <span className="px-1">/</span>
                    <span>
                      <a
                        className="text-danger"
                        href="#"
                        onClick={() => handleShowDeleteModal(supplier.SupplierId)}
                      >
                        <Trash />
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
});

const SupplierForm = memo(({ isEditMode, supplier, onSubmit, onCancel, isLoading }) => {
  const [errors, setErrors] = useState({
    SupplierName: '',
    ContactEmail: '',
    ContactPhone: '',
    Address: '',
    Description: '',
  });

  const validateForm = useCallback((formData) => {
    const newErrors = {};
    let isValid = true;

    // Validate SupplierName
    const supplierName = formData.get('SupplierName')?.trim();
    if (!supplierName) {
      newErrors.SupplierName = 'Vui lòng nhập tên nhà cung cấp';
      isValid = false;
    } else if (supplierName.length > 255) {
      newErrors.SupplierName = 'Tên nhà cung cấp không được vượt quá 255 ký tự';
      isValid = false;
    } else if (specialCharRegex.test(supplierName) || codePatternRegex.test(supplierName)) {
      newErrors.SupplierName = 'Vui lòng không nhập ký tự đặc biệt hoặc ngôn ngữ code';
      isValid = false;
    }

    // Validate ContactEmail
    const contactEmail = formData.get('ContactEmail')?.trim();
    if (contactEmail && contactEmail.length > 255) {
      newErrors.ContactEmail = 'Email không được vượt quá 255 ký tự';
      isValid = false;
    } else if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.ContactEmail = 'Email không hợp lệ';
      isValid = false;
    }

    // Validate ContactPhone
    const contactPhone = formData.get('ContactPhone')?.trim();
    if (contactPhone && contactPhone.length > 20) {
      newErrors.ContactPhone = 'Số điện thoại không được vượt quá 20 ký tự';
      isValid = false;
    } else if (contactPhone && !/^\+?\d{9,15}$/.test(contactPhone)) {
      newErrors.ContactPhone = 'Số điện thoại không hợp lệ';
      isValid = false;
    }

    // Validate Address
    const address = formData.get('Address')?.trim();
    if (address && address.length > 255) {
      newErrors.Address = 'Địa chỉ không được vượt quá 255 ký tự';
      isValid = false;
    } else if (address && (specialCharRegex.test(address) || codePatternRegex.test(address))) {
      newErrors.Address = 'Vui lòng không nhập ký tự đặc biệt hoặc ngôn ngữ code';
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

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      if (validateForm(formData)) {
        onSubmit(e);
      }
    },
    [onSubmit, validateForm]
  );

  return (
    <div>
      <h3>{isEditMode ? 'Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp'}</h3>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Tên Nhà Cung Cấp</Form.Label>
              <Form.Control
                type="text"
                name="SupplierName"
                defaultValue={isEditMode ? supplier?.SupplierName : ''}
                placeholder="Nhập tên nhà cung cấp"
                isInvalid={!!errors.SupplierName}
              />
              <Form.Text className="text-danger">{errors.SupplierName}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="ContactEmail"
                defaultValue={isEditMode ? supplier?.ContactEmail : ''}
                placeholder="Nhập email (tùy chọn)"
                isInvalid={!!errors.ContactEmail}
              />
              <Form.Text className="text-danger">{errors.ContactEmail}</Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Số Điện Thoại</Form.Label>
              <Form.Control
                type="text"
                name="ContactPhone"
                defaultValue={isEditMode ? supplier?.ContactPhone : ''}
                placeholder="Nhập số điện thoại (tùy chọn)"
                isInvalid={!!errors.ContactPhone}
              />
              <Form.Text className="text-danger">{errors.ContactPhone}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Địa Chỉ</Form.Label>
              <Form.Control
                type="text"
                name="Address"
                defaultValue={isEditMode ? supplier?.Address : ''}
                placeholder="Nhập địa chỉ (tùy chọn)"
                isInvalid={!!errors.Address}
              />
              <Form.Text className="text-danger">{errors.Address}</Form.Text>
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
                defaultValue={isEditMode ? supplier?.Description : ''}
                placeholder="Nhập mô tả (tùy chọn)"
                isInvalid={!!errors.Description}
              />
              <Form.Text className="text-danger">{errors.Description}</Form.Text>
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
});

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [currentView, setCurrentView] = useState('list'); // list, add, edit
  const [editSupplier, setEditSupplier] = useState(null);
  const cache = useRef(new Map());
  const debounceRef = useRef(null);

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ show: false, type: 'info', message: '' });
  }, []);

  const fetchSuppliers = useCallback(
    async (page = 1) => {
      if (cache.current.has(page)) {
        const { data, last_page } = cache.current.get(page);
        setSuppliers(data);
        setPageCount(last_page);
        setCurrentPage(page - 1);
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${API_BASE_URL}/api/suppliers?page=${page}`, {
            headers: {
              Accept: 'application/json',
            },
            credentials: 'include',
          });
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const paginator = await response.json();
          cache.current.set(page, { data: paginator.data, last_page: paginator.last_page });
          setSuppliers(paginator.data);
          setPageCount(paginator.last_page);
          setCurrentPage(page - 1);
        } catch (error) {
          console.error('Error fetching suppliers:', error);
          showToast('error', `Lỗi khi tải danh sách nhà cung cấp: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    [showToast]
  );

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

  const handleShowDeleteModal = useCallback((supplierId) => {
    setSupplierToDelete(supplierId);
    setShowDeleteModal(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setSupplierToDelete(null);
  }, []);

  const handleShowEditForm = useCallback((supplier) => {
    setEditSupplier(supplier);
    setCurrentView(supplier ? 'edit' : 'add');
  }, []);

  const handleCancelForm = useCallback(() => {
    setCurrentView('list');
    setEditSupplier(null);
  }, []);

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

  useEffect(() => {
    if (currentView === 'list') {
      fetchSuppliers(1);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentView, fetchSuppliers]);

  const handlePageChange = useCallback(
    ({ selected }) => {
      const nextPage = selected + 1;
      fetchSuppliers(nextPage);
    },
    [fetchSuppliers]
  );

  return (
    <div className="d-flex">
      <AdminSidebar />
      <div className="position-relative w-100 flex-grow-1 ms-5 p-4">
        <h1 className="mb-4">Quản Lý Nhà Cung Cấp</h1>
        {currentView === 'list' && (
          <SupplierList
            suppliers={suppliers}
            isLoading={isLoading}
            handleShowDeleteModal={handleShowDeleteModal}
            handleShowEditForm={handleShowEditForm}
            pageCount={pageCount}
            currentPage={currentPage}
            handlePageChange={handlePageChange}
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
          message="Bạn có chắc chắn muốn xóa nhà cung cấp này? Lưu ý: Không thể xóa nếu nhà cung cấp có phiếu nhập kho liên quan."
          onConfirm={() => handleDelete(supplierToDelete)}
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

export default AdminSuppliers;