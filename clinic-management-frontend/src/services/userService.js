import axios from "../axios"
const userService = {
    getMe: () => {
        return axios.get("/api/me");
    },
    handleLogout: async () => {
        return axios.post('/api/auth/logout');
    },
}

export default userService;