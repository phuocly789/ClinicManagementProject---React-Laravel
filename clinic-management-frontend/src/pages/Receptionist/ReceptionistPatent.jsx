import React, { useState, useEffect } from "react";
import axiosInstance from "../../axios";
import Select from 'react-select';
import CustomToast from "../../Components/CustomToast/CustomToast";
import ConfirmDeleteModal from "../../Components/CustomToast/DeleteConfirmModal";
import Loading from "../../Components/Loading/Loading";

// Validation utilities
const ValidationUtils = {
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validatePhone: (phone) => {
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },

    validateName: (name) => {
        const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
        return nameRegex.test(name) && name.length >= 2;
    },

    validateDateOfBirth: (date) => {
        if (!date) return true;
        const birthDate = new Date(date);
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 120);
        return birthDate <= today && birthDate >= minDate;
    },

    validateRequired: (value) => {
        return value && value.toString().trim().length > 0;
    },

    validateAppointmentTime: (time, date) => {
        if (!time || !date) return true;
        const appointmentTime = new Date(`${date}T${time}`);
        const hours = appointmentTime.getHours();
        const minutes = appointmentTime.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        return totalMinutes >= 420 && totalMinutes <= 1080;
    }
};

const ErrorMessages = {
    REQUIRED: "Trường này là bắt buộc",
    INVALID_EMAIL: "Email không hợp lệ",
    INVALID_PHONE: "Số điện thoại không hợp lệ (phải là 10 số và bắt đầu bằng 0)",
    INVALID_NAME: "Họ tên chỉ được chứa chữ cái và khoảng trắng, tối thiểu 2 ký tự",
    INVALID_DATE: "Ngày sinh không hợp lệ",
    INVALID_APPOINTMENT_TIME: "Thời gian hẹn phải trong khoảng 7:00 - 18:00",
    FUTURE_DATE: "Ngày hẹn không được ở quá khứ",
    DOCTOR_REQUIRED: "Vui lòng chọn bác sĩ",
    ROOM_REQUIRED: "Vui lòng chọn phòng khám",
    PATIENT_REQUIRED: "Vui lòng chọn hoặc tạo bệnh nhân"
};

// Các loại cảnh báo
const AlertTypes = {
    WARNING: 'warning',
    ERROR: 'error'
};

// Các mã cảnh báo
const AlertCodes = {
    MULTIPLE_APPOINTMENTS: 'MULTIPLE_APPOINTMENTS',
    OUTSIDE_WORKING_HOURS: 'OUTSIDE_WORKING_HOURS',
    DUPLICATE_PATIENT_INFO: 'DUPLICATE_PATIENT_INFO',
    SPAM_SUSPICION: 'SPAM_SUSPICION',
    DOCTOR_UNAVAILABLE: 'DOCTOR_UNAVAILABLE',
    PAST_APPOINTMENT: 'PAST_APPOINTMENT'
};

