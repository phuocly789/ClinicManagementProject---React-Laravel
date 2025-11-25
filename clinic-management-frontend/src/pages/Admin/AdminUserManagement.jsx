import React, { useEffect, useState, useCallback, useMemo } from 'react';
import '../../App.css';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import instance from '../../axios';
import dayjs from 'dayjs';
import { BiUserPlus, BiShow, BiPencil, BiTrash, BiLockOpen, BiLock, BiKey, BiSearch } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';
import Pagination from '../../Components/Pagination/Pagination';

const initialFormState = {
  Username: '', FullName: '', Password: '',
  Gender: '', Email: '', Phone: '',
  DateOfBirth: '', Address: '', Role: '',
  Specialty: '', LicenseNumber: '', StaffType: '',
};

// Tách FormField component ra ngoài để tránh re-render
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

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', gender: '', role: '', status: '' });
  const [debouncedSearchTerm] = useDebounce(filters.search, 500);
  const [modal, setModal] = useState({ type: null, user: null });
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [solrAvailable, setSolrAvailable] = useState(false);

  const apiFilters = useMemo(() => ({
    search: debouncedSearchTerm,
    gender: filters.gender,
    role: filters.role,
    status: filters.status,
  }), [debouncedSearchTerm, filters.gender, filters.role, filters.status]);

  // Kiểm tra kết nối Solr - Xử lý lỗi 404 và các lỗi khác
  const checkSolrHealth = useCallback(async () => {
    try {
      // Thử gọi endpoint search với query đơn giản
      const response = await instance.get('/api/search?q=*:*&type=user&per_page=1');
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

  // Lấy danh sách người dùng từ database (fallback)
  const fetchUsersFromDatabase = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        per_page: 10,
        ...apiFilters
      });

      const response = await instance.get(`/api/users?${params.toString()}`);

      if (!response.data) {
        throw new Error('Dữ liệu trả về không hợp lệ');
      }

      const formattedUsers = (response.data.data || response.data || []).map(user => ({
        ...user,
        BirthDate: user.DateOfBirth ? dayjs(user.DateOfBirth).format('DD/MM/YYYY') : 'Chưa có',
        Role: user.roles && user.roles.length > 0 ? user.roles[0].RoleName : 'Chưa có',
      }));

      setUsers(formattedUsers);
      setPagination({
        currentPage: response.data.current_page || response.current_page || 1,
        totalPages: response.data.last_page || response.last_page || 1,
      });
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Lỗi khi tải danh sách người dùng.'
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  // Tìm kiếm người dùng từ Solr 
  const searchUsersFromSolr = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedSearchTerm || '*:*',
        page: page.toString(),
        per_page: '10',
        type: 'user'
      });

      if (filters.gender) {
        params.append('gender', filters.gender);
      }
      if (filters.role) {
        params.append('user_role', filters.role);
      }
      if (filters.status) {
        params.append('is_active', filters.status === '1' ? 'true' : 'false');
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
        await fetchUsersFromDatabase(page);
        return;
      }

      // Xử lý kết quả thành công từ Solr
      let results = [];
      if (solrData.results && Array.isArray(solrData.results)) {
        results = solrData.results;
      } else if (solrData.data && Array.isArray(solrData.data)) {
        results = solrData.data;
      }

      const formattedUsers = results.map((item, index) => {
        const user = {
          UserId: item.id || item.UserId || `solr-${index}`,
          Username: item.username || item.Username || 'N/A',
          FullName: item.title || item.full_name || item.FullName || item.name || 'Chưa có tên',
          Email: item.email || item.Email || 'N/A',
          Phone: item.phone || item.Phone || 'N/A',
          Gender: item.gender || item.Gender || 'Chưa có',
          DateOfBirth: item.date_of_birth || item.DateOfBirth,
          BirthDate: item.date_of_birth || item.DateOfBirth ?
            dayjs(item.date_of_birth || item.DateOfBirth).format('DD/MM/YYYY') : 'Chưa có',
          Address: item.address || item.Address || 'Chưa có',
          Role: item.role || item.Role || item.user_role || 'Chưa có',
          Specialty: item.specialty || item.Specialty || '',
          LicenseNumber: item.license_number || item.LicenseNumber || '',
          IsActive: true,
        };

        if (item.is_active !== undefined) {
          user.IsActive = item.is_active;
        } else if (item.IsActive !== undefined) {
          user.IsActive = item.IsActive;
        } else if (item.status === 'inactive') {
          user.IsActive = false;
        }

        return user;
      });

      setUsers(formattedUsers);

      const totalResults = solrData.total || results.length;
      setPagination({
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalResults / 10)),
      });

    } catch (err) {
      // Xử lý tất cả lỗi từ Solr (404, 500, network, etc.)
      console.error('Solr search error:', err.response?.status || err.message);
      setSolrAvailable(false);
      // Tự động fallback về database
      await fetchUsersFromDatabase(page);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters.gender, filters.role, filters.status, fetchUsersFromDatabase]);

  // Hàm chung để fetch users - Tự động chọn Solr hoặc Database
  const fetchUsers = useCallback(async (page = 1) => {
    const shouldUseSolr = debouncedSearchTerm && debouncedSearchTerm.length >= 2 && solrAvailable;

    if (shouldUseSolr) {
      await searchUsersFromSolr(page);
    } else {
      await fetchUsersFromDatabase(page);
    }
  }, [debouncedSearchTerm, solrAvailable, searchUsersFromSolr, fetchUsersFromDatabase]);

  // Khởi tạo kết nối Solr khi component mount
  useEffect(() => {
    const initializeSolr = async () => {
      await checkSolrHealth();
    };

    initializeSolr();
  }, [checkSolrHealth]);

  // Fetch users khi filters thay đổi
  useEffect(() => {
    fetchUsers(1);
  }, [apiFilters, fetchUsers]);

  // Lấy danh sách vai trò
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await instance.get('/api/roles');
        const rolesData = response.data || response;
        const rolesArray = Array.isArray(rolesData) ? rolesData : (rolesData.data || []);
        setRoles(rolesArray);
      } catch (err) {
        console.error('Lỗi tải vai trò:', err);
        setToast({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi khi tải danh sách vai trò.'
        });
        setRoles([]);
      }
    };
    fetchRoles();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setModal({ type: null, user: null });
    setFormData(initialFormState);
    setFormErrors({});
  };

  const handleOpenModal = (type, user = null) => {
    if (type === 'delete' && user?.Role === 'Admin') {
      setToast({ type: 'error', message: 'Không thể xóa tài khoản Admin!' });
      return;
    }

    setModal({ type, user });
    setFormErrors({});

    if (type === 'add') {
      setFormData(initialFormState);
    } else if (type === 'edit' && user) {
      setFormData({
        ...user,
        DateOfBirth: user.DateOfBirth ? dayjs(user.DateOfBirth).format('YYYY-MM-DD') : '',
        Role: user.roles && user.roles.length > 0 ? user.roles[0].RoleName : user.Role,
      });
    } else {
      setFormData(initialFormState);
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

    if (!formData.Username?.trim()) errors.Username = 'Tên đăng nhập là bắt buộc';
    if (!formData.FullName?.trim()) errors.FullName = 'Họ tên là bắt buộc';
    if (!formData.Email?.trim()) errors.Email = 'Email là bắt buộc';
    else if (!/\S+@\S+\.\S+/.test(formData.Email)) errors.Email = 'Email không hợp lệ';
    if (!formData.Phone?.trim()) errors.Phone = 'Số điện thoại là bắt buộc';
    if (!formData.Gender) errors.Gender = 'Giới tính là bắt buộc';
    if (!formData.Role) errors.Role = 'Vai trò là bắt buộc';

    if (modal.type === 'add' && !formData.Password) {
      errors.Password = 'Mật khẩu là bắt buộc';
    } else if (modal.type === 'add' && formData.Password.length < 6) {
      errors.Password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (formData.Role === 'Bác sĩ') {
      if (!formData.Specialty?.trim()) errors.Specialty = 'Chuyên khoa là bắt buộc';
      if (!formData.LicenseNumber?.trim()) errors.LicenseNumber = 'Số giấy phép hành nghề là bắt buộc';
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
    const { type, user } = modal;
    const isEditing = type === 'edit';
    const url = isEditing ? `/api/users/${user.UserId}` : '/api/users';
    const method = isEditing ? 'put' : 'post';

    try {
      const payload = { ...formData };
      if (isEditing && !payload.Password) {
        delete payload.Password;
      }

      const response = await instance[method](url, payload);
      const responseData = response.data || response;

      setToast({
        type: 'success',
        message: responseData.message || responseData.data?.message || `Người dùng đã được ${isEditing ? 'cập nhật' : 'thêm mới'} thành công!`
      });
      handleCloseModal();
      fetchUsers(pagination.currentPage);
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

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      const response = await instance.delete(`/api/users/${modal.user.UserId}`);
      const responseData = response.data || response;
      setToast({
        type: 'success',
        message: responseData.message || responseData.data?.message || 'Xóa người dùng thành công!'
      });
      handleCloseModal();
      const newPage = users.length === 1 && pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.currentPage;
      fetchUsers(newPage);
    } catch (err) {
      console.error('Lỗi khi xóa người dùng:', err);
      setToast({
        type: 'error',
        message: err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi khi xóa người dùng.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    const { user } = modal;
    try {
      const response = await instance.put(`/api/users/toggle-status/${user.UserId}`);
      const responseData = response.data || response;
      setToast({
        type: 'success',
        message: responseData.message || responseData.data?.message || 'Thay đổi trạng thái thành công!'
      });
      handleCloseModal();
      fetchUsers(pagination.currentPage);
    } catch (err) {
      console.error('Lỗi khi thay đổi trạng thái:', err);
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Lỗi khi thay đổi trạng thái.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    const { user } = modal;
    try {
      const response = await instance.put(`/api/users/reset-password/${user.UserId}`, {
        password: '123456'
      });
      const responseData = response.data || response;

      setToast({
        type: 'success',
        message: responseData.message || responseData.data?.message || 'Reset mật khẩu thành công! Mật khẩu mới là: 123456'
      });
      handleCloseModal();
      fetchUsers(pagination.currentPage);
    } catch (err) {
      console.error('Lỗi khi reset mật khẩu:', err);
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Lỗi khi reset mật khẩu.'
      });
    } finally {
      setLoading(false);
    }
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
          isEditing ? 'Cập Nhật Thông Tin' : 'Thêm Người Dùng Mới',
          <form onSubmit={handleFormSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <FormField
                  label="Tên đăng nhập"
                  name="Username"
                  required
                  disabled={isEditing}
                  value={formData.Username}
                  onChange={handleFormChange}
                  error={formErrors.Username}
                />
              </div>
              <div className="col-md-6">
                <FormField
                  label="Họ tên"
                  name="FullName"
                  required
                  value={formData.FullName}
                  onChange={handleFormChange}
                  error={formErrors.FullName}
                />
              </div>

              {!isEditing && (
                <div className="col-12">
                  <FormField
                    label="Mật khẩu"
                    name="Password"
                    type="password"
                    required
                    minLength={6}
                    value={formData.Password}
                    onChange={handleFormChange}
                    error={formErrors.Password}
                  />
                </div>
              )}

              <div className="col-md-6">
                <FormField
                  label="Email"
                  name="Email"
                  type="email"
                  required
                  value={formData.Email}
                  onChange={handleFormChange}
                  error={formErrors.Email}
                />
              </div>
              <div className="col-md-6">
                <FormField
                  label="Số điện thoại"
                  name="Phone"
                  type="tel"
                  required
                  value={formData.Phone}
                  onChange={handleFormChange}
                  error={formErrors.Phone}
                />
              </div>

              <div className="col-md-6">
                <FormField
                  label="Ngày sinh"
                  name="DateOfBirth"
                  type="date"
                  max={dayjs().format('YYYY-MM-DD')}
                  value={formData.DateOfBirth}
                  onChange={handleFormChange}
                />
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    Giới tính <span className="text-danger">*</span>
                  </label>
                  <select
                    name="Gender"
                    value={formData.Gender || ''}
                    onChange={handleFormChange}
                    className={`form-select ${formErrors.Gender ? 'is-invalid' : ''}`}
                    required
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                  {formErrors.Gender && <div className="invalid-feedback">{formErrors.Gender}</div>}
                </div>
              </div>

              <div className="col-12">
                <FormField
                  label="Địa chỉ"
                  name="Address"
                  value={formData.Address}
                  onChange={handleFormChange}
                />
              </div>

              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">
                    Vai trò <span className="text-danger">*</span>
                  </label>
                  <select
                    name="Role"
                    value={formData.Role || ''}
                    onChange={handleFormChange}
                    className={`form-select ${formErrors.Role ? 'is-invalid' : ''}`}
                    required
                    disabled={formData.Role === 'Admin' && isEditing}
                  >
                    <option value="">Chọn vai trò</option>
                    {roles.filter(r => r.RoleName !== 'Bệnh nhân').map(r => (
                      <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>
                    ))}
                  </select>
                  {formErrors.Role && <div className="invalid-feedback">{formErrors.Role}</div>}
                </div>
              </div>

              {formData.Role === 'Bác sĩ' && (
                <>
                  <div className="col-md-6">
                    <FormField
                      label="Chuyên khoa"
                      name="Specialty"
                      required
                      placeholder="Nhập chuyên khoa"
                      value={formData.Specialty}
                      onChange={handleFormChange}
                      error={formErrors.Specialty}
                    />
                  </div>
                  <div className="col-md-6">
                    <FormField
                      label="Số giấy phép hành nghề"
                      name="LicenseNumber"
                      required
                      placeholder="Nhập số giấy phép hành nghề"
                      value={formData.LicenseNumber}
                      onChange={handleFormChange}
                      error={formErrors.LicenseNumber}
                    />
                  </div>
                </>
              )}
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
            <p>Bạn có chắc chắn muốn xóa người dùng <strong>{modal.user.FullName}</strong>?</p>
            <p className="text-muted small">Hành động này không thể hoàn tác.</p>
          </>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
            <button className="btn btn-danger" onClick={handleDeleteUser} disabled={loading}>
              {loading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
            </button>
          </>,
          '450px'
        );

      case 'status':
        return modalLayout(
          'Xác Nhận Thay Đổi Trạng Thái',
          <p>Bạn có chắc muốn <strong>{modal.user.IsActive ? 'vô hiệu hóa' : 'kích hoạt'}</strong> tài khoản của <strong>{modal.user.FullName}</strong>?</p>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
            <button className={`btn ${modal.user.IsActive ? 'btn-warning' : 'btn-success'}`} onClick={handleToggleStatus} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Xác Nhận'}
            </button>
          </>,
          '450px'
        );

      case 'reset-password':
        return modalLayout(
          'Xác Nhận Reset Mật Khẩu',
          <>
            <p>Bạn có chắc muốn reset mật khẩu cho người dùng <strong>{modal.user.FullName}</strong>?</p>
            <p className="text-warning fw-semibold">
              Mật khẩu sẽ được đặt lại thành: <strong>123456</strong>
            </p>
            <p className="text-muted small">
              Người dùng nên đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật tài khoản.
            </p>
          </>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
            <button className="btn btn-warning" onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Reset Mật Khẩu'}
            </button>
          </>,
          '500px'
        );

      case 'detail':
        return modalLayout(
          'Chi Tiết Người Dùng',
          <>
            <InfoRow label="ID" value={modal.user.UserId} />
            <InfoRow label="Tên đăng nhập" value={modal.user.Username} />
            <InfoRow label="Họ tên" value={modal.user.FullName} />
            <InfoRow label="Email" value={modal.user.Email} />
            <InfoRow label="SĐT" value={modal.user.Phone} />
            <InfoRow label="Giới tính" value={modal.user.Gender} />
            <InfoRow label="Ngày sinh" value={modal.user.BirthDate} />
            <InfoRow label="Địa chỉ" value={modal.user.Address} />
            <InfoRow label="Vai trò" value={modal.user.Role} />
            {modal.user.Role === 'Bác sĩ' && (
              <>
                <InfoRow label="Chuyên khoa" value={modal.user.Specialty} />
                <InfoRow label="Số giấy phép" value={modal.user.LicenseNumber} />
              </>
            )}
            <InfoRow label="Trạng thái" value={modal.user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'} />
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
            <h1 className="h4 mb-0">Quản Lý Người Dùng</h1>
          </div>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={() => handleOpenModal('add')}
          >
            <BiUserPlus size={20} /> Thêm Người Dùng
          </button>
        </header>

        {/* Bộ lọc sạch sẽ */}
        <div className="card shadow-sm border-0 flex-shrink-0">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-md-5">
                <label className="form-label fw-semibold">
                  <BiSearch className="me-2" />
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  name="search"
                  className="form-control"
                  placeholder="Tìm theo tên, email, SĐT, địa chỉ..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Giới tính</label>
                <select
                  name="gender"
                  className="form-select"
                  value={filters.gender}
                  onChange={handleFilterChange}
                >
                  <option value="">Tất cả</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Vai trò</label>
                <select
                  name="role"
                  className="form-select"
                  value={filters.role}
                  onChange={handleFilterChange}
                >
                  <option value="">Tất cả</option>
                  {roles.map(r => (
                    <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Trạng thái</label>
                <select
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">Tất cả</option>
                  <option value="1">Hoạt động</option>
                  <option value="0">Vô hiệu hóa</option>
                </select>
              </div>
              <div className="col-md-1">
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setFilters({ search: '', gender: '', role: '', status: '' });
                  }}
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
                      <th className="px-4">ID</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>SĐT</th>
                      <th>Giới tính</th>
                      <th>Vai trò</th>
                      <th className="text-center">Trạng thái</th>
                      <th className="text-center px-4">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? users.map(user => (
                      <tr key={user.UserId}>
                        <td className="px-4">
                          <span className='user-id'>{`#${user.UserId}`}</span>
                        </td>
                        <td className="fw-semibold">{user.FullName || 'Chưa cập nhật'}</td>
                        <td>{user.Email}</td>
                        <td>{user.Phone}</td>
                        <td>{user.Gender}</td>
                        <td>{user.Role}</td>
                        <td className="text-center">
                          <span className={`badge rounded-pill fs-6 fw-semibold ${user.IsActive ? 'bg-success-soft' : 'bg-secondary-soft'}`}>
                            {user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                          </span>
                        </td>
                        <td className="text-center px-4">
                          <div className="d-flex gap-2 justify-content-center">
                            <button
                              className="btn btn-lg btn-light"
                              title="Chi tiết"
                              onClick={() => handleOpenModal('detail', user)}
                            >
                              <BiShow />
                            </button>
                            <button
                              className="btn btn-lg btn-light"
                              title="Sửa"
                              onClick={() => handleOpenModal('edit', user)}
                            >
                              <BiPencil />
                            </button>
                            <button
                              className="btn btn-lg btn-light text-info"
                              title="Reset mật khẩu"
                              onClick={() => handleOpenModal('reset-password', user)}
                            >
                              <BiKey />
                            </button>
                            <button
                              className={`btn btn-lg btn-light text-${user.IsActive ? 'warning' : 'success'}`}
                              title={user.IsActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                              onClick={() => handleOpenModal('status', user)}
                            >
                              {user.IsActive ? <BiLock /> : <BiLockOpen />}
                            </button>
                            <button
                              className="btn btn-lg btn-light text-danger"
                              title="Xóa"
                              onClick={() => handleOpenModal('delete', user)}
                              disabled={user.Role === 'Admin'}
                            >
                              <BiTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" className="text-center p-5 text-muted">
                          {filters.search ? 'Không tìm thấy người dùng phù hợp với từ khóa tìm kiếm.' : 'Không tìm thấy người dùng.'}
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
                    onPageChange={({ selected }) => fetchUsers(selected + 1)}
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

export default AdminUserManagement;