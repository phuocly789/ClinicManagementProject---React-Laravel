import React, { useEffect, useState, useCallback, useMemo } from 'react';
import '../../App.css';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import Pagination from '../../Components/Pagination/Pagination';
import adminService from '../../services/adminService';
import instance from '../../axios';
import { BiPlus, BiPencil, BiTrash, BiSearch, BiShow } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';

const initialFormState = {
    name: '',
    type: '',
    price: '',
    description: ''
};

// Tách FormField component với đầy đủ tính năng
const FormField = React.memo(({
    label,
    name,
    type = "text",
    required = false,
    value,
    onChange,
    error,
    maxLength,
    showCharCount = false,
    ...props
}) => {
    const handleChange = (e) => {
        let newValue = e.target.value;

        // Giới hạn độ dài nếu có maxLength
        if (maxLength && newValue.length > maxLength) {
            newValue = newValue.slice(0, maxLength);
        }

        // Tạo event mới với giá trị đã được xử lý
        const syntheticEvent = {
            ...e,
            target: {
                ...e.target,
                name: e.target.name,
                value: newValue
            }
        };

        onChange(syntheticEvent);
    };

    return (
        <div className="mb-3">
            <label className="form-label">
                {label} {required && <span className="text-danger">*</span>}
                {showCharCount && (
                    <small className="text-muted ms-1">
                        ({value?.length || 0}/{maxLength || '∞'})
                    </small>
                )}
            </label>
            <input
                type={type}
                name={name}
                value={value || ''}
                onChange={handleChange}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                required={required}
                maxLength={maxLength}
                {...props}
            />
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
});

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
    const [solrAvailable, setSolrAvailable] = useState(true);

    // API filters
    const apiFilters = useMemo(() => ({
        search: debouncedSearchTerm,
        type: filters.type,
    }), [debouncedSearchTerm, filters.type]);

    // Kiểm tra kết nối Solr
    const checkSolrHealth = useCallback(async () => {
        try {
            const response = await instance.get('/api/services/search?q=*:*&per_page=1');
            if (response.data && response.data.success !== false && !response.data.fallback) {
                setSolrAvailable(true);
                localStorage.setItem('solr_available_services', 'true');
                return true;
            } else {
                setSolrAvailable(false);
                return false;
            }
        } catch (error) {
            console.warn('❌ Solr connection failed for services:', error.response?.status || error.message);
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
                    console.log('🔄 Tự động thử lại kết nối Solr cho dịch vụ...');
                    await checkSolrHealth();
                }, 30000);
            }
        };

        setupRetry();

        return () => {
            if (retryInterval) {
                clearInterval(retryInterval);
            }
        };
    }, [solrAvailable, checkSolrHealth]);

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

    // Lấy danh sách dịch vụ từ database (fallback)
    const fetchServicesFromDatabase = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            // Đảm bảo page là số hợp lệ (Tình huống 9)
            const safePage = Math.max(1, parseInt(page) || 1);

            const response = await adminService.getServices({
                page: safePage,
                per_page: 10,
                ...apiFilters
            });

            console.log('Full API Response:', response);
            console.log('Services Data:', response.data);

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

            // Xử lý lỗi phân trang (Tình huống 9)
            let errorMessage = 'Lỗi khi tải danh sách dịch vụ.';
            if (error.response?.status === 422) {
                errorMessage = 'Tham số tìm kiếm không hợp lệ. Vui lòng kiểm tra lại.';
            } else if (error.response?.status === 400) {
                errorMessage = 'Tham số phân trang không hợp lệ.';
            }

            setToast({
                type: 'error',
                message: error.response?.data?.message || errorMessage
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
            const safePage = Math.max(1, parseInt(page) || 1);

            const params = new URLSearchParams();

            if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
                const keyword = debouncedSearchTerm.trim();
                params.append('q', `(service_name:*${keyword}* OR service_type:*${keyword}* OR description:*${keyword}*)`);
            } else {
                params.append('q', '*:*');
            }

            params.append('fq', 'type:service');
            params.append('page', safePage.toString());
            params.append('per_page', '10');
            params.append('sort', 'score desc, id asc');

            if (filters.type) {
                params.append('type', filters.type);
            }

            const response = await instance.get(`/api/services/search?${params.toString()}`);
            if (!response.data) {
                throw new Error('Dữ liệu trả về không hợp lệ');
            }

            const solrData = response.data;

            if (solrData.success === false || solrData.fallback) {
                console.warn('Solr unavailable for services, using database fallback');
                setSolrAvailable(false);
                await fetchServicesFromDatabase(safePage);
                return;
            }

            let results = [];
            if (solrData.results && Array.isArray(solrData.results)) {
                results = solrData.results;
            } else if (solrData.data && Array.isArray(solrData.data)) {
                results = solrData.data;
            }

            const formattedServices = results.map((item, index) => {
                const get = (field, fallback = 'Chưa có') => {
                    const val = item[field];
                    if (Array.isArray(val)) return val[0] || fallback;
                    return val !== undefined && val !== null ? val : fallback;
                };

                const serviceName = get('service_name', 'Chưa có tên');
                const serviceType = get('service_type', 'Chưa có');

                return {
                    id: item.id?.replace('service_', '') || index + 1,
                    name: serviceName,
                    type: serviceType,
                    price: get('price', 0),
                    description: get('description', 'Chưa có mô tả'),
                    status: 'active',
                };
            });
            setServices(formattedServices);

            const totalResults = solrData.total || results.length;
            setPagination({
                currentPage: safePage,
                totalPages: Math.max(1, Math.ceil(totalResults / 10)),
                totalItems: totalResults
            });

        } catch (err) {
            console.error('Solr search error for services:', err.response?.status || err.message);
            setSolrAvailable(false);
            const safePage = Math.max(1, parseInt(page) || 1);
            await fetchServicesFromDatabase(safePage);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, filters.type, fetchServicesFromDatabase]);

    // Hàm chung để fetch services - Tự động chọn Solr hoặc Database
    const fetchServices = useCallback(async (page = 1) => {
        const safePage = Math.max(1, parseInt(page) || 1);
        const shouldUseSolr = debouncedSearchTerm?.trim() && solrAvailable;

        try {
            if (shouldUseSolr) {
                await searchServicesFromSolr(safePage);
            } else {
                await fetchServicesFromDatabase(safePage);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu dịch vụ:', error);
            setToast({
                type: 'error',
                message: 'Có lỗi xảy ra khi tải dữ liệu dịch vụ. Vui lòng thử lại.'
            });
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
                description: service.description || '',
                updated_at: service.updated_at
            });
        } else {
            setFormData(initialFormState);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;

        let cleanedValue = value;
        if (typeof value === 'string') {
            // Loại bỏ script tags và các thẻ HTML nguy hiểm
            cleanedValue = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            cleanedValue = cleanedValue.replace(/<[^>]*>/g, '');
        }

        setFormData(prev => ({ ...prev, [name]: cleanedValue }));

        // Clear errors khi user nhập
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Validate form chi tiết
    const validateForm = () => {
        const errors = {};

        // Tình huống 4 & 6: Validate chi tiết
        if (!formData.name?.trim()) {
            errors.name = 'Tên dịch vụ là bắt buộc';
        } else if (formData.name.trim().length === 0) {
            errors.name = 'Tên dịch vụ không được để trống';
        } else if (formData.name.length > 255) {
            errors.name = 'Tên dịch vụ không được vượt quá 255 ký tự';
        } else if (formData.name.includes('　')) {
            errors.name = 'Tên dịch vụ không được chứa khoảng trắng không hợp lệ';
        }

        if (!formData.type?.trim()) {
            errors.type = 'Loại dịch vụ là bắt buộc';
        } else if (formData.type.length > 255) {
            errors.type = 'Loại dịch vụ không được vượt quá 255 ký tự';
        }

        if (!formData.price) {
            errors.price = 'Giá dịch vụ là bắt buộc';
        } else {
            const priceValue = parseFloat(formData.price);
            if (isNaN(priceValue)) {
                errors.price = 'Giá dịch vụ phải là số';
            } else if (priceValue < 0) {
                errors.price = 'Giá dịch vụ không được âm';
            } else if (priceValue > 999999999.99) {
                errors.price = 'Giá dịch vụ không được vượt quá 999,999,999 VND';
            }
        }

        if (!formData.description?.trim()) {
            errors.description = 'Mô tả dịch vụ là bắt buộc';
        } else if (formData.description.trim().length === 0) {
            errors.description = 'Mô tả dịch vụ không được để trống';
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
                description: formData.description,
                updated_at: formData.updated_at
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

            //phân trang
            if (isEditing) {
                fetchServices(pagination.currentPage);
            } else {
                fetchServices(1);
            }
        } catch (error) {
            console.error(`Lỗi khi ${isEditing ? 'cập nhật' : 'thêm'} dịch vụ:`, error);

            // Tình huống 2: Xử lý optimistic locking
            if (error.response?.status === 409 && error.response?.data?.requires_reload) {
                setToast({
                    type: 'error',
                    message: 'Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại trang!'
                });
                handleCloseModal();
                fetchServices(pagination.currentPage);
                return;
            }

            // Tình huống 8: Xử lý trùng lặp
            if (error.response?.status === 409) {
                setToast({
                    type: 'error',
                    message: 'Dịch vụ đã tồn tại trong hệ thống'
                });
                return;
            }

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

            //Phân trang
            const newPage = services.length === 1 && pagination.currentPage > 1
                ? pagination.currentPage - 1
                : pagination.currentPage;
            fetchServices(newPage);
        } catch (error) {
            console.error('Lỗi khi xóa dịch vụ:', error);

            // Tình huống 1: Xử lý xóa mục không tồn tại
            if (error.response?.status === 404) {
                setToast({
                    type: 'error',
                    message: 'Dịch vụ không tồn tại hoặc đã bị xóa'
                });
                handleCloseModal();
                fetchServices(pagination.currentPage);
                return;
            }

            // Tình huống 3: Xử lý ID không hợp lệ
            if (error.response?.status === 400) {
                setToast({
                    type: 'error',
                    message: 'ID dịch vụ không hợp lệ'
                });
                return;
            }

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

    //Render modal function
    const renderModal = () => {
        if (!modal.type) return null;

        const modalLayout = (title, body, footer, maxWidth = '700px') => (
            <>
                <div className="modal-backdrop fade show"></div>
                <div className="modal fade show d-block" tabIndex="-1" onClick={handleCloseModal}>
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
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
                                    maxLength={255}
                                    showCharCount={true}
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
                                    max="999999999.99"
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
                        <InfoRow label="Mã dịch vụ" value={`#${modal.service.id}`} />
                        <InfoRow label="Tên dịch vụ" value={modal.service.name} />
                        <InfoRow label="Loại dịch vụ" value={modal.service.type} />
                        <InfoRow label="Giá dịch vụ" value={formatPrice(modal.service.price)} />
                        <InfoRow label="Mô tả" value={modal.service.description} />
                    </>,
                    <button type="btn btn-outline-secondary" className="btn btn-outline-secondary " onClick={handleCloseModal}>Đóng</button>,
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
                                        maxLength={255}
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
                                                        {/* Nút Xem chi tiết */}
                                                        <button
                                                            className="btn btn-lg btn-light"
                                                            title="Xem chi tiết"
                                                            onClick={() => handleOpenModal('detail', service)}
                                                            disabled={loading}
                                                        >
                                                            <BiShow />
                                                        </button>

                                                        {/* Nút Sửa */}
                                                        <button
                                                            className="btn btn-lg btn-light"
                                                            title="Sửa"
                                                            onClick={() => handleOpenModal('edit', service)}
                                                            disabled={loading}
                                                        >
                                                            <BiPencil />
                                                        </button>

                                                        {/* Nút Xóa */}
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