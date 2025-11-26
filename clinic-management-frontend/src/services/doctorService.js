import axios from "../axios";

// ✅ HÀM XỬ LÝ LỖI CHUNG CHO TẤT CẢ API
const handleApiError = (error) => {
  console.error('❌ API Error:', {
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    data: error.response?.data,
    message: error.message
  });

  // ✅ NÉM LẠI LỖI VỚI THÔNG TIN ĐẦY ĐỦ TỪ BACKEND
  if (error.response?.data) {
    const backendError = new Error(error.response.data.error || error.response.data.message || 'Lỗi hệ thống');
    backendError.response = error.response;
    backendError.status = error.response.status;
    throw backendError;
  }
  
  throw error;
};

// ✅ HÀM WRAPPER ĐỂ XỬ LÝ LỖI CHO TẤT CẢ API CALLS
const apiCall = (axiosCall) => {
  return axiosCall
    .then(response => {
      console.log('✅ API Success:', {
        url: response.config?.url,
        data: response.data
      });
      return response;
    })
    .catch(error => {
      return handleApiError(error);
    });
};

const doctorService = {
    // Lấy danh sách bệnh nhân hôm nay
    getToday: () => {
        return apiCall(axios.get(`/api/doctor/today-patients`));
    },

    // Lấy danh sách dịch vụ
    getServices: () => {
        return apiCall(axios.get(`/api/doctor/services`));
    },

    // Gợi ý chẩn đoán dựa trên triệu chứng
    suggestDiagnosis: (symptoms) => {
        return apiCall(axios.get(`/api/doctor/ai/suggestion`, {
            params: { symptoms, type: "diagnosis" },
        }));
    },

    // Gợi ý thuốc dựa trên chẩn đoán
    suggestMedicine: (diagnosis) => {
        return apiCall(axios.get(`/api/doctor/ai/suggestion`, {
            params: { diagnosis, type: "medicine" },
        }));
    },

    // Gợi ý dịch vụ dựa trên chẩn đoán
    suggestService: (diagnosis) => {
        return apiCall(axios.get(`/api/doctor/ai/suggestion`, {
            params: { diagnosis, type: "service" },
        }));
    },

    getRoom: () => {
        return apiCall(axios.get("/api/doctor/room-info"));
    },

    // Lấy thông tin khám đã hoàn thành
    getExamination: (patientId) => {
        return apiCall(axios.get(`/api/doctor/examinations/${patientId}`));
    },

    // Bắt đầu khám bệnh
    startExamination: (patientId) => {
        return apiCall(axios.post(`/api/doctor/examinations/${patientId}/start`, {}));
    },

    // Hoàn tất khám bệnh - ✅ THÊM XỬ LÝ LỖI CHI TIẾT
    completeExamination: (patientId, data) => {
        return apiCall(axios.post(`/api/doctor/examinations/${patientId}/complete`, data));
    },

    // Tạm lưu dữ liệu khám
    tempSaveExamination: (patientId, data) => {
        return apiCall(axios.post(`/api/doctor/examinations/${patientId}/temp-save`, data));
    },

    // Chỉ định dịch vụ cho cuộc hẹn
    assignServices: (appointmentId, data) => {
        return apiCall(axios.post(`/api/doctor/appointments/${appointmentId}/assign-services`, data));
    },

    // Tìm kiếm thuốc
    searchMedicines: (query) => {
        return apiCall(axios.get(`/api/doctor/medicines/search`, {
            params: { q: query },
        }));
    },

    // === CÁC API MỚI CHO LỊCH SỬ BỆNH NHÂN ===

    // Lấy danh sách tất cả bệnh nhân (cho lịch sử)
    getAllPatients: () => {
        return apiCall(axios.get(`/api/doctor/patients`));
    },

    // Lấy lịch sử khám bệnh của bệnh nhân
    getPatientHistory: (patientId) => {
        return apiCall(axios.get(`/api/doctor/patients/${patientId}/history`));
    },

    // Lấy lịch sử y tế
    getMedicalHistory: (patientId) => {
        return apiCall(axios.get(`/api/doctor/patients/${patientId}/medical-history`));
    },

    // Lấy tất cả lần khám
    getAllExaminations: (patientId) => {
        return apiCall(axios.get(`/api/doctor/patients/${patientId}/examinations`));
    },

    // Tìm kiếm bệnh nhân
    searchPatients: (query) => {
        return apiCall(axios.get(`/api/doctor/patients/search`, {
            params: { q: query }
        }));
    },

    // === API LẤY LỊCH LÀM VIỆC CỦA BÁC SĨ ===

    // ✅ API MỚI: Lấy lịch làm việc của bác sĩ đang đăng nhập - KHÔNG CẦN ID
    getWorkSchedule: () => {
        return apiCall(axios.get(`/api/doctor/work-schedule-doctor`));
    },

    // ✅ API MỚI: Lấy lịch làm việc theo tháng của bác sĩ đang đăng nhập
    getWorkScheduleByMonth: (year, month) => {
        return apiCall(axios.get(`/api/doctor/work-schedule/${year}/${month}`));
    },
}

export default doctorService;