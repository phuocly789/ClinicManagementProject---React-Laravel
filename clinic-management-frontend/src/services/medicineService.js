// src/services/medicineService.js
import axiosInstance from '../axios'; // Đảm bảo đường dẫn đúng

const API_BASE = '/api/medicines';

const medicineService = {
  // Lấy danh sách thuốc + phân trang + filter
  getAll: async (page = 1, queryString = '') => {
    const response = await axiosInstance.get(
      `${API_BASE}?page=${page}${queryString ? '&' + queryString : ''}`
    );
    return response; // axiosInstance đã return response.data
  },

  // Tạo mới thuốc
  create: async (data) => {
    return await axiosInstance.post(API_BASE, data);
  },

  // Cập nhật thuốc
  update: async (id, data) => {
    return await axiosInstance.put(`${API_BASE}/${id}`, data);
  },

  // Xóa thuốc
  delete: async (id) => {
    return await axiosInstance.delete(`${API_BASE}/${id}`);
  },

  // Tải template Excel
  downloadTemplate: async () => {
    const response = await axiosInstance.get(`${API_BASE}/template`, {
      responseType: 'blob',
    });
    return response;
  },

  // Export Excel
  exportExcel: async (filters = {}, columns = []) => {
    const params = new URLSearchParams();
    params.append('filters', JSON.stringify(filters));
    params.append('columns', columns.join(','));

    const response = await axiosInstance.get(`${API_BASE}/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response;
  },

  // Dry-run import
  dryRunImport: async (file, mapping) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    return await axiosInstance.post(`${API_BASE}/dry-run`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Import thực tế
  importExcel: async (file, mapping) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    return await axiosInstance.post(`${API_BASE}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Gợi ý AI
  suggestAI: async (name) => {
    return await axiosInstance.post(`${API_BASE}/suggest`, { name });
  },
};

export default medicineService;