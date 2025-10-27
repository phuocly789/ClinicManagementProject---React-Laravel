// PDFEditorPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Modal } from 'react-bootstrap';

// Utility function để tạo HTML cho in ấn
const generatePrintHtml = (
  type,
  patient,
  symptoms = '',
  diagnosis = '',
  tests = {},
  prescriptionRows = [],
  testLabels = {},
  settings = {}
) => {
  if (!patient) {
    throw new Error('Patient data is required for printing.');
  }

  console.log('Patient data in generatePrintHtml:', patient);
  console.log('PrescriptionRows in generatePrintHtml:', prescriptionRows);

  const { name: patientName, age, gender, phone, address } = patient;
  const codePrefix = type === 'service' ? 'DV' : 'TT';
  const code = codePrefix + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const date = new Date().toLocaleDateString('vi-VN');
  const doctor = settings.doctorName || 'Trần Thị B';

  // Function to convert number to Vietnamese text
  const numberToVietnameseText = (num) => {
    const units = ['', 'nghìn', 'triệu', 'tỷ'];
    const numbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const readThreeDigits = (num) => {
      let str = '';
      const hundred = Math.floor(num / 100);
      const ten = Math.floor((num % 100) / 10);
      const unit = num % 10;
      if (hundred > 0) str += numbers[hundred] + ' trăm ';
      if (ten > 1) str += numbers[ten] + ' mươi ';
      else if (ten === 1) str += 'mười ';
      if (unit > 0) {
        if (ten === 0 && hundred > 0) str += 'lẻ ';
        if (ten > 1 && unit === 5) str += 'lăm ';
        else if (ten > 0 && unit === 1) str += 'mốt ';
        else str += numbers[unit] + ' ';
      }
      return str.trim();
    };
    if (num === 0) return 'không đồng';
    let result = '';
    let unitIndex = 0;
    while (num > 0) {
      const threeDigits = num % 1000;
      if (threeDigits > 0) {
        result = readThreeDigits(threeDigits) + ' ' + units[unitIndex] + ' ' + result;
      }
      num = Math.floor(num / 1000);
      unitIndex++;
    }
    return result.trim() + ' đồng';
  };

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
            <th>Đơn giá</th>
            <th>Thành tiền</th>
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
                    <td></td>
                  </tr>
                `)
          .join('')
        : '<tr><td colspan="4" style="text-align:center;">Không có dịch vụ nào được chọn</td></tr>'
      }
          ${selectedTests.length > 0
        ? `
              <tr>
                <td colspan="4" style="text-align:right;">Cộng số tiền thanh toán:</td>
                <td>${0} VNĐ</td>
              </tr>
              <tr>
                <td colspan="5" style="text-align:left;">Số tiền viết thành chữ: ${numberToVietnameseText(0)}</td>
              </tr>
            `
        : ''
      }
        </tbody>
      </table>
    `;
  } else if (type === 'prescription') {
    title = settings.customTitle || 'TOA THUỐC';
    extraSection = `
      <div class="diagnosis-section">
        <p><strong>Triệu chứng:</strong> ${symptoms}</p>
        <p><strong>Chẩn đoán:</strong> ${diagnosis}</p>
      </div>
    `;
    const totalPayment = prescriptionRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);
    console.log('Total Payment calculated:', totalPayment);
    tableHtml = `
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên thuốc</th>
            <th>Số lượng</th>
            <th>Liều dùng</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
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
                    <td style="text-align:right;">${(row.unitPrice || 0).toLocaleString()} VNĐ</td>
                    <td style="text-align:right;">${(row.totalPrice || 0).toLocaleString()} VNĐ</td>
                  </tr>
                `)
          .join('')
        : '<tr><td colspan="6" style="text-align:center;">Không có thuốc nào được kê</td></tr>'
      }
          ${prescriptionRows.length > 0
        ? `
              <tr>
                <td colspan="5" style="text-align:right; font-weight:bold;">Cộng số tiền thanh toán:</td>
                <td style="text-align:right; font-weight:bold;">${totalPayment.toLocaleString()} VNĐ</td>
              </tr>
              <tr>
                <td colspan="6" style="text-align:left; font-style:italic;">Số tiền viết thành chữ: ${numberToVietnameseText(totalPayment)}</td>
              </tr>
            `
        : ''
      }
        </tbody>
      </table>
    `;
    footerRight = 'Bác sĩ kê đơn';
  } else {
    throw new Error('Invalid type: must be "service" or "prescription"');
  }

  const html = `
    <div class="container">
      ${settings.watermark?.enabled ? `
        <div class="watermark">
          <div class="watermark-text">${settings.watermark.text}</div>
        </div>
      ` : ''}
      <div class="header">
        <h2>${settings.clinicName || 'PHÒNG KHÁM XYZ'}</h2>
        <p>${settings.clinicAddress || 'Địa chỉ: Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM'}</p>
        <p>${settings.clinicPhone || 'Điện thoại: 024.3574.7788'} — ${settings.clinicTax || 'MST: 0100688738'}</p>
      </div>
      <div class="title">
        <h3>${title}</h3>
      </div>
      <div class="info">
        <div>
          <p><strong>Họ tên BN:</strong> ${patientName}</p>
          <p><strong>Tuổi:</strong> ${age}</p>
          <p><strong>Giới tính:</strong> ${gender}</p>
          <p><strong>Địa chỉ:</strong> ${address || 'Chưa có thông tin'}</p>
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
        font-family: "${settings.fontFamily || 'Times New Roman'}", serif;
        background: #fefefe;
        margin: 40px;
        color: #000;
        font-size: ${settings.fontSize || '14px'};
      }
      .container {
        border: 2px solid #000;
        padding: 30px 40px;
        border-radius: 6px;
        max-width: 700px;
        margin: auto;
        background: #fff;
        position: relative;
        overflow: hidden;
      }
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(${settings.watermark?.rotation || -45}deg);
        opacity: ${settings.watermark?.opacity || 0.1};
        z-index: 0;
        pointer-events: none;
      }
      .watermark-text {
        font-size: ${settings.watermark?.fontSize || 48}px;
        color: ${settings.watermark?.color || '#cccccc'};
        font-weight: bold;
        white-space: nowrap;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
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
        position: relative;
        z-index: 1;
      }
      .title h3 {
        font-size: 20px;
        margin: 0;
        font-weight: bold;
      }
      .info {
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        position: relative;
        z-index: 1;
      }
      .info p { margin: 3px 0; }
      .diagnosis-section {
        margin-bottom: 20px;
        font-size: 14px;
        position: relative;
        z-index: 1;
      }
      .diagnosis-section p {
        margin: 5px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        font-size: 14px;
        position: relative;
        z-index: 1;
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
      td {
        text-align: right;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
        font-size: 14px;
        text-align: center;
        position: relative;
        z-index: 1;
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

  return html;
};

const PDFEditorPage = () => {
  const API_BASE_URL = 'http://localhost:8000';

  const [pdfData, setPdfData] = useState(null);
  const [previewHTML, setPreviewHTML] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Cài đặt PDF với các tùy chọn mới
  const [pdfSettings, setPdfSettings] = useState({
    // Clinic information
    clinicName: 'PHÒNG KHÁM XYZ',
    clinicAddress: 'Địa chỉ: Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
    clinicPhone: 'Điện thoại: 024.3574.7788',
    clinicTax: 'MST: 0100688738',
    doctorName: 'Trần Thị B',

    // Watermark
    watermark: {
      text: 'MẪU BẢN QUYỀN',
      enabled: false,
      opacity: 0.1,
      fontSize: 48,
      color: '#cccccc',
      rotation: -45
    },
    // Font settings
    fontFamily: 'Times New Roman',
    fontSize: '14px',

    // Custom title
    customTitle: 'TOA THUỐC'
  });

  // Form data state
  const [formData, setFormData] = useState({
    patient_name: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    appointment_date: '',
    appointment_time: '',
    doctor_name: '',
    diagnosis: '',
    instructions: 'Uống thuốc theo chỉ dẫn. Tái khám nếu cần.'
  });

  // Load data từ sessionStorage khi component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = sessionStorage.getItem('pdfPreviewData');
        const prescriptionRows = sessionStorage.getItem('prescriptionRows');
        const selectedPatient = sessionStorage.getItem('selectedPatient');

        if (!savedData) {
          setError('Không tìm thấy dữ liệu để hiển thị');
          setIsLoading(false);
          return;
        }

        const parsedData = JSON.parse(savedData);
        setPdfData(parsedData);

        // Khởi tạo form data
        const patientData = JSON.parse(selectedPatient || '{}');
        setFormData({
          patient_name: parsedData.patient_name || patientData.name || '',
          age: parsedData.age || patientData.age || '',
          gender: parsedData.gender || patientData.gender || '',
          phone: parsedData.phone || patientData.phone || '',
          address: patientData.address || '',
          appointment_date: parsedData.appointment_date || '',
          appointment_time: parsedData.appointment_time || '',
          doctor_name: parsedData.doctor_name || pdfSettings.doctorName,
          diagnosis: parsedData.diagnoses?.[0]?.Diagnosis || parsedData.diagnosis || '',
          instructions: 'Uống thuốc theo chỉ dẫn. Tái khám nếu cần.'
        });

        // Load preview HTML
        await loadPreviewHTML(parsedData);

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Lỗi khi tải dữ liệu: ' + err.message);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load preview HTML sử dụng generatePrintHtml
  const loadPreviewHTML = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const prescriptionRows = JSON.parse(sessionStorage.getItem('prescriptionRows') || '[]');

      const patientInfo = {
        name: formData.patient_name,
        age: formData.age,
        gender: formData.gender,
        phone: formData.phone,
        address: formData.address
      };

      const html = generatePrintHtml(
        'prescription',
        patientInfo,
        data.symptoms || '',
        formData.diagnosis,
        {},
        prescriptionRows,
        {},
        pdfSettings
      );

      setPreviewHTML(html);

    } catch (err) {
      console.error('Error loading preview:', err);
      setError('Lỗi tải preview: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    setFormData(updatedFormData);

    // Update preview với data mới
    if (pdfData) {
      loadPreviewHTML(pdfData);
    }
  };

  // Handle settings changes
  const handleSettingsChange = (category, field, value) => {
    if (category === 'watermark') {
      const updatedSettings = {
        ...pdfSettings,
        watermark: {
          ...pdfSettings.watermark,
          [field]: value
        }
      };
      setPdfSettings(updatedSettings);
    } else {
      const updatedSettings = {
        ...pdfSettings,
        [field]: value
      };
      setPdfSettings(updatedSettings);
    }

    // Reload preview với settings mới
    if (pdfData) {
      loadPreviewHTML(pdfData);
    }
  };

  // Download PDF
  // Download PDF - GỬI SETTINGS LÊN BACKEND
  const handleDownloadPDF = async () => {
    if (!pdfData) return;

    setIsSaving(true);
    try {
      const prescriptionRows = JSON.parse(sessionStorage.getItem('prescriptionRows') || '[]');

      // TẠO DATA GỬI LÊN BACKEND VỚI SETTINGS
      const printData = {
        type: 'prescription',
        patient_name: formData.patient_name || 'N/A',
        age: String(formData.age || 'N/A'),
        gender: formData.gender || 'N/A',
        phone: formData.phone || 'N/A',
        address: formData.address || 'N/A',
        appointment_date: formData.appointment_date || new Date().toLocaleDateString('vi-VN'),
        appointment_time: formData.appointment_time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        doctor_name: formData.doctor_name || pdfSettings.doctorName,
        prescriptions: [
          {
            details: prescriptionRows.map(row => ({
              medicine: row.medicine || 'N/A',
              quantity: parseInt(row.quantity) || 1,
              dosage: row.dosage || 'N/A',
              unitPrice: parseFloat(row.unitPrice) || 0,
            })),
          },
        ],
        diagnoses: formData.diagnosis ? [{ Diagnosis: formData.diagnosis }] : [],
        symptoms: pdfData.symptoms || '',

        // QUAN TRỌNG: GỬI SETTINGS LÊN BACKEND
        pdf_settings: pdfSettings
      };

      console.log('🎨 Sending to backend with settings:', pdfSettings);

      // GỬI REQUEST ĐẾN API CÓ THẬT
      const response = await fetch(`${API_BASE_URL}/api/print/prescription/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(printData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TOA_THUOC_${formData.patient_name || 'benh_nhan'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('✅ Xuất toa thuốc thành công!');
        console.log('✅ PDF downloaded with settings');
      } else {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error(errorText || `Lỗi server: ${response.status}`);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('❌ Lỗi khi xuất toa thuốc: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save settings
  const handleSaveSettings = () => {
    localStorage.setItem('pdfSettings', JSON.stringify(pdfSettings));
    setShowSettings(false);
    alert('✅ Đã lưu cài đặt!');

    // Reload preview với settings mới
    if (pdfData) {
      loadPreviewHTML(pdfData);
    }
  };

  // Load settings từ localStorage khi component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('pdfSettings');
    if (savedSettings) {
      setPdfSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Quay lại trang trước
  const handleBack = () => {
    window.close();
  };

  if (isLoading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3">Đang tải editor PDF...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center min-vh-100">
        <Alert variant="danger" className="text-center">
          <h4>❌ Lỗi</h4>
          <p>{error}</p>
          <Button variant="primary" onClick={handleBack}>
            Quay lại
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">
                <i className="bi bi-file-earmark-pdf text-primary"></i> Editor Toa Thuốc
              </h1>
              <p className="text-muted mb-0">Chỉnh sửa và tùy biến toa thuốc trước khi tải về</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" onClick={() => setShowSettings(true)}>
                <i className="bi bi-gear"></i> Cài đặt
              </Button>
              <Button variant="outline-secondary" onClick={handleBack}>
                <i className="bi bi-arrow-left"></i> Quay lại
              </Button>
              <Button
                variant="success"
                onClick={handleDownloadPDF}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download me-2"></i>
                    Tải PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Main Content - 2 Columns */}
      <Row className="g-4">
        {/* Left Column - Controls */}
        <Col md={4}>
          <Card className="h-100 shadow">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-sliders"></i> Thông tin toa thuốc
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-3">

                {/* Patient Information */}
                <div>
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-person-badge"></i> Thông tin bệnh nhân
                  </h6>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Họ tên bệnh nhân</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.patient_name}
                      onChange={(e) => handleInputChange('patient_name', e.target.value)}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Tuổi</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.age}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Giới tính</label>
                      <select
                        className="form-select"
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Số điện thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Địa chỉ</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                </div>

                {/* Appointment Information */}
                <div>
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-calendar-check"></i> Thông tin lịch hẹn
                  </h6>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Ngày khám</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.appointment_date}
                      onChange={(e) => handleInputChange('appointment_date', e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Giờ khám</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.appointment_time}
                      onChange={(e) => handleInputChange('appointment_time', e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Bác sĩ điều trị</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.doctor_name}
                      onChange={(e) => handleInputChange('doctor_name', e.target.value)}
                    />
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-clipboard-check"></i> Thông tin y tế
                  </h6>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Chẩn đoán</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.diagnosis}
                      onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Preview */}
        <Col md={8}>
          <Card className="h-100 shadow">
            <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-eye"></i> Preview Toa Thuốc
              </h5>
              <span className="badge bg-light text-dark">Real-time</span>
            </Card.Header>
            <Card.Body className="p-0">
              {previewHTML ? (
                <div
                  className="pdf-preview-content"
                  style={{
                    height: 'calc(100vh - 200px)',
                    overflow: 'auto',
                    backgroundColor: 'white'
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                />
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-file-earmark-pdf text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-3">Chưa có nội dung để hiển thị</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Settings Modal */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-gear"></i> Cài đặt PDF
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            {/* Clinic Settings */}
            <div className="col-12">
              <h6 className="fw-bold">Thông tin phòng khám</h6>
              <div className="row g-2">
                <div className="col-12">
                  <Form.Label>Tên phòng khám</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.clinicName}
                    onChange={(e) => handleSettingsChange('general', 'clinicName', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <Form.Label>Địa chỉ</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.clinicAddress}
                    onChange={(e) => handleSettingsChange('general', 'clinicAddress', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Điện thoại</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.clinicPhone}
                    onChange={(e) => handleSettingsChange('general', 'clinicPhone', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Mã số thuế</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.clinicTax}
                    onChange={(e) => handleSettingsChange('general', 'clinicTax', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <Form.Label>Tên bác sĩ</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.doctorName}
                    onChange={(e) => handleSettingsChange('general', 'doctorName', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Watermark Settings */}
            <div className="col-12">
              <h6 className="fw-bold">Watermark</h6>
              <div className="row g-2">
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Bật watermark"
                    checked={pdfSettings.watermark.enabled}
                    onChange={(e) => handleSettingsChange('watermark', 'enabled', e.target.checked)}
                  />
                </div>
                <div className="col-12">
                  <Form.Label>Nội dung watermark</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.watermark.text}
                    onChange={(e) => handleSettingsChange('watermark', 'text', e.target.value)}
                    disabled={!pdfSettings.watermark.enabled}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Độ trong suốt</Form.Label>
                  <Form.Range
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={pdfSettings.watermark.opacity}
                    onChange={(e) => handleSettingsChange('watermark', 'opacity', parseFloat(e.target.value))}
                    disabled={!pdfSettings.watermark.enabled}
                  />
                  <small>{pdfSettings.watermark.opacity}</small>
                </div>
                <div className="col-6">
                  <Form.Label>Kích thước chữ</Form.Label>
                  <Form.Control
                    type="number"
                    value={pdfSettings.watermark.fontSize}
                    onChange={(e) => handleSettingsChange('watermark', 'fontSize', parseInt(e.target.value))}
                    disabled={!pdfSettings.watermark.enabled}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Màu sắc</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.watermark.color}
                    onChange={(e) => handleSettingsChange('watermark', 'color', e.target.value)}
                    disabled={!pdfSettings.watermark.enabled}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Góc xoay</Form.Label>
                  <Form.Control
                    type="number"
                    value={pdfSettings.watermark.rotation}
                    onChange={(e) => handleSettingsChange('watermark', 'rotation', parseInt(e.target.value))}
                    disabled={!pdfSettings.watermark.enabled}
                  />
                </div>
              </div>
            </div>

            {/* Font Settings */}
            <div className="col-12">
              <h6 className="fw-bold">Font chữ</h6>
              <div className="row g-2">
                <div className="col-6">
                  <Form.Label>Font family</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontFamily}
                    onChange={(e) => handleSettingsChange('general', 'fontFamily', e.target.value)}
                  >
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Size chữ</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontSize}
                    onChange={(e) => handleSettingsChange('general', 'fontSize', e.target.value)}
                  >
                    <option value="12px">Nhỏ (12px)</option>
                    <option value="14px">Vừa (14px)</option>
                    <option value="16px">Lớn (16px)</option>
                    <option value="18px">Rất lớn (18px)</option>
                  </Form.Select>
                </div>
              </div>
            </div>

            {/* Custom Title */}
            <div className="col-12">
              <Form.Label>Tiêu đề toa thuốc</Form.Label>
              <Form.Control
                type="text"
                value={pdfSettings.customTitle}
                onChange={(e) => handleSettingsChange('general', 'customTitle', e.target.value)}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSettings(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSaveSettings}>
            Lưu cài đặt
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PDFEditorPage;