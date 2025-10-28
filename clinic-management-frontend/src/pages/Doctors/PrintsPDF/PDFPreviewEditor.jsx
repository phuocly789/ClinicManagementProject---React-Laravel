// PDFEditorPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Modal, Tab, Tabs } from 'react-bootstrap';

// Utility functions
const numberToVietnameseWords = (num) => {
  const ones = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const units = ['', 'nghìn', 'triệu', 'tỷ'];

  if (num === 0) return 'Không đồng';

  let result = '';
  let unitIndex = 0;
  let numStr = Math.floor(num).toString();

  while (numStr.length > 0) {
    let group = parseInt(numStr.slice(-3)) || 0;
    numStr = numStr.slice(0, -3);
    if (group > 0) {
      let str = '';
      let hundred = Math.floor(group / 100);
      let ten = Math.floor((group % 100) / 10);
      let one = group % 10;

      if (hundred > 0) {
        str += ones[hundred] + ' trăm';
      }
      if (ten > 1) {
        str += (str ? ' ' : '') + tens[ten];
        if (one > 0) str += ' ' + ones[one];
      } else if (ten === 1) {
        str += (str ? ' ' : '') + 'mười';
        if (one > 0) str += ' ' + ones[one];
      } else if (one > 0) {
        str += (str ? ' ' : '') + ones[one];
      }
      str += ' ' + units[unitIndex];
      result = (str.trim() + (result ? ' ' : '') + result).trim();
    }
    unitIndex++;
  }

  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
};

const formatNumber = (n) => {
  return Number(n || 0).toLocaleString('vi-VN');
};

