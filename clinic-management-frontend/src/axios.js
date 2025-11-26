// axios.js
import axios from "axios";
import Cookies from 'js-cookie';
import NProgress from "nprogress";
import "nprogress/nprogress.css";

const API_BASE_URL = "http://125.212.218.44:8000";

NProgress.configure({ showSpinner: false });

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

axiosInstance.interceptors.request.use(
    (config) => {
        NProgress.start();

        // Lấy token từ cookie và thêm vào header
        const token = Cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        NProgress.done();
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => {
        NProgress.done();
        return response.data;
    },
    (error) => {
        NProgress.done();
        if (error.response?.status === 401) {
            Cookies.remove('token');
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;