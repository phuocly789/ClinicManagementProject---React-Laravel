import axios from '../axios'; // ✅ SỬA LẠI IMPORT

const technicianService = {
    // ✅ Lấy danh sách dịch vụ được chỉ định (PHÂN TRANG)
    getAssignedServices: (page = 1) => {
        return axios.get(`/api/technician/servicesv1`, {
            params: { page }
        });
    },

    // ✅ POST - Cập nhật dữ liệu (thay vì PUT)
    updateServiceStatus: (serviceOrderId, status) => {
        console.log(`🔄 Sending status update: ${serviceOrderId} -> ${status}`);

        return axios.post(`/api/technician/services/${serviceOrderId}/status`, { status })
            .then(response => {
                console.log('✅ Status update success:', response.data);
                return response;
            })
            .catch(error => {
                console.error('❌ Status update error:', error);
                throw error;
            });
    },

    // SỬA LẠI: Cập nhật kết quả - Dùng JSON thay vì FormData
    updateServiceResult: (serviceOrderId, result) => {
        console.log('🔄 Sending result data:', {
            serviceOrderId,
            resultLength: result.length
        });

        // SỬA: Dùng JSON thay vì FormData
        return axios.post(`/api/technician/service-orders/${serviceOrderId}/result`, {
            result: result
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                console.log('✅ Result update success:', response.data);
                return response;
            })
            .catch(error => {
                console.error('❌ Result update error:', error);
                throw error;
            });
    },

    // SỬA LẠI: Lấy danh sách dịch vụ đã hoàn thành
    getCompletedServices: (technicianId = 5) => {
        console.log(`📋 Getting completed services for technician: ${technicianId}`);

        return axios.get('/api/technician/completed-services')
            .then(response => {
                console.log('✅ Completed services response:', response.data);
                return response;
            })
            .catch(error => {
                console.error('❌ Completed services error:', error);
                throw error;
            });
    }
};

export default technicianService;