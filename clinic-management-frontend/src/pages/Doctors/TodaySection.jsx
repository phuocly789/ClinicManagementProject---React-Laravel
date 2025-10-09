// import { editableInputTypes } from "@testing-library/user-event/dist/utils";
import React, { useState, useRef } from "react";
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
} from "react-bootstrap";
import PrescriptionModalContent from './PrescriptionModalContent'; // Giả sử đường dẫn đến component modal

const TodaySection = ({
  currentSection = "today",
  prescriptionRows = [],
  removePrescription = () => { },
  editPrescription = () => { },
  symptoms = "",
  setSymptoms = () => { },
  diagnosis = "",
  setDiagnosis = () => { },
  tests = { test1: false, test2: false, test3: true },
  setTests = () => { },
  openPrescriptionModal = () => { }, // Giữ prop cũ nếu cần, nhưng giờ dùng internal modal
  handleExaminationSubmit = (e) => e.preventDefault(),
  handleTempSave = () => { },
  selectedTodayPatient = null,
  setSelectedTodayPatient = () => { },
}) => {
  const [requestedTests, setRequestedTests] = useState({});
  const [toast, setToast] = useState({ show: false, message: "", variant: "" });
  const [showModal, setShowModal] = useState(false);
  const [defaultData, setDefaultData] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const printRef = useRef(null);

  const testLabels = {
    test1: "Xét nghiệm công thức máu",
    test2: "Chụp X-quang phổi",
    test3: "Nội soi tai mũi họng"
  };

  const todayPatients = [
    { time: "09:30", name: "Nguyễn Văn An", status: "done", age: 35, gender: "Nam", phone: "0912345678" },
    { time: "09:45", name: "Trần Thị Mỹ Linh", status: "in-progress", active: true, age: 28, gender: "Nữ", phone: "0987654321" },
    { time: "10:00", name: "Phạm Hùng Dũng", status: "waiting", age: 40, gender: "Nam", phone: "0934567890" },
    { time: "10:15", name: "Lê Văn Tú", status: "waiting", age: 25, gender: "Nam", phone: "0901234567" },
    { time: "10:30", name: "Hoàng Thị Mai", status: "waiting", age: 32, gender: "Nữ", phone: "0971234567" },
  ];

  const getStatusVariant = (status) => {
    switch (status) {
      case "done":
        return "secondary";
      case "in-progress":
        return "info";
      case "waiting":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "done":
        return "Đã khám";
      case "in-progress":
        return "Đang khám";
      case "waiting":
        return "Đang chờ";
      default:
        return "";
    }
  };

  const handleTestChange = (key) => (e) => {
    setTests({ ...tests, [key]: e.target.checked });
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
        disabled={!selectedTodayPatient}
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

  // Mở modal sửa thuốc (tái tạo form với dữ liệu cũ, không confirm ở đây nữa)
  const handleEdit = (index) => {
    const medicineToEdit = prescriptionRows[index];
    setDefaultData(medicineToEdit);
    setEditIndex(index);
    setShowModal(true);
  };

  // Xử lý submit từ modal (thêm hoặc sửa)
  const handleModalSubmit = (submittedData) => {
    if (editIndex !== null) {
      // Chế độ sửa: Gọi editPrescription với data mới và index
      editPrescription(submittedData, editIndex);
      setToast({
        show: true,
        message: `✅ Đã cập nhật thuốc "${submittedData.medicine}".`,
        variant: "success",
      });
    } else {
      // Chế độ thêm mới: Gọi prop để thêm (giả sử prop xử lý add)
      // Nếu không có prop add, bạn có thể thêm logic ở đây nếu prescriptionRows là state
      // Ví dụ: setPrescriptionRows([...prescriptionRows, submittedData]);
      openPrescriptionModal(submittedData); // Hoặc gọi prop khác nếu có
      setToast({
        show: true,
        message: `✅ Đã thêm thuốc "${submittedData.medicine}".`,
        variant: "success",
      });
    }
    setShowModal(false);
  };

  // Xử lý close modal (confirm nếu có thay đổi sẽ được xử lý trong PrescriptionModalContent)
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

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div
        className={`section ${currentSection === "today" ? "active" : ""}`}
        id="today"
      >
        <Row>
          {/* Danh sách bệnh nhân */}
          <Col md={4}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-primary text-white text-start">
                <h5 className="mb-0">Danh sách khám (23-09-2025)</h5>
              </Card.Header>
              <ListGroup variant="flush" className="patient-list">
                {todayPatients.map((patient, index) => (
                  <ListGroup.Item
                    key={index}
                    action
                    className={`patient-item ${selectedTodayPatient?.name === patient.name ? "active" : ""
                      }`}
                    onClick={() => setSelectedTodayPatient(patient)}
                  >
                    <div className="d-flex w-100 justify-content-between align-items-center">
                      <h6 className="mb-0 text-start">
                        <strong>{patient.time}</strong> - {patient.name}
                      </h6>
                      <Badge bg={getStatusVariant(patient.status)}>
                        {getStatusText(patient.status)}
                      </Badge>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
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
                              disabled={!selectedTodayPatient}
                            />
                          </Form.Group>
                          <Form.Group className="mb-3 text-start">
                            <Form.Label>Chẩn đoán sơ bộ</Form.Label>
                            <Form.Control
                              type="text"
                              value={diagnosis}
                              onChange={(e) => setDiagnosis(e.target.value)}
                              disabled={!selectedTodayPatient}
                            />
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
                            {renderService("Xét nghiệm công thức máu", "test1")}
                            {renderService("Chụp X-quang phổi", "test2")}
                            {renderService("Nội soi tai mũi họng", "test3")}
                          </Form.Group>

                          <div className="text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={handleRequestService}
                              disabled={!selectedTodayPatient}
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
                                      disabled={!selectedTodayPatient}
                                    >
                                      Xóa
                                    </Button>

                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      className="ms-2"
                                      onClick={() => handleEdit(index)}
                                      disabled={!selectedTodayPatient}
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
                            disabled={!selectedTodayPatient}
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
                      disabled={!selectedTodayPatient}
                      className="no-print"
                    >
                      Hoàn Tất & Lưu Hồ Sơ
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleTempSave}
                      disabled={!selectedTodayPatient}
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