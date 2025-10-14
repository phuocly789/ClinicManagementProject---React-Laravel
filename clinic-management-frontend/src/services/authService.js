import axios from "../axios";
const authService = {
    handleRegister: (data) => {
        return axios.post(`/api/register`, data)
    },
    verifyEmail: (data) => {
        return axios.post(`/api/verify-email`, data)
    },
    sendVerificationCode: (data) => {
        return axios.post(`/api/resend-verification-email`, data)
    },
    handleLogin: (data) => {
        return axios.post(`/api/v1/auth/login`, data);
    }
}

export default authService;