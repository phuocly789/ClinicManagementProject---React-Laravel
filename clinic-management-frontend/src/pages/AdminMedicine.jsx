import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Spinner, Form, Row, Col } from 'react-bootstrap';
import Taskbar from '../Components/Taskbar';
import Pagination from '../Components/Pagination/Pagination';
import ConfirmDeleteModal from '../Components/CustomToast/DeleteConfirmModal';
import CustomToast from '../Components/CustomToast/CustomToast';
import { Pencil, PencilIcon, ServerCrash, Trash } from 'lucide-react';

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

// Regex kiểm tra ký tự đặc biệt và ngôn ngữ code
const specialCharRegex = /[<>{}[\]()\\\/;:'"`~!@#$%^&*+=|?]/;
const codePatternRegex = /(function|var|let|const|if|else|for|while|return|class|import|export|\$\w+)/i;

const MedicineList = ({ medicines, isLoading, formatVND, handleShowDeleteModal, handleShowEditForm, pageCount, currentPage, handlePageChange }) => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Danh Sách Thuốc</h3>
        <Button variant="primary" onClick={() => handleShowEditForm(null)}>Thêm Thuốc Mới</Button>
      </div>
      <div className="table-responsive" style={{ transition: 'opacity 0.3s ease' }}>
        <Table striped bordered hover responsive className={isLoading ? 'opacity-50' : ''}>
          <thead>
            <tr>
              <th>Mã Thuốc</th>
              <th>Tên Thuốc</th>
              <th>Loại Thuốc</th>
              <th>Đơn Vị</th>
              <th>Giá Bán</th>
              <th>Tồn Kho</th>
              <th>Mô Tả</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="text-center">
                  <Spinner animation="border" variant="primary" />
                </td>
              </tr>
            ) : medicines.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">
                  Trống
                </td>
              </tr>
            ) : (
              medicines.map((medicine) => (
                <tr key={medicine.MedicineId}>
                  <td>{medicine.MedicineId}</td>
                  <td>{medicine.MedicineName}</td>
                  <td>{medicine.MedicineType}</td>
                  <td>{medicine.Unit}</td>
                  <td>{formatVND(medicine.Price)}</td>
                  <td>{medicine.StockQuantity}</td>
                  <td>{medicine.Description}</td>
                  <td>
                    <span>
                      <a
                        className="text-success"
                        href="#"
                        onClick={() => handleShowEditForm(medicine)}
                      >
                        <PencilIcon />

                      </a>
                    </span>
                    <span className="px-1">/</span>
                    <span>
                      <a
                        className="text-danger"
                        href="#"
                        onClick={() => handleShowDeleteModal(medicine.MedicineId)}
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
};

const MedicineForm = ({ isEditMode, medicine, onSubmit, onCancel, isLoading }) => {
  const [errors, setErrors] = useState({
    MedicineName: '',
    MedicineType: '',
    Unit: '',
    Price: '',
    StockQuantity: '',
    Description: '',
  });

  const validateForm = (formData) => {
    const newErrors = {
      MedicineName: '',
      MedicineType: '',
      Unit: '',
      Price: '',
      StockQuantity: '',
      Description: '',
    };
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
};

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
  const cache = useRef(new Map());
  const debounceRef = useRef(null);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  const hideToast = () => {
    setToast({ show: false, type: 'info', message: '' });
  };

  const fetchMedicines = useCallback(async (page = 1) => {
    if (cache.current.has(page)) {
      const { data, last_page } = cache.current.get(page);
      setMedicines(data);
      setPageCount(last_page);
      setCurrentPage(page - 1);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/medicines?page=${page}`, {
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
        setMedicines(paginator.data);
        setPageCount(paginator.last_page);
        setCurrentPage(page - 1);
      } catch (error) {
        console.error('Error fetching medicines:', error);
        showToast('error', `Lỗi khi tải danh sách thuốc: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 300);
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
  };

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
  }, [currentPage, fetchMedicines]);

  const handleShowDeleteModal = (medicineId) => {
    setMedicineToDelete(medicineId);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setMedicineToDelete(null);
  };

  const handleShowEditForm = (medicine) => {
    setEditMedicine(medicine);
    setCurrentView(medicine ? 'edit' : 'add');
  };

  const handleCancelForm = () => {
    try {
      setCurrentView('list');
      setEditMedicine(null);
    } catch (error) {
      showToast('error', 'Hủy thất bại');
    }
  };

  const handleAddMedicine = async (e) => {
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
  };

  const handleEditMedicine = async (e) => {
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
  };

  useEffect(() => {
    if (currentView === 'list') {
      fetchMedicines(1);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentView, fetchMedicines]);

  const handlePageChange = ({ selected }) => {
    const nextPage = selected + 1;
    fetchMedicines(nextPage);
  };

  const formatVND = (price) => {
    return Number(price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  return (
    <div className="d-flex">
      <Taskbar />
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
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa thuốc này?"
          onConfirm={() => handleDelete(medicineToDelete)}
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

export default AdminMedicine;