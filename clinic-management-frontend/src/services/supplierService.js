// src/services/supplierService.js
import axiosInstance from '../axios';

const API_BASE = '/api/suppliers';

const supplierService = {
  getAll: async (page = 1, queryString = '') => {
    const response = await axiosInstance.get(
      `${API_BASE}?page=${page}${queryString ? '&' + queryString : ''}`
    );
    return response; // trả về { data: [...], last_page: number }
  },

  create: async (data) => {
    return await axiosInstance.post(API_BASE, data);
  },

  update: async (id, data) => {
    return await axiosInstance.put(`${API_BASE}/${id}`, data);
  },

  delete: async (id) => {
    return await axiosInstance.delete(`${API_BASE}/${id}`);
  },
};

export default supplierService;