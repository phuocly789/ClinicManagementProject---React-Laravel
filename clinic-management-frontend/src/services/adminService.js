import instance from '../axios';

const adminService = {
  // Lấy tất cả dịch vụ
  getServices: (params) => instance.get('/api/admin/services', { params }),

  // Lấy dịch vụ theo ID
  getService: (id) => instance.get(`/api/admin/services/${id}`),

  // Tạo mới dịch vụ
  createService: (serviceData) => instance.post('/api/admin/services', serviceData),

  // Cập nhật dịch vụ
  updateService: (id, serviceData) => instance.put(`/api/admin/services/${id}`, serviceData),

  // Xóa dịch vụ
  deleteService: (id) => instance.delete(`/api/admin/services/${id}`),

  // Lấy loại dịch vụ
  getServiceTypes: () => instance.get('/api/admin/services/types/all'),

  // Lấy danh sách dịch vụ theo loại
  getServicesByType: (type) => instance.get(`/api/admin/services/type/${type}`)
};

export default adminService;
