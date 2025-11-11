import axios from "../axios";
import Cookies from 'js-cookie';
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
    handleLogin: async (credentials) => {
        const response = await axios.post('/api/auth/login', credentials);

        if (response.success && response.token) {
            Cookies.set('token', response.token, {
                expires: 1,
                path: '/',
                sameSite: 'Lax'
            });
        }

        return response;
    },
}

export default authService;