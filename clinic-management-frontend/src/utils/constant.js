
export const path = {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    VERIFICATION_EMAIL: "/verify-email",
    UNAUTHORIZED: "/unauthorized",
    ADMIN: {
        ROOT: "/admin",
    },
    USER: {
        ROOT: "/user",
        APPOINTMENT: {
            MANAGEMENT: "/user/apppointment-management",
            CREATE: "/user/apppointment-create",
            UPDATE: "/user/apppointment-update",
        },
        PROFILE: {
            MANAGEMENT: "/user/profile-management/:id",
        },
        PRESCRIPTION: {
            MANAGEMENT: "/user/prescription-management",
            CREATE: "/user/prescription-create",
            UPDATE: "/user/prescription-update/:id",
        },
    },
    PATIENT: {
        ROOT: "/patient",
        APPOINTMENT: {
            MANAGEMENT: "/patient/apppointment-management",
            CREATE: "/patient/apppointment-create",
            UPDATE: "/patient/apppointment-update",
        },
        PROFILE: {
            MANAGEMENT: "/patient/profile-management",
            CREATE: "/patient/profile-create",
            UPDATE: "/patient/profile-update",
        }
    }
};

export const USER_ROLE = {
    ADMIN: "Admin",
    PATIENT: "Bệnh nhân",
};


export const ROLE_ROUTE = {
    [USER_ROLE.ADMIN]: path.ADMIN.ROOT,
    [USER_ROLE.PATIENT]: path.PATIENT.ROOT,
};

export const CRUD_ACTIONS = {
    ADD: "ADD",
    EDIT: "EDIT",
    DELETE: "DELETE",
};


// export const USER_ROLE = {
//     ADMIN: "R1",
//     DEV: "R2",
//     TESTER: "R3",
// };


