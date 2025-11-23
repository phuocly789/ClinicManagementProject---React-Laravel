import React, { useEffect, useState, useCallback, useMemo } from 'react';
import '../../App.css';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import Pagination from '../../Components/Pagination/Pagination';
import adminService from '../../services/adminService';
import { BiPlus, BiPencil, BiTrash, BiSearch } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';

const initialFormState = {
    name: '',
    type: '',
    price: '',
    description: ''
};

// Tách FormField component
const FormField = React.memo(({ 
    label, 
    name, 
    type = "text", 
    required = false, 
    value,
    onChange,
    error,
    ...props 
}) => (
    <div className="mb-3">
        <label className="form-label">
            {label} {required && <span className="text-danger">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value || ''}
            onChange={onChange}
            className={`form-control ${error ? 'is-invalid' : ''}`}
            required={required}
            {...props}
        />
        {error && <div className="invalid-feedback">{error}</div>}
    </div>
));

const AdminServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [pagination, setPagination] = useState({ 
        currentPage: 1, 
        totalPages: 1,
        totalItems: 0 
    });
    const [filters, setFilters] = useState({ 
        search: '', 
        type: ''
    });
    const [debouncedSearchTerm] = useDebounce(filters.search, 500);
    const [modal, setModal] = useState({ type: null, service: null });
    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // API filters - ĐƠN GIẢN HÓA 
    const apiFilters = useMemo(() => ({
        search: debouncedSearchTerm,
        type: filters.type,
    }), [debouncedSearchTerm, filters.type]);

    // Fetch service types
    useEffect(() => {
        const fetchServiceTypes = async () => {
            try {
                const response = await adminService.getServiceTypes();
                console.log('Service Types Response:', response.data);
                
                const typesData = response.data || response;
                setServiceTypes(typesData);
            } catch (error) {
                console.error('Lỗi khi tải loại dịch vụ:', error);
                setToast({ 
                    type: 'error', 
                    message: error.response?.data?.message || 'Lỗi khi tải loại dịch vụ' 
                });
                
                // Fallback types
                setServiceTypes([
                    { id: 1, name: 'Khám bệnh' },
                    { id: 2, name: 'Xét nghiệm' },
                    { id: 3, name: 'Chẩn đoán hình ảnh' },
                    { id: 4, name: 'Thủ thuật' }
                ]);
            }
        };
        fetchServiceTypes();
    }, []);

    // Fetch services 
    const fetchServices = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            console.log('Fetching services with params:', {
                page, 
                per_page: 10, 
                ...apiFilters 
            });
            
            const response = await adminService.getServices({
                page, 
                per_page: 10, 
                ...apiFilters 
            });
            
            console.log('Full API Response:', response);
            console.log('Services Data:', response.data);
            
            // XỬ LÝ DỮ LIỆU GIỐNG 
            if (!response.data) {
                throw new Error('Dữ liệu trả về không hợp lệ');
            }
            
            const formattedServices = response.data.data || response.data || [];
            
            setServices(formattedServices);
            setPagination({
                currentPage: response.data.current_page || response.current_page || 1,
                totalPages: response.data.last_page || response.last_page || 1,
                totalItems: response.data.total || response.total || 0
            });
            
        } catch (error) {
            console.error('Lỗi khi tải danh sách dịch vụ:', error);
            console.error('Error response:', error.response);
            setToast({ 
                type: 'error', 
                message: error.response?.data?.message || error.message || 'Lỗi khi tải danh sách dịch vụ' 
            });
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [apiFilters]);

    // Fetch services khi filters thay đổi 
    useEffect(() => {
        fetchServices(1);
    }, [apiFilters, fetchServices]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleCloseModal = () => {
        setModal({ type: null, service: null });
        setFormData(initialFormState);
        setFormErrors({});
    };

    const handleOpenModal = (type, service = null) => {
        setModal({ type, service });
        setFormErrors({});
        
        if (type === 'add') {
            setFormData(initialFormState);
        } else if (type === 'edit' && service) {
            setFormData({
                name: service.name || '',
                type: service.type || '',
                price: service.price?.toString() || '',
                description: service.description || ''
            });
        } else {
            setFormData(initialFormState);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear errors khi user nhập
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Validate form
    const validateForm = () => {
        const errors = {};
        
        if (!formData.name?.trim()) {
            errors.name = 'Tên dịch vụ là bắt buộc';
        }
        
        if (!formData.type?.trim()) {
            errors.type = 'Loại dịch vụ là bắt buộc';
        }
        
        if (!formData.price) {
            errors.price = 'Giá dịch vụ là bắt buộc';
        } else if (parseFloat(formData.price) < 0) {
            errors.price = 'Giá dịch vụ không hợp lệ';
        }
        
        if (!formData.description?.trim()) {
            errors.description = 'Mô tả dịch vụ là bắt buộc';
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setToast({ type: 'error', message: 'Vui lòng kiểm tra lại thông tin nhập vào.' });
            return;
        }
        
        setLoading(true);
        const { type, service } = modal;
        const isEditing = type === 'edit';

        try {
            const serviceData = {
                name: formData.name,
                type: formData.type,
                price: parseFloat(formData.price),
                description: formData.description
            };
            
            if (isEditing) {
                await adminService.updateService(service.id, serviceData);
            } else {
                await adminService.createService(serviceData);
            }
            
            setToast({ 
                type: 'success', 
                message: `Dịch vụ đã được ${isEditing ? 'cập nhật' : 'thêm mới'} thành công!` 
            });
            handleCloseModal();
            
            // XỬ LÝ PHÂN TRANG KHI XÓA/THÊM 
            if (isEditing) {
                fetchServices(pagination.currentPage);
            } else {
                // Khi thêm mới, quay về trang đầu tiên
                fetchServices(1);
            }
        } catch (error) {
            console.error(`Lỗi khi ${isEditing ? 'cập nhật' : 'thêm'} dịch vụ:`, error);
            const errorMessage = error.response?.data?.message || `Lỗi khi ${isEditing ? 'cập nhật' : 'thêm'} dịch vụ`;
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteService = async () => {
        if (!modal.service) return;
        
        setLoading(true);
        try {
            await adminService.deleteService(modal.service.id);
            setToast({ 
                type: 'success', 
                message: 'Xóa dịch vụ thành công!' 
            });
            handleCloseModal();
            
            // XỬ LÝ PHÂN TRANG 
            const newPage = services.length === 1 && pagination.currentPage > 1 
                ? pagination.currentPage - 1 
                : pagination.currentPage;
            fetchServices(newPage);
        } catch (error) {
            console.error('Lỗi khi xóa dịch vụ:', error);
            const errorMessage = error.response?.data?.message || 'Lỗi khi xóa dịch vụ';
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFilters({ search: '', type: '' });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
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
                    isEditing ? 'Cập Nhật Thông Tin Dịch Vụ' : 'Thêm Dịch Vụ Mới',
                    <form onSubmit={handleFormSubmit}>
                        <div className="row g-3">
                            <div className="col-12">
                                <FormField 
                                    label="Tên dịch vụ" 
                                    name="name" 
                                    required 
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    error={formErrors.name}
                                    placeholder="Nhập tên dịch vụ..."
                                />
                            </div>
                            <div className="col-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Loại dịch vụ <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        name="type"
                                        value={formData.type || ''}
                                        onChange={handleFormChange}
                                        className={`form-select ${formErrors.type ? 'is-invalid' : ''}`}
                                        required
                                    >
                                        <option value="">Chọn loại dịch vụ</option>
                                        {serviceTypes.map(type => (
                                            <option key={type.id} value={type.name}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.type && <div className="invalid-feedback">{formErrors.type}</div>}
                                </div>
                            </div>
                            <div className="col-12">
                                <FormField 
                                    label="Giá (VND)" 
                                    name="price" 
                                    type="number" 
                                    required 
                                    min="0"
                                    step="1000"
                                    value={formData.price}
                                    onChange={handleFormChange}
                                    error={formErrors.price}
                                    placeholder="Nhập giá dịch vụ..."
                                />
                            </div>
                            <div className="col-12">
                                <div className="mb-3">
                                    <label className="form-label">
                                        Mô tả <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleFormChange}
                                        className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                                        rows="4"
                                        required
                                        placeholder="Nhập mô tả dịch vụ..."
                                    />
                                    {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Đang xử lý...' : (isEditing ? 'Cập Nhật' : 'Thêm Mới')}
                            </button>
                        </div>
                    </form>,
                    null
                );

            case 'delete':
                return modalLayout(
                    'Xác Nhận Xóa',
                    <>
                        <p>Bạn có chắc chắn muốn xóa dịch vụ <strong>"{modal.service.name}"</strong>?</p>
                        <p className="text-muted small">Hành động này không thể hoàn tác.</p>
                    </>,
                    <>
                        <button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
                        <button className="btn btn-danger" onClick={handleDeleteService} disabled={loading}>
                            {loading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                        </button>
                    </>,
                    '450px'
                );

            default:
                return null;
        }
    };

    return (
        <div className="d-flex">
            <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
                {toast && (
                    <CustomToast 
                        type={toast.type} 
                        message={toast.message} 
                        onClose={() => setToast(null)} 
                    />
                )}

                <header className="d-flex justify-content-between align-items-center flex-shrink-0">
                    <h1 className="h4 mb-0">Quản Lý Dịch Vụ</h1>
                    <button 
                        className="btn btn-primary d-flex align-items-center gap-2" 
                        onClick={() => handleOpenModal('add')}
                        disabled={loading}
                    >
                        <BiPlus size={18} /> Tạo Dịch Vụ
                    </button>
                </header>

                {/* Bộ lọc */}
                <div className="card shadow-sm border-0 flex-shrink-0">
                    <div className="card-body p-4">
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <BiSearch />
                                    </span>
                                    <input
                                        type="text"
                                        name="search"
                                        className="form-control"
                                        placeholder="Tìm theo tên, loại, mô tả..."
                                        value={filters.search}
                                        onChange={handleFilterChange}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="col-md-4">
                                <select 
                                    name="type" 
                                    className="form-select" 
                                    value={filters.type} 
                                    onChange={handleFilterChange}
                                    disabled={loading}
                                >
                                    <option value="">Tất cả loại</option>
                                    {serviceTypes.map(type => (
                                        <option key={type.id} value={type.name}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <button 
                                    className="btn btn-outline-secondary w-100 h-100" 
                                    onClick={clearFilters}
                                    disabled={loading}
                                >
                                    Xóa lọc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bảng dữ liệu */}
                <div className="card shadow-sm border-0 table-panel">
                    {loading ? (
                        <Loading isLoading={loading} />
                    ) : (
                        <>
                            <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
                                <h6 className="mb-0 text-muted">
                                    Tổng cộng: <strong>{pagination.totalItems}</strong> dịch vụ
                                </h6>
                                <small className="text-muted">
                                    Trang {pagination.currentPage} / {pagination.totalPages}
                                </small>
                            </div>

                            <div className="table-responsive-container">
                                <table className="table table-hover clinic-table mb-0">
                                    <thead className="p-4">
                                        <tr>
                                            <th className="px-4">Mã Dịch Vụ</th>
                                            <th>Tên Dịch Vụ</th>
                                            <th>Loại</th>
                                            <th>Giá</th>
                                            <th>Mô Tả</th>
                                            <th className="text-center px-4">Hành Động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {services.length > 0 ? services.map(service => (
                                            <tr key={service.id}>
                                                <td className="px-4">
                                                    <span className='user-id'>{`#${service.id}`}</span>
                                                </td>
                                                <td className="fw-semibold">{service.name}</td>
                                                <td>
                                                    <span className="badge bg-info bg-opacity-10 text-info">
                                                        {service.type}
                                                    </span>
                                                </td>
                                                <td className="text-success fw-medium">
                                                    {formatPrice(service.price)}
                                                </td>
                                                <td>
                                                    <div 
                                                        className="text-truncate" 
                                                        style={{ maxWidth: '200px' }} 
                                                        title={service.description}
                                                    >
                                                        {service.description}
                                                    </div>
                                                </td>
                                                <td className="text-center px-4">
                                                    <div className="d-flex gap-2 justify-content-center">
                                                        <button
                                                            className="btn btn-lg btn-light" 
                                                            title="Sửa"
                                                            onClick={() => handleOpenModal('edit', service)}
                                                            disabled={loading}
                                                        >
                                                            <BiPencil />
                                                        </button>
                                                        <button
                                                            className="btn btn-lg btn-light text-danger" 
                                                            title="Xóa"
                                                            onClick={() => handleOpenModal('delete', service)}
                                                            disabled={loading}
                                                        >
                                                            <BiTrash />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="text-center p-5 text-muted">
                                                    <BiSearch size={48} className="mb-3 opacity-50" />
                                                    <p className="mb-0 fs-5">Không tìm thấy dịch vụ</p>
                                                    <small>Thử thay đổi bộ lọc hoặc thêm dịch vụ mới</small>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* PHÂN TRANG */}
                            {pagination.totalPages > 1 && (
                                <div className="card-footer p-3 border-0 flex-shrink-0">
                                    <Pagination
                                        pageCount={pagination.totalPages}
                                        onPageChange={({ selected }) => fetchServices(selected + 1)}
                                        currentPage={pagination.currentPage - 1}
                                        isLoading={loading}
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

export default AdminServiceManagement;