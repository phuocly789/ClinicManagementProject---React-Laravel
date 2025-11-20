import axios from "../axios";

const doctorService = {
    // Lấy danh sách bệnh nhân hôm nay
    getToday: () => {
        return axios.get(`/api/doctor/today-patients`);
    },

    // Lấy danh sách dịch vụ
    getServices: () => {
        return axios.get(`/api/doctor/services`);
    },

    // Gợi ý chẩn đoán dựa trên triệu chứng
    suggestDiagnosis: (symptoms) => {
        return axios.get(`/api/doctor/ai/suggestion`, {
            params: { symptoms, type: "diagnosis" },
        });
    },

    // Gợi ý thuốc dựa trên chẩn đoán
    suggestMedicine: (diagnosis) => {
        return axios.get(`/api/doctor/ai/suggestion`, {
            params: { diagnosis, type: "medicine" },
        });
    },

    // Gợi ý dịch vụ dựa trên chẩn đoán
    suggestService: (diagnosis) => {
        return axios.get(`/api/doctor/ai/suggestion`, {
            params: { diagnosis, type: "service" },
        });
    },

    // Lấy thông tin khám đã hoàn thành
    getExamination: (patientId) => {
        return axios.get(`/api/doctor/examinations/${patientId}`);
    },

    // Bắt đầu khám bệnh
    startExamination: (patientId) => {
        return axios.post(`/api/doctor/examinations/${patientId}/start`, {});
    },

    // Hoàn tất khám bệnh
    completeExamination: (patientId, data) => {
        return axios.post(`/api/doctor/examinations/${patientId}/complete`, data);
    },

    // Tạm lưu dữ liệu khám
    tempSaveExamination: (patientId, data) => {
        return axios.post(`/api/doctor/examinations/${patientId}/temp-save`, data);
    },

    // Chỉ định dịch vụ cho cuộc hẹn
    assignServices: (appointmentId, data) => {
        return axios.post(`/api/doctor/appointments/${appointmentId}/assign-services`, data);
    },

    // Tìm kiếm thuốc
    searchMedicines: (query) => {
        return axios.get(`/api/doctor/medicines/search`, {
            params: { q: query },
        });
    },



    // === CÁC API MỚI CHO LỊCH SỬ BỆNH NHÂN ===

    // Lấy danh sách tất cả bệnh nhân (cho lịch sử)
    getAllPatients: () => {
        return axios.get(`/api/doctor/patients`);
    },

    // Lấy lịch sử khám bệnh của bệnh nhân
    getPatientHistory: (patientId) => {
        return axios.get(`/api/doctor/patients/${patientId}/history`);
    },

    // Lấy lịch sử y tế
    getMedicalHistory: (patientId) => {
        return axios.get(`/api/doctor/patients/${patientId}/medical-history`);
    },

    // Lấy tất cả lần khám
    getAllExaminations: (patientId) => {
        return axios.get(`/api/doctor/patients/${patientId}/examinations`);
    },

    // Tìm kiếm bệnh nhân
    searchPatients: (query) => {
        return axios.get(`/api/doctor/patients/search`, {
            params: { q: query }
        });
    },

    // === API LẤY LỊCH LÀM VIỆC CỦA BÁC SĨ ===

    // Lấy lịch làm việc của bác sĩ - CẬP NHẬT
    getSchedule: (doctorId) => {
        return axios.get(`/api/doctor/schedules/${doctorId}`);
    },

    // Lấy lịch làm việc theo tháng - THÊM MỚI
    getScheduleByMonth: (doctorId, year, month) => {
        return axios.get(`/api/doctor/schedules/${doctorId}/month/${year}/${month}`);
    },

    // Lấy lịch làm việc hôm nay - THÊM MỚI
    getTodaySchedule: (doctorId) => {
        return axios.get(`/api/doctor/schedules/${doctorId}/today`);
    },

    // Lấy lịch làm việc tuần này - THÊM MỚI
    getWeekSchedule: (doctorId) => {
        return axios.get(`/api/doctor/schedules/${doctorId}/week`);
    },
}

export default doctorService;