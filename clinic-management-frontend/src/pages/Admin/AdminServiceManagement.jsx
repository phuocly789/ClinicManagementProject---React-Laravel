import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Pagination from '../../Components/Pagination/Pagination';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import adminService from '../../services/adminService';
import { BiPlus, BiEdit, BiTrash, BiShow, BiSearch, BiRefresh } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';

const initialFormState = {
    name: '',
    type: '',
    price: '',
    description: '',
    status: 'active'
};

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
        type: '',
        status: '' 
    });
    
    const [debouncedSearchTerm] = useDebounce(filters.search, 500);
    
    const [modal, setModal] = useState({ type: null, service: null });
    const [formData, setFormData] = useState(initialFormState);
    
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Fetch service types
    useEffect(() => {
        const fetchServiceTypes = async () => {
            try {
                const response = await adminService.getServiceTypes();
                setServiceTypes(response.data?.data || []);
            } catch (error) {
                console.error('Lỗi khi tải loại dịch vụ:', error);
                setToast({ 
                    type: 'error', 
                    message: error.response?.data?.message || 'Lỗi khi tải loại dịch vụ' 
                });
            }
        };
        fetchServiceTypes();
    }, []);

    // API filters
    const apiFilters = useMemo(() => ({
        search: debouncedSearchTerm,
        type: filters.type,
        status: filters.status,
        page: pagination.currentPage,
        per_page: 5
    }), [debouncedSearchTerm, filters.type, filters.status, pagination.currentPage]);

    // Fetch services từ database
    const fetchServices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await adminService.getServices(apiFilters);
            const data = response.data;
            
            setServices(data.data || []);
            setPagination({
                currentPage: data.current_page || 1,
                totalPages: data.last_page || 1,
                totalItems: data.total || 0
            });
        } catch (error) {
            console.error('Lỗi khi tải danh sách dịch vụ:', error);
            setToast({ 
                type: 'error', 
                message: error.response?.data?.message || 'Lỗi khi tải danh sách dịch vụ' 
            });
        } finally {
            setLoading(false);
        }
    }, [apiFilters]);

    // Fetch services khi filters thay đổi
    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleCloseModal = () => {
        setModal({ type: null, service: null });
        setFormData(initialFormState);
    };

    const handleOpenModal = (type, service = null) => {
        setModal({ type, service });
        if (type === 'edit' && service) {
            setFormData({
                name: service.name,
                type: service.type,
                price: service.price.toString(),
                description: service.description,
                status: service.status
            });
        } else if (type === 'add') {
            setFormData(initialFormState);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Thêm dịch vụ mới vào database
    const handleAddService = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const serviceData = {
                name: formData.name,
                type: formData.type,
                price: parseInt(formData.price),
                description: formData.description,
                status: formData.status
            };
            
            await adminService.createService(serviceData);
            setToast({ 
                type: 'success', 
                message: 'Thêm dịch vụ thành công!' 
            });
            handleCloseModal();
            fetchServices(); // Refresh danh sách
        } catch (error) {
            console.error('Lỗi khi thêm dịch vụ:', error);
            const errorMessage = error.response?.data?.errors 
                ? Object.values(error.response.data.errors).flat().join(' ')
                : (error.response?.data?.message || 'Lỗi khi thêm dịch vụ');
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    // Cập nhật dịch vụ trong database
    const handleEditService = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const serviceData = {
                name: formData.name,
                type: formData.type,
                price: parseInt(formData.price),
                description: formData.description,
                status: formData.status
            };
            
            await adminService.updateService(modal.service.id, serviceData);
            setToast({ 
                type: 'success', 
                message: 'Cập nhật dịch vụ thành công!' 
            });
            handleCloseModal();
            fetchServices(); // Refresh danh sách
        } catch (error) {
            console.error('Lỗi khi cập nhật dịch vụ:', error);
            const errorMessage = error.response?.data?.errors 
                ? Object.values(error.response.data.errors).flat().join(' ')
                : (error.response?.data?.message || 'Lỗi khi cập nhật dịch vụ');
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    // Xóa dịch vụ từ database
    const handleDeleteService = async () => {
        setLoading(true);
        
        try {
            await adminService.deleteService(modal.service.id);
            setToast({ 
                type: 'success', 
                message: 'Xóa dịch vụ thành công!' 
            });
            handleCloseModal();
            fetchServices(); // Refresh danh sách
        } catch (error) {
            console.error('Lỗi khi xóa dịch vụ:', error);
            const errorMessage = error.response?.data?.message || 'Lỗi khi xóa dịch vụ';
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = ({ selected }) => {
        setPagination(prev => ({ ...prev, currentPage: selected + 1 }));
    };

    const clearFilters = () => {
        setFilters({ search: '', type: '', status: '' });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const refreshData = () => {
        fetchServices();
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    return (
        <div className="d-flex">
            <AdminSidebar />
            <main className="flex-grow-1 p-3">
                {toast && (
                    <CustomToast 
                        type={toast.type} 
                        message={toast.message} 
                        onClose={() => setToast(null)} 
                    />
                )}

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3 mb-0 fw-bold text-primary">Quản Lý Dịch Vụ</h1>
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-outline-secondary d-flex align-items-center"
                            onClick={refreshData}
                            disabled={loading}
                        >
                            <BiRefresh className="me-1" size={18} />
                            Làm mới
                        </button>
                        <button 
                            className="btn btn-primary d-flex align-items-center" 
                            onClick={() => handleOpenModal('add')}
                            disabled={loading}
                        >
                            <BiPlus className="me-2" size={18} /> Tạo Dịch Vụ
                        </button>
                    </div>
                </div>

                <div className="card shadow-sm mb-4 border-0">
                    <div className="card-body">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label htmlFor="search" className="form-label fw-medium">Tìm kiếm</label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <BiSearch />
                                    </span>
                                    <input
                                        id="search"
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
                            <div className="col-md-3">
                                <label htmlFor="type" className="form-label fw-medium">Loại dịch vụ</label>
                                <select 
                                    id="type"
                                    name="type" 
                                    className="form-select" 
                                    value={filters.type} 
                                    onChange={handleFilterChange}
                                    disabled={loading}
                                >
                                    <option value="">Tất cả</option>
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

                <div className="card shadow-sm border-0">
                    <div className="card-body">
                        {loading ? (
                            <div className="text-center py-5">
                                <Loading isLoading={loading} />
                            </div>
                        ) : (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0 text-muted">
                                        Tổng cộng: <strong>{pagination.totalItems}</strong> dịch vụ
                                    </h6>
                                    <small className="text-muted">
                                        Trang {pagination.currentPage} / {pagination.totalPages}
                                    </small>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th scope="col" className="fw-semibold">Mã DV</th>
                                                <th scope="col" className="fw-semibold">Tên Dịch Vụ</th>
                                                <th scope="col" className="fw-semibold">Loại</th>
                                                <th scope="col" className="fw-semibold">Giá</th>
                                                <th scope="col" className="fw-semibold">Mô Tả</th>
                                                <th scope="col" className="fw-semibold text-center">Trạng Thái</th>
                                                <th scope="col" className="fw-semibold text-center">Hành Động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {services.length > 0 ? services.map(service => (
                                                <tr key={service.id}>
                                                    <td>
                                                        <span className="badge bg-secondary bg-opacity-25 text-secondary fw-medium">
                                                            #{service.id}
                                                        </span>
                                                    </td>
                                                    <td className="fw-medium">{service.name}</td>
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
                                                    <td className="text-center">
                                                        <span className={`badge ${service.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                                            {service.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="btn-group btn-group-sm" role="group">
                                                            <button
                                                                className="btn btn-outline-info"
                                                                title="Chi tiết"
                                                                onClick={() => handleOpenModal('detail', service)}
                                                                disabled={loading}
                                                            >
                                                                <BiShow size={16} />
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-primary"
                                                                title="Sửa"
                                                                onClick={() => handleOpenModal('edit', service)}
                                                                disabled={loading}
                                                            >
                                                                <BiEdit size={16} />
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-danger"
                                                                title="Xóa"
                                                                onClick={() => handleOpenModal('delete', service)}
                                                                disabled={loading}
                                                            >
                                                                <BiTrash size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-5">
                                                        <div className="text-muted">
                                                            <BiSearch size={48} className="mb-3 opacity-50" />
                                                            <p className="mb-0 fs-5">Không tìm thấy dịch vụ</p>
                                                            <small>Thử thay đổi bộ lọc hoặc thêm dịch vụ mới</small>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {pagination.totalPages > 1 && (
                                    <div className="d-flex justify-content-center mt-4">
                                        <Pagination
                                            pageCount={pagination.totalPages}
                                            onPageChange={handlePageChange}
                                            forcePage={pagination.currentPage - 1}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Add Service Modal */}
                {modal.type === 'add' && (
                    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
                        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                            <div className="modal-content">
                                <div className="modal-header bg-light">
                                    <h5 className="modal-title fw-bold">Thêm Dịch Vụ Mới</h5>
                                    <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={handleAddService}>
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label htmlFor="addName" className="form-label fw-medium">
                                                    Tên dịch vụ <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="addName"
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleFormChange}
                                                    className="form-control"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="addType" className="form-label fw-medium">
                                                    Loại dịch vụ <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    id="addType"
                                                    name="type"
                                                    value={formData.type}
                                                    onChange={handleFormChange}
                                                    className="form-select"
                                                    required
                                                    disabled={loading}
                                                >
                                                    <option value="">Chọn loại</option>
                                                    {serviceTypes.map(type => (
                                                        <option key={type.id} value={type.name}>
                                                            {type.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="addPrice" className="form-label fw-medium">
                                                    Giá (VND) <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="addPrice"
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleFormChange}
                                                    className="form-control"
                                                    required
                                                    min="0"
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="addDescription" className="form-label fw-medium">
                                                    Mô tả <span className="text-danger">*</span>
                                                </label>
                                                <textarea
                                                    id="addDescription"
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleFormChange}
                                                    className="form-control"
                                                    rows="4"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="addStatus" className="form-label fw-medium">Trạng thái</label>
                                                <select
                                                    id="addStatus"
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleFormChange}
                                                    className="form-select"
                                                    disabled={loading}
                                                >
                                                    <option value="active">Hoạt động</option>
                                                    <option value="inactive">Ngừng hoạt động</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="modal-footer mt-4 border-top-0">
                                            <button 
                                                type="button" 
                                                className="btn btn-outline-secondary" 
                                                onClick={handleCloseModal} 
                                                disabled={loading}
                                            >
                                                Hủy
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary px-4" 
                                                disabled={loading}
                                            >
                                                {loading ? 'Đang xử lý...' : 'Thêm Dịch Vụ'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Service Modal */}
                {modal.type === 'edit' && modal.service && (
                    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
                        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                            <div className="modal-content">
                                <div className="modal-header bg-light">
                                    <h5 className="modal-title fw-bold">Sửa Thông Tin Dịch Vụ</h5>
                                    <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={handleEditService}>
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label htmlFor="editName" className="form-label fw-medium">
                                                    Tên dịch vụ <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="editName"
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleFormChange}
                                                    className="form-control"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="editType" className="form-label fw-medium">
                                                    Loại dịch vụ <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    id="editType"
                                                    name="type"
                                                    value={formData.type}
                                                    onChange={handleFormChange}
                                                    className="form-select"
                                                    required
                                                    disabled={loading}
                                                >
                                                    {serviceTypes.map(type => (
                                                        <option key={type.id} value={type.name}>
                                                            {type.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="editPrice" className="form-label fw-medium">
                                                    Giá (VND) <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    id="editPrice"
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleFormChange}
                                                    className="form-control"
                                                    required
                                                    min="0"
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="editDescription" className="form-label fw-medium">
                                                    Mô tả <span className="text-danger">*</span>
                                                </label>
                                                <textarea
                                                    id="editDescription"
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleFormChange}
                                                    className="form-control"
                                                    rows="4"
                                                    required
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label htmlFor="editStatus" className="form-label fw-medium">Trạng thái</label>
                                                <select
                                                    id="editStatus"
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleFormChange}
                                                    className="form-select"
                                                    disabled={loading}
                                                >
                                                    <option value="active">Hoạt động</option>
                                                    <option value="inactive">Ngừng hoạt động</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="modal-footer mt-4 border-top-0">
                                            <button 
                                                type="button" 
                                                className="btn btn-outline-secondary" 
                                                onClick={handleCloseModal} 
                                                disabled={loading}
                                            >
                                                Hủy
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary px-4" 
                                                disabled={loading}
                                            >
                                                {loading ? 'Đang xử lý...' : 'Cập Nhật'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {modal.type === 'delete' && modal.service && (
                    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
                        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                            <div className="modal-content">
                                <div className="modal-header border-0">
                                    <h5 className="modal-title fw-bold text-danger">Xác Nhận Xóa</h5>
                                    <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                                </div>
                                <div className="modal-body text-center py-4">
                                    <BiTrash className="text-danger mb-3" size={48} />
                                    <h6 className="fw-bold">Bạn có chắc chắn muốn xóa dịch vụ?</h6>
                                    <p className="mb-2">Thông tin về <strong>"{modal.service.name}"</strong> sẽ bị xóa vĩnh viễn.</p>
                                    <p className="text-muted small">Hành động này không thể hoàn tác.</p>
                                </div>
                                <div className="modal-footer justify-content-center border-0">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary px-4" 
                                        onClick={handleCloseModal}
                                        disabled={loading}
                                    >
                                        Hủy
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-danger px-4" 
                                        onClick={handleDeleteService}
                                        disabled={loading}
                                    >
                                        {loading ? 'Đang xử lý...' : 'Xác Nhận Xóa'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Service Detail Modal */}
                {modal.type === 'detail' && modal.service && (
                    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
                        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                            <div className="modal-content">
                                <div className="modal-header bg-light">
                                    <h5 className="modal-title fw-bold">Chi Tiết Dịch Vụ</h5>
                                    <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                                </div>
                                <div className="modal-body">
                                    <div className="text-center mb-4">
                                        <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                                            style={{ width: '80px', height: '80px' }}>
                                            <BiPlus size={32} className="text-primary" />
                                        </div>
                                        <h6 className="fw-bold mb-1">{modal.service.name}</h6>
                                        <span className="badge bg-secondary">#{modal.service.id}</span>
                                    </div>
                                    
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <div className="border-bottom pb-2">
                                                <small className="text-muted fw-medium">Tên dịch vụ</small>
                                                <div className="fw-medium">{modal.service.name}</div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="border-bottom pb-2">
                                                <small className="text-muted fw-medium">Loại dịch vụ</small>
                                                <div>
                                                    <span className="badge bg-info">
                                                        {modal.service.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="border-bottom pb-2">
                                                <small className="text-muted fw-medium">Giá</small>
                                                <div className="fw-medium text-success">
                                                    {formatPrice(modal.service.price)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="border-bottom pb-2">
                                                <small className="text-muted fw-medium">Mô tả</small>
                                                <div className="fw-medium">{modal.service.description}</div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="border-bottom pb-2">
                                                <small className="text-muted fw-medium">Trạng thái</small>
                                                <div>
                                                    <span className={`badge ${modal.service.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                                        {modal.service.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="border-bottom pb-2">
                                                <small className="text-muted fw-medium">Ngày tạo</small>
                                                <div className="fw-medium">
                                                    {modal.service.created_at ? new Date(modal.service.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-0">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary" 
                                        onClick={handleCloseModal}
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminServiceManagement;