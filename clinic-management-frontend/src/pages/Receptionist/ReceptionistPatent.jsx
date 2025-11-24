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
    },

    validateAppointmentTimeSlot: (time) => {
        if (!time) return true;
        const timeSlots = generateTimeSlots();
        return timeSlots.includes(time);
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
    PATIENT_REQUIRED: "Vui lòng chọn hoặc tạo bệnh nhân",
    INVALID_APPOINTMENT_TIME_SLOT: "Thời gian hẹn phải là một trong các khung giờ: 7:00, 7:30, 8:00, ..., 16:30",
    TIMESLOT_FULL: "Khung giờ này đã đầy, vui lòng chọn khung giờ khác"
};

const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 16; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 16) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }
    slots.push('16:30');
    return slots;
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
    const [isAutoSelecting, setIsAutoSelecting] = useState(false);

    // Modal states
    const [showToast, setShowToast] = useState(false);
    const [toastConfig, setToastConfig] = useState({ type: 'success', message: '' });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({});

    // React Select states
    const [patientOptions, setPatientOptions] = useState([]);
    const [selectedPatientOption, setSelectedPatientOption] = useState(null);
    const [isSearchingPatients, setIsSearchingPatients] = useState(false);
    // Thêm state cho availableTimeSlots (trong component)
    const [availableTimeSlots, setAvailableTimeSlots] = useState(generateTimeSlots().map(time => ({ time, available: 10 })));

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
    const [timeSlotCache, setTimeSlotCache] = useState({});
    // Thêm hàm tìm khung giờ gần nhất
    const findNearestTimeSlot = (currentTime) => {
        const timeSlots = generateTimeSlots();

        // Chuyển currentTime sang phút để so sánh
        const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        let nearestSlot = timeSlots[0];
        let minDifference = Infinity;

        for (const slot of timeSlots) {
            const [slotHours, slotMinutes] = slot.split(':').map(Number);
            const slotTotalMinutes = slotHours * 60 + slotMinutes;

            // Tính khoảng cách thời gian
            const difference = slotTotalMinutes - currentTotalMinutes;

            // Chỉ xét các khung giờ trong tương lai (difference >= 0)
            if (difference >= 0 && difference < minDifference) {
                minDifference = difference;
                nearestSlot = slot;
            }
        }

        // Nếu không tìm thấy khung giờ nào trong tương lai, chọn khung giờ đầu tiên
        return minDifference === Infinity ? timeSlots[0] : nearestSlot;
    };

    // Thêm hàm kiểm tra và tự động chọn khung giờ
    const autoSelectTimeSlot = async (date, roomId, staffId) => {
        if (!date) return;
        setIsAutoSelecting(true);
        const currentTime = new Date().toTimeString().slice(0, 5); // Lấy giờ hiện tại
        const nearestSlot = findNearestTimeSlot(currentTime);

        // Kiểm tra xem khung giờ gần nhất có available không
        try {
            const availability = await checkTimeSlotAvailability(nearestSlot, date, roomId, staffId);

            if (!availability.isFull) {
                // Nếu còn chỗ, tự động chọn
                setAppointmentForm(prev => ({
                    ...prev,
                    appointmentTime: nearestSlot
                }));
            } else {
                // Nếu đầy, tìm khung giờ gần nhất còn chỗ
                const allSlots = generateTimeSlots();
                const currentIndex = allSlots.indexOf(nearestSlot);

                // Tìm từ khung giờ hiện tại về sau
                for (let i = currentIndex; i < allSlots.length; i++) {
                    const slot = allSlots[i];
                    const slotAvailability = await checkTimeSlotAvailability(slot, date, roomId, staffId);

                    if (!slotAvailability.isFull) {
                        setAppointmentForm(prev => ({
                            ...prev,
                            appointmentTime: slot
                        }));
                        return;
                    }
                }

                // Nếu không tìm thấy khung giờ nào còn chỗ, chọn khung giờ đầu tiên
                setAppointmentForm(prev => ({
                    ...prev,
                    appointmentTime: allSlots[0]
                }));
            }
        } catch (error) {
            console.error("Error auto-selecting time slot:", error);
            // Nếu có lỗi, vẫn chọn khung giờ gần nhất
            setAppointmentForm(prev => ({
                ...prev,
                appointmentTime: nearestSlot
            }));
        } finally {
            setIsAutoSelecting(false); // KẾT THÚC LOADING
        }
    };

    const checkTimeSlotsBatch = async (times, date, roomId, staffId) => {
        try {
            const response = await axiosInstance.get('/api/receptionist/appointments/counts-by-timeslots', {
                params: {
                    date: date,
                    times: times,
                    room_id: roomId,
                    staff_id: staffId
                }
            });

            if (response.data && response.data.success === true) {
                return times.map(time => response.data.data[time] || {
                    count: 0, maxCapacity: 10, available: 10, isFull: false
                });
            }

            throw new Error('API batch response error');

        } catch (error) {
            console.error("Batch API error:", error);
            // Fallback: dùng API cũ cho từng cái
            const individualResults = [];
            for (const time of times) {
                const result = await checkTimeSlotAvailability(time, date, roomId, staffId);
                individualResults.push(result);
            }
            return individualResults;
        }
    };

    // Thêm hàm kiểm tra số lượng bệnh nhân trong khung giờ (dựa trên dữ liệu local)
    const checkTimeSlotAvailability = async (time, date, roomId = null, staffId = null) => {
        try {
            const response = await axiosInstance.get('/api/receptionist/appointments/count-by-timeslot', {
                params: {
                    time: time,
                    date: date,
                    room_id: roomId,
                    staff_id: staffId
                }
            });

            if (response && response.success === true) {
                return response.data;
            } else {
                throw new Error(response?.message || 'Lỗi không xác định');
            }
        } catch (error) {
            console.error("Error checking time slot availability:", error);
            // Trả về giá trị mặc định nếu có lỗi
            return {
                count: 0,
                maxCapacity: 10,
                available: 10,
                isFull: false
            };
        }
    };
    // Cập nhật hàm loadAvailableTimeSlots để dùng API batch
    const loadAvailableTimeSlots = async (date, roomId, staffId) => {
        if (!date) {
            setAvailableTimeSlots(generateTimeSlots().map(time => ({
                time,
                available: 10,
                isFull: false
            })));
            return;
        }

        try {
            const allSlots = generateTimeSlots();

            // THAY ĐỔI Ở ĐÂY: Dùng API batch thay vì từng cái
            const slotResults = await checkTimeSlotsBatch(allSlots, date, roomId, staffId);

            const availableSlots = allSlots.map((slot, index) => ({
                time: slot,
                available: slotResults[index].available,
                isFull: slotResults[index].isFull
            }));

            setAvailableTimeSlots(availableSlots);
        } catch (error) {
            console.error("Error loading available time slots:", error);
            setAvailableTimeSlots(generateTimeSlots().map(time => ({
                time,
                available: 10,
                isFull: false
            })));
        }
    };
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

    // API Calls với error handling và loading
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

    useEffect(() => {
        if (!appointmentForm.appointmentDate || !appointmentForm.roomId || !appointmentForm.staffId) return;

        loadAvailableTimeSlots(
            appointmentForm.appointmentDate,
            appointmentForm.roomId,
            appointmentForm.staffId
        );
    }, [
        appointmentForm.appointmentDate,
        appointmentForm.roomId,
        appointmentForm.staffId
    ]);

    useEffect(() => {
        if (!appointmentForm.appointmentDate ||
            !appointmentForm.roomId ||
            !appointmentForm.staffId ||
            appointmentForm.appointmentTime // đã có time thì KHÔNG chạy
        ) return;

        autoSelectTimeSlot(
            appointmentForm.appointmentDate,
            appointmentForm.roomId,
            appointmentForm.staffId
        );
    }, [
        appointmentForm.appointmentDate,
        appointmentForm.roomId,
        appointmentForm.staffId
    ]);

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
            setIsSearchingPatients(true);
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
        } finally {
            setIsSearchingPatients(false);
        }
    };

    // Tìm kiếm bệnh nhân với React Select
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
                setIsSearchingPatients(true);
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
            } finally {
                setIsSearchingPatients(false);
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

    // Validation functions
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

    const validateAppointmentForm = async () => {
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

        if (!ValidationUtils.validateRequired(appointmentForm.appointmentTime)) {
            newErrors.appointmentTime = ErrorMessages.REQUIRED;
        } else if (!ValidationUtils.validateAppointmentTimeSlot(appointmentForm.appointmentTime)) {
            newErrors.appointmentTime = ErrorMessages.INVALID_APPOINTMENT_TIME_SLOT;
        } else if (appointmentForm.appointmentDate) {
            // Kiểm tra capacity thông qua API
            try {
                const availability = await checkTimeSlotAvailability(
                    appointmentForm.appointmentTime,
                    appointmentForm.appointmentDate,
                    appointmentForm.roomId,
                    appointmentForm.staffId
                );

                if (availability.isFull) {
                    newErrors.appointmentTime = ErrorMessages.TIMESLOT_FULL;
                }
            } catch (error) {
                console.error("Error validating time slot:", error);
                // Nếu có lỗi khi check API, vẫn cho phép tiếp tục
            }
        }

        return newErrors;
    };

    const validateAll = async () => {
        const appointmentErrors = await validateAppointmentForm();
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

    const handleCreateAll = async () => {
        if (!(await validateAll())) {
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

            // Thêm bệnh nhân mới nếu cần
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
                throw new Error(result.error || "Lỗi không xác định");
            }
        } catch (error) {
            console.error("Error creating reception:", error);
            const errorMessage = error.message || "Có lỗi xảy ra khi tiếp nhận bệnh nhân!";
            setApiError(errorMessage);
            showToastMessage('error', errorMessage);
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

    // UI components
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
                        {loading && (
                            <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card-body">
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
                                <div className="input-group">
                                    <select
                                        className={`form-control form-control-sm ${errors.appointmentTime ? 'is-invalid' : ''}`}
                                        value={appointmentForm.appointmentTime}
                                        onChange={(e) => {
                                            setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value });
                                            if (errors.appointmentTime) setErrors(prev => ({ ...prev, appointmentTime: null }));
                                        }}
                                    >
                                        <option value="">Chọn giờ khám</option>
                                        {availableTimeSlots.map((slot) => (
                                            <option
                                                key={slot.time}
                                                value={slot.time}
                                                disabled={slot.isFull}
                                                className={slot.isFull ? 'text-danger' : ''}
                                            >
                                                {slot.time} {slot.isFull ? '(Đã đầy)' : `(${slot.available} chỗ trống)`}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                        onClick={async () => {
                                            await autoSelectTimeSlot(
                                                appointmentForm.appointmentDate,
                                                appointmentForm.roomId,
                                                appointmentForm.staffId
                                            );
                                        }}
                                        disabled={!appointmentForm.appointmentDate || isAutoSelecting}
                                        title="Tự động chọn khung giờ gần nhất còn chỗ"
                                    >
                                        {isAutoSelecting ? (
                                            <div className="text-primary small mt-1">
                                                <span className="spinner-border spinner-border-sm me-1"></span>
                                                Đang tự động chọn khung giờ phù hợp...
                                            </div>
                                        ) : (
                                            <i className="bi bi-clock"></i>
                                        )}
                                    </button>

                                </div>
                                {renderInputError('appointmentTime')}
                                <div className="form-text">
                                    <small>Khung giờ làm việc: 7:00 - 16:30, mỗi khung giờ tối đa 10 bệnh nhân</small>
                                </div>
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
                            disabled={loading || !appointmentForm.staffId || !appointmentForm.roomId}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-circle me-2"></i>
                                    XÁC NHẬN TIẾP NHẬN
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
            {/* Loading Component */}
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

                                {/* Direct Reception Tab */}
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