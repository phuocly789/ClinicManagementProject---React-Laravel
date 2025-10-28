import axios from "../axios";

const adminService = {
    // Lấy danh sách dịch vụ với phân trang và lọc
    getServices: (params = {}) => {
        return axios.get(`/api/services`, { params });
    },

    // Lấy thông tin chi tiết dịch vụ
    getServiceById: (id) => {
        return axios.get(`/api/services/${id}`);
    },

    // Tạo dịch vụ mới
    createService: (data) => {
        return axios.post(`/api/services`, data);
    },

    // Cập nhật dịch vụ
    updateService: (id, data) => {
        return axios.put(`/api/services/${id}`, data);
    },

    // Xóa dịch vụ
    deleteService: (id) => {
        return axios.delete(`/api/services/${id}`);
    },

    // Lấy các loại dịch vụ
    getServiceTypes: () => {
        return axios.get(`/api/service-types`);
    }
};

export default adminService;