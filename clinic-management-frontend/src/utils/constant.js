
export const path = {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    VERIFICATION_EMAIL: "/verify-email",
    UNAUTHORIZED: "/unauthorized",
    ADMIN: {
        ROOT: "/admin",
        DASHBOARD: "/admin/dashboard",
        USER: {
            MANAGEMENT: "/admin/users",
            CREATE: "/admin/users/create",
            UPDATE: "/admin/users/update/:id",
        },
        MEDICINE: {
            MANAGEMENT: "/admin/medicines",
            CREATE: "/admin/medicines/create",
            UPDATE: "/admin/medicines/update/:id",
        },
        INVENTORY: "/admin/inventory",
        SUPPLIERS: {
            MANAGEMENT: "/admin/suppliers",
            CREATE: "/admin/suppliers/create",
            UPDATE: "/admin/suppliers/update/:id",
        },
        SERVICE: {
            MANAGEMENT: "/admin/services",
            CREATE: "/admin/services/create",
            UPDATE: "/admin/services/update/:id",
        },
        SCHEDULE: {
            MANAGEMENT: "/admin/schedule-management",
            CREATE: "/admin/schedules/create",
            UPDATE: "/admin/schedules/update/:id",
        },
        REVENUE_REPORT: "/admin/revenue-report",

    },
    RECEPTIONIST: {
        ROOT: "/receptionist",
        DASHBOARD: "/receptionist/dashboard",
        PATIENT_MANAGEMENT: "/receptionist/patient-management",

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
    },
    DOCTOR: {
        ROOT: "/doctor",
        TODAY_APPOINTMENTS: "today",
        SCHEDULE: "schedule-doctor",
        PATIENT_HISTORY: "history",
        DOCTOR_PRINT_PDF: "print-pdf-editor",
    },

    TECHNICIAN: {
        ROOT: "/technician",
        SCHEDULE: "schedule",
        TEST_RESULTS: "test-results",
    },

    PayMent:{
        ROOT:"/payment",
        PAY_RESULT:"result"
    }
};

export const USER_ROLE = {
    ADMIN: "Admin",
    PATIENT: "Bệnh nhân",
    DOCTOR: "Bác sĩ",
    TECHNICIAN: "Kỹ thuật viên",
    RECEPTIONIST: "Lễ tân",
};


export const ROLE_ROUTE = {
    [USER_ROLE.ADMIN]: path.ADMIN.ROOT,
    [USER_ROLE.PATIENT]: path.PATIENT.ROOT,
    [USER_ROLE.DOCTOR]: path.DOCTOR.ROOT,
    [USER_ROLE.TECHNICIAN]: path.TECHNICIAN.ROOT,
    [USER_ROLE.RECEPTIONIST]: path.RECEPTIONIST.DASHBOARD,
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


