import axios from "axios";
import _ from "lodash";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

const API_BASE_URL = 'http://localhost:8000';
NProgress.configure({ showSpinner: false });
const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});


instance.interceptors.request.use(
    (config) => {
        NProgress.start();
        return config;
    },
    (error) => {
        NProgress.done();
        return Promise.reject(error);
    }
);
instance.interceptors.response.use(
    (response) => {
        NProgress.done();
        return response.data;
    },
    (error) => {
        NProgress.done();
        return Promise.reject(error);
    }
);

// instance.interceptors.response.use((response) => {
//     const { data } = response;
//     return response.data;
// });

export default instance;