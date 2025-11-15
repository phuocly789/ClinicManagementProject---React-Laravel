// src/services/inventoryService.js
import axiosInstance from '../axios';

const API_BASE = '/api/import-bills';

const inventoryService = {
  getAll: async (page = 1, query = '') => {
    const response = await axiosInstance.get(
      `${API_BASE}?page=${page}${query ? '&' + query : ''}`
    );
    return {
      data: response.data.data.map(item => ({
        id: item.ImportId,
        supplierId: item.SupplierId,
        date: item.ImportDate,
        total: item.TotalAmount,
        note: item.Notes || '',
      })),
      last_page: response.data.last_page,
    };
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`${API_BASE}/${id}`);
    const data = response.data.data;

    return {
      inventory: {
        id: data.ImportId,
        supplierId: data.SupplierId,
        date: data.ImportDate,
        total: data.TotalAmount,
        note: data.Notes || '',
        details: data.import_details || [],
      },
      details: (data.import_details || []).map(d => ({
        id: d.ImportDetailId,
        medicineId: d.MedicineId,
        medicineName: d.medicine?.MedicineName || 'N/A',
        quantity: d.Quantity,
        price: d.ImportPrice,
        subTotal: d.SubTotal,
      })),
      supplier: data.supplier ? {
        SupplierId: data.supplier.SupplierId,
        SupplierName: data.supplier.SupplierName,
        ContactEmail: data.supplier.ContactEmail,
        ContactPhone: data.supplier.ContactPhone,
        Address: data.supplier.Address,
        Description: data.supplier.Description,
      } : null,
    };
  },

  getSuppliers: async () => {
    const res = await axiosInstance.get('/api/suppliers/all');
    return res.data.data || [];
  },

  getMedicines: async () => {
    const res = await axiosInstance.get('/api/medicines/all');
    return res.data || [];
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

export default inventoryService;