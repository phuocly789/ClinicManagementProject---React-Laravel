import React, { useEffect, useState, useCallback, useMemo } from 'react';
import '../../App.css';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import Pagination from '../../Components/Pagination/Pagination';
import instance from '../../axios';
import { BiPlus, BiPencil, BiTrash, BiSearch, BiShow } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';

const initialFormState = {
    name: '',
    type: '',
    price: '',
    description: ''
};

const FormField = React.memo(({
    label, name, type = "text", required = false, value, onChange, error, ...props
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
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
    const [filters, setFilters] = useState({ search: '', type: '' });
    const [debouncedSearchTerm] = useDebounce(filters.search, 500);
    const [modal, setModal] = useState({ type: null, service: null });
    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [solrAvailable, setSolrAvailable] = useState(false);

    const apiFilters = useMemo(() => ({
        search: debouncedSearchTerm,
        type: filters.type,
    }), [debouncedSearchTerm, filters.type]);

    // Kiểm tra kết nối Solr - Xử lý lỗi 404 và các lỗi khác
    const checkSolrHealth = useCallback(async () => {
        try {
            // Thử gọi endpoint search với query đơn giản
            const response = await instance.get('/api/search?q=*:*&type=service&per_page=1');
            // Kiểm tra response structure để xác định Solr có hoạt động không
            if (response.data && response.data.success !== false && !response.data.fallback) {
                setSolrAvailable(true);
                return true;
            } else {
                setSolrAvailable(false);
                return false;
            }
        } catch (error) {
            // Xử lý tất cả các lỗi (404, 500, network error, etc.)
            console.warn('❌ Solr connection failed:', error.response?.status || error.message);
            setSolrAvailable(false);
            return false;
        }
    }, []);

    // Tự động thử lại Solr sau 30 giây nếu lỗi
    useEffect(() => {
        let retryInterval;

        const setupRetry = () => {
            if (!solrAvailable) {
                retryInterval = setInterval(async () => {
                    console.log('🔄 Tự động thử lại kết nối Solr...');
                    await checkSolrHealth();
                }, 30000); // 30 giây
            }
        };

        setupRetry();

        return () => {
            if (retryInterval) {
                clearInterval(retryInterval);
            }
        };
    }, [solrAvailable, checkSolrHealth]);

    // Lấy danh sách dịch vụ từ database (fallback)
    const fetchServicesFromDatabase = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                per_page: 10,
                ...apiFilters
            });

            const response = await instance.get(`/api/admin/services?${params.toString()}`);

            if (!response.data) {
                throw new Error('Dữ liệu trả về không hợp lệ');
            }

            const data = response.data;
            const formattedServices = (data.data || data || []).map(service => ({
                id: service.id,
                name: service.name,
                type: service.type,
                price: service.price,
                description: service.description || 'Không có mô tả'
            }));

            setServices(formattedServices);
           setPagination({
        currentPage: response.data.current_page || response.current_page || 1,
        totalPages: response.data.last_page || response.last_page || 1,
      });
        } catch (err) {
            console.error('Lỗi khi tải danh sách dịch vụ:', err);
            setToast({
                type: 'error',
                message: err.response?.data?.message || 'Lỗi khi tải danh sách dịch vụ.'
            });
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [apiFilters]);

    // Tìm kiếm dịch vụ từ Solr 
    const searchServicesFromSolr = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                q: debouncedSearchTerm || '*:*',
                page: page.toString(),
                per_page: '10',
                type: 'service'
            });

            if (filters.type) {
                params.append('service_type', filters.type);
            }

            const response = await instance.get(`/api/search?${params.toString()}`);

            if (!response.data) {
                throw new Error('Dữ liệu trả về không hợp lệ');
            }

            const solrData = response.data;

            // Kiểm tra nếu Solr trả về lỗi (success: false) hoặc fallback
            if (solrData.success === false || solrData.fallback) {
                console.warn(' Solr unavailable, using database fallback');
                setSolrAvailable(false);
                await fetchServicesFromDatabase(page);
                return;
            }

            // Xử lý kết quả thành công từ Solr
            let results = [];
            if (solrData.results && Array.isArray(solrData.results)) {
                results = solrData.results;
            } else if (solrData.data && Array.isArray(solrData.data)) {
                results = solrData.data;
            }

            const formattedServices = results.map((item, index) => {
                const service = {
                    id: item.id || item.service_id || `solr-${index}`,
                    name: item.title || item.name || item.service_name || 'Chưa có tên',
                    type: item.service_type || item.type || 'Chưa xác định',
                    price: item.price || 0,
                    description: item.description || item.content || 'Không có mô tả'
                };

                return service;
            });

            setServices(formattedServices);

            const totalResults = solrData.total || results.length;
            setPagination({
                currentPage: page,
                totalPages: Math.max(1, Math.ceil(totalResults / 10)),
                totalItems: totalResults
            });

        } catch (err) {
            // Xử lý tất cả lỗi từ Solr (404, 500, network, etc.)
            console.error('Solr search error:', err.response?.status || err.message);
            setSolrAvailable(false);
            // Tự động fallback về database
            await fetchServicesFromDatabase(page);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, filters.type, fetchServicesFromDatabase]);

    // Hàm chung để fetch services - Tự động chọn Solr hoặc Database
    const fetchServices = useCallback(async (page = 1) => {
        const shouldUseSolr = debouncedSearchTerm && debouncedSearchTerm.length >= 2 && solrAvailable;

        if (shouldUseSolr) {
            await searchServicesFromSolr(page);
        } else {
            await fetchServicesFromDatabase(page);
        }
    }, [debouncedSearchTerm, solrAvailable, searchServicesFromSolr, fetchServicesFromDatabase]);

    // Khởi tạo kết nối Solr khi component mount
    useEffect(() => {
        const initializeSolr = async () => {
            await checkSolrHealth();
        };

        initializeSolr();
    }, [checkSolrHealth]);

    // Fetch services khi filters thay đổi
    useEffect(() => {
        fetchServices(1);
    }, [apiFilters]);

    // Lấy danh sách loại dịch vụ
    useEffect(() => {
        const fetchServiceTypes = async () => {
            try {
                const response = await instance.get('/api/admin/services/types/all');
                const typesData = response.data || response;
                const typesArray = Array.isArray(typesData) ? typesData : (typesData.data || []);
                setServiceTypes(typesArray);
            } catch (err) {
                console.error('Lỗi tải loại dịch vụ:', err);
                // Fallback types nếu API không khả dụng
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
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Kiểm tra tính hợp lệ của form
    const validateForm = () => {
        const errors = {};

        if (!formData.name?.trim()) errors.name = 'Tên dịch vụ là bắt buộc';
        if (!formData.type?.trim()) errors.type = 'Loại dịch vụ là bắt buộc';
        if (!formData.price || parseFloat(formData.price) < 0) errors.price = 'Giá không hợp lệ';
        if (!formData.description?.trim()) errors.description = 'Mô tả là bắt buộc';

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
        const url = isEditing ? `/api/admin/services/${service.id}` : '/api/admin/services';
        const method = isEditing ? 'put' : 'post';

        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                price: parseFloat(formData.price),
                description: formData.description
            };

            const response = await instance[method](url, payload);
            const responseData = response.data || response;

            setToast({
                type: 'success',
                message: responseData.message || responseData.data?.message || `Dịch vụ đã được ${isEditing ? 'cập nhật' : 'thêm mới'} thành công!`
            });
            handleCloseModal();
            fetchServices(pagination.currentPage);
        } catch (err) {
            console.error('Lỗi khi gửi form:', err);
            const errorMessage = err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : (err.response?.data?.message || err.message || 'Có lỗi xảy ra.');
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteService = async () => {
        setLoading(true);
        try {
            const response = await instance.delete(`/api/admin/services/${modal.service.id}`);
            const responseData = response.data || response;
            setToast({
                type: 'success',
                message: responseData.message || responseData.data?.message || 'Xóa dịch vụ thành công!'
            });
            handleCloseModal();
            const newPage = services.length === 1 && pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.currentPage;
            fetchServices(newPage);
        } catch (err) {
            console.error('Lỗi khi xóa dịch vụ:', err);
            setToast({
                type: 'error',
                message: err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi khi xóa dịch vụ.'
            });
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFilters({ search: '', type: '' });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // Hàm hiển thị modal
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

        const InfoRow = ({ label, value }) => (
            <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">{label}:</span>
                <span className="fw-semibold text-dark">{value || 'Chưa có'}</span>
            </div>
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

            case 'detail':
                return modalLayout(
                    'Chi Tiết Dịch Vụ',
                    <>
                        <InfoRow label="Mã" value={modal.service.id} />
                        <InfoRow label="Tên dịch vụ" value={modal.service.name} />
                        <InfoRow label="Loại dịch vụ" value={modal.service.type} />
                        <InfoRow label="Giá" value={formatPrice(modal.service.price)} />
                        <InfoRow label="Mô tả" value={modal.service.description} />
                    </>,
                    <button className="btn btn-outline-secondary" onClick={handleCloseModal}>Đóng</button>
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

                {/* Header sạch sẽ, không có thông tin Solr */}
                <header className="d-flex justify-content-between align-items-center flex-shrink-0">
                    <div>
                        <h1 className="h4 mb-0">Quản Lý Dịch Vụ</h1>
                    </div>
                    <button
                        className="btn btn-primary d-flex align-items-center gap-2"
                        onClick={() => handleOpenModal('add')}
                    >
                        <BiPlus size={18} /> Tạo Dịch Vụ
                    </button>
                </header>

                {/* Bộ lọc sạch sẽ */}
                <div className="card shadow-sm border-0 flex-shrink-0">
                    <div className="card-body p-4">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">
                                    <BiSearch className="me-2" />
                                    Tìm kiếm
                                </label>
                                <input
                                    type="text"
                                    name="search"
                                    className="form-control"
                                    placeholder="Tìm theo tên, loại, mô tả dịch vụ..."
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Loại dịch vụ</label>
                                <select
                                    name="type"
                                    className="form-select"
                                    value={filters.type}
                                    onChange={handleFilterChange}
                                >
                                    <option value="">Tất cả</option>
                                    {serviceTypes.map(type => (
                                        <option key={type.id} value={type.name}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <button
                                    className="btn btn-outline-secondary w-100"
                                    onClick={clearFilters}
                                    title="Làm mới bộ lọc"
                                >
                                    ⟳
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
                            <div className="table-responsive-container">
                                <table className="table table-hover clinic-table mb-0">
                                    <thead className="p-4">
                                        <tr>
                                            <th className="px-4">Mã</th>
                                            <th>Tên Dịch Vụ</th>
                                            <th>Loại</th>
                                            <th>Giá</th>
                                            <th>Mô Tả</th>
                                            <th className="text-center px-4">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {services.length > 0 ? services.map(service => (
                                            <tr key={service.id}>
                                                <td className="px-4">
                                                    <span className='user-id'>{`#${service.id}`}</span>
                                                </td>
                                                <td className="fw-semibold">{service.name || 'Chưa cập nhật'}</td>
                                                <td>
                                                    <span className="badge bg-info bg-opacity-10 text-info">
                                                        {service.type}
                                                    </span>
                                                </td>
                                                <td className="text-success fw-medium">{formatPrice(service.price)}</td>
                                                <td>
                                                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={service.description}>
                                                        {service.description}
                                                    </div>
                                                </td>
                                                <td className="text-center px-4">
                                                    <div className="d-flex gap-2 justify-content-center">
                                                        <button
                                                            className="btn btn-lg btn-light"
                                                            title="Chi tiết"
                                                            onClick={() => handleOpenModal('detail', service)}
                                                        >
                                                            <BiShow />
                                                        </button>
                                                        <button
                                                            className="btn btn-lg btn-light"
                                                            title="Sửa"
                                                            onClick={() => handleOpenModal('edit', service)}
                                                        >
                                                            <BiPencil />
                                                        </button>
                                                        <button
                                                            className="btn btn-lg btn-light text-danger"
                                                            title="Xóa"
                                                            onClick={() => handleOpenModal('delete', service)}
                                                        >
                                                            <BiTrash />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="text-center p-5 text-muted">
                                                    {filters.search ? 'Không tìm thấy dịch vụ phù hợp với từ khóa tìm kiếm.' : 'Không tìm thấy dịch vụ.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Phân trang */}
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