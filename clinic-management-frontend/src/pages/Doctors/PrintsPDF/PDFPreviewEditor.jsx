// PDFEditorPage.jsx - COMPLETE VERSION
import React, { useState, useEffect } from 'react';
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
    patientPhone: '0909123456',
    code: 'TT0123',
    date: new Date().toISOString().split('T')[0],
    doctor: 'Trần Thị B',
    symptoms: 'Ho, sốt nhẹ',
    diagnosis: 'Viêm họng cấp',
    instructions: 'Uống thuốc theo chỉ dẫn. Tái khám nếu cần.',
    invoiceCode: 'HD001',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    discount: 0,
    tax: 10,
    transactionId: 'TX123456',
    orderId: 'ORD789',
    cashier: 'Nhân viên thu ngân'
  });

  const [prescriptionRows, setPrescriptionRows] = useState([
    { id: 1, name: 'Paracetamol 500mg', quantity: 2, dosage: 'Uống 1 viên khi sốt', unitPrice: 5000, totalPrice: 10000 }
  ]);

  const [serviceRows, setServiceRows] = useState([
    { id: 1, name: 'Khám bệnh', quantity: 1, unitPrice: 100000, totalPrice: 100000 },
    { id: 2, name: 'Xét nghiệm máu', quantity: 1, unitPrice: 150000, totalPrice: 150000 }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Cài đặt PDF
  const [pdfSettings, setPdfSettings] = useState({
    clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
    clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
    clinicPhone: '024.3574.7788',
    clinicTax: 'MST: 0100688738',
    clinicEmail: 'contact@phongkhamxyz.com',
    clinicWebsite: 'www.phongkhamxyz.com',
    doctorName: 'Trần Thị B',
    doctorDegree: 'Bác sĩ Chuyên khoa II',
    doctorSpecialty: 'Nội tổng quát',

    // Logo settings
    logo: {
      enabled: false,
      url: '',
      width: '80px',
      height: '80px',
      position: 'left',
      opacity: 1,
      marginTop: '0px',
      marginBottom: '10px'
    },

    watermark: {
      type: 'text', // 'text' hoặc 'image'
      text: 'MẪU BẢN QUYỀN',
      enabled: false,
      opacity: 0.1,
      fontSize: 48,
      color: '#cccccc',
      rotation: -45,
      imageUrl: '', // URL ảnh cho watermark
      imageWidth: '200px',
      imageHeight: '200px'
    },

    fontFamily: 'Times New Roman',
    fontSize: '14px',
    lineHeight: 1.5,
    fontColor: '#000000',
    marginTop: '15mm',
    marginBottom: '15mm',
    marginLeft: '20mm',
    marginRight: '20mm',
    pageOrientation: 'portrait',
    pageSize: 'A4',
    primaryColor: '#2c5aa0',
    secondaryColor: '#f8f9fa',
    borderColor: '#333333',
    headerBgColor: '#f0f0f0',
    customTitle: 'TOA THUỐC',
    showClinicLogo: false,
    showDoctorSignature: true,
    showPatientQRCode: false,
    footerText: 'Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi',
    disclaimer: 'Thuốc kê trong toa cần được sử dụng theo đúng hướng dẫn của bác sĩ',
    encryptPDF: false,
    passwordProtect: false,
    allowPrinting: true,
    allowCopying: true,
    showHeader: true,
    showFooter: true,
    headerTemplate: '',
    footerTemplate: '',
    compressionLevel: 'medium',
    imageQuality: 92,
    pdfVersion: '1.7'
  });

  // Load data từ sessionStorage và localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = sessionStorage.getItem('pdfPreviewData');
        const savedRows = sessionStorage.getItem('prescriptionRows');
        const selectedPatient = sessionStorage.getItem('selectedPatient');
        const savedSettings = localStorage.getItem('pdfSettings');
        const editorSource = sessionStorage.getItem('editorSource');

        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (!settings.logo) {
            settings.logo = {
              enabled: false,
              url: '',
              width: '80px',
              height: '80px',
              position: 'left',
              opacity: 1,
              marginTop: '0px',
              marginBottom: '10px'
            };
          }
          if (!settings.watermark) {
            settings.watermark = {
              type: 'text',
              text: 'MẪU BẢN QUYỀN',
              enabled: false,
              opacity: 0.1,
              fontSize: 48,
              color: '#cccccc',
              rotation: -45,
              imageUrl: '',
              imageWidth: '200px',
              imageHeight: '200px'
            };
          }
          setPdfSettings(settings);
        }

        if (savedRows) {
          setPrescriptionRows(JSON.parse(savedRows));
        }

        // Load data từ invoice
        if (editorSource === 'invoice') {
          const pdfEditorData = sessionStorage.getItem('pdfEditorData');
          if (pdfEditorData) {
            const invoiceData = JSON.parse(pdfEditorData);

            setFormData(prev => ({
              ...prev,
              patientName: invoiceData.patient_name || '',
              patientAge: invoiceData.age || '',
              patientGender: invoiceData.gender || '',
              patientPhone: invoiceData.phone || '',
              invoiceCode: invoiceData.invoice_code || 'HD001',
              date: invoiceData.appointment_date || new Date().toISOString().split('T')[0],
              paymentMethod: invoiceData.payment_method || 'cash',
              paymentStatus: 'paid',
              doctor: invoiceData.doctor_name || 'Hệ thống'
            }));

            if (invoiceData.services && invoiceData.services.length > 0) {
              const services = invoiceData.services.map((service, index) => ({
                id: index + 1,
                name: service.ServiceName || 'Dịch vụ',
                quantity: service.Quantity || 1,
                unitPrice: service.Price || 0,
                totalPrice: (service.Quantity || 1) * (service.Price || 0)
              }));
              setServiceRows(services);
            }

            setType('payment');
            setPdfSettings(prev => ({
              ...prev,
              customTitle: 'HÓA ĐƠN THANH TOÁN'
            }));
          }
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

  // Xử lý upload logo
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('❌ Vui lòng chọn file hình ảnh!');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert('❌ Kích thước file không được vượt quá 2MB!');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const logoUrl = e.target.result;
        setPdfSettings(prev => ({
          ...prev,
          logo: {
            ...prev.logo,
            url: logoUrl,
            enabled: true
          }
        }));
        alert('✅ Đã upload logo thành công!');
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  // Xử lý upload watermark image
  const handleWatermarkImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('❌ Vui lòng chọn file hình ảnh!');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert('❌ Kích thước file không được vượt quá 2MB!');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setPdfSettings(prev => ({
          ...prev,
          watermark: {
            ...prev.watermark,
            imageUrl: imageUrl,
            type: 'image',
            enabled: true
          }
        }));
        alert('✅ Đã upload ảnh watermark thành công!');
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  // Xóa logo
  const handleRemoveLogo = () => {
    if (window.confirm('Bạn có chắc muốn xóa logo?')) {
      setPdfSettings(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          url: '',
          enabled: false
        }
      }));
      alert('✅ Đã xóa logo!');
    }
  };

  // Xóa watermark image
  const handleRemoveWatermarkImage = () => {
    if (window.confirm('Bạn có chắc muốn xóa ảnh watermark?')) {
      setPdfSettings(prev => ({
        ...prev,
        watermark: {
          ...prev.watermark,
          imageUrl: '',
          type: 'text'
        }
      }));
      alert('✅ Đã xóa ảnh watermark!');
    }
  };

  // Hàm lưu logo lên server
  const handleSaveLogoToServer = async () => {
    if (!pdfSettings.logo.url) {
      alert('❌ Không có logo để lưu!');
      return;
    }

    // Kiểm tra nếu đã là URL từ server thì không cần lưu lại
    if (pdfSettings.logo.url.includes('/storage/logos/')) {
      alert('ℹ️ Logo đã được lưu trên server!');
      return;
    }

    setIsSavingLogo(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/print/logo/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logo: pdfSettings.logo.url,
          clinic_id: 1
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Logo đã được lưu thành công!');
        // Cập nhật URL logo thành URL từ server
        setPdfSettings(prev => ({
          ...prev,
          logo: {
            ...prev.logo,
            url: result.logo_url
          }
        }));
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error saving logo:', err);
      alert('❌ Lỗi khi lưu logo: ' + err.message);
    } finally {
      setIsSavingLogo(false);
    }
  };

  // Hàm tải logo đã lưu
  const handleLoadSavedLogo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/print/logo/1`);
      const result = await response.json();
      
      if (result.success) {
        setPdfSettings(prev => ({
          ...prev,
          logo: {
            ...prev.logo,
            url: result.logo_url,
            enabled: true
          }
        }));
        alert('✅ Đã tải logo từ server!');
      } else {
        alert('ℹ️ ' + result.message);
      }
    } catch (err) {
      console.error('Error loading logo:', err);
      alert('❌ Lỗi khi tải logo: ' + err.message);
    }
  };

  // Hàm xóa logo khỏi server
  const handleDeleteLogoFromServer = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa logo khỏi server?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/print/logo/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clinic_id: 1
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Đã xóa logo khỏi server!');
        // Vô hiệu hóa logo trong settings
        setPdfSettings(prev => ({
          ...prev,
          logo: {
            ...prev.logo,
            url: '',
            enabled: false
          }
        }));
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error deleting logo:', err);
      alert('❌ Lỗi khi xóa logo: ' + err.message);
    }
  };

  // Xử lý thay đổi form
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Xử lý thay đổi type
  const handleTypeChange = (newType) => {
    setType(newType);

    let newTitle = '';
    switch (newType) {
      case 'prescription':
        newTitle = 'TOA THUỐC';
        break;
      case 'service':
        newTitle = 'PHIẾU CHỈ ĐỊNH DỊCH VỤ';
        break;
      case 'payment':
        newTitle = 'HÓA ĐƠN THANH TOÁN';
        break;
      default:
        newTitle = 'TOA THUỐC';
    }

    setPdfSettings(prev => ({
      ...prev,
      customTitle: newTitle
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

    if (type === 'prescription') {
      setPrescriptionRows(prev => [...prev, newRow]);
    } else {
      const serviceRow = { ...newRow };
      delete serviceRow.dosage;
      setServiceRows(prev => [...prev, serviceRow]);
    }
  };

  const removeRow = (id) => {
    if (type === 'prescription') {
      setPrescriptionRows(prev => prev.filter(row => row.id !== id));
    } else {
      setServiceRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const updateRow = (id, field, value) => {
    const updateFunction = type === 'prescription' ? setPrescriptionRows : setServiceRows;
    const rows = type === 'prescription' ? prescriptionRows : serviceRows;

    updateFunction(prev => prev.map(row => {
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
  const getCurrentRows = () => type === 'prescription' ? prescriptionRows : serviceRows;
  const totalAmount = getCurrentRows().reduce((sum, row) => sum + (row.totalPrice || 0), 0);
  const discountAmount = (totalAmount * (formData.discount || 0)) / 100;
  const taxAmount = (totalAmount * (formData.tax || 0)) / 100;
  const finalAmount = totalAmount - discountAmount + taxAmount;

  // Handle settings changes
  const handleSettingsChange = (category, field, value) => {
    if (category === 'watermark') {
      setPdfSettings(prev => ({
        ...prev,
        watermark: { ...prev.watermark, [field]: value }
      }));
    } else if (category === 'logo') {
      setPdfSettings(prev => ({
        ...prev,
        logo: { ...prev.logo, [field]: value }
      }));
    } else {
      setPdfSettings(prev => ({ ...prev, [field]: value }));
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
        logo: {
          enabled: false,
          url: '',
          width: '80px',
          height: '80px',
          position: 'left',
          opacity: 1,
          marginTop: '0px',
          marginBottom: '10px'
        },
        watermark: { 
          type: 'text',
          enabled: false, 
          text: 'MẪU BẢN QUYỀN', 
          opacity: 0.1, 
          fontSize: 48, 
          color: '#cccccc', 
          rotation: -45,
          imageUrl: '',
          imageWidth: '200px',
          imageHeight: '200px'
        },
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

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let printData = {};

      if (type === 'prescription') {
        printData = {
          type: 'prescription',
          patient_name: formData.patientName,
          age: String(formData.patientAge),
          gender: formData.patientGender,
          phone: formData.patientPhone,
          address: formData.patientAddress,
          appointment_date: new Date().toLocaleDateString('vi-VN'),
          appointment_time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          doctor_name: formData.doctor || pdfSettings.doctorName,
          prescriptions: [{
            details: prescriptionRows.map(row => ({
              medicine: row.name || 'N/A',
              quantity: parseInt(row.quantity) || 1,
              dosage: row.dosage || 'N/A',
              unitPrice: parseFloat(row.unitPrice) || 0,
            })),
          }],
          diagnoses: formData.diagnosis ? [{ Diagnosis: formData.diagnosis }] : [],
          symptoms: formData.symptoms || '',
          instructions: formData.instructions || '',
          pdf_settings: pdfSettings
        };
      } else if (type === 'payment') {
        printData = {
          type: 'payment',
          patient_name: formData.patientName,
          age: String(formData.patientAge),
          gender: formData.patientGender,
          phone: formData.patientPhone,
          appointment_date: formData.date || new Date().toLocaleDateString('vi-VN'),
          appointment_time: 'Hoàn tất',
          doctor_name: formData.doctor || 'Hệ thống',
          services: serviceRows.map(row => ({
            ServiceName: row.name || 'Dịch vụ',
            Quantity: parseInt(row.quantity) || 1,
            Price: parseFloat(row.unitPrice) || 0
          })),
          payment_method: formData.paymentMethod,
          payment_status: 'Đã thanh toán',
          discount: formData.discount || 0,
          invoice_code: formData.invoiceCode || `INV_${Date.now()}`,
          total_amount: finalAmount,
          transaction_id: formData.transactionId,
          order_id: formData.orderId,
          diagnoses: formData.diagnosis ? [formData.diagnosis] : ['Khám và điều trị'],
          pdf_settings: {
            ...pdfSettings,
            customTitle: 'HÓA ĐƠN THANH TOÁN'
          }
        };
      } else {
        printData = {
          type: 'service',
          patient_name: formData.patientName,
          age: String(formData.patientAge),
          gender: formData.patientGender,
          phone: formData.patientPhone,
          address: formData.patientAddress,
          appointment_date: new Date().toLocaleDateString('vi-VN'),
          doctor_name: formData.doctor || pdfSettings.doctorName,
          services: serviceRows.map(row => ({
            ServiceName: row.name || 'Dịch vụ',
            Quantity: parseInt(row.quantity) || 1,
            Price: parseFloat(row.unitPrice) || 0
          })),
          diagnoses: formData.diagnosis ? [{ Diagnosis: formData.diagnosis }] : [],
          pdf_settings: pdfSettings
        };
      }

      const endpoint =  '/api/print/prescription/preview';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

        let fileName = '';
        switch (type) {
          case 'prescription':
            fileName = `TOA_THUOC_${formData.patientName || 'benh_nhan'}_${new Date().getTime()}.pdf`;
            break;
          case 'service':
            fileName = `PHIEU_DICH_VU_${formData.patientName || 'benh_nhan'}_${new Date().getTime()}.pdf`;
            break;
          case 'payment':
            fileName = `HOA_DON_${formData.invoiceCode || 'HD'}_${new Date().getTime()}.pdf`;
            break;
        }

        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`✅ Xuất ${type === 'prescription' ? 'toa thuốc' : type === 'service' ? 'phiếu dịch vụ' : 'hóa đơn'} thành công!`);
      } else {
        const errorText = await response.text();
        throw new Error(errorText || `Lỗi server: ${response.status}`);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('❌ Lỗi khi xuất PDF: ' + err.message);
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

  // Render preview theo template HTML
  const renderPreviewContent = () => {
    const currentRows = getCurrentRows();

    return (
      <>
        {/* Watermark */}
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
            {pdfSettings.watermark.type === 'image' && pdfSettings.watermark.imageUrl ? (
              <img
                src={pdfSettings.watermark.imageUrl}
                alt="Watermark"
                style={{
                  width: pdfSettings.watermark.imageWidth,
                  height: pdfSettings.watermark.imageHeight,
                  opacity: pdfSettings.watermark.opacity
                }}
              />
            ) : (
              pdfSettings.watermark.text
            )}
          </div>
        )}

        {/* Header với Logo */}
        <div className="header" style={{
          textAlign: 'center',
          borderBottom: `1.5px solid #000`,
          paddingBottom: '5px',
          marginBottom: '10px',
          position: 'relative'
        }}>
          {/* Logo */}
          {pdfSettings.logo.enabled && pdfSettings.logo.url && (
            <div style={{
              position: 'absolute',
              top: pdfSettings.logo.marginTop,
              [pdfSettings.logo.position]: '20px',
              opacity: pdfSettings.logo.opacity
            }}>
              <img
                src={pdfSettings.logo.url}
                alt="Clinic Logo"
                style={{
                  width: pdfSettings.logo.width,
                  height: pdfSettings.logo.height,
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

          <h2 style={{
            margin: 0,
            fontSize: '16px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            {pdfSettings.clinicName}
          </h2>
          <p style={{ margin: '2px 0', fontSize: '11px' }}>
            Địa chỉ: {pdfSettings.clinicAddress}
          </p>
          <p style={{ margin: '2px 0', fontSize: '11px' }}>
            Điện thoại: {pdfSettings.clinicPhone}
          </p>
        </div>

        {/* Title */}
        <div className="title" style={{
          textAlign: 'center',
          margin: '8px 0 12px',
          fontSize: '15px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          <h3 style={{ margin: 0 }}>
            {pdfSettings.customTitle}
          </h3>
        </div>

        {/* Patient Info - Table layout */}
        <div className="info" style={{
          display: 'table',
          width: '100%',
          fontSize: '12px',
          marginBottom: '12px'
        }}>
          <div className="info-row" style={{ display: 'table-row' }}>
            <div className="info-cell" style={{
              display: 'table-cell',
              width: '50%',
              verticalAlign: 'top',
              padding: '2px 5px'
            }}>
              <p style={{ margin: '2px 0' }}><strong>Họ tên:</strong> {formData.patientName}</p>
              <p style={{ margin: '2px 0' }}><strong>Tuổi:</strong> {formData.patientAge}</p>
              <p style={{ margin: '2px 0' }}><strong>Giới tính:</strong> {formData.patientGender}</p>
              <p style={{ margin: '2px 0' }}><strong>Điện thoại:</strong> {formData.patientPhone}</p>
            </div>
            <div className="info-cell" style={{
              display: 'table-cell',
              width: '50%',
              verticalAlign: 'top',
              padding: '2px 5px'
            }}>
              <p style={{ margin: '2px 0' }}>
                <strong>Mã {type === 'payment' ? 'hóa đơn' : type === 'service' ? 'hồ sơ' : 'toa'}:</strong> {type === 'payment' ? formData.invoiceCode : formData.code}
              </p>
              <p style={{ margin: '2px 0' }}>
                <strong>Ngày {type === 'payment' ? 'thanh toán' : 'khám'}:</strong> {new Date(formData.date).toLocaleDateString('vi-VN')}
              </p>
              <p style={{ margin: '2px 0' }}>
                <strong>Giờ {type === 'payment' ? 'thanh toán' : 'khám'}:</strong> {type === 'payment' ? 'Hoàn tất' : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p style={{ margin: '2px 0' }}>
                <strong>{type === 'payment' ? 'Thu ngân' : type === 'service' ? 'Bác sĩ chỉ định' : 'Bác sĩ'}:</strong> {formData.doctor}
              </p>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        {(type === 'prescription' || type === 'service') && (formData.symptoms || formData.diagnosis) && (
          <div className="diagnosis-section" style={{
            fontSize: '12px',
            marginBottom: '12px',
            textAlign: 'left'
          }}>
            <strong>THÔNG TIN CHẨN ĐOÁN:</strong>
            <div className="diagnosis-item" style={{
              padding: '5px',
              background: '#f9f9f9',
              border: '1px solid #ddd',
              marginBottom: '5px'
            }}>
              {type === 'prescription' && formData.symptoms && (
                <p style={{ margin: '2px 0' }}><strong>Triệu chứng:</strong> {formData.symptoms}</p>
              )}
              {formData.diagnosis && (
                <p style={{ margin: '2px 0' }}><strong>Chẩn đoán:</strong> {formData.diagnosis}</p>
              )}
              {type === 'prescription' && formData.instructions && (
                <p style={{ margin: '2px 0' }}><strong>Hướng dẫn:</strong> {formData.instructions}</p>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {currentRows.length > 0 ? (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '12px',
            fontSize: '11px'
          }}>
            <thead>
              <tr>
                <th style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }} width="5%">STT</th>
                <th style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }} width={type === 'prescription' ? '25%' : '45%'}>
                  {type === 'prescription' ? 'Tên thuốc' : 'Tên dịch vụ'}
                </th>
                <th style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }} width="10%">SL</th>
                {type === 'prescription' && (
                  <th style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }} width="25%">Liều dùng</th>
                )}
                <th style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }} width={type === 'prescription' ? '15%' : '20%'}>Đơn giá</th>
                <th style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }} width={type === 'prescription' ? '20%' : '15%'}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((row, index) => (
                <tr key={row.id}>
                  <td style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ border: `1px solid #333`, padding: '4px 6px' }}>{row.name}</td>
                  <td style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'center' }}>{row.quantity}</td>
                  {type === 'prescription' && (
                    <td style={{ border: `1px solid #333`, padding: '4px 6px' }}>{row.dosage}</td>
                  )}
                  <td style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'right' }}>
                    {formatNumber(row.unitPrice)} {type !== 'prescription' && 'VNĐ'}
                  </td>
                  <td style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'right' }}>
                    {formatNumber(row.totalPrice)} {type !== 'prescription' && 'VNĐ'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {type === 'payment' ? (
                <>
                  <tr style={{ fontWeight: '600' }}>
                    <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid #333`, padding: '6px', textAlign: 'right', fontWeight: 'bold', background: '#fafafa' }}>
                      Tổng tiền:
                    </td>
                    <td colSpan={2} style={{ border: `1px solid #333`, padding: '6px', textAlign: 'right', fontWeight: 'bold', background: '#fafafa' }}>
                      {formatNumber(totalAmount)} VNĐ
                    </td>
                  </tr>
                  {formData.discount > 0 && (
                    <tr style={{ background: '#fff3cd' }}>
                      <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'right' }}>
                        Giảm giá ({formData.discount}%):
                      </td>
                      <td colSpan={2} style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'right' }}>
                        -{formatNumber(discountAmount)} VNĐ
                      </td>
                    </tr>
                  )}
                  {formData.tax > 0 && (
                    <tr style={{ background: '#e7f3ff' }}>
                      <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'right' }}>
                        Thuế ({formData.tax}%):
                      </td>
                      <td colSpan={2} style={{ border: `1px solid #333`, padding: '4px 6px', textAlign: 'right' }}>
                        +{formatNumber(taxAmount)} VNĐ
                      </td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: '600', background: '#d4edda' }}>
                    <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid #333`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                      TỔNG CỘNG:
                    </td>
                    <td colSpan={2} style={{ border: `1px solid #333`, padding: '6px', textAlign: 'right', fontWeight: 'bold', color: '#155724' }}>
                      {formatNumber(finalAmount)} VNĐ
                    </td>
                  </tr>
                </>
              ) : (
                <tr style={{ fontWeight: '600', background: '#fafafa' }}>
                  <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid #333`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                    Tổng cộng:
                  </td>
                  <td style={{ border: `1px solid #333`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(totalAmount)} {type !== 'prescription' && 'VNĐ'}
                  </td>
                  <td style={{ border: `1px solid #333`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(totalAmount)} {type !== 'prescription' && 'VNĐ'}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        ) : (
          <div className="diagnosis-item" style={{
            padding: '5px',
            background: '#f9f9f9',
            border: '1px solid #ddd',
            marginBottom: '5px'
          }}>
            <strong>
              {type === 'prescription' ? 'ĐƠN THUỐC:' :
                type === 'service' ? 'DỊCH VỤ CHỈ ĐỊNH:' :
                  'DỊCH VỤ:'}
            </strong> Không có {type === 'prescription' ? 'đơn thuốc' : 'dịch vụ'} nào được {type === 'prescription' ? 'kê' : 'chỉ định'}
          </div>
        )}

        {/* Total in words */}
        {(currentRows.length > 0 && (type === 'payment' ? finalAmount : totalAmount) > 0) && (
          <div className="real-money" style={{
            textAlign: 'left',
            marginBottom: '15px',
            padding: '5px',
            fontSize: '11px'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              <strong>Số tiền viết bằng chữ:</strong> {numberToVietnameseWords(type === 'payment' ? finalAmount : totalAmount)}
            </p>
          </div>
        )}

        {/* Payment Info Section */}
        {type === 'payment' && (
          <div className="payment-info" style={{
            background: '#f0f8ff',
            padding: '10px',
            borderRadius: '5px',
            margin: '15px 0'
          }}>
            <div className="section-title" style={{
              background: '#2c5aa0',
              color: 'white',
              padding: '5px 10px',
              margin: '-10px -10px 10px -10px',
              fontWeight: 'bold'
            }}>
              THÔNG TIN THANH TOÁN
            </div>

            <div className="payment-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px'
            }}>
              <span className="payment-label" style={{ fontWeight: 'bold' }}>Tổng tiền dịch vụ:</span>
              <span className="payment-value" style={{ fontWeight: 'bold', color: '#d9534f' }}>
                {formatNumber(totalAmount)} VNĐ
              </span>
            </div>

            {formData.discount > 0 && (
              <div className="payment-row" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '5px'
              }}>
                <span className="payment-label" style={{ fontWeight: 'bold' }}>Giảm giá:</span>
                <span className="payment-value" style={{ fontWeight: 'bold', color: '#d9534f' }}>
                  -{formatNumber(discountAmount)} VNĐ
                </span>
              </div>
            )}

            <div className="payment-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #ccc',
              paddingTop: '5px',
              marginTop: '5px'
            }}>
              <span className="payment-label" style={{ fontWeight: 'bold', fontSize: '14px' }}>THÀNH TIỀN:</span>
              <span className="payment-value" style={{ fontWeight: 'bold', fontSize: '14px', color: '#d9534f' }}>
                {formatNumber(finalAmount)} VNĐ
              </span>
            </div>

            <div className="payment-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px'
            }}>
              <span className="payment-label" style={{ fontWeight: 'bold' }}>Phương thức thanh toán:</span>
              <span className="payment-value" style={{ fontWeight: 'bold' }}>
                {formData.paymentMethod === 'cash' ? 'Tiền mặt' :
                  formData.paymentMethod === 'momo' ? 'MoMo' :
                    formData.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}
              </span>
            </div>

            <div className="payment-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px'
            }}>
              <span className="payment-label" style={{ fontWeight: 'bold' }}>Trạng thái:</span>
              <span className="payment-value" style={{ fontWeight: 'bold', color: '#5cb85c' }}>
                Đã thanh toán
              </span>
            </div>

            <div className="payment-row" style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span className="payment-label" style={{ fontWeight: 'bold' }}>Ngày thanh toán:</span>
              <span className="payment-value" style={{ fontWeight: 'bold' }}>
                {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {/* Note Section */}
        {(type === 'service' || type === 'payment') && (
          <div className="note" style={{
            fontStyle: 'italic',
            color: '#666',
            marginTop: '10px'
          }}>
            <p style={{ margin: 0 }}>
              <strong>Ghi chú:</strong> {
                type === 'service'
                  ? 'Bệnh nhân vui lòng đến phòng dịch vụ để thực hiện các xét nghiệm và chẩn đoán hình ảnh đã được chỉ định.'
                  : 'Hóa đơn này có giá trị thanh toán một lần. Vui lòng giữ lại hóa đơn để đối chiếu khi cần thiết.'
              }
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="footer" style={{
          marginTop: '30px'
        }}>
          <div className="footer-content" style={{
            display: 'table',
            width: '100%'
          }}>
            <div className="footer-column" style={{
              display: 'table-cell',
              width: '50%',
              textAlign: 'center',
              verticalAlign: 'top'
            }}>
              <p style={{ margin: 0, fontSize: '11px' }}><strong>Bệnh nhân</strong></p>
              <p style={{ margin: 0, fontSize: '11px' }}>(Ký và ghi rõ họ tên)</p>
              <div className="signature" style={{
                marginTop: '15px',
                borderTop: '1px solid #000',
                width: '150px',
                marginLeft: 'auto',
                marginRight: 'auto',
                height: '40px'
              }}></div>
            </div>
            <div className="footer-column" style={{
              display: 'table-cell',
              width: '50%',
              textAlign: 'center',
              verticalAlign: 'top'
            }}>
              <p style={{ margin: 0, fontSize: '11px' }}>
                <strong>
                  {type === 'payment' ? 'Nhân viên thu ngân' :
                    type === 'service' ? 'Bác sĩ chỉ định' :
                      'Bác sĩ kê toa'}
                </strong>
              </p>
              <p style={{ margin: 0, fontSize: '11px' }}>(Ký và ghi rõ họ tên)</p>
              <div className="signature" style={{
                marginTop: '15px',
                borderTop: '1px solid #000',
                width: '150px',
                marginLeft: 'auto',
                marginRight: 'auto',
                height: '40px'
              }}>
                {pdfSettings.showDoctorSignature && formData.doctor}
              </div>
              <p style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '11px' }}>
                {formData.doctor}
              </p>
            </div>
          </div>
        </div>
      </>
    );
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
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="prescription">Toa thuốc</option>
            <option value="service">Phiếu chỉ định dịch vụ</option>
            <option value="payment">Hóa đơn thanh toán</option>
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
            <Form.Label>Mã {type === 'payment' ? 'hóa đơn' : 'phiếu/toa'}</Form.Label>
            <Form.Control
              type="text"
              value={type === 'payment' ? formData.invoiceCode : formData.code}
              onChange={(e) => handleInputChange(type === 'payment' ? 'invoiceCode' : 'code', e.target.value)}
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
          <Form.Label>{type === 'payment' ? 'Thu ngân' : 'Bác sĩ'}</Form.Label>
          <Form.Control
            type="text"
            value={formData.doctor}
            onChange={(e) => handleInputChange('doctor', e.target.value)}
          />
        </Form.Group>

        {/* Các trường đặc biệt cho hóa đơn */}
        {type === 'payment' && (
          <>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <Form.Label>Phương thức thanh toán</Form.Label>
                <Form.Select
                  value={formData.paymentMethod}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="momo">MoMo</option>
                  <option value="bank">Chuyển khoản</option>
                  <option value="card">Thẻ tín dụng</option>
                </Form.Select>
              </div>
              <div className="col-6">
                <Form.Label>Mã giao dịch</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => handleInputChange('transactionId', e.target.value)}
                  placeholder="Tùy chọn"
                />
              </div>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <Form.Label>Giảm giá (%)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={(e) => handleInputChange('discount', e.target.value)}
                />
              </div>
              <div className="col-6">
                <Form.Label>Thuế (%)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="100"
                  value={formData.tax}
                  onChange={(e) => handleInputChange('tax', e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Triệu chứng và chẩn đoán - Ẩn với hóa đơn */}
        {(type === 'prescription' || type === 'service') && (
          <>
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

            {type === 'prescription' && (
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
            )}
          </>
        )}

        <h5>
          {type === 'prescription' ? 'Danh sách thuốc' :
            type === 'service' ? 'Danh sách dịch vụ' :
              'Danh sách dịch vụ & thuốc'}
        </h5>

        <table className="table-edit" style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '12px',
          fontSize: '14px'
        }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>#</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>
                {type === 'prescription' ? 'Tên thuốc' : 'Tên dịch vụ'}
              </th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>SL</th>
              {type === 'prescription' && (
                <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Liều dùng</th>
              )}
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Đơn giá</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Thành tiền</th>
              <th style={{ border: '1px solid #e0e0e0', padding: '8px', textAlign: 'center', background: '#f7f7f7' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {getCurrentRows().map((row, index) => (
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
                    placeholder={type === 'prescription' ? "Tên thuốc" : "Tên dịch vụ"}
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
                {type === 'prescription' && (
                  <td style={{ border: '1px solid #e0e0e0', padding: '4px' }}>
                    <Form.Control
                      type="text"
                      value={row.dosage}
                      onChange={(e) => updateRow(row.id, 'dosage', e.target.value)}
                      style={{ border: 'none', padding: '4px', fontSize: '14px' }}
                      placeholder="Liều dùng"
                    />
                  </td>
                )}
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

        {/* Hiển thị tổng tiền cho hóa đơn */}
        {type === 'payment' && (
          <div className="mt-3 p-3 bg-light rounded">
            <div className="row text-center">
              <div className="col-4">
                <strong>Tổng tiền:</strong><br />
                <span className="text-primary">{formatNumber(totalAmount)} VNĐ</span>
              </div>
              <div className="col-4">
                <strong>Giảm giá:</strong><br />
                <span className="text-danger">-{formatNumber(discountAmount)} VNĐ</span>
              </div>
              <div className="col-4">
                <strong>Thành tiền:</strong><br />
                <span className="text-success">{formatNumber(finalAmount)} VNĐ</span>
              </div>
            </div>
          </div>
        )}

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
          lineHeight: pdfSettings.lineHeight,
          border: '1.5px solid #333',
          borderRadius: '4px'
        }}>
          <div className="print-container" style={{
            height: '100%',
            boxSizing: 'border-box',
            padding: '15px 20px',
            position: 'relative',
            zIndex: 1
          }}>
            {renderPreviewContent()}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>⚙️ Cài đặt PDF Nâng cao</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="general" className="mb-3">
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
                  </div>
                </div>

                <div className="col-12">
                  <Form.Label>Tiêu đề</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.customTitle}
                    onChange={(e) => handleSettingsChange('general', 'customTitle', e.target.value)}
                  />
                </div>
              </div>
            </Tab>

            <Tab eventKey="logo" title="🖼️ Logo">
              <div className="row g-3">
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Hiển thị logo"
                    checked={pdfSettings.logo.enabled}
                    onChange={(e) => handleSettingsChange('logo', 'enabled', e.target.checked)}
                  />
                </div>

                <div className="col-12">
                  <Form.Label>Upload Logo</Form.Label>
                  <div className="d-flex gap-2 align-items-center mb-2">
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={!pdfSettings.logo.enabled}
                    />
                    {pdfSettings.logo.url && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={!pdfSettings.logo.enabled}
                      >
                        Xóa Logo
                      </Button>
                    )}
                  </div>
                  
                  {/* THÊM CÁC NÚT QUẢN LÝ LOGO SERVER */}
                  <div className="d-flex gap-2 flex-wrap mb-3">
                    {pdfSettings.logo.url && !pdfSettings.logo.url.includes('/storage/logos/') && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleSaveLogoToServer}
                        disabled={isSavingLogo || !pdfSettings.logo.enabled}
                      >
                        {isSavingLogo ? <Spinner size="sm" /> : '💾 Lưu Logo lên Server'}
                      </Button>
                    )}
                    <Button
                      variant="info"
                      size="sm"
                      onClick={handleLoadSavedLogo}
                      disabled={!pdfSettings.logo.enabled}
                    >
                      📥 Tải Logo từ Server
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={handleDeleteLogoFromServer}
                    >
                      🗑️ Xóa Logo khỏi Server
                    </Button>
                  </div>
                  
                  <Form.Text className="text-muted">
                    Chọn file ảnh (JPG, PNG, SVG) - Tối đa 2MB
                  </Form.Text>
                </div>

                {pdfSettings.logo.url && (
                  <div className="col-12">
                    <Form.Label>Preview Logo:</Form.Label>
                    <div className="border rounded p-3 text-center">
                      <img
                        src={pdfSettings.logo.url}
                        alt="Logo Preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '100px',
                          objectFit: 'contain'
                        }}
                      />
                      {pdfSettings.logo.url.includes('/storage/logos/') && (
                        <div className="mt-2 text-success">
                          <small>✅ Logo đã lưu trên server</small>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="col-6">
                  <Form.Label>Vị trí logo</Form.Label>
                  <Form.Select
                    value={pdfSettings.logo.position}
                    onChange={(e) => handleSettingsChange('logo', 'position', e.target.value)}
                    disabled={!pdfSettings.logo.enabled}
                  >
                    <option value="left">Bên trái</option>
                    <option value="center">Ở giữa</option>
                    <option value="right">Bên phải</option>
                  </Form.Select>
                </div>

                <div className="col-6">
                  <Form.Label>Độ trong suốt</Form.Label>
                  <Form.Range
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={pdfSettings.logo.opacity}
                    onChange={(e) => handleSettingsChange('logo', 'opacity', parseFloat(e.target.value))}
                    disabled={!pdfSettings.logo.enabled}
                  />
                  <small>{pdfSettings.logo.opacity}</small>
                </div>

                <div className="col-6">
                  <Form.Label>Chiều rộng</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.logo.width}
                    onChange={(e) => handleSettingsChange('logo', 'width', e.target.value)}
                    placeholder="80px"
                    disabled={!pdfSettings.logo.enabled}
                  />
                </div>

                <div className="col-6">
                  <Form.Label>Chiều cao</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.logo.height}
                    onChange={(e) => handleSettingsChange('logo', 'height', e.target.value)}
                    placeholder="80px"
                    disabled={!pdfSettings.logo.enabled}
                  />
                </div>
              </div>
            </Tab>

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
                  </Form.Select>
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
                    label="Hiển thị chữ ký bác sĩ"
                    checked={pdfSettings.showDoctorSignature}
                    onChange={(e) => handleSettingsChange('layout', 'showDoctorSignature', e.target.checked)}
                  />
                </div>
              </div>
            </Tab>

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
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Màu chính</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.primaryColor}
                    onChange={(e) => handleSettingsChange('color', 'primaryColor', e.target.value)}
                  />
                </div>
              </div>
            </Tab>

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
                  <Form.Label>Loại watermark</Form.Label>
                  <Form.Select
                    value={pdfSettings.watermark.type}
                    onChange={(e) => handleSettingsChange('watermark', 'type', e.target.value)}
                    disabled={!pdfSettings.watermark.enabled}
                  >
                    <option value="text">Text</option>
                    <option value="image">Hình ảnh</option>
                  </Form.Select>
                </div>

                {pdfSettings.watermark.type === 'text' ? (
                  <div className="col-12">
                    <Form.Label>Nội dung watermark</Form.Label>
                    <Form.Control
                      type="text"
                      value={pdfSettings.watermark.text}
                      onChange={(e) => handleSettingsChange('watermark', 'text', e.target.value)}
                      disabled={!pdfSettings.watermark.enabled}
                    />
                  </div>
                ) : (
                  <>
                    <div className="col-12">
                      <Form.Label>Upload Ảnh Watermark</Form.Label>
                      <div className="d-flex gap-2 align-items-center mb-2">
                        <Form.Control
                          type="file"
                          accept="image/*"
                          onChange={handleWatermarkImageUpload}
                          disabled={!pdfSettings.watermark.enabled}
                        />
                        {pdfSettings.watermark.imageUrl && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={handleRemoveWatermarkImage}
                            disabled={!pdfSettings.watermark.enabled}
                          >
                            Xóa Ảnh
                          </Button>
                        )}
                      </div>
                    </div>
                    {pdfSettings.watermark.imageUrl && (
                      <div className="col-12">
                        <Form.Label>Preview Watermark:</Form.Label>
                        <div className="border rounded p-3 text-center">
                          <img
                            src={pdfSettings.watermark.imageUrl}
                            alt="Watermark Preview"
                            style={{
                              maxWidth: '200px',
                              maxHeight: '100px',
                              objectFit: 'contain',
                              opacity: pdfSettings.watermark.opacity
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="col-6">
                      <Form.Label>Chiều rộng ảnh</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.watermark.imageWidth}
                        onChange={(e) => handleSettingsChange('watermark', 'imageWidth', e.target.value)}
                        placeholder="200px"
                        disabled={!pdfSettings.watermark.enabled}
                      />
                    </div>
                    <div className="col-6">
                      <Form.Label>Chiều cao ảnh</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.watermark.imageHeight}
                        onChange={(e) => handleSettingsChange('watermark', 'imageHeight', e.target.value)}
                        placeholder="200px"
                        disabled={!pdfSettings.watermark.enabled}
                      />
                    </div>
                  </>
                )}

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
                  <Form.Label>Góc xoay</Form.Label>
                  <Form.Control
                    type="number"
                    min="-180"
                    max="180"
                    value={pdfSettings.watermark.rotation}
                    onChange={(e) => handleSettingsChange('watermark', 'rotation', parseFloat(e.target.value))}
                    disabled={!pdfSettings.watermark.enabled}
                  />
                </div>

                {pdfSettings.watermark.type === 'text' && (
                  <div className="col-6">
                    <Form.Label>Màu sắc</Form.Label>
                    <Form.Control
                      type="color"
                      value={pdfSettings.watermark.color}
                      onChange={(e) => handleSettingsChange('watermark', 'color', e.target.value)}
                      disabled={!pdfSettings.watermark.enabled}
                    />
                  </div>
                )}

                {pdfSettings.watermark.type === 'text' && (
                  <div className="col-6">
                    <Form.Label>Font size</Form.Label>
                    <Form.Control
                      type="number"
                      min="10"
                      max="100"
                      value={pdfSettings.watermark.fontSize}
                      onChange={(e) => handleSettingsChange('watermark', 'fontSize', parseInt(e.target.value))}
                      disabled={!pdfSettings.watermark.enabled}
                    />
                  </div>
                )}
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