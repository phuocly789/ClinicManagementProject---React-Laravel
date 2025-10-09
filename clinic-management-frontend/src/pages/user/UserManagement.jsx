import React, { useEffect, useState } from 'react';
import './UserManagement.css';
import Pagination from '../../Components/Pagination/Pagination';

const UserManagement = () => {
  const usersPerPage = 5;

  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // bắt đầu từ 1
  const [totalPages, setTotalPages] = useState(0);
  const [newUser, setNewUser] = useState({ Username: '', FullName: '', Email: '', Phone: '' });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [disableUserId, setDisableUserId] = useState(null);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const fetchUsers = (page = 1) => {
    fetch(`http://localhost:8000/api/users?page=${page}&per_page=${usersPerPage}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Dữ liệu từ API:", data); // để debug
        setUsers(data.data || []);
        setTotalPages(data.last_page || 1);
        setCurrentPage(data.current_page || 1);
      })
      .catch((err) => console.error("Lỗi gọi API: ", err));
  };

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleCreateUser = () => {
    fetch('http://localhost:8000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).then(() => {
      setNewUser({ Username: '', FullName: '', Email: '', Phone: '' });
      fetchUsers(currentPage);
    });
  };

  const handleEditUser = (user) => {
    setNewUser(user);
    setEditingUserId(user.UserId);
  };

  const handleUpdateUser = () => {
    fetch(`http://localhost:8000/api/users/${editingUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).then(() => {
      setEditingUserId(null);
      setNewUser({ Username: '', FullName: '', Email: '', Phone: '' });
      fetchUsers(currentPage);
    });
  };

  const handleDeleteUser = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa?")) return;
    fetch(`http://localhost:8000/api/users/${id}`, { method: 'DELETE' })
      .then(() => fetchUsers(currentPage));
  };

  const handleToggleActive = (id) => {
    setDisableUserId(id);
    setShowModal(true);
  };

  const confirmToggle = () => {
    const user = users.find((u) => u.UserId === disableUserId);
    fetch(`http://localhost:8000/api/users/${disableUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, IsActive: !user.IsActive }),
    }).then(() => {
      setShowModal(false);
      setDisableUserId(null);
      fetchUsers(currentPage);
    });
  };

  return (
    <div className="content">
      <h1>Quản Lý Người Dùng</h1>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Tài khoản</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>SĐT</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.UserId}>
              <td>{(currentPage - 1) * usersPerPage + index + 1}</td>
              <td>{user.Username}</td>
              <td>{user.FullName}</td>
              <td>{user.Email}</td>
              <td>{user.Phone}</td>
              <td>
                <span className={`status ${user.IsActive ? 'active' : 'inactive'}`}>
                  {user.IsActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                </span>
              </td>
              <td className="action-buttons">
                <button className="edit-btn" onClick={() => handleEditUser(user)}>Sửa</button>
                <button className="delete-btn" onClick={() => handleDeleteUser(user.UserId)}>Xóa</button>
                <button className="disable-btn" onClick={() => handleToggleActive(user.UserId)}>
                  {user.IsActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PHÂN TRANG */}
      <Pagination
        pageCount={totalPages}
        currentPage={currentPage - 1} // ReactPaginate dùng index từ 0
        onPageChange={({ selected }) => setCurrentPage(selected + 1)} // cập nhật state, useEffect sẽ gọi fetch
        isLoading={false}
      />

      <button className="add-btn" onClick={handleCreateUser}>+ Tạo người dùng</button>

      {/* MODAL */}
      {showModal && (
        <div id="confirmModal" className="modal">
          <div className="modal-content">
            <p>Bạn có chắc chắn muốn thay đổi trạng thái hoạt động người dùng?</p>
            <button className="confirm-btn" onClick={confirmToggle}>Đồng ý</button>
            <button className="cancel-btn" onClick={() => setShowModal(false)}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
