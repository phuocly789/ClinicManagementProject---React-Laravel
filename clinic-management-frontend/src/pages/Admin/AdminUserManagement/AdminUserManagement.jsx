import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Pagination from '../../../Components/Pagination/Pagination';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import Loading from '../../../Components/Loading/Loading';
import instance from '../../../axios';
import dayjs from 'dayjs';
import { BiUserPlus, BiShow, BiPencil, BiTrash, BiLockOpen, BiLock } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';

const initialFormState = {
  Username: '', FullName: '', Password: '',
  Gender: '', Email: '', Phone: '',
  DateOfBirth: '', Address: '', Role: '',
};

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

  const apiFilters = useMemo(() => ({
    search: debouncedSearchTerm,
    gender: filters.gender,
    role: filters.role,
    status: filters.status,
  }), [debouncedSearchTerm, filters.gender, filters.role, filters.status]);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 5, ...apiFilters });
      const response = await instance.get(`/api/users?${params.toString()}`);

      const formattedUsers = (response.data || []).map(user => ({
        ...user,
        BirthDate: user.DateOfBirth ? dayjs(user.DateOfBirth).format('DD/MM/YYYY') : 'Chưa có',
        Role: user.roles && user.roles.length > 0 ? user.roles[0].RoleName : 'Chưa có',
      }));

      setUsers(formattedUsers);
      setPagination({
        currentPage: response.current_page || 1,
        totalPages: response.last_page || 1,
      });
    } catch (err) {
      setToast({ type: 'error', message: 'Lỗi khi tải danh sách người dùng.' });
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    fetchUsers(1);
  }, [apiFilters, fetchUsers]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await instance.get('/api/roles');
        setRoles(response);
      } catch (err) { console.error('Lỗi tải vai trò:', err); }
    };
    fetchRoles();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => setModal({ type: null, user: null });

  const handleOpenModal = (type, user = null) => {
    setModal({ type, user });
    if (type === 'add') {
      setFormData(initialFormState);
    } else if (type === 'edit' && user) {
      setFormData({
        ...user,
        DateOfBirth: user.DateOfBirth ? dayjs(user.DateOfBirth).format('YYYY-MM-DD') : '',
      });
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();
    const { type, user } = modal;
    const isEditing = type === 'edit';
    const url = isEditing ? `/api/users/${user.UserId}` : '/api/users';
    const method = isEditing ? 'put' : 'post';

    try {
      const response = await instance[method](url, formData);
      setToast({ type: 'success', message: response.message || 'Thao tác thành công!' });
      handleCloseModal();
      fetchUsers(pagination.currentPage);
    } catch (err) {
      const errorMessage = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : (err.response?.data?.message || 'Có lỗi xảy ra.');
      setToast({ type: 'error', message: errorMessage });
    }
    finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      const response = await instance.delete(`/api/users/${modal.user.UserId}`);
      setToast({ type: 'success', message: response.data.message || 'Xóa người dùng thành công!' });
      handleCloseModal();
      const newPage = users.length === 1 && pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.currentPage;
      fetchUsers(newPage);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Lỗi khi xóa người dùng.' });
    }
    finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    const { user } = modal;
    try {
      const response = await instance.put(`/api/users/toggle-status/${user.UserId}`);
      setToast({ type: 'success', message: response.message });
      handleCloseModal();
      fetchUsers(pagination.currentPage);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Lỗi khi thay đổi trạng thái.' });
    }
    finally{
      setLoading(false);
    }
  };

  return (
    <div className="d-flex">
      <AdminSidebar />
      <main className="flex-grow-1 p-3">
        {toast && <CustomToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0 fw-bold text-primary">Quản Lý Người Dùng</h1>
          <button className="btn btn-primary d-flex align-items-center" onClick={() => handleOpenModal('add')}>
            <BiUserPlus className="me-2" size={18} /> Thêm Người Dùng
          </button>
        </div>

        <div className="card shadow-sm mb-4 border-0">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label htmlFor="search" className="form-label fw-medium">Tìm kiếm</label>
                <input 
                  id="search"
                  type="text" 
                  name="search" 
                  className="form-control" 
                  placeholder="Tìm theo tên, email, SĐT..." 
                  value={filters.search} 
                  onChange={handleFilterChange} 
                />
              </div>
              <div className="col-md-2">
                <label htmlFor="gender" className="form-label fw-medium">Giới tính</label>
                <select id="gender" name="gender" className="form-select" value={filters.gender} onChange={handleFilterChange}>
                  <option value="">Tất cả</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
              <div className="col-md-2">
                <label htmlFor="role" className="form-label fw-medium">Vai trò</label>
                <select id="role" name="role" className="form-select" value={filters.role} onChange={handleFilterChange}>
                  <option value="">Tất cả</option>
                  {roles.map(r => <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label htmlFor="status" className="form-label fw-medium">Trạng thái</label>
                <select id="status" name="status" className="form-select" value={filters.status} onChange={handleFilterChange}>
                  <option value="">Tất cả</option>
                  <option value="1">Hoạt động</option>
                  <option value="0">Vô hiệu hóa</option>
                </select>
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
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" className="fw-semibold">ID</th>
                        <th scope="col" className="fw-semibold">Họ tên</th>
                        <th scope="col" className="fw-semibold">Email</th>
                        <th scope="col" className="fw-semibold">SĐT</th>
                        <th scope="col" className="fw-semibold">Giới tính</th>
                        <th scope="col" className="fw-semibold">Vai trò</th>
                        <th scope="col" className="fw-semibold text-center">Trạng thái</th>
                        <th scope="col" className="fw-semibold text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? users.map(user => (
                        <tr key={user.UserId} className="hover-shadow">
                          <td>
                            <span className="badge bg-secondary bg-opacity-25 text-secondary fw-medium">
                              #{user.UserId}
                            </span>
                          </td>
                          <td>
                            <div className="fw-medium">{user.FullName || 'Chưa cập nhật'}</div>
                          </td>
                          <td>
                            <div className="text-break">{user.Email}</div>
                          </td>
                          <td>{user.Phone}</td>
                          <td>
                            <span className={`badge ${user.Gender === 'Nam' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-danger bg-opacity-10 text-danger'}`}>
                              {user.Gender}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info bg-opacity-10 text-info">
                              {user.Role}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={`badge ${user.IsActive ? 'bg-success' : 'bg-danger'}`}>
                              {user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" role="group">
                              <button 
                                className="btn btn-outline-info" 
                                title="Chi tiết" 
                                onClick={() => handleOpenModal('detail', user)}
                              >
                                <BiShow size={16} />
                              </button>
                              <button 
                                className="btn btn-outline-primary" 
                                title="Sửa" 
                                onClick={() => handleOpenModal('edit', user)}
                              >
                                <BiPencil size={16} />
                              </button>
                              <button 
                                className={`btn ${user.IsActive ? 'btn-outline-warning' : 'btn-outline-success'}`} 
                                title={user.IsActive ? 'Vô hiệu hóa' : 'Kích hoạt'} 
                                onClick={() => handleOpenModal('status', user)}
                              >
                                {user.IsActive ? <BiLock size={16} /> : <BiLockOpen size={16} />}
                              </button>
                              <button 
                                className="btn btn-outline-danger" 
                                title="Xóa" 
                                onClick={() => handleOpenModal('delete', user)}
                              >
                                <BiTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="8" className="text-center py-5">
                            <div className="text-muted">
                              <BiUserPlus size={48} className="mb-3 opacity-50" />
                              <p className="mb-0 fs-5">Không tìm thấy người dùng</p>
                              <small>Thử thay đổi bộ lọc hoặc thêm người dùng mới</small>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-center mt-4">
                  <Pagination 
                    pageCount={pagination.totalPages} 
                    onPageChange={({ selected }) => fetchUsers(selected + 1)} 
                    forcePage={pagination.currentPage - 1} 
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {(modal.type === 'add' || modal.type === 'edit') && (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold">
                    {modal.type === 'add' ? 'Thêm Người Dùng Mới' : 'Cập Nhật Thông Tin'}
                  </h5>
                  <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleFormSubmit}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label htmlFor="username" className="form-label fw-medium">Tên đăng nhập <span className="text-danger">*</span></label>
                        <input 
                          id="username"
                          type="text" 
                          name="Username" 
                          value={formData.Username || ''} 
                          onChange={handleFormChange} 
                          className="form-control" 
                          required 
                          disabled={modal.type === 'edit'} 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="fullname" className="form-label fw-medium">Họ tên <span className="text-danger">*</span></label>
                        <input 
                          id="fullname"
                          type="text" 
                          name="FullName" 
                          value={formData.FullName || ''} 
                          onChange={handleFormChange} 
                          className="form-control" 
                          required 
                        />
                      </div>
                      {modal.type === 'add' && (
                        <div className="col-12">
                          <label htmlFor="password" className="form-label fw-medium">Mật khẩu <span className="text-danger">*</span></label>
                          <input 
                            id="password"
                            type="password" 
                            name="Password" 
                            value={formData.Password || ''} 
                            onChange={handleFormChange} 
                            className="form-control" 
                            required 
                          />
                        </div>
                      )}
                      <div className="col-md-6">
                        <label htmlFor="email" className="form-label fw-medium">Email <span className="text-danger">*</span></label>
                        <input 
                          id="email"
                          type="email" 
                          name="Email" 
                          value={formData.Email || ''} 
                          onChange={handleFormChange} 
                          className="form-control" 
                          required 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="phone" className="form-label fw-medium">Số điện thoại <span className="text-danger">*</span></label>
                        <input 
                          id="phone"
                          type="tel" 
                          name="Phone" 
                          value={formData.Phone || ''} 
                          onChange={handleFormChange} 
                          className="form-control" 
                          required 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="dateOfBirth" className="form-label fw-medium">Ngày sinh</label>
                        <input 
                          id="dateOfBirth"
                          type="date" 
                          name="DateOfBirth" 
                          value={formData.DateOfBirth || ''} 
                          onChange={handleFormChange} 
                          className="form-control" 
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="gender" className="form-label fw-medium">Giới tính <span className="text-danger">*</span></label>
                        <select 
                          id="gender"
                          name="Gender" 
                          value={formData.Gender || ''} 
                          onChange={handleFormChange} 
                          className="form-select" 
                          required
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label htmlFor="address" className="form-label fw-medium">Địa chỉ</label>
                        <input 
                          id="address"
                          type="text" 
                          name="Address" 
                          value={formData.Address || ''} 
                          onChange={handleFormChange} 
                          className="form-control" 
                        />
                      </div>
                      <div className="col-12">
                        <label htmlFor="role" className="form-label fw-medium">Vai trò <span className="text-danger">*</span></label>
                        <select 
                          id="role"
                          name="Role" 
                          value={formData.Role || ''} 
                          onChange={handleFormChange} 
                          className="form-select" 
                          required 
                          disabled={formData.Role === 'Admin'}
                        >
                          <option value="">Chọn vai trò</option>
                          {roles.map(r => (
                            <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>
                          ))}
                        </select>
                        {formData.Role === 'Admin' && (
                          <div className="form-text text-warning">
                            <BiLock className="me-1" />
                            Không thể thay đổi vai trò của tài khoản Admin
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="modal-footer mt-4 border-top-0">
                      <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>
                        Hủy
                      </button>
                      <button type="submit" className="btn btn-primary px-4">
                        {modal.type === 'add' ? 'Thêm Người Dùng' : 'Cập Nhật'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {modal.type === 'delete' && modal.user && (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
            <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold text-danger">Xác Nhận Xóa</h5>
                  <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                </div>
                <div className="modal-body text-center py-4">
                  <BiTrash className="text-danger mb-3" size={48} />
                  <h6 className="fw-bold">Bạn có chắc chắn muốn xóa người dùng?</h6>
                  <p className="mb-2">Thông tin về <strong>"{modal.user.FullName}"</strong> sẽ bị xóa vĩnh viễn.</p>
                  <p className="text-muted small">Hành động này không thể hoàn tác.</p>
                </div>
                <div className="modal-footer justify-content-center border-0">
                  <button type="button" className="btn btn-outline-secondary px-4" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="button" className="btn btn-danger px-4" onClick={handleDeleteUser}>
                    Xác Nhận Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Toggle Modal */}
        {modal.type === 'status' && modal.user && (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
            <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold">Xác Nhận Thay Đổi Trạng Thái</h5>
                  <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                </div>
                <div className="modal-body text-center py-4">
                  {modal.user.IsActive ? (
                    <BiLock className="text-warning mb-3" size={48} />
                  ) : (
                    <BiLockOpen className="text-success mb-3" size={48} />
                  )}
                  <h6 className="fw-bold">
                    {modal.user.IsActive ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
                  </h6>
                  <p className="mb-0">
                    Bạn có chắc muốn <strong>{modal.user.IsActive ? 'vô hiệu hóa' : 'kích hoạt'}</strong> tài khoản của
                  </p>
                  <p><strong>"{modal.user.FullName}"</strong>?</p>
                </div>
                <div className="modal-footer justify-content-center border-0">
                  <button type="button" className="btn btn-outline-secondary px-4" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button 
                    type="button" 
                    className={`btn px-4 ${modal.user.IsActive ? 'btn-warning' : 'btn-success'}`} 
                    onClick={handleToggleStatus}
                  >
                    {modal.user.IsActive ? 'Vô Hiệu Hóa' : 'Kích Hoạt'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {modal.type === 'detail' && modal.user && (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleCloseModal}>
            <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold">Chi Tiết Người Dùng</h5>
                  <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '80px', height: '80px' }}>
                      <BiUserPlus size={32} className="text-primary" />
                    </div>
                    <h6 className="fw-bold mb-1">{modal.user.FullName}</h6>
                    <span className="badge bg-secondary">#{modal.user.UserId}</span>
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Tên đăng nhập</small>
                        <div className="fw-medium">{modal.user.Username}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Email</small>
                        <div className="fw-medium text-break">{modal.user.Email}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Số điện thoại</small>
                        <div className="fw-medium">{modal.user.Phone}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Giới tính</small>
                        <div>
                          <span className={`badge ${modal.user.Gender === 'Nam' ? 'bg-primary' : 'bg-pink'}`}>
                            {modal.user.Gender}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Ngày sinh</small>
                        <div className="fw-medium">{modal.user.BirthDate}</div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Địa chỉ</small>
                        <div className="fw-medium">{modal.user.Address || 'Chưa có'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Vai trò</small>
                        <div>
                          <span className="badge bg-info">{modal.user.Role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border-bottom pb-2">
                        <small className="text-muted fw-medium">Trạng thái</small>
                        <div>
                          <span className={`badge ${modal.user.IsActive ? 'bg-success' : 'bg-danger'}`}>
                            {modal.user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleCloseModal}>
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

export default AdminUserManagement;