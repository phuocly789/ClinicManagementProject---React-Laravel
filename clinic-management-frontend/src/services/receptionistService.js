import axios from "../axios";
const receptionistService = {
    getNotifications: async (current, pageSize) => {
        return axios.get(`/api/receptionist/notifications?current=${current}&pageSize=${pageSize}`)
    },
}

export default receptionistService;