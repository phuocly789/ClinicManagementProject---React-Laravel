import React, { useEffect, useState, useCallback, useMemo } from 'react';
import './AdminUserManagement.css';
import Pagination from '../../../Components/Pagination/Pagination';
import AdminSidebar from '../../../Components/Sidebar/AdminSidebar';
import CustomToast from '../../../Components/CustomToast/CustomToast';
import Loading from '../../../Components/Loading/Loading';
import instance from '../../../axios';
import dayjs from 'dayjs';
import { BiUserPlus, BiShow, BiPencil, BiTrash, BiLockOpen, BiLock } from 'react-icons/bi';
import { useDebounce } from 'use-debounce';// Thư viện debounce để tối ưu tìm kiếm

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

  const [debouncedSearchTerm] = useDebounce(filters.search, 500); // Tối ưu hóa: chỉ tìm kiếm sau khi người dùng ngừng gõ 500ms

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
      // Fetch lại trang hiện tại, nếu trang đó rỗng thì lùi về trang trước
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
    const { user } = modal;
    // API chỉ cần ID, không cần gửi body
    try {
      const response = await instance.put(`/api/users/toggle-status/${user.UserId}`);
      setToast({ type: 'success', message: response.data.message });
      handleCloseModal();
      fetchUsers(pagination.currentPage);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Lỗi khi thay đổi trạng thái.' });
    }
  };


  return (
    <div className="user-layout">
      <AdminSidebar />
      <main className="main-content">
        {toast && <CustomToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <header className="page-header">
          <h1>Quản Lý Người Dùng</h1>
          <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>
            <BiUserPlus className="icon" /> Thêm Người Dùng
          </button>
        </header>

        <div className="card-style filter-panel">
          <div className="row g-3">
            <div className="col-md-6">
              <input type="text" name="search" className="form-control" placeholder="Tìm theo tên, email, SĐT..." value={filters.search} onChange={handleFilterChange} />
            </div>
            <div className="col-md-2">
              <select name="gender" className="form-select" value={filters.gender} onChange={handleFilterChange}>
                <option value="">Tất cả giới tính</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div className="col-md-2">
              <select name="role" className="form-select" value={filters.role} onChange={handleFilterChange}>
                <option value="">Tất cả vai trò</option>
                {roles.map(r => <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <select name="status" className="form-select" value={filters.status} onChange={handleFilterChange}>
                <option value="">Tất cả trạng thái</option>
                <option value="1">Hoạt động</option>
                <option value="0">Vô hiệu hóa</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-style table-panel">
          {loading ? <Loading isLoading={loading} /> : (
            <>
              <div className="table-responsive">
                <table className="clinic-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>SĐT</th>
                      <th>Giới tính</th>
                      <th>Vai trò</th>
                      <th className="text-center">Trạng thái</th>
                      <th className="text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? users.map(user => (
                      <tr key={user.UserId}>
                        <td><span className='user-id'>{`#${user.UserId}`}</span></td>
                        <td>
                          {user.FullName || 'Chưa cập nhật'}
                       
                        </td>
                        <td>
                          <div>{user.Email}</div>
                        </td>
                        <td>  <div >{user.Phone}</div></td>
                        <td>{user.Gender}</td>
                        <td>{user.Role}</td>
                        <td className="text-center">
                          <span className={`status ${user.IsActive ? 'status-active' : 'status-inactive'}`}>
                            {user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                          </span>
                        </td>
                        <td className="text-center action-buttons">
                          <button className="btn-icon" title="Chi tiết" onClick={() => handleOpenModal('detail', user)}><BiShow /></button>
                          <button className="btn-icon" title="Sửa" onClick={() => handleOpenModal('edit', user)}><BiPencil /></button>
                          <button className={`btn-icon ${user.IsActive ? 'text-warning' : 'text-success'}`} title={user.IsActive ? 'Vô hiệu hóa' : 'Kích hoạt'} onClick={() => handleOpenModal('status', user)}>
                            {user.IsActive ? <BiLock /> : <BiLockOpen />}
                          </button>
                          <button className="btn-icon text-danger" title="Xóa" onClick={() => handleOpenModal('delete', user)}><BiTrash /></button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" className="no-data">Không tìm thấy người dùng.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination-container">
                <Pagination pageCount={pagination.totalPages} onPageChange={({ selected }) => fetchUsers(selected + 1)} forcePage={pagination.currentPage - 1} />
              </div>
            </>
          )}
        </div>

        {/* --- MODALS --- */}
        {(modal.type === 'add' || modal.type === 'edit') && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{modal.type === 'add' ? 'Thêm Người Dùng Mới' : 'Cập Nhật Thông Tin'}</h2>
                <button className="btn-close" onClick={handleCloseModal}>&times;</button>
              </div>
                <div className="modal-body">
              <form onSubmit={handleFormSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6 form-group"><label>Tên đăng nhập</label><input type="text" name="Username" value={formData.Username || ''} onChange={handleFormChange} className="form-control" required disabled={modal.type === 'edit'} /></div>
                    <div className="col-md-6 form-group"><label>Họ tên</label><input type="text" name="FullName" value={formData.FullName || ''} onChange={handleFormChange} className="form-control" required /></div>
                    {modal.type === 'add' && <div className="col-12 form-group"><label>Mật khẩu</label><input type="password" name="Password" value={formData.Password || ''} onChange={handleFormChange} className="form-control" required /></div>}
                    <div className="col-md-6 form-group"><label>Email</label><input type="email" name="Email" value={formData.Email || ''} onChange={handleFormChange} className="form-control" required /></div>
                    <div className="col-md-6 form-group"><label>Số điện thoại</label><input type="tel" name="Phone" value={formData.Phone || ''} onChange={handleFormChange} className="form-control" required /></div>
                    <div className="col-md-6 form-group"><label>Ngày sinh</label><input type="date" name="DateOfBirth" value={formData.DateOfBirth || ''} onChange={handleFormChange} className="form-control" /></div>
                    <div className="col-md-6 form-group"><label>Giới tính</label><select name="Gender" value={formData.Gender || ''} onChange={handleFormChange} className="form-select" required><option value="">Chọn giới tính</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
                    <div className="col-12 form-group"><label>Địa chỉ</label><input type="text" name="Address" value={formData.Address || ''} onChange={handleFormChange} className="form-control" /></div>
                    <div className="col-12 form-group"><label>Vai trò</label><select name="Role" value={formData.Role || ''} onChange={handleFormChange} className="form-select" required disabled={formData.Role === 'Admin'}><option value="">Chọn vai trò</option>{roles.map(r => <option key={r.RoleId} value={r.RoleName}>{r.RoleName}</option>)}</select></div>
                  </div>
              </form>
                </div>
                <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={handleCloseModal}>Hủy</button><button type="submit" className="btn btn-primary">Lưu Thay Đổi</button></div>
            </div>
          </div>
        )}

        {modal.type === 'delete' && modal.user && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Xác Nhận Xóa</h2><button className="btn-close" onClick={handleCloseModal}>&times;</button></div>
              <div className="modal-body">
                <p>Bạn có chắc chắn muốn xóa người dùng <strong>{modal.user.FullName}</strong>?</p>
                <p className="text-muted small">Hành động này không thể hoàn tác.</p>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button><button className="btn btn-danger" onClick={handleDeleteUser}>Xác Nhận Xóa</button></div>
            </div>
          </div>
        )}

        {modal.type === 'status' && modal.user && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Xác Nhận</h2><button className="btn-close" onClick={handleCloseModal}>&times;</button></div>
              <div className="modal-body"><p>Bạn có chắc muốn <strong>{modal.user.IsActive ? 'vô hiệu hóa' : 'kích hoạt'}</strong> tài khoản của <strong>{modal.user.FullName}</strong>?</p></div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={handleCloseModal}>Hủy</button><button className={`btn ${modal.user.IsActive ? 'btn-warning' : 'btn-success'}`} onClick={handleToggleStatus}>Xác Nhận</button></div>
            </div>
          </div>
        )}

        {modal.type === 'detail' && modal.user && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-title">Chi Tiết Người Dùng</h2><button className="btn-close" onClick={handleCloseModal}>&times;</button></div>
              <div className="modal-body">
                <div className="info-row"><span className="label">ID:</span><span className="value">{modal.user.UserId}</span></div>
                <div className="info-row"><span className="label">Tên đăng nhập:</span><span className="value">{modal.user.Username}</span></div>
                <div className="info-row"><span className="label">Họ tên:</span><span className="value">{modal.user.FullName}</span></div>
                <div className="info-row"><span className="label">Email:</span><span className="value">{modal.user.Email}</span></div>
                <div className="info-row"><span className="label">SĐT:</span><span className="value">{modal.user.Phone}</span></div>
                <div className="info-row"><span className="label">Giới tính:</span><span className="value">{modal.user.Gender}</span></div>
                <div className="info-row"><span className="label">Ngày sinh:</span><span className="value">{modal.user.BirthDate}</span></div>
                <div className="info-row"><span className="label">Địa chỉ:</span><span className="value">{modal.user.Address || 'Chưa có'}</span></div>
                <div className="info-row"><span className="label">Vai trò:</span><span className="value">{modal.user.Role}</span></div>
                <div className="info-row"><span className="label">Trạng thái:</span><span className="value">{modal.user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'}</span></div>
              </div>
              <div className="modal-footer"><button className="btn btn-outline" onClick={handleCloseModal}>Đóng</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUserManagement;