import axios from "../axios";
const doctorService = {
    // Lấy danh sách bệnh nhân hôm nay
    getToday: () => {
        return axios.get(`/api/doctor/today-patients`);
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
}

export default doctorService;