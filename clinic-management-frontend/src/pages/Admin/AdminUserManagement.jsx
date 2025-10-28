// ... (các phần import và state không đổi)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import '../../App.css';
// import Pagination from '../Components/Pagination/Pagination';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import CustomToast from '../../Components/CustomToast/CustomToast';
import Loading from '../../Components/Loading/Loading';
import instance from '../../axios';
import dayjs from 'dayjs';
import { BiUserPlus, BiShow, BiPencil, BiTrash, BiLockOpen, BiLock } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';
import Pagination from '../../Components/Pagination/Pagination';

const initialFormState = {
  Username: '', FullName: '', Password: '',
  Gender: '', Email: '', Phone: '',
  DateOfBirth: '', Address: '', Role: '',
};

const AdminUserManagement = () => {
  // ... (toàn bộ logic state và hàm xử lý giữ nguyên như phiên bản trước)
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
    finally {
      setLoading(false);
    }
  };

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
        return renderModal(
          isEditing ? 'Cập Nhật Thông Tin' : 'Thêm Người Dùng Mới',
          <form onSubmit={handleFormSubmit}>
            <div className="row g-3">
              <div className="col-md-6 mb-3"><label className="form-label">Tên đăng nhập</label><input type="text" name="Username" value={formData.Username || ''} onChange={handleFormChange} className="form-control" required disabled={isEditing} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Họ tên</label><input type="text" name="FullName" value={formData.FullName || ''} onChange={handleFormChange} className="form-control" required /></div>
              {!isEditing && <div className="col-12 mb-3"><label className="form-label">Mật khẩu</label><input type="password" name="Password" value={formData.Password || ''} onChange={handleFormChange} className="form-control" required /></div>}
              <div className="col-md-6 mb-3"><label className="form-label">Email</label><input type="email" name="Email" value={formData.Email || ''} onChange={handleFormChange} className="form-control" required /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Số điện thoại</label><input type="tel" name="Phone" value={formData.Phone || ''} onChange={handleFormChange} className="form-control" required /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Ngày sinh</label><input type="date" name="DateOfBirth" value={formData.DateOfBirth || ''} onChange={handleFormChange} className="form-control" /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Giới tính</label><select name="Gender" value={formData.Gender || ''} onChange={handleFormChange} className="form-select" required><option value="">Chọn giới tính</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
              <div className="col-12 mb-3"><label className="form-label">Địa chỉ</label><input type="text" name="Address" value={formData.Address || ''} onChange={handleFormChange} className="form-control" /></div>
              <div className="col-12 mb-3"><label className="form-label">Vai trò</label><select name="Role" value={formData.Role || ''} onChange={handleFormChange} className="form-select" required disabled={formData.Role === 'Admin'}><option value="">Chọn vai trò</option>{roles.map(r => <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>)}</select></div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
              <button type="submit" className="btn btn-primary">Lưu Thay Đổi</button>
            </div>
          </form>,
          null
        );

      case 'delete':
        return renderModal(
          'Xác Nhận Xóa',
          <>
            <p>Bạn có chắc chắn muốn xóa người dùng <strong>{modal.user.FullName}</strong>?</p>
            <p className="text-muted small">Hành động này không thể hoàn tác.</p>
          </>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
            <button className="btn btn-danger" onClick={handleDeleteUser}>Xác Nhận Xóa</button>
          </>,
          '450px'
        );

      case 'status':
        return renderModal(
          'Xác Nhận',
          <p>Bạn có chắc muốn <strong>{modal.user.IsActive ? 'vô hiệu hóa' : 'kích hoạt'}</strong> tài khoản của <strong>{modal.user.FullName}</strong>?</p>,
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button>
            <button className={`btn ${modal.user.IsActive ? 'btn-warning' : 'btn-success'}`} onClick={handleToggleStatus}>Xác Nhận</button>
          </>,
          '450px'
        );

      case 'detail':
        const InfoRow = ({ label, value }) => (
          <div className="d-flex justify-content-between py-2 border-bottom">
            <span className="text-muted">{label}:</span>
            <span className="fw-semibold text-dark">{value}</span>
          </div>
        );
        return renderModal(
          'Chi Tiết Người Dùng',
          <>
            <InfoRow label="ID" value={modal.user.UserId} />
            <InfoRow label="Tên đăng nhập" value={modal.user.Username} />
            <InfoRow label="Họ tên" value={modal.user.FullName} />
            <InfoRow label="Email" value={modal.user.Email} />
            <InfoRow label="SĐT" value={modal.user.Phone} />
            <InfoRow label="Giới tính" value={modal.user.Gender} />
            <InfoRow label="Ngày sinh" value={modal.user.BirthDate} />
            <InfoRow label="Địa chỉ" value={modal.user.Address || 'Chưa có'} />
            <InfoRow label="Vai trò" value={modal.user.Role} />
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
      <AdminSidebar />
      <main className="main-content flex-grow-1 p-4 d-flex flex-column gap-4">
        {toast && <CustomToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <header className="d-flex justify-content-between align-items-center flex-shrink-0">
          <h1 className="h4 mb-0">Quản Lý Người Dùng</h1>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => handleOpenModal('add')}>
            <BiUserPlus size={20} /> Thêm Người Dùng
          </button>
        </header>

        <div className="card shadow-sm border-0 flex-shrink-0">
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-6"><input type="text" name="search" className="form-control" placeholder="Tìm theo tên, email, SĐT..." value={filters.search} onChange={handleFilterChange} /></div>
              <div className="col-md-2"><select name="gender" className="form-select" value={filters.gender} onChange={handleFilterChange}><option value="">Giới tính</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
              <div className="col-md-2"><select name="role" className="form-select" value={filters.role} onChange={handleFilterChange}><option value="">Vai trò</option>{roles.map(r => <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>)}</select></div>
              <div className="col-md-2"><select name="status" className="form-select" value={filters.status} onChange={handleFilterChange}><option value="">Trạng thái</option><option value="1">Hoạt động</option><option value="0">Vô hiệu hóa</option></select></div>
            </div>
          </div>
        </div>

        {/* ===== KHỐI BẢNG ĐÃ SỬA LẠI LAYOUT ===== */}
        <div className="card shadow-sm border-0 table-panel">
          {loading ? <Loading isLoading={loading} /> : (
            <>
              <div className="table-responsive-container">
                <table className="table table-hover clinic-table mb-0">
                  <thead className="p-4">
                    <tr>
                      <th className="px-4">ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th>
                      <th>Giới tính</th><th>Vai trò</th>
                      <th className="text-center">Trạng thái</th>
                      <th className="text-center px-4">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? users.map(user => (
                      <tr key={user.UserId}>
                        <td className="px-4"><span className='user-id'>{`#${user.UserId}`}</span></td>
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
                            <button className="btn btn-lg btn-light" title="Chi tiết" onClick={() => handleOpenModal('detail', user)}><BiShow /></button>
                            <button className="btn btn-lg btn-light" title="Sửa" onClick={() => handleOpenModal('edit', user)}><BiPencil /></button>
                            <button className={`btn btn-lg btn-light text-${user.IsActive ? 'warning' : 'success'}`} title={user.IsActive ? 'Vô hiệu hóa' : 'Kích hoạt'} onClick={() => handleOpenModal('status', user)}>
                              {user.IsActive ? <BiLock /> : <BiLockOpen />}
                            </button>
                            <button className="btn btn-lg btn-light text-danger" title="Xóa" onClick={() => handleOpenModal('delete', user)}><BiTrash /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="8" className="text-center p-5 text-muted">Không tìm thấy người dùng.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="card-footer p-3 border-0 flex-shrink-0">
                  <Pagination pageCount={pagination.totalPages} onPageChange={({ selected }) => fetchUsers(selected + 1)} forcePage={pagination.currentPage - 1} />
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