import axiosInstance from '../axios'; // Giả sử đường dẫn đến axios.js là '../axios', chỉnh nếu cần
import Cookies from 'js-cookie';

// Hàm lấy CSRF token (gọi trước các request modify)
async function getCsrfToken(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await axiosInstance.get('/sanctum/csrf-cookie');
      const token = Cookies.get('XSRF-TOKEN');
      if (!token) throw new Error('CSRF token not found in cookies');
      return decodeURIComponent(token);
    } catch (error) {
      console.error(`Attempt ${attempt} to fetch CSRF token failed:`, error);
      if (attempt === retries) throw new Error(`Không thể lấy CSRF token sau ${retries} lần thử: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Lấy tất cả suppliers
export async function getSuppliers() {
  return axiosInstance.get('/api/suppliers/all');
}

// Lấy tất cả medicines
export async function getMedicines() {
  return axiosInstance.get('/api/medicines/all');
}

// Lấy danh sách inventories (import-bills) với pagination và filter
export async function getInventories(page = 1, queryString = '') {
  return axiosInstance.get(`/api/import-bills?page=${page}${queryString ? '&' + queryString : ''}`);
}

// Lấy chi tiết một inventory
export async function getInventoryDetails(importId) {
  return axiosInstance.get(`/api/import-bills/${importId}`);
}

// Xóa một inventory
export async function deleteInventory(inventoryId) {
  const token = await getCsrfToken();
  return axiosInstance.delete(`/api/import-bills/${inventoryId}`, {
    headers: { 'X-XSRF-TOKEN': token },
  });
}

// Thêm mới inventory
export async function addInventory(data) {
  const token = await getCsrfToken();
  return axiosInstance.post('/api/import-bills', data, {
    headers: { 'X-XSRF-TOKEN': token },
  });
}

// Sửa inventory
export async function editInventory(id, data) {
  const token = await getCsrfToken();
  return axiosInstance.put(`/api/import-bills/${id}`, data, {
    headers: { 'X-XSRF-TOKEN': token },
  });
}