const PDFEditorPage = () => {
  const API_BASE_URL = 'http://localhost:8000';

  // State chính
  const [type, setType] = useState('prescription');
  const [formData, setFormData] = useState({
    patientName: 'Nguyễn Văn A',
    patientAge: '35',
    patientGender: 'Nam',
    patientAddress: '123 Nguyễn Trãi, Quận 5, TP.HCM',
    patientPhone: '0909xxxxxx',
    code: 'TT0123',
    date: new Date().toISOString().split('T')[0],
    doctor: 'Trần Thị B',
    symptoms: 'Ho, sốt nhẹ',
    diagnosis: 'Viêm họng cấp',
    instructions: 'Uống thuốc theo chỉ dẫn. Tái khám nếu cần.'
  });

  const [prescriptionRows, setPrescriptionRows] = useState([
    { id: 1, name: 'Paracetamol', quantity: 1, dosage: 'Uống 1 viên khi sốt', unitPrice: 5000, totalPrice: 5000 }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Cài đặt PDF đầy đủ với nhiều tính năng
  const [pdfSettings, setPdfSettings] = useState({
    // Thông tin phòng khám
    clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
    clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
    clinicPhone: '024.3574.7788',
    clinicTax: 'MST: 0100688738',
    clinicEmail: 'contact@phongkhamxyz.com',
    clinicWebsite: 'www.phongkhamxyz.com',
    
    // Thông tin bác sĩ
    doctorName: 'Trần Thị B',
    doctorDegree: 'Bác sĩ Chuyên khoa II',
    doctorSpecialty: 'Nội tổng quát',
    
    // Watermark
    watermark: {
      text: 'MẪU BẢN QUYỀN',
      enabled: false,
      opacity: 0.1,
      fontSize: 48,
      color: '#cccccc',
      rotation: -45
    },
    
    // Cài đặt font chữ
    fontFamily: 'Times New Roman',
    fontSize: '14px',
    lineHeight: 1.5,
    fontColor: '#000000',
    
    // Layout và margin
    marginTop: '15mm',
    marginBottom: '15mm',
    marginLeft: '20mm',
    marginRight: '20mm',
    pageOrientation: 'portrait', // portrait | landscape
    pageSize: 'A4', // A4 | A5 | Letter
    
    // Màu sắc và theme
    primaryColor: '#2c5aa0',
    secondaryColor: '#f8f9fa',
    borderColor: '#333333',
    headerBgColor: '#f0f0f0',
    
    // Tiêu đề và nội dung
    customTitle: 'TOA THUỐC',
    showClinicLogo: false,
    showDoctorSignature: true,
    showPatientQRCode: false,
    
    // Nội dung tùy chỉnh
    footerText: 'Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi',
    disclaimer: 'Thuốc kê trong toa cần được sử dụng theo đúng hướng dẫn của bác sĩ',
    
    // Bảo mật
    encryptPDF: false,
    passwordProtect: false,
    allowPrinting: true,
    allowCopying: true,
    
    // Header/Footer
    showHeader: true,
    showFooter: true,
    headerTemplate: '',
    footerTemplate: '',
    
    // Advanced
    compressionLevel: 'medium', // low | medium | high
    imageQuality: 92,
    pdfVersion: '1.7'
  });

  // Load data từ sessionStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = sessionStorage.getItem('pdfPreviewData');
        const savedRows = sessionStorage.getItem('prescriptionRows');
        const selectedPatient = sessionStorage.getItem('selectedPatient');
        const savedSettings = localStorage.getItem('pdfSettings');

        if (savedSettings) {
          setPdfSettings(JSON.parse(savedSettings));
        }

        if (savedRows) {
          setPrescriptionRows(JSON.parse(savedRows));
        }

        if (selectedPatient) {
          const patientData = JSON.parse(selectedPatient);
          setFormData(prev => ({
            ...prev,
            patientName: patientData.name || '',
            patientAge: patientData.age || '',
            patientGender: patientData.gender || '',
            patientPhone: patientData.phone || '',
            patientAddress: patientData.address || '',
            doctor: pdfSettings.doctorName
          }));
        }

        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setFormData(prev => ({
            ...prev,
            diagnosis: parsedData.diagnoses?.[0]?.Diagnosis || parsedData.diagnosis || '',
            doctor: parsedData.doctor_name || pdfSettings.doctorName,
            symptoms: parsedData.symptoms || '',
            instructions: parsedData.instructions || 'Uống thuốc theo chỉ dẫn. Tái khám nếu cần.'
          }));
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Lỗi khi tải dữ liệu: ' + err.message);
      }
    };

    loadData();
  }, []);

  // Xử lý thay đổi form
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Xử lý hàng trong bảng
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      name: '',
      quantity: 1,
      dosage: '',
      unitPrice: 0,
      totalPrice: 0
    };
    setPrescriptionRows(prev => [...prev, newRow]);
  };

  const removeRow = (id) => {
    setPrescriptionRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id, field, value) => {
    setPrescriptionRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        if (field === 'quantity' || field === 'unitPrice') {
          const quantity = field === 'quantity' ? value : row.quantity;
          const unitPrice = field === 'unitPrice' ? value : row.unitPrice;
          updatedRow.totalPrice = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  // Tính tổng tiền
  const totalAmount = prescriptionRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);

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
    } else if (category === 'clinic') {
      const updatedSettings = {
        ...pdfSettings,
        [field]: value
      };
      setPdfSettings(updatedSettings);
    } else if (category === 'doctor') {
      const updatedSettings = {
        ...pdfSettings,
        [field]: value
      };
      setPdfSettings(updatedSettings);
    } else {
      const updatedSettings = {
        ...pdfSettings,
        [field]: value
      };
      setPdfSettings(updatedSettings);
    }
  };

  // Save settings
  const handleSaveSettings = () => {
    localStorage.setItem('pdfSettings', JSON.stringify(pdfSettings));
    setShowSettings(false);
    alert('✅ Đã lưu cài đặt PDF!');
  };

  // Reset settings
  const handleResetSettings = () => {
    if (window.confirm('Bạn có chắc muốn reset về cài đặt mặc định?')) {
      const defaultSettings = {
        clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
        clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
        clinicPhone: '024.3574.7788',
        clinicTax: 'MST: 0100688738',
        doctorName: 'Trần Thị B',
        watermark: { enabled: false, text: 'MẪU BẢN QUYỀN', opacity: 0.1, fontSize: 48, color: '#cccccc', rotation: -45 },
        fontFamily: 'Times New Roman',
        fontSize: '14px',
        customTitle: 'TOA THUỐC',
        showDoctorSignature: true,
        pageOrientation: 'portrait',
        pageSize: 'A4',
        primaryColor: '#2c5aa0'
      };
      setPdfSettings(defaultSettings);
      alert('✅ Đã reset cài đặt về mặc định!');
    }
  };

  // Download PDF với đầy đủ settings
  const handleDownloadPDF = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const printData = {
        type: 'prescription',
        patient_name: formData.patientName,
        age: String(formData.patientAge),
        gender: formData.patientGender,
        phone: formData.patientPhone,
        address: formData.patientAddress,
        appointment_date: new Date().toLocaleDateString('vi-VN'),
        appointment_time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        doctor_name: formData.doctor || pdfSettings.doctorName,
        prescriptions: [
          {
            details: prescriptionRows.map(row => ({
              medicine: row.name || 'N/A',
              quantity: parseInt(row.quantity) || 1,
              dosage: row.dosage || 'N/A',
              unitPrice: parseFloat(row.unitPrice) || 0,
            })),
          },
        ],
        diagnoses: formData.diagnosis ? [{ Diagnosis: formData.diagnosis }] : [],
        symptoms: formData.symptoms || '',
        instructions: formData.instructions || '',

        // Gửi đầy đủ settings lên BE
        pdf_settings: pdfSettings
      };

      console.log('🎨 Sending to backend with full settings:', pdfSettings);

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
        a.download = `TOA_THUOC_${formData.patientName || 'benh_nhan'}_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('✅ Xuất toa thuốc thành công!');
      } else {
        const errorText = await response.text();
        throw new Error(errorText || `Lỗi server: ${response.status}`);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('❌ Lỗi khi xuất toa thuốc: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // In trực tiếp
  const handlePrint = () => {
    window.print();
  };

  // Quay lại
  const handleBack = () => {
    window.history.back();
  };

  // Export settings
  const handleExportSettings = () => {
    const dataStr = JSON.stringify(pdfSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_settings_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('✅ Đã xuất cài đặt PDF!');
  };

  // Import settings
  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target.result);
          setPdfSettings(settings);
          alert('✅ Đã nhập cài đặt PDF thành công!');
        } catch (err) {
          alert('❌ File không hợp lệ!');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

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
    <div className="app" style={{ 
      display: 'flex', 
      gap: '24px', 
      alignItems: 'flex-start', 
      maxWidth: '1400px', 
      margin: '0 auto',
      padding: '20px'
    }}>
      {/* Left Column - Controls */}
      <div className="controls" style={{
        width: '440px',
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 style={{ margin: 0, fontSize: '20px', color: '#333', fontWeight: '600' }}>
            Chỉnh sửa phiếu / toa
          </h3>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            ⚙️ Cài đặt PDF
          </Button>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Loại</Form.Label>
          <Form.Select 
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="prescription">Toa thuốc</option>
            <option value="service">Phiếu chỉ định dịch vụ</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Họ tên bệnh nhân</Form.Label>
          <Form.Control
            type="text"
            value={formData.patientName}
            onChange={(e) => handleInputChange('patientName', e.target.value)}
          />
        </Form.Group>

        <div className="row g-2 mb-3">
          <div className="col-6">
            <Form.Label>Tuổi</Form.Label>
            <Form.Control
              type="number"
              value={formData.patientAge}
              onChange={(e) => handleInputChange('patientAge', e.target.value)}
            />
          </div>
          <div className="col-6">
            <Form.Label>Giới tính</Form.Label>
            <Form.Select
              value={formData.patientGender}
              onChange={(e) => handleInputChange('patientGender', e.target.value)}
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </Form.Select>
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Địa chỉ</Form.Label>
          <Form.Control
            type="text"
            value={formData.patientAddress}
            onChange={(e) => handleInputChange('patientAddress', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Điện thoại</Form.Label>
          <Form.Control
            type="text"
            value={formData.patientPhone}
            onChange={(e) => handleInputChange('patientPhone', e.target.value)}
          />
        </Form.Group>

        <div className="row g-2 mb-3">
          <div className="col-6">
            <Form.Label>Mã phiếu / toa</Form.Label>
            <Form.Control
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
            />
          </div>
          <div className="col-6">
            <Form.Label>Ngày lập</Form.Label>
            <Form.Control
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Bác sĩ</Form.Label>
          <Form.Control
            type="text"
            value={formData.doctor}
            onChange={(e) => handleInputChange('doctor', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Triệu chứng</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={formData.symptoms}
            onChange={(e) => handleInputChange('symptoms', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Chẩn đoán</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={formData.diagnosis}
            onChange={(e) => handleInputChange('diagnosis', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Hướng dẫn</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            placeholder="Uống thuốc theo chỉ dẫn..."
          />
        </Form.Group>

        <h5>Danh sách thuốc / dịch vụ</h5>
        
        <table className="table-edit" style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '12px',
          fontSize: '14px'
        }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>#</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Tên thuốc</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>SL</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Liều dùng</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Đơn giá</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Thành tiền</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {prescriptionRows.map((row, index) => (
              <tr key={row.id}>
                <td style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center' }}>
                  {index + 1}
                </td>
                <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                  <Form.Control
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                    style={{ border: 'none', padding: '4px', fontSize: '14px' }}
                    placeholder="Tên thuốc"
                  />
                </td>
                <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                  <Form.Control
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                    style={{ border: 'none', padding: '4px', fontSize: '14px' }}
                  />
                </td>
                <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                  <Form.Control
                    type="text"
                    value={row.dosage}
                    onChange={(e) => updateRow(row.id, 'dosage', e.target.value)}
                    style={{ border: 'none', padding: '4px', fontSize: '14px' }}
                    placeholder="Liều dùng"
                  />
                </td>
                <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                  <Form.Control
                    type="number"
                    min="0"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(row.id, 'unitPrice', e.target.value)}
                    style={{ border: 'none', padding: '4px', fontSize: '14px' }}
                  />
                </td>
                <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                  <Form.Control
                    type="number"
                    value={row.totalPrice}
                    readOnly
                    style={{ border: 'none', padding: '4px', fontSize: '14px', background: '#e8e8e8' }}
                  />
                </td>
                <td style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center' }}>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeRow(row.id)}
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="d-flex gap-2 mt-3 flex-wrap">
          <Button variant="outline-primary" onClick={addRow}>
            + Thêm hàng
          </Button>
          <Button 
            variant="success" 
            onClick={handleDownloadPDF} 
            disabled={isLoading}
          >
            {isLoading ? <Spinner animation="border" size="sm" /> : '📥 Tải PDF'}
          </Button>
          <Button variant="outline-secondary" onClick={handlePrint}>
            🖨️ In
          </Button>
          <Button variant="outline-dark" onClick={handleBack}>
            ↩️ Quay lại
          </Button>
        </div>
      </div>

      {/* Right Column - Preview */}
      <div className="preview-wrap" style={{ flex: 1 }}>
        <div className="page" style={{
          width: pdfSettings.pageOrientation === 'landscape' ? '297mm' : '210mm',
          minHeight: pdfSettings.pageOrientation === 'landscape' ? '210mm' : '297mm',
          margin: '0 auto',
          background: '#fff',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          padding: `${pdfSettings.marginTop} ${pdfSettings.marginRight} ${pdfSettings.marginBottom} ${pdfSettings.marginLeft}`,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: pdfSettings.fontFamily,
          fontSize: pdfSettings.fontSize,
          color: pdfSettings.fontColor,
          lineHeight: pdfSettings.lineHeight
        }}>
          {pdfSettings.watermark.enabled && (
            <div className="watermark" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${pdfSettings.watermark.rotation}deg)`,
              fontSize: `${pdfSettings.watermark.fontSize}px`,
              color: pdfSettings.watermark.color,
              opacity: pdfSettings.watermark.opacity,
              fontWeight: '700',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              zIndex: 0,
              whiteSpace: 'nowrap'
            }}>
              {pdfSettings.watermark.text}
            </div>
          )}
          
          <div className="print-container" style={{
            border: `1.5px solid ${pdfSettings.borderColor}`,
            height: '100%',
            boxSizing: 'border-box',
            padding: '12px',
            borderRadius: '4px',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Header */}
            {pdfSettings.showHeader && (
              <div className="header" style={{
                textAlign: 'center',
                borderBottom: `1.5px solid ${pdfSettings.borderColor}`,
                paddingBottom: '12px',
                marginBottom: '12px',
                background: pdfSettings.headerBgColor,
                padding: '10px',
                borderRadius: '4px'
              }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  textTransform: 'uppercase', 
                  color: pdfSettings.primaryColor, 
                  fontWeight: '700' 
                }}>
                  {pdfSettings.clinicName}
                </h2>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#444' }}>
                  {pdfSettings.clinicAddress}
                </p>
                <p style={{ margin: '2px 0', fontSize: '13px', color: '#666' }}>
                  ĐT: {pdfSettings.clinicPhone} | {pdfSettings.clinicTax}
                </p>
                {pdfSettings.clinicEmail && (
                  <p style={{ margin: '2px 0', fontSize: '13px', color: '#666' }}>
                    Email: {pdfSettings.clinicEmail} | Website: {pdfSettings.clinicWebsite}
                  </p>
                )}
              </div>
            )}

            {/* Title */}
            <div className="title" style={{ textAlign: 'center', margin: '12px 0 16px' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '20px', 
                fontWeight: '600', 
                color: pdfSettings.primaryColor,
                textTransform: 'uppercase'
              }}>
                {pdfSettings.customTitle}
              </h3>
            </div>

            {/* Patient Info */}
            <div className="info" style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              marginBottom: '12px',
              gap: '16px',
              background: pdfSettings.secondaryColor,
              padding: '10px',
              borderRadius: '4px'
            }}>
              <div>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  <strong>Họ tên BN:</strong> {formData.patientName}
                </p>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  <strong>Tuổi:</strong> {formData.patientAge}
                </p>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  <strong>Giới tính:</strong> {formData.patientGender}
                </p>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  <strong>Địa chỉ:</strong> {formData.patientAddress}
                </p>
              </div>
              <div>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  <strong>Mã toa:</strong> {formData.code}
                </p>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  <strong>Ngày lập:</strong> {new Date(formData.date).toLocaleDateString('vi-VN')}
                </p>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  <strong>Bác sĩ:</strong> {formData.doctor}
                  {pdfSettings.doctorDegree && ` - ${pdfSettings.doctorDegree}`}
                </p>
                {pdfSettings.doctorSpecialty && (
                  <p style={{ margin: '4px 0', color: '#333' }}>
                    <strong>Chuyên khoa:</strong> {pdfSettings.doctorSpecialty}
                  </p>
                )}
              </div>
            </div>

            {/* Medical Information */}
            <div className="diagnosis" style={{ 
              fontSize: '14px', 
              marginBottom: '12px',
              background: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              borderLeft: `4px solid ${pdfSettings.primaryColor}`
            }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Triệu chứng:</strong> {formData.symptoms}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Chẩn đoán:</strong> {formData.diagnosis}
              </p>
              {formData.instructions && (
                <p style={{ margin: '4px 0' }}>
                  <strong>Hướng dẫn:</strong> {formData.instructions}
                </p>
              )}
            </div>

            {/* Prescription Table */}
            <table className="print-table" style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              marginBottom: '20px',
              border: `1px solid ${pdfSettings.borderColor}`
            }}>
              <thead>
                <tr>
                  <th style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center', background: pdfSettings.headerBgColor, fontWeight: '600' }}>STT</th>
                  <th style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center', background: pdfSettings.headerBgColor, fontWeight: '600' }}>Tên thuốc</th>
                  <th style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center', background: pdfSettings.headerBgColor, fontWeight: '600' }}>Số lượng</th>
                  <th style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center', background: pdfSettings.headerBgColor, fontWeight: '600' }}>Liều dùng</th>
                  <th style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center', background: pdfSettings.headerBgColor, fontWeight: '600' }}>Đơn giá (VNĐ)</th>
                  <th style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center', background: pdfSettings.headerBgColor, fontWeight: '600' }}>Thành tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionRows.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px' }}>{row.name}</td>
                    <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'center' }}>{row.quantity}</td>
                    <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px' }}>{row.dosage}</td>
                    <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'right' }}>{formatNumber(row.unitPrice)}</td>
                    <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'right' }}>{formatNumber(row.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row" style={{ fontWeight: '600', background: pdfSettings.secondaryColor }}>
                  <td colSpan="4" style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                    Tổng cộng:
                  </td>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(totalAmount)} VNĐ
                  </td>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor}`, padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(totalAmount)} VNĐ
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Total in words */}
            <div className="total-section" style={{
              background: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px',
              borderLeft: `4px solid ${pdfSettings.primaryColor}`
            }}>
              <p style={{ fontSize: '14px', margin: 0, color: '#222', fontWeight: 'bold' }}>
                <strong>Số tiền viết bằng chữ:</strong> {numberToVietnameseWords(totalAmount)}
              </p>
            </div>

            {/* Disclaimer */}
            {pdfSettings.disclaimer && (
              <div className="disclaimer" style={{
                fontSize: '12px',
                color: '#666',
                fontStyle: 'italic',
                textAlign: 'center',
                marginBottom: '20px',
                padding: '8px',
                background: '#fff3cd',
                borderRadius: '4px',
                border: '1px solid #ffeaa7'
              }}>
                {pdfSettings.disclaimer}
              </div>
            )}

            {/* Footer */}
            <div className="footer" style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '40px',
              fontSize: '14px',
              color: '#333'
            }}>
              <div style={{ width: '45%', textAlign: 'center' }}>
                <p><strong>Bệnh nhân</strong></p>
                <p>(Ký và ghi rõ họ tên)</p>
                <div className="signature" style={{
                  marginTop: '60px',
                  fontStyle: 'italic',
                  borderTop: `1px solid ${pdfSettings.borderColor}`,
                  paddingTop: '8px',
                  width: '200px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}></div>
              </div>
              <div style={{ width: '45%', textAlign: 'center' }}>
                <p><strong>Bác sĩ kê toa</strong></p>
                <p>(Ký và ghi rõ họ tên)</p>
                <div className="signature" style={{
                  marginTop: '60px',
                  fontStyle: 'italic',
                  borderTop: `1px solid ${pdfSettings.borderColor}`,
                  paddingTop: '8px',
                  width: '200px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  {pdfSettings.showDoctorSignature && formData.doctor}
                </div>
              </div>
            </div>

            {/* Custom Footer Text */}
            {pdfSettings.footerText && pdfSettings.showFooter && (
              <div className="custom-footer" style={{
                textAlign: 'center',
                marginTop: '20px',
                paddingTop: '10px',
                borderTop: `1px solid ${pdfSettings.borderColor}`,
                fontSize: '12px',
                color: '#666'
              }}>
                {pdfSettings.footerText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal với nhiều tabs */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>⚙️ Cài đặt PDF Nâng cao</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="general" className="mb-3">
            {/* Tab General */}
            <Tab eventKey="general" title="📄 Chung">
              <div className="row g-3">
                <div className="col-12">
                  <h6 className="fw-bold">Thông tin phòng khám</h6>
                  <div className="row g-2">
                    <div className="col-12">
                      <Form.Label>Tên phòng khám</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.clinicName}
                        onChange={(e) => handleSettingsChange('clinic', 'clinicName', e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <Form.Label>Địa chỉ</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.clinicAddress}
                        onChange={(e) => handleSettingsChange('clinic', 'clinicAddress', e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <Form.Label>Điện thoại</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.clinicPhone}
                        onChange={(e) => handleSettingsChange('clinic', 'clinicPhone', e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <Form.Label>Mã số thuế</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.clinicTax}
                        onChange={(e) => handleSettingsChange('clinic', 'clinicTax', e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={pdfSettings.clinicEmail}
                        onChange={(e) => handleSettingsChange('clinic', 'clinicEmail', e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <Form.Label>Website</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.clinicWebsite}
                        onChange={(e) => handleSettingsChange('clinic', 'clinicWebsite', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <h6 className="fw-bold">Thông tin bác sĩ</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <Form.Label>Tên bác sĩ</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.doctorName}
                        onChange={(e) => handleSettingsChange('doctor', 'doctorName', e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <Form.Label>Học vị</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.doctorDegree}
                        onChange={(e) => handleSettingsChange('doctor', 'doctorDegree', e.target.value)}
                        placeholder="Bác sĩ Chuyên khoa II"
                      />
                    </div>
                    <div className="col-12">
                      <Form.Label>Chuyên khoa</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.doctorSpecialty}
                        onChange={(e) => handleSettingsChange('doctor', 'doctorSpecialty', e.target.value)}
                        placeholder="Nội tổng quát"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <Form.Label>Tiêu đề toa thuốc</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.customTitle}
                    onChange={(e) => handleSettingsChange('general', 'customTitle', e.target.value)}
                  />
                </div>
              </div>
            </Tab>

            {/* Tab Layout */}
            <Tab eventKey="layout" title="📐 Layout">
              <div className="row g-3">
                <div className="col-6">
                  <Form.Label>Hướng trang</Form.Label>
                  <Form.Select
                    value={pdfSettings.pageOrientation}
                    onChange={(e) => handleSettingsChange('layout', 'pageOrientation', e.target.value)}
                  >
                    <option value="portrait">Portrait (Dọc)</option>
                    <option value="landscape">Landscape (Ngang)</option>
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Kích thước trang</Form.Label>
                  <Form.Select
                    value={pdfSettings.pageSize}
                    onChange={(e) => handleSettingsChange('layout', 'pageSize', e.target.value)}
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Margin Top</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.marginTop}
                    onChange={(e) => handleSettingsChange('layout', 'marginTop', e.target.value)}
                    placeholder="15mm"
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Margin Bottom</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.marginBottom}
                    onChange={(e) => handleSettingsChange('layout', 'marginBottom', e.target.value)}
                    placeholder="15mm"
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Margin Left</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.marginLeft}
                    onChange={(e) => handleSettingsChange('layout', 'marginLeft', e.target.value)}
                    placeholder="20mm"
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Margin Right</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.marginRight}
                    onChange={(e) => handleSettingsChange('layout', 'marginRight', e.target.value)}
                    placeholder="20mm"
                  />
                </div>
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Hiển thị header"
                    checked={pdfSettings.showHeader}
                    onChange={(e) => handleSettingsChange('layout', 'showHeader', e.target.checked)}
                  />
                </div>
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Hiển thị footer"
                    checked={pdfSettings.showFooter}
                    onChange={(e) => handleSettingsChange('layout', 'showFooter', e.target.checked)}
                  />
                </div>
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Hiển thị chữ ký bác sĩ"
                    checked={pdfSettings.showDoctorSignature}
                    onChange={(e) => handleSettingsChange('layout', 'showDoctorSignature', e.target.checked)}
                  />
                </div>
              </div>
            </Tab>

            {/* Tab Font & Color */}
            <Tab eventKey="font" title="🎨 Font & Màu sắc">
              <div className="row g-3">
                <div className="col-6">
                  <Form.Label>Font family</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontFamily}
                    onChange={(e) => handleSettingsChange('font', 'fontFamily', e.target.value)}
                  >
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Size chữ</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontSize}
                    onChange={(e) => handleSettingsChange('font', 'fontSize', e.target.value)}
                  >
                    <option value="12px">Nhỏ (12px)</option>
                    <option value="13px">Vừa (13px)</option>
                    <option value="14px">Trung bình (14px)</option>
                    <option value="16px">Lớn (16px)</option>
                    <option value="18px">Rất lớn (18px)</option>
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Line height</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="1"
                    max="2"
                    value={pdfSettings.lineHeight}
                    onChange={(e) => handleSettingsChange('font', 'lineHeight', parseFloat(e.target.value))}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Màu chữ</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.fontColor}
                    onChange={(e) => handleSettingsChange('font', 'fontColor', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Màu chính</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.primaryColor}
                    onChange={(e) => handleSettingsChange('color', 'primaryColor', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Màu nền phụ</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.secondaryColor}
                    onChange={(e) => handleSettingsChange('color', 'secondaryColor', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Màu viền</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.borderColor}
                    onChange={(e) => handleSettingsChange('color', 'borderColor', e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Màu nền header</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.headerBgColor}
                    onChange={(e) => handleSettingsChange('color', 'headerBgColor', e.target.value)}
                  />
                </div>
              </div>
            </Tab>

            {/* Tab Watermark */}
            <Tab eventKey="watermark" title="💧 Watermark">
              <div className="row g-3">
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
            </Tab>

            {/* Tab Content */}
            <Tab eventKey="content" title="📝 Nội dung">
              <div className="row g-3">
                <div className="col-12">
                  <Form.Label>Text footer</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={pdfSettings.footerText}
                    onChange={(e) => handleSettingsChange('content', 'footerText', e.target.value)}
                    placeholder="Cảm ơn quý khách đã sử dụng dịch vụ..."
                  />
                </div>
                <div className="col-12">
                  <Form.Label>Disclaimer/Cảnh báo</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={pdfSettings.disclaimer}
                    onChange={(e) => handleSettingsChange('content', 'disclaimer', e.target.value)}
                    placeholder="Thuốc kê trong toa cần được sử dụng theo đúng hướng dẫn của bác sĩ..."
                  />
                </div>
              </div>
            </Tab>

            {/* Tab Advanced */}
            <Tab eventKey="advanced" title="Nâng cao">
              <div className="row g-3">
                <div className="col-6">
                  <Form.Label>Mức độ nén</Form.Label>
                  <Form.Select
                    value={pdfSettings.compressionLevel}
                    onChange={(e) => handleSettingsChange('advanced', 'compressionLevel', e.target.value)}
                  >
                    <option value="low">Thấp (Chất lượng cao)</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao (Kích thước nhỏ)</option>
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Chất lượng ảnh</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="100"
                    value={pdfSettings.imageQuality}
                    onChange={(e) => handleSettingsChange('advanced', 'imageQuality', parseInt(e.target.value))}
                  />
                </div>
                <div className="col-6">
                  <Form.Label>Phiên bản PDF</Form.Label>
                  <Form.Select
                    value={pdfSettings.pdfVersion}
                    onChange={(e) => handleSettingsChange('advanced', 'pdfVersion', e.target.value)}
                  >
                    <option value="1.4">PDF 1.4</option>
                    <option value="1.5">PDF 1.5</option>
                    <option value="1.6">PDF 1.6</option>
                    <option value="1.7">PDF 1.7</option>
                  </Form.Select>
                </div>
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Cho phép in ấn"
                    checked={pdfSettings.allowPrinting}
                    onChange={(e) => handleSettingsChange('advanced', 'allowPrinting', e.target.checked)}
                  />
                </div>
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Cho phép sao chép nội dung"
                    checked={pdfSettings.allowCopying}
                    onChange={(e) => handleSettingsChange('advanced', 'allowCopying', e.target.checked)}
                  />
                </div>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <div>
              <Button variant="outline-secondary" onClick={handleResetSettings}>
                Reset
              </Button>
              <Button variant="outline-info" onClick={handleExportSettings} className="ms-2">
                Export
              </Button>
              <Form.Control
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                style={{ display: 'none' }}
                id="import-settings"
              />
              <Button 
                variant="outline-warning" 
                onClick={() => document.getElementById('import-settings').click()}
                className="ms-2"
              >
                Import
              </Button>
            </div>
            <div>
              <Button variant="secondary" onClick={() => setShowSettings(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSaveSettings} className="ms-2">
                Lưu cài đặt
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PDFEditorPage;