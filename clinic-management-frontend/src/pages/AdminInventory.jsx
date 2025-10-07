import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Spinner, Form, Row, Col } from 'react-bootstrap';
import Taskbar from '../Components/Taskbar';
import Pagination from '../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../Components/CustomToast/CustomToast';

const API_BASE_URL = 'http://localhost:8000';

// Mảng tĩnh cho Nhà Cung Cấp (Static supplier list for demo purposes)
const suppliers = [
  'Công ty Dược ABC',
  'Công ty Dược XYZ',
  'Công ty Dược 123',
  'Công ty Dược DEF',
];

// Regex kiểm tra ký tự đặc biệt và ngôn ngữ code
const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const InventoryList = ({ inventories, isLoading, formatVND, handleShowDeleteModal, handleShowEditForm, pageCount, currentPage, handlePageChange }) => {
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
                  <td>{inventory.id}</td>
                  <td>{inventory.supplier}</td>
                  <td>{inventory.date}</td>
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
              details.map((detail, index) => (
                <tr key={index}>
                  <td>{detail.id}</td>
                  <td>{detail.medicine}</td>
                  <td>{detail.quantity}</td>
                  <td>{formatVND(detail.price)}</td>
                  <td>{formatVND(detail.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

const InventoryForm = ({ isEditMode, inventory, onSubmit, onCancel, isLoading }) => {
  const [errors, setErrors] = useState({
    supplier: '',
    date: '',
    total: '',
    note: '',
  });

  const validateForm = (formData) => {
    const newErrors = {
      supplier: '',
      date: '',
      total: '',
      note: '',
    };
    let isValid = true;

    // Validate Supplier
    const supplier = formData.get('supplier')?.trim();
    if (!supplier) {
      newErrors.supplier = 'Vui lòng chọn nhà cung cấp';
      isValid = false;
    } else if (!suppliers.includes(supplier)) {
      newErrors.supplier = 'Nhà cung cấp không hợp lệ';
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
                name="supplier"
                defaultValue={isEditMode ? inventory?.supplier : ''}
                isInvalid={!!errors.supplier}
              >
                <option value="" disabled>Chọn nhà cung cấp</option>
                {suppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-danger">{errors.supplier}</Form.Text>
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

const AdminInventory = () => {
  const [inventories, setInventories] = useState([]);
  const [details, setDetails] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
  const [currentView, setCurrentView] = useState('list'); // list, add, edit
  const [editInventory, setEditInventory] = useState(null);
  const cache = useRef(new Map());
  const debounceRef = useRef(null);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  const hideToast = () => {
    setToast({ show: false, type: 'info', message: '' });
  };

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
        const response = await fetch(`${API_BASE_URL}/api/inventories?page=${page}`, {
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const paginator = await response.json();
        cache.current.set(page, { data: paginator.data, last_page: paginator.last_page });
        setInventories(paginator.data);
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

  const fetchInventoryDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/inventory-details`, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setDetails(data);
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
        const response = await fetch(`${API_BASE_URL}/api/inventories/${inventoryId}`, {
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
    setCurrentView(inventory ? 'edit' : 'add');
  };

  const handleCancelForm = () => {
    try {
      setCurrentView('list');
      setEditInventory(null);
    } catch (error) {
      showToast('error', 'Hủy thất bại');
    }
  };

  const handleAddInventory = async (e) => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken();
      const formData = new FormData(e.target);
      const data = {
        supplier: formData.get('supplier'),
        date: formData.get('date'),
        total: parseFloat(formData.get('total')),
        note: formData.get('note') || '',
      };

      const response = await fetch(`${API_BASE_URL}/api/inventories`, {
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
        supplier: formData.get('supplier'),
        date: formData.get('date'),
        total: parseFloat(formData.get('total')),
        note: formData.get('note') || '',
      };

      const response = await fetch(`${API_BASE_URL}/api/inventories/${editInventory.id}`, {
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
      fetchInventories(1);
      fetchInventoryDetails();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentView, fetchInventories, fetchInventoryDetails]);

  const handlePageChange = ({ selected }) => {
    const nextPage = selected + 1;
    fetchInventories(nextPage);
  };

  const formatVND = (value) => {
    return Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  return (
    <div className="d-flex">
      <Taskbar />
      <div className="position-relative w-100 flex-grow-1 ms-5 p-5">
        <h1 className="mb-4">Quản Lý Kho</h1>
        {currentView === 'list' && (
          <>
            <InventoryList
              inventories={inventories}
              isLoading={isLoading}
              formatVND={formatVND}
              handleShowDeleteModal={handleShowDeleteModal}
              handleShowEditForm={handleShowEditForm}
              pageCount={pageCount}
              currentPage={currentPage}
              handlePageChange={handlePageChange}
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
          />
        )}
        {currentView === 'edit' && (
          <InventoryForm
            isEditMode={true}
            inventory={editInventory}
            onSubmit={handleEditInventory}
            onCancel={handleCancelForm}
            isLoading={isLoading}
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