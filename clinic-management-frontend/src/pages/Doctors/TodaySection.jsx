import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  ListGroup,
  Form,
  Table,
  Row,
  Col,
  Button,
  Badge,
  Toast,
  ToastContainer,
  Modal,
  Spinner,
} from "react-bootstrap";
// import Swal from 'sweetalert2';
import PrescriptionModalContent from './PrescriptionModalContent';

const API_BASE_URL = 'http://localhost:8000';

const TodaySection = ({
  currentSection = "today",
  prescriptionRows = [],
  setPrescriptionRows = () => { },
  removePrescription = () => { },
  editPrescription = () => { },
  symptoms = "",
  setSymptoms = () => { },
  diagnosis = "",
  setDiagnosis = () => { },
  tests = { test1: false, test2: false, test3: true },
  setTests = () => { },
  requestedTests = {},
  setRequestedTests = () => { },
  openPrescriptionModal = () => { },
  handleTempSave = () => { },
  selectedTodayPatient = null,
  setSelectedTodayPatient = () => { },
}) => {
  const [todayPatients, setTodayPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", variant: "" });
  const [showModal, setShowModal] = useState(false);
  const [defaultData, setDefaultData] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const printRef = useRef(null);
  const cache = useRef(new Map());
  const debounceRef = useRef(null);

  // 🧠 AI Gợi ý thuốc và dịch vụ dựa trên chẩn đoán
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [serviceSuggestions, setServiceSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false); // Loading cho thuốc
  const [serviceLoading, setServiceLoading] = useState(false); // Loading cho dịch vụ

  useEffect(() => {
    if (!diagnosis || diagnosis.length < 3) {
      setAiSuggestions([]);
      setServiceSuggestions([]);
      return;
    }

    // Gợi ý thuốc
    setAiLoading(true);
    const timeoutMedicine = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/doctor/ai/suggestion?diagnosis=${encodeURIComponent(diagnosis)}&type=medicine`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setAiSuggestions(data);
        } else {
          throw new Error("Dữ liệu gợi ý thuốc không phải mảng JSON");
        }
      } catch (err) {
        console.error("AI suggestion error (medicine):", err);
        setToast({
          show: true,
          message: `Lỗi gợi ý thuốc: ${err.message}`,
          variant: "danger",
        });
        setAiSuggestions([]);
      } finally {
        setAiLoading(false);
      }
    }, 800);

    // Gợi ý dịch vụ
    setServiceLoading(true);
    const timeoutService = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/doctor/ai/suggestion?diagnosis=${encodeURIComponent(diagnosis)}&type=service`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setServiceSuggestions(data);
        } else {
          throw new Error("Dữ liệu gợi ý dịch vụ không phải mảng JSON");
        }
      } catch (err) {
        console.error("Service suggestion error:", err);
        setToast({
          show: true,
          message: `Lỗi gợi ý dịch vụ: ${err.message}`,
          variant: "danger",
        });
        setServiceSuggestions([]);
      } finally {
        setServiceLoading(false);
      }
    }, 800);

    return () => {
      clearTimeout(timeoutMedicine);
      clearTimeout(timeoutService);
    };
  }, [diagnosis]);



  const isFormDisabled = selectedTodayPatient && selectedTodayPatient?.status === 'Đang khám' ? false : true;

  const testLabels = {
    test1: "Xét nghiệm công thức máu",
    test2: "Chụp X-quang phổi",
    test3: "Nội soi tai mũi họng"
  };

  const getStatusVariant = (status) => {
    if (!status) return "secondary";

    // Hỗ trợ cả tiếng Việt và tiếng Anh
    switch (status.toLowerCase()) {
      case "done":
      case "đã khám":
        return "success"; // Màu xanh

      case "in-progress":
      case "đang khám":
        return "info"; // Màu xanh dương nhạt

      case "waiting":
      case "đang chờ":
      case "chờ khám":
        return "warning"; // Màu vàng

      default:
        return "secondary"; // Màu xám
    }
  };

  const getStatusText = (status) => {
    if (!status) return "";
    // Nếu backend gửi tiếng Việt thì hiển thị nguyên văn
    if (["Đã khám", "Đang khám", "Đang chờ"].includes(status)) return status;

    // Nếu backend gửi mã tiếng Anh thì map sang tiếng Việt
    switch (status.toLowerCase()) {
      case "done":
        return "Đã khám";
      case "in-progress":
        return "Đang khám";
      case "waiting":
        return "Đang chờ";
      default:
        return status;
    }
  };

  // ✅ Filter chỉ 3 trạng thái ở frontend
  const filterValidStatuses = (patients) => {
    const validStatuses = ["Đã khám", "Đang khám", "Đang chờ"];
    return patients.filter(patient => validStatuses.includes(getStatusText(patient.status)));
  };

  const handleTestChange = (key) => (e) => {
    setTests({ ...tests, [key]: e.target.checked });
  };

  // Fetch todayPatients từ API (tương tự AdminMedicine)
  const fetchTodayPatients = useCallback(async () => {
    if (cache.current.has('today-patients')) {
      const data = cache.current.get('today-patients');
      setTodayPatients(filterValidStatuses(data)); // ✅ Filter sau khi lấy data
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/doctor/today-patients`, {
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const filteredData = filterValidStatuses(data); // ✅ Filter chỉ 3 trạng thái
        cache.current.set('today-patients', data); // Cache data gốc
        setTodayPatients(filteredData);
      } catch (error) {
        console.error('Error fetching today patients:', error);
        setToast({
          show: true,
          message: `Lỗi khi tải danh sách bệnh nhân: ${error.message}`,
          variant: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  // Load data khi component mount
  useEffect(() => {
    fetchTodayPatients();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchTodayPatients]);

  // ✅ Hàm tìm bệnh nhân tiếp theo gần nhất (trạng thái "Đang chờ", thời gian gần nhất sau bệnh nhân hiện tại)
  const findNextPatient = useCallback((currentPatientId, patients) => {
    if (!currentPatientId || !patients.length) return null;

    // Parse thời gian để so sánh (giả sử time là string 'HH:MM')
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const currentTime = parseTime(patients.find(p => p.id === currentPatientId)?.time || '00:00');

    // Lọc bệnh nhân "Đang chờ", thời gian > currentTime, sắp xếp theo thời gian asc
    const waitingPatientsAfter = patients
      .filter(p => getStatusText(p.status) === 'Đang chờ' && parseTime(p.time) > currentTime)
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));

    return waitingPatientsAfter[0] || null; // Trả về bệnh nhân đầu tiên (gần nhất)
  }, []);

  // ✅ Implement handleExaminationSubmit: Submit dữ liệu, update status, chọn next patient
  const handleExaminationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTodayPatient) {
      setToast({ show: true, message: "⚠️ Chưa chọn bệnh nhân.", variant: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        symptoms,
        diagnosis,
        tests: { ...tests }, // Các tests được chọn
        prescriptions: [...prescriptionRows], // Danh sách thuốc
        status: 'done', // Update status thành done
      };

      const response = await fetch(`${API_BASE_URL}/api/doctor/examinations/${selectedTodayPatient.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Submit thành công:', result);

      // Reset form sau submit
      setSymptoms('');
      setDiagnosis('');
      setTests({ test1: false, test2: false, test3: false });
      setRequestedTests({});
      setPrescriptionRows([]);

      // Refetch todayPatients để cập nhật status mới
      await fetchTodayPatients();

      // Tìm và chọn bệnh nhân tiếp theo
      const nextPatient = findNextPatient(selectedTodayPatient.id, todayPatients);
      if (nextPatient) {
        setSelectedTodayPatient(nextPatient);
        setToast({
          show: true,
          message: `✅ Hoàn tất khám cho ${selectedTodayPatient.name}. Đã chuyển sang bệnh nhân tiếp theo: ${nextPatient.name}.`,
          variant: "success",
        });
      } else {
        setSelectedTodayPatient(null);
        setToast({
          show: true,
          message: `✅ Hoàn tất khám cho ${selectedTodayPatient.name}. Không còn bệnh nhân chờ khám hôm nay.`,
          variant: "success",
        });
      }
    } catch (error) {
      console.error('Error submitting examination:', error);
      setToast({
        show: true,
        message: `Lỗi khi hoàn tất khám: ${error.message}`,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Nút yêu cầu dịch vụ
  const handleRequestService = () => {
    const selected = Object.keys(tests).filter((k) => tests[k]);
    if (selected.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Bạn chưa chọn dịch vụ nào.",
        variant: "warning",
      });
      return;
    }

    const updated = { ...requestedTests };
    selected.forEach((key) => (updated[key] = true));
    setRequestedTests(updated);

    setToast({
      show: true,
      message: "✅ Đã gửi yêu cầu thực hiện dịch vụ cận lâm sàng.",
      variant: "success",
    });
  };

  // ✅ Render checkbox có dấu “Đã yêu cầu ✅”
  const renderService = (label, key) => (
    <div className="d-flex justify-content-between align-items-center mb-2">
      <Form.Check
        type="checkbox"
        label={label}
        checked={tests[key]}
        onChange={handleTestChange(key)}
        disabled={isFormDisabled}
      />
      {requestedTests[key] && (
        <Badge bg="success" pill className="ms-2">
          ✅ Đã yêu cầu
        </Badge>
      )}
    </div>
  );

  // Xử lý xóa với SweetAlert2 confirm
  const handleRemoveWithConfirm = async (index) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: 'Bạn có chắc chắn muốn xóa thuốc này khỏi đơn?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Có, xóa!',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      removePrescription(index);
      setToast({
        show: true,
        message: "✅ Đã xóa thuốc khỏi đơn.",
        variant: "success",
      });
    }
  };

  // Mở modal thêm thuốc mới
  const handleOpenAddModal = () => {
    setDefaultData(null);
    setEditIndex(null);
    setShowModal(true);
  };

  // Mở modal sửa thuốc
  const handleEdit = (index) => {
    const medicineToEdit = prescriptionRows[index];
    setDefaultData(medicineToEdit);
    setEditIndex(index);
    setShowModal(true);
  };

  // Xử lý submit từ modal (thêm hoặc sửa)
  const handleModalSubmit = (submittedData) => {
    if (editIndex !== null) {
      editPrescription(submittedData, editIndex);
      setToast({
        show: true,
        message: `✅ Đã cập nhật thuốc "${submittedData.medicine}".`,
        variant: "success",
      });
    } else {
      setPrescriptionRows([...prescriptionRows, submittedData]);
      setToast({
        show: true,
        message: `✅ Đã thêm thuốc "${submittedData.medicine}".`,
        variant: "success",
      });
    }
    setShowModal(false);
    setDefaultData(null);
    setEditIndex(null);
  };

  // Xử lý close modal
  const handleModalClose = () => {
    setShowModal(false);
    setDefaultData(null);
    setEditIndex(null);
  };

  // Hàm in tài liệu
  const printDocument = (type) => {
    if (!selectedTodayPatient) {
      setToast({
        show: true,
        message: "⚠️ Chưa chọn bệnh nhân.",
        variant: "warning",
      });
      return;
    }

    const { name: patientName, age, gender, phone } = selectedTodayPatient;
    const currentSymptoms = symptoms;
    const currentDiagnosis = diagnosis;
    const codePrefix = type === 'service' ? 'DV' : 'TT';
    const code = codePrefix + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const date = new Date().toLocaleDateString('vi-VN');
    const doctor = 'Trần Thị B';

    let title = '';
    let tableHtml = '';
    let extraSection = '';
    let footerLeft = 'Bệnh nhân';
    let footerRight = 'Bác sĩ chỉ định';

    if (type === 'service') {
      title = 'PHIẾU CHỈ ĐỊNH DỊCH VỤ CẬN LÂM SÀNG';
      const selectedTests = Object.entries(tests)
        .filter(([key, value]) => value)
        .map(([key]) => testLabels[key]);
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên dịch vụ</th>
              <th>Ghi chú</th>
              <th>Tổng tiền</th>
            </tr>
          </thead>
          <tbody>
            ${selectedTests.length > 0
          ? selectedTests
            .map((test, i) => `
                    <tr>
                      <td style="text-align:center;">${i + 1}</td>
                      <td>${test}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  `)
            .join('')
          : '<tr><td colspan="4" style="text-align:center;">Không có dịch vụ nào được chọn</td></tr>'
        }
          </tbody>
        </table>
      `;
    } else if (type === 'prescription') {
      title = 'TOA THUỐC';
      extraSection = `
        <div class="diagnosis-section">
          <p><strong>Triệu chứng:</strong> ${currentSymptoms}</p>
          <p><strong>Chẩn đoán:</strong> ${currentDiagnosis}</p>
        </div>
      `;
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên thuốc</th>
              <th>Số lượng</th>
              <th>Liều dùng</th>
            </tr>
          </thead>
          <tbody>
            ${prescriptionRows.length > 0
          ? prescriptionRows
            .map((row, i) => `
                    <tr>
                      <td style="text-align:center;">${i + 1}</td>
                      <td>${row.medicine}</td>
                      <td>${row.quantity}</td>
                      <td>${row.dosage}</td>
                    </tr>
                  `)
            .join('')
          : '<tr><td colspan="4" style="text-align:center;">Không có thuốc nào được kê</td></tr>'
        }
          </tbody>
        </table>
      `;
      footerRight = 'Bác sĩ kê đơn';
    }

    const html = `
      <div class="container">
        <div class="header">
          <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="Logo">
          <h2>PHÒNG KHÁM XYZ</h2>
          <p>Địa chỉ: Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM</p>
          <p>Điện thoại: 024.3574.7788 — MST: 0100688738</p>
        </div>
        <div class="title">
          <h3>${title}</h3>
        </div>
        <div class="info">
          <div>
            <p><strong>Họ tên BN:</strong> ${patientName}</p>
            <p><strong>Tuổi:</strong> ${age}</p>
            <p><strong>Giới tính:</strong> ${gender}</p>
          </div>
          <div>
            <p><strong>Mã ${type === 'service' ? 'phiếu' : 'toa'}:</strong> ${code}</p>
            <p><strong>Ngày lập:</strong> ${date}</p>
            <p><strong>Bác sĩ:</strong> ${doctor}</p>
          </div>
        </div>
        ${extraSection}
        ${tableHtml}
        <div class="footer">
          <div>
            <p><strong>${footerLeft}</strong></p>
            <p>(Ký, ghi rõ họ tên)</p>
            <p class="name">&nbsp;</p>
          </div>
          <div>
            <p><strong>${footerRight}</strong></p>
            <p>(Ký, ghi rõ họ tên)</p>
            <p class="name">${doctor}</p>
          </div>
        </div>
      </div>
      <style>
        body {
          font-family: "Times New Roman", serif;
          background: #fefefe;
          margin: 40px;
          color: #000;
        }
        .container {
          border: 2px solid #000;
          padding: 30px 40px;
          border-radius: 6px;
          max-width: 700px;
          margin: auto;
          background: #fff;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header img {
          width: 80px;
          height: auto;
          margin-bottom: 5px;
        }
        .header h2 {
          margin: 5px 0;
          font-size: 22px;
          text-transform: uppercase;
        }
        .header p {
          margin: 2px 0;
          font-size: 13px;
          color: #333;
        }
        .title {
          text-align: center;
          margin: 25px 0;
        }
        .title h3 {
          font-size: 20px;
          margin: 0;
          text-decoration: underline;
          font-weight: bold;
        }
        .info {
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .info p { margin: 3px 0; }
        .diagnosis-section {
          margin-bottom: 20px;
          font-size: 14px;
        }
        .diagnosis-section p {
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 14px;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px 10px;
          text-align: left;
        }
        th {
          background: #f3f3f3;
          text-align: center;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          font-size: 14px;
          text-align: center;
        }
        .footer div {
          width: 45%;
        }
        .footer p {
          margin: 4px 0;
        }
        .footer .name {
          margin-top: 50px;
          font-style: italic;
        }
      </style>
    `;

    if (printRef.current) {
      printRef.current.innerHTML = html;
    }
    window.print();
    setTimeout(() => {
      if (printRef.current) {
        printRef.current.innerHTML = '';
      }
    }, 1000);
  };

  // Render danh sách bệnh nhân từ API (đã filter ở state)
  const renderPatientList = () => (
    <ListGroup variant="flush" className="patient-list">
      {isLoading ? (
        <ListGroup.Item className="text-center">
          <Spinner animation="border" size="sm" />
          <p className="mt-2 text-muted">Đang tải danh sách bệnh nhân...</p>
        </ListGroup.Item>
      ) : todayPatients.length === 0 ? (
        <ListGroup.Item className="text-center text-muted">
          Không có lịch hẹn hôm nay
        </ListGroup.Item>
      ) : (
        todayPatients.map((patient, index) => (
          <ListGroup.Item
            key={patient.id || index}
            action
            active={selectedTodayPatient?.id === patient.id}
            onClick={() => setSelectedTodayPatient(selectedTodayPatient?.id === patient.id ? null : patient)}
            className={getStatusVariant(patient.status)}
          >
            <div className="d-flex w-100 justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">{patient.time} - {patient.name}</h6>
                <small>{patient.age} tuổi, {patient.gender} | {patient.phone}</small>
              </div>
              <Badge bg={getStatusVariant(patient.status)}>
                {getStatusText(patient.status)}
              </Badge>
            </div>
          </ListGroup.Item>
        ))
      )}
    </ListGroup>
  );

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-content, #print-content * { visibility: visible; }
          #print-content { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className={`section ${currentSection === "today" ? "active" : ""}`} id="today">
        <Row>
          {/* Danh sách bệnh nhân từ API */}
          <Col md={4}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white text-start">
                <h5 className="mb-0">Danh sách khám ({new Date().toLocaleDateString('vi-VN')})</h5>
              </Card.Header>
              <Card.Body className="p-0">
                {renderPatientList()}
              </Card.Body>
            </Card>
          </Col>

          {/* Form khám */}
          <Col md={8}>
            <Card className="shadow-sm">
              <Card.Header className="bg-info text-white text-start">
                <h5 className="mb-0">Thông Tin Khám Bệnh</h5>
              </Card.Header>
              <Card.Body>
                <p className="card-text text-start">
                  {selectedTodayPatient ? (
                    <>
                      <strong>Bệnh nhân:</strong> {selectedTodayPatient.name} -{" "}
                      <strong>Tuổi:</strong> {selectedTodayPatient.age} -{" "}
                      <strong>Giới tính:</strong> {selectedTodayPatient.gender} -{" "}
                      <strong>SĐT:</strong> {selectedTodayPatient.phone} -{" "}
                      <strong>Giờ:</strong> {selectedTodayPatient.time} -{" "}
                      <strong>Trạng thái:</strong>{" "}
                      {getStatusText(selectedTodayPatient.status)}
                    </>
                  ) : (
                    <span className="text-muted">Chưa chọn bệnh nhân nào</span>
                  )}
                </p>
                <hr />

                <Form onSubmit={handleExaminationSubmit}>
                  <Row>
                    {/* 1. Chẩn đoán */}
                    <Col md={12}>
                      <Card className="mb-3 border-light shadow-sm">
                        <Card.Header className="text-start fw-bold">
                          1. Chẩn đoán
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3 text-start">
                            <Form.Label>Triệu chứng</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              value={symptoms}
                              onChange={(e) => setSymptoms(e.target.value)}
                              disabled={isFormDisabled}
                            />
                          </Form.Group>
                          <Form.Group className="mb-3 text-start">
                            <Form.Label>Chẩn đoán sơ bộ</Form.Label>
                            <Form.Control
                              type="text"
                              value={diagnosis}
                              onChange={(e) => setDiagnosis(e.target.value)}
                              disabled={isFormDisabled}
                            />
                            {aiLoading && (
                              <div className="text-center mt-2">
                                <Spinner animation="border" size="sm" /> Đang tải gợi ý...
                              </div>
                            )}
                            {aiSuggestions.length > 0 && (
                              <div className="ai-suggestions">
                                <h6>🧠 Gợi ý thuốc phù hợp:</h6>
                                <ul className="mb-0">
                                  {aiSuggestions.map((item, i) => (
                                    <li key={i}>
                                      <div className="medicine-info">
                                        <b>{item.MedicineName}</b> — <i>{item.Reason}</i>
                                      </div>
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        className="ms-2"
                                        onClick={() => {
                                          const existingItem = prescriptionRows.find(row => row.medicine === item.MedicineName);
                                          if (existingItem) {
                                            // Nếu thuốc đã tồn tại, tăng quantity
                                            const updatedRows = prescriptionRows.map(row =>
                                              row.medicine === item.MedicineName
                                                ? { ...row, quantity: row.quantity + 1 }
                                                : row
                                            );
                                            setPrescriptionRows(updatedRows);
                                          } else {
                                            // Nếu chưa tồn tại, thêm hàng mới với quantity = 1
                                            setPrescriptionRows(prev => [...prev, { medicine: item.MedicineName, quantity: 1, dosage: '' }]);
                                          }
                                          setToast({ show: true, message: `✅ Đã thêm "${item.MedicineName}" vào toa thuốc.`, variant: "success" });
                                        }}
                                      >
                                        + Thêm
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>


                    {/* 2. Chỉ định dịch vụ */}
                    <Col md={12}>
                      <Card className="mb-3 border-light shadow-sm">
                        <Card.Header className="text-start fw-bold">
                          2. Chỉ định dịch vụ cận lâm sàng
                        </Card.Header>
                        <Card.Body className="text-start">
                          <Form.Group className="mb-3">
                            {serviceSuggestions.length > 0 && (
                              <div className="ai-suggestions mb-3">
                                <h6>🩺 Gợi ý dịch vụ phù hợp:</h6>
                                <ul className="mb-0">
                                  {serviceSuggestions.map((service, i) => (
                                    <li key={i}>
                                      <div className="medicine-info">
                                        <b>{service.ServiceName}</b> — <i>{service.Reason || "Đề xuất dựa trên chẩn đoán"}</i>
                                      </div>
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="ms-2"
                                        onClick={() => {
                                          const serviceKey = Object.keys(testLabels).find(key => testLabels[key] === service.ServiceName);
                                          if (serviceKey) {
                                            setTests(prev => ({ ...prev, [serviceKey]: !prev[serviceKey] })); // Toggle checkbox
                                            setToast({
                                              show: true,
                                              message: `✅ Đã ${!tests[serviceKey] ? 'chọn' : 'bỏ chọn'} dịch vụ "${service.ServiceName}".`,
                                              variant: "success",
                                            });
                                          }
                                        }}
                                      >
                                        {tests[Object.keys(testLabels).find(key => testLabels[key] === service.ServiceName)] ? "✓ Đã chọn" : "+ Chọn"}
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {serviceLoading && (
                              <div className="text-center mt-2">
                                <Spinner animation="border" size="sm" /> Đang tải gợi ý dịch vụ...
                              </div>
                            )}
                            {Object.entries(testLabels).map(([key, label]) => renderService(label, key))}
                          </Form.Group>

                          <div className="text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={handleRequestService}
                              disabled={isFormDisabled || Object.values(tests).every(v => !v)}
                              className="no-print"
                            >
                              🧾 Yêu cầu thực hiện dịch vụ đã chọn
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => printDocument('service')}
                              disabled={!selectedTodayPatient || !Object.values(tests).some(Boolean)}
                              className="no-print ms-2"
                            >
                              🖨️ Xuất chỉ định dịch vụ
                            </Button>
                          </div>

                          <hr />
                          <p>
                            <strong>Kết quả (nếu có):</strong>{" "}
                            <a href="#">Xem file đính kèm...</a>
                          </p>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* 3. Kê đơn thuốc */}
                    <Col md={12}>
                      <Card className="mb-3 border-light shadow-sm">
                        <Card.Header className="text-start fw-bold">
                          3. Kê đơn thuốc
                        </Card.Header>
                        <Card.Body className="text-start">
                          <Table striped bordered hover responsive>
                            <thead>
                              <tr>
                                <th>Tên thuốc</th>
                                <th>Số lượng</th>
                                <th>Liều dùng</th>
                                <th>Hành động</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prescriptionRows.map((row, index) => (
                                <tr key={index}>
                                  <td>{row.medicine}</td>
                                  <td>{row.quantity}</td>
                                  <td>{row.dosage}</td>
                                  <td>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleRemoveWithConfirm(index)}
                                      disabled={isFormDisabled}
                                    >
                                      Xóa
                                    </Button>
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      className="ms-2"
                                      onClick={() => handleEdit(index)}
                                      disabled={isFormDisabled}
                                    >
                                      Sửa
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                          <Button
                            variant="link"
                            onClick={handleOpenAddModal}
                            className="text-decoration-none fw-bold"
                            disabled={isFormDisabled}
                          >
                            + Thêm thuốc vào đơn
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-start gap-2 mt-3">
                    <Button
                      variant="success"
                      type="submit"
                      disabled={isFormDisabled || isLoading}
                      className="no-print"
                    >
                      {isLoading ? <Spinner animation="border" size="sm" /> : null}
                      Hoàn Tất & Lưu Hồ Sơ
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleTempSave}
                      disabled={isFormDisabled}
                      className="no-print"
                    >
                      Tạm Lưu
                    </Button>
                    <Button
                      variant="outline-success"
                      onClick={() => printDocument('prescription')}
                      disabled={!selectedTodayPatient || prescriptionRows.length === 0}
                      className="no-print"
                    >
                      🖨️ Xuất toa thuốc
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Modal cho thêm/sửa thuốc */}
        <Modal show={showModal} onHide={handleModalClose} centered size="md">
          <Modal.Header closeButton>
            <Modal.Title>
              {defaultData ? 'Sửa thông tin thuốc' : 'Thêm thuốc mới'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <PrescriptionModalContent
              onSubmit={handleModalSubmit}
              onClose={handleModalClose}
              defaultData={defaultData}
            />
          </Modal.Body>
        </Modal>

        {/* Toast */}
        <ToastContainer position="bottom-end" className="p-3">
          <Toast
            bg={toast.variant}
            onClose={() => setToast({ ...toast, show: false })}
            show={toast.show}
            delay={2500}
            autohide
          >
            <Toast.Body className="text-white fw-semibold text-start">
              {toast.message}
            </Toast.Body>
          </Toast>
        </ToastContainer>

        {/* Print content div */}
        <div id="print-content" ref={printRef} style={{ display: 'none' }} />
      </div>
    </>
  );
};

export default TodaySection;