const ReceptionistPatent = () => {
    const [activeTab, setActiveTab] = useState("online");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("Tất cả");
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showPatientForm, setShowPatientForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState(null);

    // Modal states
    const [showToast, setShowToast] = useState(false);
    const [toastConfig, setToastConfig] = useState({ type: 'success', message: '' });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({});

    // React Select states
    const [patientOptions, setPatientOptions] = useState([]);
    const [selectedPatientOption, setSelectedPatientOption] = useState(null);
    const [isSearchingPatients, setIsSearchingPatients] = useState(false);

    // Alert states - THÊM MỚI
    const [alerts, setAlerts] = useState([]);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [currentAlert, setCurrentAlert] = useState(null);
    const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);

    const [appointmentForm, setAppointmentForm] = useState({
        patientId: "",
        staffId: "",
        scheduleId: "",
        roomId: "",
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: getCurrentTime(),
        notes: "",
        serviceType: "Khám bệnh"
    });

    const [patientForm, setPatientForm] = useState({
        fullName: "",
        phone: "",
        email: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        medicalHistory: ""
    });

    const [rooms, setRooms] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [onlineAppointments, setOnlineAppointments] = useState([]);

    // Modal functions
    const showToastMessage = (type, message) => {
        setToastConfig({ type, message });
        setShowToast(true);
    };

    const hideToast = () => {
        setShowToast(false);
    };

    const showConfirmDialog = (config) => {
        setConfirmModalConfig(config);
        setShowConfirmModal(true);
    };

    const hideConfirmDialog = () => {
        setShowConfirmModal(false);
    };

    // Alert functions - THÊM MỚI
    const addAlert = (alert) => {
        setAlerts(prev => [...prev, alert]);
    };

    const clearAlerts = () => {
        setAlerts([]);
        setIsConfirmDisabled(false);
    };

    const showAlertDialog = (alert) => {
        setCurrentAlert(alert);
        setShowAlertModal(true);
    };

    const hideAlertDialog = () => {
        setShowAlertModal(false);
        setCurrentAlert(null);
    };

    // API Calls với error handling
    const api = {
        getRooms: async () => {
            try {
                const response = await axiosInstance.get('/api/receptionist/rooms');
                return response.data;
            } catch (error) {
                console.error("API Error - getRooms:", error);
                throw error;
            }
        },

        getDoctorsWithSchedules: async (date, roomId = null) => {
            try {
                const params = { date };
                if (roomId) params.room_id = roomId;
                const response = await axiosInstance.get('/api/receptionist/medical-staff/schedules', { params });
                return response.data;
            } catch (error) {
                console.error("API Error - getDoctorsWithSchedules:", error);
                throw error;
            }
        },

        getOnlineAppointments: async (status = "Tất cả", date = null) => {
            try {
                const params = {};
                if (status !== "Tất cả") params.status = status;
                if (date) params.date = date;

                const response = await axiosInstance.get('/api/receptionist/appointments/online', { params });
                return response.data;
            } catch (error) {
                console.error("API Error - getOnlineAppointments:", error);
                throw error;
            }
        },

        // API lấy tất cả patients
        getAllPatients: async () => {
            try {
                const response = await axiosInstance.get('/api/receptionist/patients');
                if (response.status === 204) {
                    return []; // Không có bệnh nhân
                }
                return response.data || [];
            } catch (error) {
                console.error("API Error - getAllPatients:", error);
                if (error.response?.status === 204) {
                    return [];
                }
                throw error;
            }
        },

        createPatient: async (patientData) => {
            try {
                const response = await axiosInstance.post('/api/receptionist/patients', patientData);
                return response.data;
            } catch (error) {
                console.error("API Error - createPatient:", error);
                throw error;
            }
        },

        completeReception: async (receptionData) => {
            try {
                const response = await axiosInstance.post('/api/receptionist/complete', receptionData);
                return response;
            } catch (error) {
                console.error("API Error - completeReception:", error);
                const message = error.response?.data?.message ||
                    error.response?.data?.error ||
                    error.message ||
                    "Lỗi không xác định từ server";
                return {
                    success: false,
                    error: message
                };
            }
        },

        // THÊM MỚI: API để kiểm tra bất thường
        checkAppointmentAnomalies: async (appointmentData) => {
            try {
                const response = await axiosInstance.post('/api/receptionist/check-anomalies', appointmentData);
                return response.data;
            } catch (error) {
                console.error("API Error - checkAppointmentAnomalies:", error);
                return { alerts: [] };
            }
        },

        // THÊM MỚI: API để log cảnh báo
        logAlertAction: async (logData) => {
            try {
                await axiosInstance.post('/api/receptionist/log-alert', logData);
            } catch (error) {
                console.error("API Error - logAlertAction:", error);
            }
        }
    };

    // Helper functions
    function getCurrentTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        return now.toTimeString().slice(0, 5);
    }

    // Format date từ API
    const formatDateFromAPI = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        } catch (error) {
            return dateString;
        }
    };
    const checkAnomaliesWithRealData = async (appointmentData, patientData, realAppointments, realPatients) => {
        const alerts = [];

        console.log("🔍 Checking anomalies with real data:", {
            appointmentData,
            patientData,
            realAppointmentsCount: realAppointments?.length,
            realPatientsCount: realPatients?.length
        });

        // 1. KIỂM TRA GIỜ KHÁM NGOÀI GIỜ LÀM VIỆC (7:00 - 18:00)
        if (appointmentData.appointmentTime) {
            const [hours, minutes] = appointmentData.appointmentTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;

            if (totalMinutes < 420 || totalMinutes > 1080) {
                alerts.push({
                    code: "OUTSIDE_WORKING_HOURS",
                    type: "error",
                    title: "Giờ khám ngoài giờ làm việc",
                    message: `Giờ khám ${appointmentData.appointmentTime} nằm ngoài khung giờ làm việc`,
                    details: "Vui lòng chọn giờ khám trong khoảng 7:00 - 18:00"
                });
            }
        }

        // 2. KIỂM TRA NHIỀU LỊCH HẸN TRONG NGÀY - QUAN TRỌNG: SỬA LOGIC NÀY
        if (appointmentData.patientId && realAppointments && appointmentData.appointmentDate) {
            // Lọc tất cả appointments của patient trong ngày (KHÔNG bao gồm appointment hiện tại nếu có)
            const patientAppointments = realAppointments.filter(apt =>
                apt.PatientId?.toString() === appointmentData.patientId?.toString() &&
                apt.AppointmentDate === appointmentData.appointmentDate &&
                apt.Status === "Đã đặt" &&
                // QUAN TRỌNG: Loại trừ appointment hiện tại nếu đang tiếp nhận từ online
                apt.AppointmentId !== appointmentData.originalAppointmentId
            );

            console.log("📅 Multiple appointments check - FIXED:", {
                patientId: appointmentData.patientId,
                appointmentDate: appointmentData.appointmentDate,
                foundAppointments: patientAppointments.length,
                currentAppointmentId: appointmentData.originalAppointmentId,
                allAppointments: realAppointments.map(a => ({
                    id: a.AppointmentId,
                    patientId: a.PatientId,
                    date: a.AppointmentDate,
                    time: a.AppointmentTime,
                    status: a.Status
                }))
            });

            // GIẢM NGƯỠNG XUỐNG 1 để dễ test (thay vì 2)
            if (patientAppointments.length >= 1) {
                const appointmentTimes = patientAppointments.map(apt => apt.AppointmentTime).join(', ');
                alerts.push({
                    code: "MULTIPLE_APPOINTMENTS",
                    type: "warning",
                    title: "Nhiều lịch hẹn trong ngày",
                    message: `Bệnh nhân đã có ${patientAppointments.length} lịch hẹn khác trong ngày hôm nay`,
                    details: `Các lịch hẹn: ${appointmentTimes}. Vui lòng xác nhận tính hợp lệ.`
                });
            }
        }

        // 3. KIỂM TRA THÔNG TIN BỆNH NHÂN TRÙNG
        if (!appointmentData.patientId && patientData.phone && realPatients) {
            const duplicatePatient = realPatients.find(patient => {
                const user = patient.user || patient;
                return user.Phone === patientData.phone;
            });

            if (duplicatePatient) {
                const existingUser = duplicatePatient.user || duplicatePatient;
                alerts.push({
                    code: "DUPLICATE_PATIENT_PHONE",
                    type: "error",
                    title: "Số điện thoại đã tồn tại",
                    message: "Số điện thoại này đã được sử dụng bởi bệnh nhân khác",
                    details: `Số điện thoại ${patientData.phone} đã thuộc về bệnh nhân: ${existingUser.FullName}`
                });
            }
        }

        // 4. KIỂM TRA NGÀY KHÁM TRONG QUÁ KHỨ
        if (appointmentData.appointmentDate) {
            const appointmentDate = new Date(appointmentData.appointmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (appointmentDate < today) {
                alerts.push({
                    code: "PAST_APPOINTMENT",
                    type: "error",
                    title: "Ngày khám trong quá khứ",
                    message: "Không thể đặt lịch khám trong quá khứ",
                    details: "Vui lòng chọn ngày khám từ hôm nay trở đi"
                });
            }
        }

        console.log("🚨 Final alerts:", alerts);
        return alerts;
    };
    // THÊM MỚI: Hàm xử lý khi lễ tân chọn hành động với cảnh báo
    const handleAlertAction = async (alert, action) => {
        // Log hành động của lễ tân
        await api.logAlertAction({
            alertCode: alert.code,
            alertMessage: alert.message,
            action: action,
            appointmentId: selectedAppointment?.AppointmentId,
            patientId: selectedPatient?.PatientId || selectedPatient?.UserId,
            receptionistId: "current_user_id" // Cần lấy từ auth context
        });

        if (action === 'continue') {
            // Tiếp tục xử lý cảnh báo tiếp theo hoặc tiếp tục tiếp nhận
            const remainingAlerts = alerts.filter(a => a !== alert);
            setAlerts(remainingAlerts);

            if (remainingAlerts.length > 0) {
                showAlertDialog(remainingAlerts[0]);
            } else {
                hideAlertDialog();
                // Nếu không còn cảnh báo nào, cho phép tiếp nhận
                setIsConfirmDisabled(false);
            }
        } else if (action === 'cancel') {
            // Hủy tiếp nhận
            hideAlertDialog();
            clearAlerts();
            showToastMessage('warning', 'Đã hủy tiếp nhận do cảnh báo hệ thống');
            resetAllForms();
        } else if (action === 'edit') {
            // Chuyển sang chế độ chỉnh sửa
            hideAlertDialog();
            // Có thể tự động focus vào field cần sửa dựa trên alert code
            handleAutoFocusField(alert.code);
        }
    };

    // THÊM MỚI: Hàm tự động focus vào field cần sửa
    const handleAutoFocusField = (alertCode) => {
        console.log("🎯 Auto-focusing field for alert:", alertCode);

        switch (alertCode) {
            case AlertCodes.OUTSIDE_WORKING_HOURS:
            case "OUTSIDE_WORKING_HOURS":
                setTimeout(() => {
                    document.querySelector('input[type="time"]')?.focus();
                }, 100);
                break;

            case AlertCodes.DUPLICATE_PATIENT_INFO:
            case "DUPLICATE_PATIENT_PHONE":
                setTimeout(() => {
                    document.querySelector('input[name="phone"]')?.focus();
                }, 100);
                break;

            case AlertCodes.DOCTOR_UNAVAILABLE:
            case "DOCTOR_UNAVAILABLE":
            case "NO_DOCTORS_IN_ROOM":
                setTimeout(() => {
                    document.querySelector('select[name="staffId"]')?.focus();
                }, 100);
                break;

            case AlertCodes.PAST_APPOINTMENT:
            case "PAST_APPOINTMENT":
                setTimeout(() => {
                    document.querySelector('input[type="date"]')?.focus();
                }, 100);
                break;

            default:
                break;
        }
    };
    // Initialize data
    useEffect(() => {
        initializeData();
    }, []);

    // Filter doctors when room changes
    useEffect(() => {
        filterDoctorsByRoom();
    }, [appointmentForm.roomId, doctors]);

    // Load all patients khi component mount
    useEffect(() => {
        loadAllPatients();
    }, []);

    // THÊM MỚI: Kiểm tra bất thường khi form thay đổi
    useEffect(() => {
        if ((selectedAppointment || selectedPatient || showPatientForm) &&
            appointmentForm.appointmentDate && appointmentForm.appointmentTime) {
            // Debounce kiểm tra bất thường
            const timeoutId = setTimeout(() => {
                checkForAnomalies(appointmentForm, patientForm, activeTab);
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [appointmentForm, patientForm, selectedAppointment, selectedPatient, showPatientForm]);

    const initializeData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Load rooms
            const roomsResponse = await api.getRooms();
            setRooms(roomsResponse || []);

            // Load doctors with today's schedules
            const doctorsResponse = await api.getDoctorsWithSchedules(today);
            setDoctors(doctorsResponse || []);
            setFilteredDoctors(doctorsResponse || []);

            // Load online appointments
            const appointmentsResponse = await api.getOnlineAppointments("Đã đặt", today);
            setOnlineAppointments(appointmentsResponse || []);

        } catch (error) {
            console.error("Error initializing data:", error);
            const errorMessage = error.response?.message || "Không thể tải dữ liệu khởi tạo";
            setApiError(errorMessage);
            showToastMessage('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Load tất cả patients
    const loadAllPatients = async () => {
        try {
            const response = await api.getAllPatients();
            const patients = response || [];

            // Format patients data để hiển thị trong select
            const options = patients.map(patient => {
                const fullName = patient.user.FullName || 'Không tên';
                const phone = patient.user.Phone || 'Không có số';
                const dob = patient.user.DateOfBirth ? ` - ${formatDateFromAPI(patient.user.DateOfBirth)}` : '';
                return {
                    value: patient.PatientId,
                    label: `${fullName} - ${phone}${dob}`,
                    patientData: patient.user
                };
            });

            setPatientOptions(options);
        } catch (error) {
            console.error("Error loading patients:", error);
            // Không hiển thị lỗi vì đây là tính năng tải trước
        }
    };

    // Tìm kiếm bệnh nhân với React Select - ĐÃ SỬA
    const handlePatientSearch = (inputValue) => {
        if (!inputValue || inputValue.trim() === '') {
            loadAllPatients(); // Load lại toàn bộ
            return;
        }

        const searchLower = inputValue.toLowerCase().trim();

        // Lọc từ danh sách đã load (patientOptions)
        const filtered = patientOptions
            .filter(option => {
                if (!option.patientData) return false;
                const patient = option.patientData;
                return (
                    (patient.FullName || '').toLowerCase().includes(searchLower) ||
                    (patient.Phone || '').includes(searchLower) ||
                    (patient.Email || '').toLowerCase().includes(searchLower)
                );
            });

        let options = filtered;

        // Nếu không tìm thấy VÀ input có ít nhất 2 ký tự → thêm option "Tạo mới"
        if (options.length === 0 && inputValue.length >= 2) {
            options = [{
                value: 'create_new',
                label: `+ Tạo bệnh nhân mới: ${inputValue}`,
                isCreateNew: true,
                searchTerm: inputValue
            }];
        } else if (options.length === 0 && inputValue.length < 2) {
            // Nếu input ít hơn 2 ký tự và không tìm thấy, không hiển thị gì cả
            options = [];
        }

        setPatientOptions(options);
    };

    const handlePatientSelect = async (selectedOption) => {
        setSelectedPatientOption(selectedOption);

        if (selectedOption?.isCreateNew) {
            // Tạo bệnh nhân mới
            setSelectedPatient(null);
            setShowPatientForm(true);
            setPatientForm(prev => ({
                ...prev,
                phone: selectedOption.searchTerm || '',
                fullName: '',
                email: '',
                dateOfBirth: '',
                gender: '',
                address: '',
                medicalHistory: ''
            }));
        } else if (selectedOption) {
            try {
                // Load chi tiết patient từ API
                const response = await axiosInstance.get(`/api/receptionist/patients/${selectedOption.value}`);
                console.log("API RESPONSE:", response); // DEBUG

                if (response && response.success === true && response.data) {
                    setSelectedPatient(response.data);
                    setAppointmentForm(prev => ({
                        ...prev,
                        patientId: selectedOption.value
                    }));
                    setShowPatientForm(false);
                } else if (response && response.status === 204) {
                    showToastMessage('warning', 'Không tìm thấy bệnh nhân này');
                    setSelectedPatient(null);
                    setSelectedPatientOption(null);
                } else {
                    showToastMessage('error', 'Không thể tải thông tin bệnh nhân');
                }
            } catch (error) {
                console.error("Error loading patient details:", error);
                showToastMessage('error', 'Không thể tải thông tin bệnh nhân');
            }
        } else {
            // Clear selection
            setSelectedPatient(null);
            setAppointmentForm(prev => ({ ...prev, patientId: "" }));
            setShowPatientForm(false);
        }
    };

    const filterDoctorsByRoom = () => {
        if (!appointmentForm.roomId) {
            setFilteredDoctors(doctors || []);
            return;
        }

        const filtered = (doctors || []).filter(doctor =>
            doctor.schedules?.some(schedule =>
                schedule.RoomId === parseInt(appointmentForm.roomId)
            )
        );
        setFilteredDoctors(filtered);

        // Reset selected doctor if not available in selected room
        if (appointmentForm.staffId && !filtered.some(d => d.StaffId === parseInt(appointmentForm.staffId))) {
            setAppointmentForm(prev => ({ ...prev, staffId: "", scheduleId: "" }));
        }
    };

    // Validation functions - ĐÃ SỬA: set errors để hiển thị dưới input
    const validatePatientForm = () => {
        const newErrors = {};

        if (!ValidationUtils.validateRequired(patientForm.fullName)) {
            newErrors.fullName = ErrorMessages.REQUIRED;
        } else if (!ValidationUtils.validateName(patientForm.fullName)) {
            newErrors.fullName = ErrorMessages.INVALID_NAME;
        }

        if (!ValidationUtils.validateRequired(patientForm.phone)) {
            newErrors.phone = ErrorMessages.REQUIRED;
        } else if (!ValidationUtils.validatePhone(patientForm.phone)) {
            newErrors.phone = ErrorMessages.INVALID_PHONE;
        }

        if (patientForm.email && !ValidationUtils.validateEmail(patientForm.email)) {
            newErrors.email = ErrorMessages.INVALID_EMAIL;
        }

        if (patientForm.dateOfBirth && !ValidationUtils.validateDateOfBirth(patientForm.dateOfBirth)) {
            newErrors.dateOfBirth = ErrorMessages.INVALID_DATE;
        }

        return newErrors;
    };

    const validateAppointmentForm = () => {
        const newErrors = {};

        if (!appointmentForm.staffId) {
            newErrors.staffId = ErrorMessages.DOCTOR_REQUIRED;
        }

        if (!appointmentForm.roomId) {
            newErrors.roomId = ErrorMessages.ROOM_REQUIRED;
        }

        if (!ValidationUtils.validateRequired(appointmentForm.appointmentDate)) {
            newErrors.appointmentDate = ErrorMessages.REQUIRED;
        } else {
            const appointmentDate = new Date(appointmentForm.appointmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (appointmentDate < today) {
                newErrors.appointmentDate = ErrorMessages.FUTURE_DATE;
            }
        }

        // if (!ValidationUtils.validateRequired(appointmentForm.appointmentTime)) {
        //     newErrors.appointmentTime = ErrorMessages.REQUIRED;
        // } else if (!ValidationUtils.validateAppointmentTime(appointmentForm.appointmentTime, appointmentForm.appointmentDate)) {
        //     newErrors.appointmentTime = ErrorMessages.INVALID_APPOINTMENT_TIME;
        // }

        return newErrors;
    };

    const validateAll = () => {
        const appointmentErrors = validateAppointmentForm();
        let patientErrors = {};

        if (showPatientForm && !selectedPatient) {
            patientErrors = validatePatientForm();
        }

        const allErrors = { ...appointmentErrors, ...patientErrors };
        setErrors(allErrors);

        return Object.keys(allErrors).length === 0;
    };

    // Event handlers
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        resetAllForms();
    };

    const resetAllForms = () => {
        setSelectedAppointment(null);
        setSelectedPatient(null);
        setSelectedPatientOption(null);
        setShowPatientForm(false);
        setErrors({});
        setApiError(null);
        clearAlerts(); // THÊM MỚI: Clear alerts khi reset form

        setAppointmentForm({
            patientId: "",
            staffId: "",
            scheduleId: "",
            roomId: "",
            appointmentDate: new Date().toISOString().split('T')[0],
            appointmentTime: activeTab === 'online'
                ? ""
                : getCurrentTime(),

            notes: "",
            serviceType: "Khám bệnh"
        });

        setPatientForm({
            fullName: "",
            phone: "",
            email: "",
            dateOfBirth: "",
            gender: "",
            address: "",
            medicalHistory: ""
        });

        // Load lại danh sách patients
        loadAllPatients();
    };

    const handleCreateNewPatient = () => {
        setSelectedPatient(null);
        setSelectedPatientOption(null);
        setShowPatientForm(true);
        setErrors({});
    };

    const handleReceivePatient = (appointment) => {
        console.table("CLICKED APPOINTMENT:", appointment);

        const formattedDate = formatDateForInput(appointment.AppointmentDate);
        console.log("Formatted Date:", formattedDate);

        setSelectedAppointment(appointment);

        const patientFromAppointment = {
            UserId: appointment.PatientId,
            PatientId: appointment.PatientId,
            FullName: appointment.PatientName,
            Phone: appointment.Phone,
            Email: appointment.Email,
            DateOfBirth: formatDateForInput(appointment.DayOfBirth || appointment.DateOfBirth),
            Gender: appointment.Gender,
            Address: appointment.Address,
            MedicalHistory: appointment.MedicalHistory
        };

        setSelectedPatient(patientFromAppointment);
        setAppointmentForm(prev => ({
            ...prev,
            patientId: appointment.PatientId,
            appointmentDate: formattedDate,
            appointmentTime: appointment.AppointmentTime || "",
            notes: appointment.Notes || "",
            originalAppointmentId: appointment.AppointmentId
        }));
        setErrors({});
    };
    const checkForAnomalies = async (appointmentData, patientData, receptionType) => {
        clearAlerts();

        try {
            console.log("🔄 Starting anomaly check for:", {
                patientId: appointmentData.patientId,
                appointmentDate: appointmentData.appointmentDate,
                receptionType
            });

            // Lấy dữ liệu THẬT - QUAN TRỌNG: lấy TẤT CẢ status, không chỉ "Đã đặt"
            const today = appointmentData.appointmentDate || new Date().toISOString().split('T')[0];

            let allAppointments = [];
            let allPatients = [];

            try {
                // QUAN TRỌNG: Lấy TẤT CẢ appointments, không chỉ "Đã đặt"
                const appointmentsResponse = await api.getOnlineAppointments("Tất cả", today);
                allAppointments = appointmentsResponse || [];

                // Lấy tất cả patients
                const patientsResponse = await api.getAllPatients();
                allPatients = patientsResponse || [];

                console.log("📊 Real data loaded:", {
                    appointments: allAppointments.length,
                    patients: allPatients.length,
                    appointmentsDetail: allAppointments.map(a => ({
                        id: a.AppointmentId,
                        patientId: a.PatientId,
                        time: a.AppointmentTime,
                        status: a.Status
                    }))
                });
            } catch (error) {
                console.warn("Could not fetch real data for anomaly check:", error);
            }

            // Kiểm tra bất thường với dữ liệu thật
            const alerts = await checkAnomaliesWithRealData(
                appointmentData,
                patientData,
                allAppointments,
                allPatients
            );

            if (alerts.length > 0) {
                console.log("🎯 Alerts found:", alerts);
                setAlerts(alerts);

                const hasErrorAlerts = alerts.some(alert => alert.type === AlertTypes.ERROR);
                setIsConfirmDisabled(hasErrorAlerts);

                if (alerts.length > 0) {
                    showAlertDialog(alerts[0]);
                }

                return true;
            }

            console.log("✅ No anomalies found");
            return false;

        } catch (error) {
            console.error("❌ Error in anomaly check:", error);
            return false;
        }
    };
    const handleCreateAll = async () => {
        if (!validateAll()) {
            return;
        }


        const hasAnomalies = await checkForAnomalies(appointmentForm, patientForm, activeTab);
        if (hasAnomalies) {
            return;
        }

        setLoading(true);
        setApiError(null);

        try {
            const receptionData = {
                appointment: {
                    StaffId: parseInt(appointmentForm.staffId),
                    RoomId: parseInt(appointmentForm.roomId),
                    AppointmentDate: appointmentForm.appointmentDate,
                    AppointmentTime: appointmentForm.appointmentTime,
                    Notes: appointmentForm.notes || "",
                    ServiceType: appointmentForm.serviceType
                },
                receptionType: activeTab,
                existingPatientId: selectedPatient ? (selectedPatient.UserId || selectedPatient.PatientId) : null
            };

            // Thêm bệnh nhân mới nếu cần - SỬA FIELD NAMES
            if (showPatientForm && !selectedPatient) {
                receptionData.patient = {
                    FullName: patientForm.fullName,
                    Phone: patientForm.phone,
                    Email: patientForm.email,
                    DateOfBirth: patientForm.dateOfBirth,
                    Gender: patientForm.gender,
                    Address: patientForm.address,
                    MedicalHistory: patientForm.medicalHistory
                };
            }

            // Thêm ID lịch cũ (online)
            if (activeTab === 'online' && selectedAppointment) {
                receptionData.original_appointment_id = selectedAppointment.AppointmentId;
            }

            console.log("Gửi dữ liệu tiếp nhận:", receptionData);

            const result = await api.completeReception(receptionData);

            if (result && result.success === true) {
                showToastMessage('success', `Đã tiếp nhận thành công! Số thứ tự: ${result.data.queue?.TicketNumber || 'N/A'}`);
                resetAllForms();
                if (activeTab === 'online') {
                    const appointmentsResponse = await api.getOnlineAppointments("Đã đặt");
                    setOnlineAppointments(appointmentsResponse.data || []);
                }
            } else {
                // THÊM MỚI: Bắt lỗi từ API và chuyển thành cảnh báo thông minh
                if (result.error && result.error.includes("phone has already been taken")) {
                    // Tạo alert thông minh thay vì hiển thị lỗi thông thường
                    const duplicateAlert = {
                        code: "DUPLICATE_PATIENT_PHONE",
                        type: "error",
                        title: "Số điện thoại đã tồn tại",
                        message: "Số điện thoại này đã được sử dụng bởi bệnh nhân khác",
                        details: "Vui lòng sử dụng số điện thoại khác hoặc tìm bệnh nhân hiện có trong hệ thống"
                    };

                    setAlerts([duplicateAlert]);
                    setIsConfirmDisabled(true);
                    showAlertDialog(duplicateAlert);
                } else {
                    throw new Error(result.error || "Lỗi không xác định");
                }
            }
        } catch (error) {
            console.error("Error creating reception:", error);
            if (error.response?.data?.error?.includes("phone has already been taken")) {
                const duplicateAlert = {
                    code: "DUPLICATE_PATIENT_PHONE",
                    type: "error",
                    title: "Số điện thoại đã tồn tại",
                    message: "Số điện thoại này đã được sử dụng bởi bệnh nhân khác",
                    details: "Vui lòng sử dụng số điện thoại khác hoặc tìm bệnh nhân hiện có trong hệ thống"
                };

                setAlerts([duplicateAlert]);
                setIsConfirmDisabled(true);
                showAlertDialog(duplicateAlert);
            } else {
                const errorMessage = error.message || "Có lỗi xảy ra khi tiếp nhận bệnh nhân!";
                setApiError(errorMessage);
                showToastMessage('error', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // Utility functions
    const formatDateForInput = (dateString) => {
        if (!dateString) return new Date().toISOString().split('T')[0];

        let date;
        try {
            date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error("Invalid date");
        } catch (error) {
            if (dateString.includes('/')) {
                const [day, month, year] = dateString.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return dateString;
        }

        // Trả về định dạng YYYY-MM-DD
        return date.toISOString().split('T')[0];
    };

    // THÊM MỚI: Component hiển thị alert modal
    const AlertModal = () => {
        if (!currentAlert) return null;

        const getAlertIcon = () => {
            switch (currentAlert.type) {
                case AlertTypes.ERROR:
                    return "bi-exclamation-triangle-fill text-danger";
                case AlertTypes.WARNING:
                    return "bi-exclamation-circle-fill text-warning";
                default:
                    return "bi-info-circle-fill text-info";
            }
        };

        const getAlertTitle = () => {
            switch (currentAlert.type) {
                case AlertTypes.ERROR:
                    return "CẢNH BÁO QUAN TRỌNG";
                case AlertTypes.WARNING:
                    return "CẢNH BÁO HỆ THỐNG";
                default:
                    return "THÔNG BÁO";
            }
        };

        return (
            <div className={`modal fade ${showAlertModal ? 'show d-block' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className={`modal-header ${currentAlert.type === AlertTypes.ERROR ? 'bg-danger text-white' :
                            currentAlert.type === AlertTypes.WARNING ? 'bg-warning text-dark' :
                                'bg-info text-white'
                            }`}>
                            <h5 className="modal-title d-flex align-items-center">
                                <i className={`bi ${getAlertIcon()} me-2`}></i>
                                {getAlertTitle()}
                            </h5>
                            <button type="button" className="btn-close" onClick={hideAlertDialog}></button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-light border">
                                <div className="d-flex">
                                    <i className={`bi ${getAlertIcon()} me-3 fs-4`}></i>
                                    <div>
                                        <h6 className="alert-heading mb-2">{currentAlert.title}</h6>
                                        <p className="mb-0">{currentAlert.message}</p>
                                        {currentAlert.details && (
                                            <div className="mt-2 p-2 bg-white rounded border">
                                                <small className="text-muted">{currentAlert.details}</small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3">
                                <small className="text-muted">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Vui lòng chọn hành động phù hợp:
                                </small>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => handleAlertAction(currentAlert, 'cancel')}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                Hủy tiếp nhận
                            </button>

                            {currentAlert.type === AlertTypes.WARNING && (
                                <button
                                    type="button"
                                    className="btn btn-warning"
                                    onClick={() => handleAlertAction(currentAlert, 'edit')}
                                >
                                    <i className="bi bi-pencil me-1"></i>
                                    Chỉnh sửa thông tin
                                </button>
                            )}

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleAlertAction(currentAlert, 'continue')}
                            >
                                <i className="bi bi-check-circle me-1"></i>
                                Tiếp tục tiếp nhận
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // THÊM MỚI: Component hiển thị alert badge
    const AlertBadge = () => {
        if (alerts.length === 0) return null;

        const errorCount = alerts.filter(alert => alert.type === AlertTypes.ERROR).length;
        const warningCount = alerts.filter(alert => alert.type === AlertTypes.WARNING).length;

        return (
            <div className="alert-badge position-fixed top-0 end-0 m-3" style={{ zIndex: 1060 }}>
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-shield-exclamation text-warning me-2 fs-5"></i>
                            <strong className="me-2">Cảnh báo hệ thống</strong>
                            <span className="badge bg-danger">{errorCount} lỗi</span>
                            {warningCount > 0 && (
                                <span className="badge bg-warning text-dark ms-1">{warningCount} cảnh báo</span>
                            )}
                        </div>
                        <div className="small text-muted">
                            Có {alerts.length} cảnh báo cần xử lý trước khi tiếp nhận
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // UI components - ĐÃ THÊM: renderInputError trở lại
    const renderStatusBadge = (status) => {
        const statusConfig = {
            "Đã đặt": { class: "bg-warning text-dark", icon: "bi-clock" },
            "Đang chờ": { class: "bg-info text-white", icon: "bi-person-waiting" },
            "Đang khám": { class: "bg-primary text-white", icon: "bi-person-check" },
            "Đã khám": { class: "bg-success text-white", icon: "bi-check-circle" },
            "Hủy": { class: "bg-danger text-white", icon: "bi-x-circle" }
        };

        const config = statusConfig[status] || { class: "bg-secondary text-white", icon: "bi-question" };

        return (
            <span className={`badge ${config.class} d-flex align-items-center`}>
                <i className={`bi ${config.icon} me-1`}></i>
                {status}
            </span>
        );
    };

    const renderInputError = (fieldName) => {
        if (!errors[fieldName]) return null;

        return (
            <div className="invalid-feedback d-block">
                <i className="bi bi-exclamation-circle me-1"></i>
                {errors[fieldName]}
            </div>
        );
    };

    const renderReceptionForm = () => {
        const hasDataToShow = selectedAppointment || selectedPatient || showPatientForm;

        if (!hasDataToShow) {
            return (
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                        <i className="bi bi-inbox display-4 text-muted d-block mb-3"></i>
                        <h5 className="text-muted mb-3">Chưa có thông tin tiếp nhận</h5>
                        <p className="text-muted small">
                            {activeTab === 'online'
                                ? 'Chọn một lịch hẹn online để tiếp nhận bệnh nhân'
                                : 'Tìm kiếm hoặc tạo mới bệnh nhân để tiếp nhận'
                            }
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <h6 className="card-title mb-0">
                        <i className="bi bi-person-plus me-2"></i>
                        THÔNG TIN TIẾP NHẬN
                    </h6>
                    <div className="d-flex align-items-center">
                        {/* THÊM MỚI: Hiển thị số cảnh báo */}
                        {alerts.length > 0 && (
                            <span className="badge bg-warning text-dark me-2">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                {alerts.length} cảnh báo
                            </span>
                        )}
                        {loading && (
                            <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card-body">
                    {/* THÊM MỚI: Hiển thị cảnh báo inline */}
                    {alerts.length > 0 && (
                        <div className="alert alert-warning mb-3">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-shield-exclamation me-2 fs-5"></i>
                                <div>
                                    <strong>Hệ thống phát hiện {alerts.length} cảnh báo</strong>
                                    <div className="small mt-1">
                                        Vui lòng xử lý các cảnh báo trước khi tiếp nhận bệnh nhân
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Patient Information Section */}
                    <div className="mb-4">
                        <h6 className="fw-semibold text-primary mb-3">
                            <i className="bi bi-person me-2"></i>
                            THÔNG TIN BỆNH NHÂN
                        </h6>

                        {selectedPatient ? (
                            <div className="border rounded p-3 bg-light">
                                <div className="d-flex align-items-center mb-2">
                                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                                        style={{ width: '50px', height: '50px', fontSize: '16px', fontWeight: 'bold' }}>
                                        {selectedPatient.FullName?.split(' ').pop().charAt(0) || 'P'}
                                    </div>
                                    <div>
                                        <strong className="d-block">{selectedPatient.FullName}</strong>
                                        <small className="text-muted">Mã BN: {selectedPatient.PatientId || selectedPatient.UserId}</small>
                                    </div>
                                </div>
                                <div className="row small">
                                    <div className="col-6"><strong>Ngày sinh:</strong><br />{formatDateFromAPI(selectedPatient.DateOfBirth) || "Chưa cập nhật"}</div>
                                    <div className="col-6"><strong>Giới tính:</strong><br />{selectedPatient.Gender || "Chưa cập nhật"}</div>
                                    <div className="col-12 mt-2"><strong>Điện thoại:</strong><br />{selectedPatient.Phone}</div>
                                    <div className="col-12 mt-2"><strong>Email:</strong><br />{selectedPatient.Email || "Chưa cập nhật"}</div>
                                    <div className="col-12 mt-2"><strong>Địa chỉ:</strong><br />{selectedPatient.Address || "Chưa cập nhật"}</div>
                                </div>
                            </div>
                        ) : showPatientForm && (
                            <div className="border rounded p-3 bg-light">
                                <h6 className="fw-semibold text-warning mb-3">
                                    <i className="bi bi-person-plus me-2"></i>
                                    TẠO TÀI KHOẢN MỚI
                                </h6>
                                <div className="row g-2">
                                    {/* Full Name */}
                                    <div className="col-12">
                                        <label className="form-label small">Họ và tên *</label>
                                        <input
                                            type="text"
                                            className={`form-control form-control-sm ${errors.fullName ? 'is-invalid' : ''}`}
                                            value={patientForm.fullName}
                                            onChange={(e) => {
                                                setPatientForm({ ...patientForm, fullName: e.target.value });
                                                if (errors.fullName) setErrors(prev => ({ ...prev, fullName: null }));
                                            }}
                                            placeholder="Nhập họ và tên đầy đủ"
                                        />
                                        {renderInputError('fullName')}
                                    </div>

                                    {/* Phone */}
                                    <div className="col-6">
                                        <label className="form-label small">Số điện thoại *</label>
                                        <input
                                            type="text"
                                            className={`form-control form-control-sm ${errors.phone ? 'is-invalid' : ''}`}
                                            value={patientForm.phone}
                                            onChange={(e) => {
                                                setPatientForm({ ...patientForm, phone: e.target.value });
                                                if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
                                            }}
                                            placeholder="0912345678"
                                        />
                                        {renderInputError('phone')}
                                    </div>

                                    {/* Date of Birth */}
                                    <div className="col-6">
                                        <label className="form-label small">Ngày sinh</label>
                                        <input
                                            type="date"
                                            className={`form-control form-control-sm ${errors.dateOfBirth ? 'is-invalid' : ''}`}
                                            value={patientForm.dateOfBirth}
                                            onChange={(e) => {
                                                setPatientForm({ ...patientForm, dateOfBirth: e.target.value });
                                                if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: null }));
                                            }}
                                        />
                                        {renderInputError('dateOfBirth')}
                                    </div>

                                    {/* Gender */}
                                    <div className="col-6">
                                        <label className="form-label small">Giới tính</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={patientForm.gender}
                                            onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                                        >
                                            <option value="">Chọn giới tính</option>
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                        </select>
                                    </div>

                                    {/* Email */}
                                    <div className="col-6">
                                        <label className="form-label small">Email</label>
                                        <input
                                            type="email"
                                            className={`form-control form-control-sm ${errors.email ? 'is-invalid' : ''}`}
                                            value={patientForm.email}
                                            onChange={(e) => {
                                                setPatientForm({ ...patientForm, email: e.target.value });
                                                if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                                            }}
                                            placeholder="email@example.com"
                                        />
                                        {renderInputError('email')}
                                    </div>

                                    {/* Address */}
                                    <div className="col-12">
                                        <label className="form-label small">Địa chỉ</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={patientForm.address}
                                            onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                                            placeholder="Nhập địa chỉ"
                                        />
                                    </div>

                                    {/* Medical History */}
                                    <div className="col-12">
                                        <label className="form-label small">Tiền sử bệnh</label>
                                        <textarea
                                            className="form-control form-control-sm"
                                            rows="2"
                                            value={patientForm.medicalHistory}
                                            onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
                                            placeholder="Nhập tiền sử bệnh nếu có..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Appointment Information Section */}
                    <div className="mb-4">
                        <h6 className="fw-semibold text-primary mb-3">
                            <i className="bi bi-calendar-plus me-2"></i>
                            THÔNG TIN LỊCH HẸN
                        </h6>

                        <div className="row g-3">
                            {/* Appointment Date */}
                            <div className="col-6">
                                <label className="form-label small">Ngày khám *</label>
                                <input
                                    type="date"
                                    className={`form-control form-control-sm ${errors.appointmentDate ? 'is-invalid' : ''}`}
                                    value={appointmentForm.appointmentDate}
                                    onChange={(e) => {
                                        setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value });
                                        if (errors.appointmentDate) setErrors(prev => ({ ...prev, appointmentDate: null }));
                                    }}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                {renderInputError('appointmentDate')}
                            </div>

                            {/* Appointment Time */}
                            <div className="col-6">
                                <label className="form-label small">Giờ khám *</label>
                                <input
                                    type="time"
                                    className={`form-control form-control-sm ${errors.appointmentTime ? 'is-invalid' : ''}`}
                                    value={appointmentForm.appointmentTime}
                                    onChange={(e) => {
                                        setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value });
                                        if (errors.appointmentTime) setErrors(prev => ({ ...prev, appointmentTime: null }));
                                    }}
                                />
                                {renderInputError('appointmentTime')}
                            </div>

                            {/* Room Selection */}
                            <div className="col-12">
                                <label className="form-label small">Phòng khám *</label>
                                <select
                                    className={`form-select form-select-sm ${errors.roomId ? 'is-invalid' : ''}`}
                                    value={appointmentForm.roomId}
                                    onChange={(e) => {
                                        setAppointmentForm({ ...appointmentForm, roomId: e.target.value, staffId: "" });
                                        if (errors.roomId) setErrors(prev => ({ ...prev, roomId: null }));
                                    }}
                                >
                                    <option value="">Chọn phòng khám</option>
                                    {rooms.map(room => (
                                        <option key={room.RoomId} value={room.RoomId}>
                                            {room.RoomName}
                                        </option>
                                    ))}
                                </select>
                                {renderInputError('roomId')}
                            </div>

                            {/* Doctor Selection */}
                            <div className="col-12">
                                <label className="form-label small">Bác sĩ *</label>
                                <select
                                    className={`form-select form-select-sm ${errors.staffId ? 'is-invalid' : ''}`}
                                    value={appointmentForm.staffId}
                                    onChange={(e) => {
                                        setAppointmentForm({ ...appointmentForm, staffId: e.target.value });
                                        if (errors.staffId) setErrors(prev => ({ ...prev, staffId: null }));
                                    }}
                                    disabled={!appointmentForm.roomId}
                                >
                                    <option value="">{appointmentForm.roomId ? 'Chọn bác sĩ' : 'Chọn phòng trước'}</option>
                                    {filteredDoctors.map(doctor => (
                                        <option key={doctor.StaffId} value={doctor.StaffId}>
                                            {doctor.FullName} - {doctor.Specialty}
                                        </option>
                                    ))}
                                </select>
                                {renderInputError('staffId')}
                                {appointmentForm.roomId && filteredDoctors.length === 0 && (
                                    <div className="text-warning small mt-1">
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        Không có bác sĩ nào trong phòng này hôm nay
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="col-12">
                                <label className="form-label small">Ghi chú</label>
                                <textarea
                                    className="form-control form-control-sm"
                                    rows="2"
                                    value={appointmentForm.notes}
                                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                                    placeholder="Ghi chú về tình trạng bệnh nhân..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-grid gap-2">
                        <button
                            className="btn btn-success"
                            onClick={handleCreateAll}
                            disabled={loading || !appointmentForm.staffId || !appointmentForm.roomId || isConfirmDisabled}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-circle me-2"></i>
                                    {isConfirmDisabled ? 'VUI LÒNG XỬ LÝ CẢNH BÁO' : 'XÁC NHẬN TIẾP NHẬN'}
                                </>
                            )}
                        </button>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={resetAllForms}
                            disabled={loading}
                        >
                            <i className="bi bi-arrow-left me-2"></i>
                            QUAY LẠI
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Filter appointments for online tab
    const filteredAppointments = (onlineAppointments || []).filter(appointment => {
        if (!appointment) return false;

        const matchesSearch = appointment.PatientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            appointment.PatientId?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
            appointment.Phone?.includes(searchTerm);

        const matchesStatus = filterStatus === "Tất cả" || appointment.Status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    // Hiển thị lỗi API nếu có
    if (apiError) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-danger">
                    <h4 className="alert-heading">Lỗi hệ thống</h4>
                    <p>{apiError}</p>
                    <button className="btn btn-primary" onClick={initializeData}>
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Loading Component - HIỆN KHI CÓ LOADING */}
            <Loading isLoading={loading} />

            {/* Toast Notification */}
            {showToast && (
                <CustomToast
                    type={toastConfig.type}
                    message={toastConfig.message}
                    onClose={hideToast}
                />
            )}

            {/* Confirm Modal */}
            <ConfirmDeleteModal
                isOpen={showConfirmModal}
                title={confirmModalConfig.title}
                message={confirmModalConfig.message}
                onConfirm={confirmModalConfig.onConfirm}
                onCancel={hideConfirmDialog}
            />

            {/* THÊM MỚI: Alert Modal */}
            <AlertModal />

            {/* THÊM MỚI: Alert Badge */}
            <AlertBadge />

            <div className="container-fluid py-4">
                <div className="row">
                    <div className="col-12">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">
                                    <i className="bi bi-person-plus me-2"></i>
                                    TIẾP NHẬN BỆNH NHÂN
                                </h5>
                                <div className="btn-group" role="group">
                                    <button
                                        className={`btn ${activeTab === 'online' ? 'btn-light' : 'btn-outline-light'}`}
                                        onClick={() => handleTabChange('online')}
                                    >
                                        <i className="bi bi-calendar-check me-2"></i>
                                        LỊCH HẸN ONLINE
                                    </button>
                                    <button
                                        className={`btn ${activeTab === 'direct' ? 'btn-light' : 'btn-outline-light'}`}
                                        onClick={() => handleTabChange('direct')}
                                    >
                                        <i className="bi bi-person-plus me-2"></i>
                                        TIẾP NHẬN TRỰC TIẾP
                                    </button>
                                </div>
                            </div>

                            <div className="card-body">
                                {/* Online Appointments Tab */}
                                {activeTab === 'online' && (
                                    <div className="row">
                                        <div className="col-lg-7">
                                            <div className="card border-0 shadow-sm mb-4">
                                                <div className="card-body">
                                                    {/* Search and filter section */}
                                                    <div className="row mb-4">
                                                        <div className="col-md-6">
                                                            <div className="input-group">
                                                                <span className="input-group-text bg-light border-end-0">
                                                                    <i className="bi bi-search text-muted"></i>
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    className="form-control border-start-0"
                                                                    placeholder="Tìm kiếm theo tên, mã BN, số điện thoại..."
                                                                    value={searchTerm}
                                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <select
                                                                className="form-select"
                                                                value={filterStatus}
                                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                            >
                                                                <option value="Tất cả">Tất cả trạng thái</option>
                                                                <option value="Đã đặt">Đã đặt</option>
                                                                <option value="Đang chờ">Đang chờ</option>
                                                                <option value="Đã khám">Đã khám</option>
                                                                <option value="Hủy">Hủy</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Thống kê nhanh */}
                                                    <div className="row mb-4">
                                                        <div className="col-12">
                                                            <div className="d-flex flex-wrap gap-3">
                                                                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                                                                    <span className="text-primary fw-bold me-1">{onlineAppointments?.length || 0}</span>
                                                                    <span className="text-muted">Tổng lịch hẹn</span>
                                                                </div>
                                                                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                                                                    <span className="text-warning fw-bold me-1">
                                                                        {(onlineAppointments || []).filter(a => a?.Status === "Đã đặt").length}
                                                                    </span>
                                                                    <span className="text-muted">Chờ tiếp nhận</span>
                                                                </div>
                                                                <div className="d-flex align-items-center bg-light rounded px-3 py-2">
                                                                    <span className="text-success fw-bold me-1">
                                                                        {(onlineAppointments || []).filter(a => a?.Status === "Đang chờ").length}
                                                                    </span>
                                                                    <span className="text-muted">Đã tiếp nhận</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Appointments table */}
                                                    <div className="table-responsive">
                                                        <table className="table table-hover align-middle">
                                                            <thead className="table-light">
                                                                <tr>
                                                                    <th style={{ width: '50px' }}>#</th>
                                                                    <th>Thông tin bệnh nhân</th>
                                                                    <th style={{ width: '120px' }}>Giờ hẹn</th>
                                                                    <th>Bác sĩ</th>
                                                                    <th style={{ width: '120px' }}>Trạng thái</th>
                                                                    <th style={{ width: '150px' }}>Thao tác</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {filteredAppointments.map((appointment, index) => (
                                                                    <tr key={appointment.AppointmentId}>
                                                                        <td>
                                                                            <div className="fw-bold text-primary">{index + 1}</div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="d-flex align-items-center">
                                                                                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                                                                                    style={{ width: '40px', height: '40px', fontSize: '14px', fontWeight: 'bold' }}>
                                                                                    {appointment.PatientName?.split(' ').pop().charAt(0) || 'P'}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="fw-semibold">
                                                                                        {appointment.PatientName}
                                                                                    </div>
                                                                                    <div className="text-muted small">
                                                                                        <div>Mã BN: {appointment.PatientId}</div>
                                                                                        <div>ĐT: {appointment.Phone}</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <span className="fw-bold text-primary bg-light px-2 py-1 rounded d-block text-center">
                                                                                {appointment.AppointmentTime}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            <div className="fw-medium">{appointment.DoctorName}</div>
                                                                        </td>
                                                                        <td>
                                                                            {renderStatusBadge(appointment.Status)}
                                                                        </td>
                                                                        <td>
                                                                            {appointment.Status === "Đã đặt" && (
                                                                                <button
                                                                                    className="btn btn-sm btn-success d-flex align-items-center"
                                                                                    onClick={() => handleReceivePatient(appointment)}
                                                                                >
                                                                                    <i className="bi bi-person-check me-1"></i>
                                                                                    Tiếp nhận
                                                                                </button>
                                                                            )}
                                                                            {appointment.Status === "Đang chờ" && (
                                                                                <button className="btn btn-sm btn-outline-success" disabled>
                                                                                    <i className="bi bi-check2 me-1"></i>
                                                                                    Đã tiếp nhận
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {filteredAppointments.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan="6" className="text-center py-4">
                                                                            <div className="text-muted">
                                                                                <i className="bi bi-inbox display-4 d-block mb-2"></i>
                                                                                Không tìm thấy lịch hẹn nào.
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-lg-5">
                                            {renderReceptionForm()}
                                        </div>
                                    </div>
                                )}

                                {/* Direct Reception Tab - ĐÃ THÊM LOADING */}
                                {activeTab === 'direct' && (
                                    <div className="row">
                                        <div className="col-lg-5">
                                            <div className="card border-0 shadow-sm mb-4">
                                                <div className="card-header bg-info text-white">
                                                    <h6 className="card-title mb-0">
                                                        <i className="bi bi-search me-2"></i>
                                                        TÌM KIẾM BỆNH NHÂN
                                                    </h6>
                                                </div>
                                                <div className="card-body">
                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold">Tìm kiếm bệnh nhân</label>
                                                        <Select
                                                            options={patientOptions}
                                                            value={selectedPatientOption}
                                                            onChange={handlePatientSelect}
                                                            onInputChange={handlePatientSearch}
                                                            placeholder="Nhập tên, số điện thoại hoặc email để tìm kiếm..."
                                                            noOptionsMessage={() => "Không tìm thấy bệnh nhân nào"}
                                                            loadingMessage={() => "Đang tìm kiếm..."}
                                                            isClearable
                                                            isSearchable
                                                            isLoading={isSearchingPatients}
                                                            styles={{
                                                                control: (base) => ({
                                                                    ...base,
                                                                    fontSize: '14px',
                                                                    minHeight: '42px'
                                                                }),
                                                                menu: (base) => ({
                                                                    ...base,
                                                                    fontSize: '14px'
                                                                }),
                                                                option: (base, { data }) => ({
                                                                    ...base,
                                                                    backgroundColor: data.isCreateNew ? '#fff3cd' : base.backgroundColor,
                                                                    color: data.isCreateNew ? '#856404' : base.color,
                                                                    fontWeight: data.isCreateNew ? 'bold' : base.fontWeight
                                                                })
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Hướng dẫn sử dụng */}
                                                    <div className="alert alert-info">
                                                        <h6 className="alert-heading mb-2">
                                                            <i className="bi bi-info-circle me-2"></i>
                                                            Hướng dẫn sử dụng
                                                        </h6>
                                                        <ul className="mb-0 small">
                                                            <li>Nhập tên, số điện thoại hoặc email để tìm kiếm</li>
                                                            <li>Chọn bệnh nhân từ danh sách xổ xuống</li>
                                                            <li>Nếu không tìm thấy, chọn option "Tạo bệnh nhân mới"</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-lg-7">
                                            {renderReceptionForm()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ReceptionistPatent;