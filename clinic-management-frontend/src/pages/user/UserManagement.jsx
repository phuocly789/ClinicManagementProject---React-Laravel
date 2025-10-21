import React, { useEffect, useState } from 'react';
import './UserManagement.css';
import Pagination from '../../Components/Pagination/Pagination';
import AdminSidebar from '../../Components/Sidebar/AdminSidebar';
import dayjs from 'dayjs';

const UserManagement = () => {
  const usersPerPage = 5;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ gender: '', role: '', status: '' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    Username: '',
    FullName: '', // ✅ Họ tên
    Gender: '',
    Email: '',
    Phone: '',
    DateOfBirth: '',
    Address: '',
    Role: '',
    Specialty: '',
    License: '',
    IsActive: true,
  });

  useEffect(() => {
    fetchUsers(currentPage);
    fetchRoles();
  }, [currentPage]);

  const fetchUsers = (page = 1) => {
    fetch(`http://localhost:8000/api/users?page=${page}&per_page=${usersPerPage}`)
      .then((res) => res.json())
      .then((data) => {
        const formattedUsers = (data.data || []).map((user) => ({
          ...user,
          BirthDate: user.DateOfBirth
            ? dayjs(user.DateOfBirth).format('DD/MM/YYYY')
            : 'Không có',
        }));
        setUsers(formattedUsers);
        setTotalPages(data.last_page || 1);
        setCurrentPage(data.current_page || 1);
      })
      .catch((err) => console.error('Lỗi gọi API:', err));
  };

  const fetchRoles = () => {
    fetch('http://localhost:8000/api/roles')
      .then((res) => res.json())
      .then((data) => setRoles(data))
      .catch((err) => console.error('Lỗi tải vai trò:', err));
  };

  const handleCreateUser = () => {
    fetch('http://localhost:8000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).then(() => {
      setShowAddModal(false);
      resetForm();
      fetchUsers(currentPage);
    });
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    fetch(`http://localhost:8000/api/users/${selectedUser.UserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).then(() => {
      setShowEditModal(false);
      fetchUsers(currentPage);
    });
  };

  const handleDeleteUser = () => {
    fetch(`http://localhost:8000/api/users/${selectedUser.UserId}`, {
      method: 'DELETE',
    }).then(() => {
      setShowDeleteModal(false);
      fetchUsers(currentPage);
    });
  };

  const handleToggleStatus = () => {
    const updatedUser = { ...selectedUser, IsActive: !selectedUser.IsActive };
    fetch(`http://localhost:8000/api/users/${selectedUser.UserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    }).then(() => {
      setShowStatusModal(false);
      fetchUsers(currentPage);
    });
  };

  const resetForm = () => {
    setNewUser({
      Username: '',
      FullName: '',
      Gender: '',
      Email: '',
      Phone: '',
      DateOfBirth: '',
      Address: '',
      Role: '',
      Specialty: '',
      License: '',
      IsActive: true,
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      user.Username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.Phone?.includes(searchTerm);

    const matchesGender = filters.gender === '' || user.Gender === filters.gender;
    const matchesRole = filters.role === '' || user.Role === filters.role;
    const matchesStatus =
      filters.status === '' ||
      (filters.status === 'active' ? user.IsActive : !user.IsActive);

    return matchesSearch && matchesGender && matchesRole && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', margin: 0, backgroundColor: '#f8f9fa' }}>
      <AdminSidebar />
      <div className="content" style={{ position: 'relative', width: '100%', flexGrow: 1, marginLeft: '5px', padding: '30px' }}>
        <h1>Quản Lý Người Dùng</h1>

        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            + Thêm người dùng
          </button>
        </div>

        {/* === Bộ lọc === */}
        <div className="filter-section">
          <h3>Bộ Lọc Nâng Cao</h3>
          <div className="filter-row">
            <div className="filter-group">
              <label>Giới Tính</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              >
                <option value="">Tất cả</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Vai Trò</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              >
                <option value="">Tất cả</option>
                {roles.map((r) => (
                  <option key={r.RoleId} value={r.RoleName}>
                    {r.RoleName}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Trạng Thái</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Vô hiệu hóa</option>
              </select>
            </div>
          </div>
        </div>

        {/* === Bảng người dùng === */}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên đăng nhập</th>
              <th>Họ tên</th>
              <th>Giới tính</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.UserId}>
                <td>{user.UserId}</td>
                <td>{user.Username}</td>
                <td>{user.FullName || '—'}</td>
                <td>{user.Gender}</td>
                <td>{user.Email}</td>
                <td>{user.Phone}</td>
                <td>
                  {user.roles && user.roles.length > 0
                    ? user.roles.map((r) => r.RoleName).join(', ')
                    : user.Role || '—'}
                </td>
                <td>
                  <span className={`status ${user.IsActive ? 'active' : 'inactive'}`}>
                    {user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </span>
                </td>
                <td className="action-buttons">
                  <button
                    className="edit-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setNewUser(user);
                      setShowEditModal(true);
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    className="disable-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowStatusModal(true);
                    }}
                  >
                    {user.IsActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowDeleteModal(true);
                    }}
                  >
                    Xóa
                  </button>
                  <button
                    className="detail-btn"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowDetailModal(true);
                    }}
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          pageCount={totalPages}
          currentPage={currentPage - 1}
          onPageChange={({ selected }) => setCurrentPage(selected + 1)}
          isLoading={false}
        />

        {/* === Các modal CRUD === */}
        {showAddModal && renderUserForm('Thêm Người Dùng Mới', handleCreateUser, setShowAddModal)}
        {showEditModal && selectedUser && renderUserForm('Sửa Người Dùng', handleUpdateUser, setShowEditModal)}
      </div>
    </div>
  );

  // ===================== Form Modal =====================
  function renderUserForm(title, onSubmit, onClose) {
    const roleName =
      selectedUser?.Role ||
      (selectedUser?.roles && selectedUser.roles.length > 0
        ? selectedUser.roles[0].RoleName
        : '');
    const isEditingAdmin = roleName === 'Admin';

    return (
      <div className="modal">
        <div className="modal-content">
          <div className="modal-header">{title}</div>
          <form>
            <div>
              <label>Tên đăng nhập</label>
              <input
                type="text"
                value={newUser.Username}
                onChange={(e) => setNewUser({ ...newUser, Username: e.target.value })}
              />
            </div>

            <div>
              <label>Họ tên</label>
              <input
                type="text"
                value={newUser.FullName}
                onChange={(e) => setNewUser({ ...newUser, FullName: e.target.value })}
              />
            </div>

            <div>
              <label>Email</label>
              <input
                type="email"
                value={newUser.Email}
                onChange={(e) => setNewUser({ ...newUser, Email: e.target.value })}
              />
            </div>

            <div>
              <label>Số điện thoại</label>
              <input
                type="text"
                value={newUser.Phone}
                onChange={(e) => setNewUser({ ...newUser, Phone: e.target.value })}
              />
            </div>

            <div>
              <label>Địa chỉ</label>
              <input
                type="text"
                value={newUser.Address}
                onChange={(e) => setNewUser({ ...newUser, Address: e.target.value })}
              />
            </div>

            <div>
              <label>Ngày sinh</label>
              <input
                type="date"
                value={newUser.DateOfBirth || ''}
                onChange={(e) => setNewUser({ ...newUser, DateOfBirth: e.target.value })}
              />
            </div>

            <div>
              <label>Giới tính</label>
              <select
                value={newUser.Gender}
                onChange={(e) => setNewUser({ ...newUser, Gender: e.target.value })}
              >
                <option value="">Chọn</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            {!isEditingAdmin && (
              <div>
                <label>Vai trò</label>
                <select
                  value={newUser.Role}
                  onChange={(e) => setNewUser({ ...newUser, Role: e.target.value })}
                >
                  <option value="">Chọn vai trò</option>
                  {roles.map((r) => (
                    <option key={r.RoleId} value={r.RoleName}>
                      {r.RoleName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newUser.Role === 'Bác sĩ' && (
              <>
                <div>
                  <label>Chuyên khoa</label>
                  <input
                    type="text"
                    value={newUser.Specialty}
                    onChange={(e) => setNewUser({ ...newUser, Specialty: e.target.value })}
                  />
                </div>
                <div>
                  <label>Giấy phép</label>
                  <input
                    type="text"
                    value={newUser.License}
                    onChange={(e) => setNewUser({ ...newUser, License: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="form-buttons">
              <button type="button" className="save-btn" onClick={onSubmit}>
                Lưu
              </button>
              <button type="button" className="cancel-btn" onClick={() => onClose(false)}>
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
};

export default UserManagement;
