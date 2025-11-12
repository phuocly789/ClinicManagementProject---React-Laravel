import axios from "../axios";
const patientService = {
    updateProfile: async (id, data) => {
        return axios.put(`/api/patient/update-profile/${id}`, data)
    },
    sendEmailVerification: async (data) => {
        return axios.post(`/api/patient/send-vefication-email`, data)
    },
    changePassword: async (data) => {
        return axios.post(`/api/account/change-password`, data)
    },
    getAllService: async () => {
        return axios.get(`/api/patient/services`);
    },
    bookingAppointment: async (data) => {
        return axios.post(`/api/patient/appointments/book`, data);
    }
}

export default patientService;