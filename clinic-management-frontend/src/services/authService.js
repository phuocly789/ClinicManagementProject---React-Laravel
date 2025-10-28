import axios from "../axios";
const authService = {
    handleRegister: (data) => {
        return axios.post(`/api/auth/register`, data)
    },
    verifyEmail: (data) => {
        return axios.post(`/api/verification-email`, data)
    },
    sendVerificationCode: (data) => {
        return axios.post(`/api/resend-verification-email`, data)
    },
    handleLogin: (data) => {
        return axios.post(`/api/auth/login`, data);
    }
}

export default authService;