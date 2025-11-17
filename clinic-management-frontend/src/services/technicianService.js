import axios from '../axios';

const technicianService = {
    getAssignedServices: (page = 1) => {
        console.log('📋 [SERVICE] Calling assigned services endpoint...');
        return axios.get(`/api/technician/servicesv1`, { params: { page } })
            .then(response => {
                console.log('✅ [SERVICE] Assigned services response received');
                return response;
            })
            .catch(error => {
                console.error('❌ [SERVICE] Assigned services error:', error);
                throw error;
            });
    },

    // ✅ CHỈ GIỮ 1 METHOD - Sử dụng parameter nếu cần
    getCompletedServices: (technicianId = null) => {
        console.log(`📋 Getting completed services for technician: ${technicianId || 'default'}`);
        return axios.get('/api/technician/completed-services')
            .then(response => {
                console.log('✅ Completed services response received');
                return response;
            })
            .catch(error => {
                console.error('❌ Completed services error:', error);
                throw error;
            });
    },

    // ✅ Cập nhật kết quả
    updateServiceResult: (serviceOrderId, result) => {
        console.log('🔄 Sending result data:', {
            serviceOrderId,
            resultLength: result.length
        });

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

    // ✅ THÊM METHOD CẬP NHẬT TRẠNG THÁI (QUAN TRỌNG)
    updateServiceStatus: (serviceOrderId, status) => {
        console.log('🔄 Updating service status:', {
            serviceOrderId,
            status
        });

        return axios.post(`/api/technician/services/${serviceOrderId}/status`, {
            status: status
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('✅ Status update success:', response.data);
            return response;
        })
        .catch(error => {
            console.error('❌ Status update error:', error);
            throw error;
        });
    },

    // Lịch làm việc
    getWorkSchedule: () => {
        console.log('📅 Getting work schedule for technician');
        return axios.get('/api/technician/work-schedule')
            .then(response => {
                console.log('✅ Work schedule response received');
                return response;
            })
            .catch(error => {
                console.error('❌ Work schedule error:', error);
                throw error;
            });
    },

    getWorkScheduleByMonth: (year, month) => {
        console.log(`📅 Getting work schedule for ${month}/${year}`);
        return axios.get(`/api/technician/work-schedule/${year}/${month}`)
            .then(response => {
                console.log('✅ Monthly work schedule response received');
                return response;
            })
            .catch(error => {
                console.error('❌ Monthly work schedule error:', error);
                throw error;
            });
    }
};

export default technicianService;