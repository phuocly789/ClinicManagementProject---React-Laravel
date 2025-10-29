import axios from '../axios'; // ✅ SỬA LẠI IMPORT

const technicianService = {
    // ✅ Lấy danh sách dịch vụ được chỉ định (PHÂN TRANG)
    getAssignedServices: (page = 1) => {
        return axios.get(`/api/technician/servicesv1`, {
            params: { page }
        });
    },
};

export default technicianService;