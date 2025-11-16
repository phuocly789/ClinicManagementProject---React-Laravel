// PDFEditorPage.jsx - COMPLETE VERSION WITH ALL FEATURES
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

    // Watermark settings
    watermark: {
      enabled: false,
      text: 'MẪU BẢN QUYỀN',
      url: '',
      width: '200px',
      height: '200px',
      opacity: 0.1,
      fontSize: 48,
      color: '#cccccc',
      rotation: -45
    },

    // Font settings
    fontFamily: 'Times New Roman',
    fontSize: '14px',
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 1.5,
    fontColor: '#000000',

    // Color settings
    primaryColor: '#2c5aa0',
    secondaryColor: '#f8f9fa',
    backgroundColor: '#ffffff',
    borderColor: '#333333',
    headerBgColor: '#f0f0f0',

    // Layout settings
    marginTop: '15mm',
    marginBottom: '15mm',
    marginLeft: '20mm',
    marginRight: '20mm',
    pageOrientation: 'portrait',
    pageSize: 'A4',

    // Content settings
    customTitle: 'TOA THUỐC',
    showClinicLogo: false,
    showDoctorSignature: true,
    showPatientQRCode: false,
    footerText: 'Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi',
    disclaimer: 'Thuốc kê trong toa cần được sử dụng theo đúng hướng dẫn của bác sĩ',

    // Security settings
    encryptPDF: false,
    passwordProtect: false,
    allowPrinting: true,
    allowCopying: true,

    // Display settings
    showHeader: true,
    showFooter: true,
    headerTemplate: '',
    footerTemplate: '',

    // Technical settings
    compressionLevel: 'medium',
    imageQuality: 92,
    pdfVersion: '1.7'
  });

  // State cho HTML template
  const [pdfHTML, setPdfHTML] = useState('');

  // 🔥 HÀM TẠO HTML VỚI REAL-TIME DATA - ĐẶT Ở NGOÀI
  const createEnhancedHTML = (htmlTemplate) => {
    if (!htmlTemplate) return '';

    let enhancedHTML = htmlTemplate;

    try {
      // 🔄 REAL-TIME UPDATES: Thay thế các biến dynamic trong HTML
      const replacements = {
        // Clinic info
        '{{pdf_settings\\.customTitle}}': pdfSettings.customTitle || 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
        '{{pdf_settings\\.clinicName}}': pdfSettings.clinicName || 'PHÒNG KHÁM ĐA KHOA XYZ',
        '{{pdf_settings\\.clinicAddress}}': pdfSettings.clinicAddress || '',
        '{{pdf_settings\\.clinicPhone}}': pdfSettings.clinicPhone || '',
        '{{pdf_settings\\.doctorName}}': pdfSettings.doctorName || 'Bác sĩ điều trị',
        '{{pdf_settings\\.clinicTax}}': pdfSettings.clinicTax || '',

        // Patient data
        '{{patient_name}}': formData.patientName || '',
        '{{age}}': formData.patientAge || '',
        '{{gender}}': formData.patientGender || '',
        '{{phone}}': formData.patientPhone || '',
        '{{address}}': formData.patientAddress || '',

        // Medical data
        '{{symptoms}}': formData.symptoms || '',
        '{{diagnosis}}': formData.diagnosis || '',
        '{{instructions}}': formData.instructions || '',

        // Code and date
        '{{code}}': formData.code || '',
        '{{invoice_code}}': formData.invoiceCode || '',
        '{{date}}': formData.date || new Date().toISOString().split('T')[0],

        // Payment info
        '{{payment_method}}': formData.paymentMethod === 'cash' ? 'Tiền mặt' :
          formData.paymentMethod === 'momo' ? 'MoMo' :
            formData.paymentMethod === 'napas' ? 'Thẻ napas' : 'Tiền mặt',
        '{{payment_status}}': 'Đã thanh toán'
      };

      // Thực hiện tất cả replacements
      Object.entries(replacements).forEach(([pattern, value]) => {
        const regex = new RegExp(pattern, 'g');
        enhancedHTML = enhancedHTML.replace(regex, value);
      });

      // 🔥 THÊM DYNAMIC STYLES CHO REAL-TIME UPDATES
      const dynamicStyles = `
        <style>
          /* 🔄 REAL-TIME STYLES */
          body {
            font-family: ${pdfSettings.fontFamily || 'Times New Roman'} !important;
            font-size: ${pdfSettings.fontSize || '14px'} !important;
            color: ${pdfSettings.fontColor || '#000000'} !important;
            background-color: ${pdfSettings.backgroundColor || '#ffffff'} !important;
            line-height: ${pdfSettings.lineHeight || 1.5} !important;
          }
          
          .header h2 {
            color: ${pdfSettings.primaryColor || '#2c5aa0'} !important;
            font-weight: ${pdfSettings.fontWeight || 'bold'} !important;
            font-style: ${pdfSettings.fontStyle || 'normal'} !important;
          }
          
          .section-title {
            background-color: ${pdfSettings.primaryColor || '#2c5aa0'} !important;
            color: white !important;
          }
          
          /* 🔄 REAL-TIME LOGO */
          .logo-img {
            width: ${pdfSettings.logo.width || '80px'} !important;
            height: ${pdfSettings.logo.height || '80px'} !important;
            opacity: ${pdfSettings.logo.opacity || 1} !important;
            display: ${pdfSettings.logo.enabled && pdfSettings.logo.url ? 'block' : 'none'} !important;
            position: ${pdfSettings.logo.position || 'absolute'} !important;
            ${pdfSettings.logo.position === 'left' ? 'left: 20px;' : ''}
            ${pdfSettings.logo.position === 'right' ? 'right: 20px;' : ''}
            ${pdfSettings.logo.position === 'center' ? 'left: 50%; transform: translateX(-50%);' : ''}
            top: ${pdfSettings.logo.marginTop || '0px'} !important;
          }
          
          /* 🔥 FIX: Cập nhật logo URL */
          .logo-img[src] {
            src: url("${pdfSettings.logo.url}") !important;
          }
          
          /* 🔄 REAL-TIME WATERMARK */
          .watermark-text, .watermark-image {
            opacity: ${pdfSettings.watermark.opacity || 0.1} !important;
            color: ${pdfSettings.watermark.color || '#cccccc'} !important;
            font-size: ${pdfSettings.watermark.fontSize || 48}px !important;
            transform: translate(-50%, -50%) rotate(${pdfSettings.watermark.rotation || -45}deg) !important;
            display: ${pdfSettings.watermark.enabled ? 'block' : 'none'} !important;
          }
          
          /* 🔥 FIX: Cập nhật watermark image URL */
          .watermark-image[src] {
            src: url("${pdfSettings.watermark.url}") !important;
            width: ${pdfSettings.watermark.width || '200px'} !important;
            height: ${pdfSettings.watermark.height || '200px'} !important;
          }
          
          table th {
            background-color: ${pdfSettings.headerBgColor || '#f0f0f0'} !important;
            border-color: ${pdfSettings.borderColor || '#333333'} !important;
          }
          
          table td {
            border-color: ${pdfSettings.borderColor || '#333333'} !important;
          }
          
          .page {
            border-color: ${pdfSettings.borderColor || '#333333'} !important;
          }
        </style>
      `;

      // Chèn styles vào head
      if (enhancedHTML.includes('</head>')) {
        enhancedHTML = enhancedHTML.replace('</head>', dynamicStyles + '</head>');
      } else {
        enhancedHTML = dynamicStyles + enhancedHTML;
      }

    } catch (error) {
      console.error('❌ Error in createEnhancedHTML:', error);
    }

    return enhancedHTML;
  };

  // 🔥 REAL-TIME UPDATES: Tự động cập nhật HTML khi data thay đổi
  useEffect(() => {
    if (pdfHTML) {
      console.log('🔄 REAL-TIME: Auto-updating HTML template');
      const updatedHTML = createEnhancedHTML(pdfHTML);
      // Chỉ cập nhật nếu có thay đổi
      if (updatedHTML !== pdfHTML) {
        setPdfHTML(updatedHTML);
      }
    }
  }, [
    // Theo dõi tất cả state cần real-time updates
    formData.patientName,
    formData.patientAge,
    formData.patientGender,
    formData.patientPhone,
    formData.patientAddress,
    formData.doctor,
    formData.diagnosis,
    formData.symptoms,
    formData.instructions,
    pdfSettings.customTitle,
    pdfSettings.clinicName,
    pdfSettings.clinicAddress,
    pdfSettings.clinicPhone,
    pdfSettings.doctorName,
    pdfSettings.logo.enabled,
    pdfSettings.logo.url,
    pdfSettings.logo.width,
    pdfSettings.logo.height,
    pdfSettings.logo.opacity,
    pdfSettings.logo.position,
    pdfSettings.watermark.enabled,
    pdfSettings.watermark.text,
    pdfSettings.watermark.url,
    pdfSettings.watermark.opacity,
    pdfSettings.watermark.rotation,
    pdfSettings.fontFamily,
    pdfSettings.fontSize,
    pdfSettings.fontColor,
    pdfSettings.backgroundColor,
    pdfSettings.primaryColor,
    // Theo dõi serviceRows và prescriptionRows
    JSON.stringify(serviceRows),
    JSON.stringify(prescriptionRows)
  ]);

  // Load data từ sessionStorage và localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🎯 === PDFEditorPage LOAD DATA START ===');

        // Lấy tất cả data từ storage
        const savedData = sessionStorage.getItem('pdfPreviewData');
        const savedRows = sessionStorage.getItem('prescriptionRows');
        const selectedPatient = sessionStorage.getItem('selectedPatient');
        const savedSettings = localStorage.getItem('pdfSettings');
        const editorSource = sessionStorage.getItem('editorSource');
        const pdfHTMLTemplate = sessionStorage.getItem('pdfHTMLTemplate');
        const pdfEditorDataRaw = sessionStorage.getItem('pdfEditorData');

        // ✅ LẤY STATE TỪ NAVIGATION
        const navigationState = window.history.state;
        const locationState = navigationState?.usr;

        console.log('📍 Navigation State:', locationState);

        // 1. ƯU TIÊN: XỬ LÝ DỮ LIỆU TỪ NAVIGATION STATE TRƯỚC
        if (locationState?.source === 'services') {
          console.log('🚨 PROCESSING NAVIGATION STATE FROM SERVICES');
          await handleNavigationState(locationState);
          return;
        }
        // 🔥 THÊM ĐIỀU KIỆN NÀY: XỬ LÝ PRESCRIPTION TỪ NAVIGATION STATE
        else if (locationState?.source === 'prescription') {
          console.log('🚨 PROCESSING NAVIGATION STATE FROM PRESCRIPTION');
          await handleNavigationState(locationState);
          return;
        }

        // 2. XỬ LÝ PDF SETTINGS
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            console.log('⚙️ Loading saved PDF settings');

            const defaultSettings = {
              fontSize: '14px',
              fontStyle: 'normal',
              fontWeight: '400',
              fontColor: '#000000',
              backgroundColor: '#ffffff',
              borderColor: '#333333',
              headerBgColor: '#f0f0f0',
              lineHeight: 1.5,
              watermark: {
                enabled: false,
                text: 'MẪU BẢN QUYỀN',
                url: '',
                width: '200px',
                height: '200px',
                opacity: 0.1,
                fontSize: 48,
                color: '#cccccc',
                rotation: -45
              },
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
              pageSize: 'A4',
              pageOrientation: 'portrait',
              marginTop: '15mm',
              marginRight: '10mm',
              marginBottom: '15mm',
              marginLeft: '10mm',
              primaryColor: '#2c5aa0'
            };

            setPdfSettings(prev => ({ ...defaultSettings, ...settings }));
          } catch (e) {
            console.error('Error parsing PDF settings:', e);
          }
        }

        // 3. XỬ LÝ PRESCRIPTION ROWS
        if (savedRows) {
          try {
            setPrescriptionRows(JSON.parse(savedRows));
            console.log('💊 Loaded prescription rows');
          } catch (e) {
            console.error('Error parsing prescription rows:', e);
          }
        }

        // 4. XỬ LÝ THEO EDITOR SOURCE TỪ SESSIONSTORAGE
        if (editorSource === 'services') {
          console.log('🔧 Processing SERVICES from sessionStorage');
          await handleServicesData(pdfEditorDataRaw, pdfHTMLTemplate);
        }
        else if (editorSource === 'invoice') {
          console.log('💰 Processing INVOICE from sessionStorage');
          await handleInvoiceData(pdfEditorDataRaw);
        }
        else if (editorSource === 'prescription') {
          console.log('💊 Processing PRESCRIPTION from sessionStorage');
          await handlePrescriptionData(pdfEditorDataRaw, pdfHTMLTemplate);
        }
        else {
          console.log('🔍 No specific editor source, using default data');
          setType('prescription');
        }

        // 5. XỬ LÝ SELECTED PATIENT (nếu có)
        if (selectedPatient) {
          try {
            const patientData = JSON.parse(selectedPatient);
            console.log('👤 Loading selected patient data:', patientData);

            setFormData(prev => ({
              ...prev,
              patientName: patientData.name || patientData.FullName || '',
              patientAge: patientData.age || patientData.DateOfBirth ?
                `Tuổi: ${new Date().getFullYear() - new Date(patientData.DateOfBirth).getFullYear()}` : '',
              patientGender: patientData.gender || patientData.Gender || '',
              patientPhone: patientData.phone || patientData.Phone || '',
              patientAddress: patientData.address || '',
              doctor: pdfSettings.doctorName || 'Bác sĩ điều trị'
            }));
          } catch (e) {
            console.error('Error parsing selected patient:', e);
          }
        }

        // 6. XỬ LÝ SAVED DATA (fallback)
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            console.log('📋 Loading saved preview data');

            setFormData(prev => ({
              ...prev,
              diagnosis: parsedData.diagnoses?.[0]?.Diagnosis || parsedData.diagnosis || '',
              doctor: parsedData.doctor_name || pdfSettings.doctorName || 'Bác sĩ điều trị',
              symptoms: parsedData.symptoms || '',
              instructions: parsedData.instructions || 'Uống thuốc theo chỉ dẫn. Tái khám nếu cần.'
            }));
          } catch (e) {
            console.error('Error parsing saved data:', e);
          }
        }

        console.log('🎯 === PDFEditorPage LOAD DATA COMPLETED ===');

      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError('Lỗi khi tải dữ liệu: ' + err.message);
      }
    };

    // 🔥 HÀM XỬ LÝ NAVIGATION STATE
    const handleNavigationState = async (state) => {
      console.log('🎯 Handling Navigation State:', {
        source: state.source,
        hasPdfData: !!state.pdfData,
        hasServices: !!state.services,
        hasPatientInfo: !!state.patientInfo
      });

      if (state.source === 'services') {
        console.log('🚀 PROCESSING SERVICES FROM NAVIGATION STATE');

        // ✅ CẬP NHẬT FORM DATA TRỰC TIẾP TỪ STATE
        const updatedFormData = {
          patientName: state.patientInfo?.name || state.pdfData?.patient_name || 'Nguyễn Thị Lan',
          patientAge: state.patientInfo?.age || state.pdfData?.patient_age || '32',
          patientGender: state.patientInfo?.gender || state.pdfData?.patient_gender || 'Nữ',
          patientPhone: state.patientInfo?.phone || state.pdfData?.patient_phone || '0956789012',
          patientAddress: state.patientInfo?.address || state.pdfData?.address || '',
          code: state.pdfData?.code || `DV_${Date.now()}`,
          date: state.pdfData?.date || new Date().toISOString().split('T')[0],
          doctor: state.pdfData?.doctor || state.pdfData?.doctor_name || 'Bác sĩ điều trị',
          symptoms: state.pdfData?.symptoms || '',
          diagnosis: state.pdfData?.diagnosis || '',
          instructions: state.pdfData?.instructions || 'Vui lòng thực hiện các dịch vụ theo chỉ định',
          invoiceCode: '',
          paymentMethod: 'cash',
          paymentStatus: 'paid'
        };

        setFormData(prev => ({ ...prev, ...updatedFormData }));

        // ✅ CẬP NHẬT SERVICE ROWS TRỰC TIẾP TỪ STATE
        if (state.services && state.services.length > 0) {
          console.log('🔄 Setting service rows from navigation state:', state.services);

          const services = state.services.map((service, index) => ({
            id: index + 1,
            name: service.ServiceName || service.name || `Dịch vụ ${index + 1}`,
            quantity: parseInt(service.Quantity) || 1,
            unitPrice: parseFloat(service.Price) || 0,
            totalPrice: (parseInt(service.Quantity) || 1) * (parseFloat(service.Price) || 0),
            dosage: ''
          }));

          setServiceRows(services);
        } else {
          console.warn('⚠️ No services in navigation state, using default');
          setServiceRows([
            { id: 1, name: 'Khám bệnh', quantity: 1, unitPrice: 100000, totalPrice: 100000, dosage: '' }
          ]);
        }

        // ✅ CẬP NHẬT PDF SETTINGS TỪ STATE
        if (state.pdfData?.pdf_settings) {
          console.log('🎨 Updating PDF settings from navigation state');
          setPdfSettings(prev => ({
            ...prev,
            ...state.pdfData.pdf_settings,
            customTitle: state.pdfData.pdf_settings.customTitle || 'PHIẾU CHỈ ĐỊNH DỊCH VỤ'
          }));
        } else {
          console.log('🎨 Setting default PDF settings for services');
          setPdfSettings(prev => ({
            ...prev,
            customTitle: 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
            clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
            clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
            clinicPhone: '024.3574.7788'
          }));
        }

        // ✅ CẬP NHẬT HTML TEMPLATE TỪ STATE
        if (state.htmlTemplate) {
          console.log('🎨 Setting HTML template from navigation state');
          setPdfHTML(state.htmlTemplate);
        }

        // ✅ SET TYPE CUỐI CÙNG
        setType('service');

        console.log('✅ Navigation state from SERVICES processed successfully');
      }
      // 🔥 THÊM PHẦN NÀY: XỬ LÝ PRESCRIPTION TỪ NAVIGATION STATE
      else if (state.source === 'prescription') {
        console.log('💊 PROCESSING PRESCRIPTION FROM NAVIGATION STATE');
        

        // ✅ CẬP NHẬT FORM DATA TRỰC TIẾP TỪ STATE
        const updatedFormData = {
          patientName: state.patientInfo?.name || state.pdfData?.patient_name || 'Nguyễn Văn A',
          patientAge: state.patientInfo?.age || state.pdfData?.age || '35',
          patientGender: state.patientInfo?.gender || state.pdfData?.gender || 'Nam',
          patientPhone: state.patientInfo?.phone || state.pdfData?.phone || '0909123456',
          patientAddress: state.patientInfo?.address || state.pdfData?.address || '',
          code: state.pdfData?.code || `TT_${Date.now()}`,
          date: state.pdfData?.date || new Date().toISOString().split('T')[0],
          doctor: state.pdfData?.doctor_name || 'Bác sĩ điều trị',
          symptoms: state.pdfData?.symptoms || state.pdfData?.originalData?.symptoms || '',
          diagnosis: state.pdfData?.diagnosis || state.pdfData?.originalData?.diagnosis || '',
          instructions: state.pdfData?.instructions || 'Uống thuốc theo chỉ dẫn. Tái khám nếu cần.'
        };

        setFormData(prev => ({ ...prev, ...updatedFormData }));

        // ✅ CẬP NHẬT PRESCRIPTION ROWS TRỰC TIẾP TỪ STATE
        if (state.pdfData?.prescriptions && state.pdfData.prescriptions.length > 0) {
          console.log('🔄 Setting prescription rows from navigation state:', state.pdfData.prescriptions);

          const prescriptionRows = state.pdfData.prescriptions.flatMap(prescription =>
            prescription.details.map(detail => ({
              id: Date.now() + Math.random(),
              name: detail.medicine || 'Thuốc',
              quantity: detail.quantity || 1,
              dosage: detail.dosage || 'Theo chỉ dẫn',
              unitPrice: detail.unitPrice || 0,
              totalPrice: (detail.quantity || 1) * (detail.unitPrice || 0)
            }))
          );

          setPrescriptionRows(prescriptionRows);
          console.log('✅ Prescription rows set:', prescriptionRows);
        }
        // ✅ HOẶC XỬ LÝ TỪ originalData.prescriptionRows
        else if (state.pdfData?.originalData?.prescriptionRows && state.pdfData.originalData.prescriptionRows.length > 0) {
          console.log('🔄 Setting prescription rows from originalData:', state.pdfData.originalData.prescriptionRows);

          const prescriptionRows = state.pdfData.originalData.prescriptionRows.map((row, index) => ({
            id: Date.now() + index,
            name: row.medicine || 'Thuốc',
            quantity: row.quantity || 1,
            dosage: row.dosage || 'Theo chỉ dẫn',
            unitPrice: row.unitPrice || 0,
            totalPrice: row.totalPrice || (row.quantity || 1) * (row.unitPrice || 0)
          }));

          setPrescriptionRows(prescriptionRows);
          console.log('✅ Prescription rows set from originalData:', prescriptionRows);
        } else {
          console.warn('⚠️ No prescription data found in navigation state, using default');
          setPrescriptionRows([
            { id: 1, name: 'Paracetamol 500mg', quantity: 2, dosage: 'Uống 1 viên khi sốt', unitPrice: 5000, totalPrice: 10000 }
          ]);
        }

        // ✅ CẬP NHẬT PDF SETTINGS TỪ STATE
        if (state.pdfData?.pdf_settings) {
          console.log('🎨 Updating PDF settings from navigation state');
          setPdfSettings(prev => ({
            ...prev,
            ...state.pdfData.pdf_settings,
            customTitle: 'TOA THUỐC'
          }));
        } else {
          console.log('🎨 Setting default PDF settings for prescription');
          setPdfSettings(prev => ({
            ...prev,
            customTitle: 'TOA THUỐC',
            clinicName: 'PHÒNG KHÁM ĐA KHOA XYZ',
            clinicAddress: 'Số 53 Võ Văn Ngân, TP. Thủ Đức, TP.HCM',
            clinicPhone: '024.3574.7788'
          }));
        }
         // ✅ CẬP NHẬT HTML TEMPLATE TỪ STATE
        if (state.htmlTemplate) {
          console.log('🎨 Setting HTML template from navigation state');
          setPdfHTML(state.htmlTemplate);
        }

        // ✅ SET TYPE CUỐI CÙNG
        setType('prescription');

        console.log('✅ Navigation state from PRESCRIPTION processed successfully');
      }
    };

    // 🔥 HÀM XỬ LÝ SERVICES DATA TỪ SESSIONSTORAGE
    const handleServicesData = async (pdfEditorDataRaw, pdfHTMLTemplate) => {
      if (!pdfEditorDataRaw) {
        console.error('❌ No pdfEditorData found for services');
        return;
      }

      try {
        const serviceData = JSON.parse(pdfEditorDataRaw);

        // CẬP NHẬT FORM DATA
        const updatedFormData = {
          patientName: serviceData.patient_name || '',
          patientAge: serviceData.patient_age || serviceData.age || '',
          patientGender: serviceData.patient_gender || serviceData.gender || '',
          patientPhone: serviceData.patient_phone || serviceData.phone || '',
          patientAddress: serviceData.address || '',
          code: serviceData.code || `DV_${Date.now()}`,
          date: serviceData.date || new Date().toISOString().split('T')[0],
          doctor: serviceData.doctor || serviceData.doctor_name || 'Bác sĩ điều trị',
          symptoms: serviceData.symptoms || '',
          diagnosis: serviceData.diagnosis || '',
          instructions: serviceData.instructions || 'Vui lòng thực hiện các dịch vụ theo chỉ định',
          invoiceCode: '',
          paymentMethod: 'momo',
          paymentStatus: 'paid'
        };

        setFormData(prev => ({ ...prev, ...updatedFormData }));

        // CẬP NHẬT SERVICE ROWS
        if (serviceData.services && serviceData.services.length > 0) {
          console.log('🔄 Setting service rows from sessionStorage:', serviceData.services);

          const services = serviceData.services.map((service, index) => ({
            id: index + 1,
            name: service.ServiceName || service.name || `Dịch vụ ${index + 1}`,
            quantity: parseInt(service.Quantity) || 1,
            unitPrice: parseFloat(service.Price) || parseFloat(service.UnitPrice) || parseFloat(service.SubTotal) || 0,
            totalPrice: (parseInt(service.Quantity) || 1) * (parseFloat(service.Price) || parseFloat(service.UnitPrice) || parseFloat(service.SubTotal) || 0),
            dosage: ''
          }));

          setServiceRows(services);
        } else {
          console.warn('⚠️ No services found in sessionStorage, using default');
          setServiceRows([
            { id: 1, name: 'Khám bệnh', quantity: 1, unitPrice: 100000, totalPrice: 100000, dosage: '' }
          ]);
        }

        // CẬP NHẬT PDF SETTINGS
        if (serviceData.pdf_settings) {
          console.log('🎨 Updating PDF settings from sessionStorage');
          setPdfSettings(prev => ({
            ...prev,
            ...serviceData.pdf_settings,
            customTitle: serviceData.pdf_settings.customTitle || 'PHIẾU CHỈ ĐỊNH DỊCH VỤ'
          }));
        }

        // XỬ LÝ HTML TEMPLATE
        if (pdfHTMLTemplate) {
          console.log('🎨 Setting HTML template from sessionStorage');
          setPdfHTML(pdfHTMLTemplate);
        }

        // SET TYPE
        setType('service');

        console.log('✅ SERVICES data from sessionStorage loaded successfully');

      } catch (error) {
        console.error('❌ Error processing services data from sessionStorage:', error);
      }
      console.log('💊 PRESCRIPTION DATA ANALYSIS:', {
        hasPrescriptions: !!state.pdfData?.prescriptions,
        prescriptionsCount: state.pdfData?.prescriptions?.length || 0,
        hasOriginalData: !!state.pdfData?.originalData,
        originalDataRows: state.pdfData?.originalData?.prescriptionRows?.length || 0,
        patientData: {
          name: state.pdfData?.patient_name,
          age: state.pdfData?.age,
          gender: state.pdfData?.gender,
          phone: state.pdfData?.phone
        }
      });
    };

    // 🔥 HÀM XỬ LÝ INVOICE DATA
    const handleInvoiceData = async (pdfEditorDataRaw) => {
      if (!pdfEditorDataRaw) return;

      try {
        const invoiceData = JSON.parse(pdfEditorDataRaw);

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
            totalPrice: (service.Quantity || 1) * (service.Price || 0),
            dosage: ''
          }));
          setServiceRows(services);
        }

        setType('payment');
        setPdfSettings(prev => ({
          ...prev,
          customTitle: 'HÓA ĐƠN THANH TOÁN'
        }));

      } catch (error) {
        console.error('❌ Error processing invoice data:', error);
      }
    };

    // 🔥 HÀM XỬ LÝ PRESCRIPTION DATA
    const handlePrescriptionData = async (pdfEditorDataRaw, pdfHTMLTemplate) => {
      if (!pdfEditorDataRaw) return;

      try {
        const prescriptionData = JSON.parse(pdfEditorDataRaw);

        // Xử lý prescription data
        setType('prescription');

        if (prescriptionData.prescriptions) {
          const prescriptionRows = prescriptionData.prescriptions.flatMap(prescription =>
            prescription.prescription_details.map(detail => ({
              id: Date.now() + Math.random(),
              name: detail.medicine?.MedicineName || 'Thuốc',
              quantity: detail.Quantity || 1,
              dosage: detail.Usage || 'Theo chỉ dẫn',
              unitPrice: detail.medicine?.Price || 0,
              totalPrice: (detail.Quantity || 1) * (detail.medicine?.Price || 0)
            }))
          );
          setPrescriptionRows(prescriptionRows);
        }

      } catch (error) {
        console.error('❌ Error processing prescription data:', error);
      }
    };

    loadData();
  }, []);
  // Thêm vào component PDFEditorPage, sau các useState
  const [debugInfo, setDebugInfo] = useState({});

  // Debug effect - thêm vào useEffect hoặc tạo useEffect mới
  useEffect(() => {
    const currentDebugInfo = {
      timestamp: new Date().toLocaleTimeString(),
      currentType: type,
      pdfHTML: {
        exists: !!pdfHTML,
        length: pdfHTML?.length || 0,
        first50Chars: pdfHTML?.substring(0, 50) || 'N/A'
      },
      source: {
        sessionStorage: {
          editorSource: sessionStorage.getItem('editorSource'),
          hasHTMLTemplate: !!sessionStorage.getItem('pdfHTMLTemplate')
        },
        navigationState: {
          source: window.history.state?.usr?.source,
          hasHTMLTemplate: !!window.history.state?.usr?.htmlTemplate
        }
      },
      finalPreviewMode: pdfHTML ? 'HTML_TEMPLATE' : 'REACT_COMPONENT'
    };

    console.log('🎯 CURRENT PREVIEW MODE:', currentDebugInfo);
    setDebugInfo(currentDebugInfo);
  }, [type, pdfHTML]);

  // Thêm visual debug trên giao diện
  const DebugBadge = () => (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#333',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: 9999,
      border: '2px solid',
      borderColor: pdfHTML ? '#28a745' : '#ffc107',
      minWidth: '200px'
    }}>
      <div>🔍 DEBUG PREVIEW MODE</div>
      <div>Type: <strong>{type}</strong></div>
      <div>Mode: <strong style={{
        color: pdfHTML ? '#28a745' : '#ffc107'
      }}>
        {pdfHTML ? 'HTML TEMPLATE' : 'REACT COMPONENT'}
      </strong></div>
      <div>PDF HTML: <strong>{pdfHTML ? '✅ YES' : '❌ NO'}</strong></div>
      <div style={{ fontSize: '10px', marginTop: '4px' }}>
        {debugInfo.timestamp}
      </div>
    </div>
  );
  // 🔥 REAL-TIME HTML PREVIEW - KHÔNG CÓ NÚT
  const renderHTMLPreview = () => {
    if (!pdfHTML) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          fontStyle: 'italic'
        }}>
          Đang tải preview PDF...
        </div>
      );
    }

    return (
      <div
        dangerouslySetInnerHTML={{ __html: pdfHTML }}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto'
        }}
      />
    );
  };

  // Render preview theo template HTML (fallback)
  const renderPreviewContent = () => {
    const currentRows = getCurrentRows();
    const totalAmount = getCurrentRows().reduce((sum, row) => sum + (row.totalPrice || 0), 0);
    const discountAmount = (totalAmount * (formData.discount || 0)) / 100;
    const taxAmount = (totalAmount * (formData.tax || 0)) / 100;
    const finalAmount = totalAmount - discountAmount + taxAmount;

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
            {pdfSettings.watermark.url ? (
              <img
                src={pdfSettings.watermark.url}
                alt="Watermark"
                style={{
                  width: pdfSettings.watermark.width || '200px',
                  height: pdfSettings.watermark.height || '200px',
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
          borderBottom: `1.5px solid ${pdfSettings.borderColor || '#000'}`,
          paddingBottom: '5px',
          marginBottom: '10px',
          position: 'relative',
          backgroundColor: pdfSettings.headerBgColor || 'transparent'
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
            fontWeight: 'bold',
            color: pdfSettings.primaryColor
          }}>
            {pdfSettings.clinicName}
          </h2>
          <p style={{ margin: '2px 0', fontSize: '11px', color: pdfSettings.fontColor }}>
            Địa chỉ: {pdfSettings.clinicAddress}
          </p>
          <p style={{ margin: '2px 0', fontSize: '11px', color: pdfSettings.fontColor }}>
            Điện thoại: {pdfSettings.clinicPhone}
          </p>
        </div>

        {/* Title */}
        <div className="title" style={{
          textAlign: 'center',
          margin: '8px 0 12px',
          fontSize: '15px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          color: pdfSettings.primaryColor
        }}>
          <h3 style={{ margin: 0 }}>
            {pdfSettings.customTitle}
          </h3>
        </div>

        {/* Patient Info - Table layout */}
        <div className="info" style={{
          display: 'table',
          width: '100%',
          fontSize: pdfSettings.fontSize,
          marginBottom: '12px',
          color: pdfSettings.fontColor,
          fontStyle: pdfSettings.fontStyle,
          fontWeight: pdfSettings.fontWeight,
          lineHeight: pdfSettings.lineHeight
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

        {/* Medical Information - CHO SERVICE VÀ PRESCRIPTION */}
        {(type === 'prescription' || type === 'service') && (formData.symptoms || formData.diagnosis) && (
          <div className="diagnosis-section" style={{
            fontSize: pdfSettings.fontSize,
            marginBottom: '12px',
            textAlign: 'left',
            color: pdfSettings.fontColor,
            fontStyle: pdfSettings.fontStyle,
            fontWeight: pdfSettings.fontWeight,
            lineHeight: pdfSettings.lineHeight
          }}>
            <strong>THÔNG TIN CHẨN ĐOÁN:</strong>
            <div className="diagnosis-item" style={{
              padding: '5px',
              background: '#f9f9f9',
              border: `1px solid ${pdfSettings.borderColor || '#ddd'}`,
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
              {type === 'service' && formData.instructions && (
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
            fontSize: '11px',
            color: pdfSettings.fontColor
          }}>
            <thead>
              <tr>
                <th style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center', background: pdfSettings.headerBgColor || '#f0f0f0', fontWeight: 'bold' }} width="5%">STT</th>
                <th style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center', background: pdfSettings.headerBgColor || '#f0f0f0', fontWeight: 'bold' }} width={type === 'prescription' ? '25%' : '45%'}>
                  {type === 'prescription' ? 'Tên thuốc' : 'Tên dịch vụ'}
                </th>
                <th style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center', background: pdfSettings.headerBgColor || '#f0f0f0', fontWeight: 'bold' }} width="10%">SL</th>
                {type === 'prescription' && (
                  <th style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center', background: pdfSettings.headerBgColor || '#f0f0f0', fontWeight: 'bold' }} width="25%">Liều dùng</th>
                )}
                <th style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center', background: pdfSettings.headerBgColor || '#f0f0f0', fontWeight: 'bold' }} width={type === 'prescription' ? '15%' : '20%'}>Đơn giá</th>
                <th style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center', background: pdfSettings.headerBgColor || '#f0f0f0', fontWeight: 'bold' }} width={type === 'prescription' ? '20%' : '15%'}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((row, index) => (
                <tr key={row.id}>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px' }}>{row.name}</td>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'center' }}>{row.quantity}</td>
                  {type === 'prescription' && (
                    <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px' }}>{row.dosage}</td>
                  )}
                  <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'right' }}>
                    {formatNumber(row.unitPrice)} {type !== 'prescription' && 'VNĐ'}
                  </td>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'right' }}>
                    {formatNumber(row.totalPrice)} {type !== 'prescription' && 'VNĐ'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {type === 'payment' ? (
                <>
                  <tr style={{ fontWeight: '600' }}>
                    <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '6px', textAlign: 'right', fontWeight: 'bold', background: '#fafafa' }}>
                      Tổng tiền:
                    </td>
                    <td colSpan={2} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '6px', textAlign: 'right', fontWeight: 'bold', background: '#fafafa' }}>
                      {formatNumber(totalAmount)} VNĐ
                    </td>
                  </tr>
                  {formData.discount > 0 && (
                    <tr style={{ background: '#fff3cd' }}>
                      <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'right' }}>
                        Giảm giá ({formData.discount}%):
                      </td>
                      <td colSpan={2} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'right' }}>
                        -{formatNumber(discountAmount)} VNĐ
                      </td>
                    </tr>
                  )}
                  {formData.tax > 0 && (
                    <tr style={{ background: '#e7f3ff' }}>
                      <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'right' }}>
                        Thuế ({formData.tax}%):
                      </td>
                      <td colSpan={2} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '4px 6px', textAlign: 'right' }}>
                        +{formatNumber(taxAmount)} VNĐ
                      </td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: '600', background: '#d4edda' }}>
                    <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                      TỔNG CỘNG:
                    </td>
                    <td colSpan={2} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '6px', textAlign: 'right', fontWeight: 'bold', color: '#155724' }}>
                      {formatNumber(finalAmount)} VNĐ
                    </td>
                  </tr>
                </>
              ) : (
                <tr style={{ fontWeight: '600', background: '#fafafa' }}>
                  <td colSpan={type === 'prescription' ? 4 : 3} style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                    Tổng cộng:
                  </td>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(totalAmount)} {type !== 'prescription' && 'VNĐ'}
                  </td>
                  <td style={{ border: `1px solid ${pdfSettings.borderColor || '#333'}`, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
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
            border: `1px solid ${pdfSettings.borderColor || '#ddd'}`,
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
            fontSize: '11px',
            color: pdfSettings.fontColor
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              <strong>Số tiền viết bằng chữ:</strong> {numberToVietnameseWords(type === 'payment' ? finalAmount : totalAmount)}
            </p>
          </div>
        )}

        {/* Payment Info Section - CHỈ CHO PAYMENT */}
        {type === 'payment' && (
          <div className="payment-info" style={{
            background: '#f0f8ff',
            padding: '10px',
            borderRadius: '5px',
            margin: '15px 0'
          }}>
            <div className="section-title" style={{
              background: pdfSettings.primaryColor,
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

        {/* Note Section - CHO SERVICE VÀ PAYMENT */}
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
              <p style={{ margin: 0, fontSize: '11px', color: pdfSettings.fontColor }}><strong>Bệnh nhân</strong></p>
              <p style={{ margin: 0, fontSize: '11px', color: pdfSettings.fontColor }}>(Ký và ghi rõ họ tên)</p>
              <div className="signature" style={{
                marginTop: '15px',
                borderTop: `1px solid ${pdfSettings.borderColor || '#000'}`,
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
              <p style={{ margin: 0, fontSize: '11px', color: pdfSettings.fontColor }}>
                <strong>
                  {type === 'payment' ? 'Nhân viên thu ngân' :
                    type === 'service' ? 'Bác sĩ chỉ định' :
                      'Bác sĩ kê toa'}
                </strong>
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: pdfSettings.fontColor }}>(Ký và ghi rõ họ tên)</p>
              <div className="signature" style={{
                marginTop: '15px',
                borderTop: `1px solid ${pdfSettings.borderColor || '#000'}`,
                width: '150px',
                marginLeft: 'auto',
                marginRight: 'auto',
                height: '40px'
              }}>
                {pdfSettings.showDoctorSignature && formData.doctor}
              </div>
              <p style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '11px', color: pdfSettings.fontColor }}>
                {formData.doctor}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };

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
            url: imageUrl,
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
          url: '',
          enabled: false
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
          image: pdfSettings.logo.url,
          type: 'logo',
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
            url: result.url
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
            url: result.url,
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

        // Font settings mặc định
        fontSize: '14px',
        fontStyle: 'normal',
        fontWeight: '400',
        fontColor: '#000000',
        backgroundColor: '#ffffff',
        borderColor: '#333333',
        headerBgColor: '#f0f0f0',
        lineHeight: 1.5,

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
          enabled: false,
          text: 'MẪU BẢN QUYỀN',
          url: '',
          width: '200px',
          height: '200px',
          opacity: 0.1,
          fontSize: 48,
          color: '#cccccc',
          rotation: -45
        },

        fontFamily: 'Times New Roman',
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

      // CHUẨN BỊ PDF SETTINGS THEO ĐÚNG FORMAT BE MONG ĐỢI
      const preparedPdfSettings = {
        ...pdfSettings,
        // ĐẢM BẢO LOGO CÓ ĐỦ CÁC FIELD BE CẦN
        logo: {
          enabled: pdfSettings.logo.enabled,
          url: pdfSettings.logo.url,
          width: pdfSettings.logo.width,
          height: pdfSettings.logo.height,
          position: pdfSettings.logo.position,
          opacity: pdfSettings.logo.opacity,
          marginTop: pdfSettings.logo.marginTop,
          marginBottom: pdfSettings.logo.marginBottom
        },
        // WATERMARK THEO ĐÚNG FORMAT BE
        watermark: {
          enabled: pdfSettings.watermark.enabled,
          text: pdfSettings.watermark.text,
          url: pdfSettings.watermark.url,
          width: pdfSettings.watermark.width,
          height: pdfSettings.watermark.height,
          opacity: pdfSettings.watermark.opacity,
          fontSize: pdfSettings.watermark.fontSize,
          color: pdfSettings.watermark.color,
          rotation: pdfSettings.watermark.rotation
        }
      };

      const totalAmount = getCurrentRows().reduce((sum, row) => sum + (row.totalPrice || 0), 0);
      const discountAmount = (totalAmount * (formData.discount || 0)) / 100;
      const taxAmount = (totalAmount * (formData.tax || 0)) / 100;
      const finalAmount = totalAmount - discountAmount + taxAmount;

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
          symptoms: formData.symptoms || '',
          instructions: formData.instructions || '',
          diagnosis: formData.diagnosis || '',
          prescriptions: prescriptionRows.map(row => ({
            details: [{
              medicine: row.name || 'N/A',
              quantity: parseInt(row.quantity) || 1,
              dosage: row.dosage || 'N/A',
              unitPrice: parseFloat(row.unitPrice) || 0,
            }]
          })),
          diagnoses: formData.diagnosis ? [{ Symptoms: formData.symptoms, Diagnosis: formData.diagnosis }] : [],
          pdf_settings: preparedPdfSettings
        };
      } else if (type === 'payment') {
        printData = {
          type: 'payment',
          patient_name: formData.patientName,
          age: String(formData.patientAge),
          gender: formData.patientGender,
          phone: formData.patientPhone,
          address: formData.patientAddress,
          appointment_date: formData.date || new Date().toLocaleDateString('vi-VN'),
          appointment_time: 'Hoàn tất',
          doctor_name: formData.doctor || 'Hệ thống',
          services: serviceRows.map(row => ({
            ServiceName: row.name || 'Dịch vụ',
            Quantity: parseInt(row.quantity) || 1,
            Price: parseFloat(row.unitPrice) || 0
          })),
          payment_method: formData.paymentMethod === 'cash' ? 'Tiền mặt' :
            formData.paymentMethod === 'momo' ? 'MoMo' :
              formData.paymentMethod === 'napas' ? 'Thẻ napas' : 'Tiền mặt',
          payment_status: 'Đã thanh toán',
          discount: parseFloat(formData.discount) || 0,
          tax: parseFloat(formData.tax) || 0,
          invoice_code: formData.invoiceCode || `INV_${Date.now()}`,
          total_amount: parseFloat(finalAmount) || 0,
          diagnoses: formData.diagnosis ? [{ Diagnosis: formData.diagnosis }] : [],
          pdf_settings: preparedPdfSettings
        };
      } else {
        // type === 'service'
        printData = {
          type: 'service',
          patient_name: formData.patientName,
          age: String(formData.patientAge),
          gender: formData.patientGender,
          phone: formData.patientPhone,
          address: formData.patientAddress,
          appointment_date: new Date().toLocaleDateString('vi-VN'),
          appointment_time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          doctor_name: formData.doctor || pdfSettings.doctorName,
          services: serviceRows.map(row => ({
            ServiceName: row.name || 'Dịch vụ',
            Quantity: parseInt(row.quantity) || 1,
            Price: parseFloat(row.unitPrice) || 0
          })),
          diagnoses: formData.diagnosis ? [{ Diagnosis: formData.diagnosis }] : [],
          pdf_settings: preparedPdfSettings
        };
      }

      console.log('📤 Sending data to BE:', printData);

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
        console.error('❌ BE Error Response:', errorText);
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

  const totalAmount = getCurrentRows().reduce((sum, row) => sum + (row.totalPrice || 0), 0);
  const discountAmount = (totalAmount * (formData.discount || 0)) / 100;
  const taxAmount = (totalAmount * (formData.tax || 0)) / 100;
  const finalAmount = totalAmount - discountAmount + taxAmount;

  return (
    <div className="app" style={{
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px'
    }}><DebugBadge />
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
          background: pdfSettings.backgroundColor || '#fff',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          padding: `${pdfSettings.marginTop} ${pdfSettings.marginRight} ${pdfSettings.marginBottom} ${pdfSettings.marginLeft}`,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: pdfSettings.fontFamily,
          fontSize: pdfSettings.fontSize,
          color: pdfSettings.fontColor,
          lineHeight: pdfSettings.lineHeight,
          border: `1.5px solid ${pdfSettings.borderColor || '#333'}`,
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

      {/* Settings Modal - HOÀN CHỈNH VỚI TẤT CẢ TÍNH NĂNG */}
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
                        onChange={(e) => handleSettingsChange('general', 'doctorName', e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <Form.Label>Học vị</Form.Label>
                      <Form.Control
                        type="text"
                        value={pdfSettings.doctorDegree}
                        onChange={(e) => handleSettingsChange('general', 'doctorDegree', e.target.value)}
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

                  {/* CÁC NÚT QUẢN LÝ LOGO SERVER */}
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
                  <Form.Label>Nội dung watermark (text)</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.watermark.text}
                    onChange={(e) => handleSettingsChange('watermark', 'text', e.target.value)}
                    disabled={!pdfSettings.watermark.enabled}
                  />
                </div>

                <div className="col-12">
                  <Form.Label>Upload Ảnh Watermark (thay thế text)</Form.Label>
                  <div className="d-flex gap-2 align-items-center mb-2">
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleWatermarkImageUpload}
                      disabled={!pdfSettings.watermark.enabled}
                    />
                    {pdfSettings.watermark.url && (
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
                  <Form.Text className="text-muted">
                    Nếu upload ảnh, watermark text sẽ bị thay thế bằng ảnh
                  </Form.Text>
                </div>

                {pdfSettings.watermark.url && (
                  <div className="col-12">
                    <Form.Label>Preview Watermark:</Form.Label>
                    <div className="border rounded p-3 text-center">
                      <img
                        src={pdfSettings.watermark.url}
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

                {/* KÍCH CỠ ẢNH WATERMARK */}
                <div className="col-6">
                  <Form.Label>Chiều rộng ảnh</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.watermark.width}
                    onChange={(e) => handleSettingsChange('watermark', 'width', e.target.value)}
                    placeholder="200px"
                    disabled={!pdfSettings.watermark.enabled || !pdfSettings.watermark.url}
                  />
                  <Form.Text>VD: 200px, 50%, 300px</Form.Text>
                </div>

                <div className="col-6">
                  <Form.Label>Chiều cao ảnh</Form.Label>
                  <Form.Control
                    type="text"
                    value={pdfSettings.watermark.height}
                    onChange={(e) => handleSettingsChange('watermark', 'height', e.target.value)}
                    placeholder="200px"
                    disabled={!pdfSettings.watermark.enabled || !pdfSettings.watermark.url}
                  />
                  <Form.Text>VD: 200px, 50%, 300px</Form.Text>
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

                <div className="col-6">
                  <Form.Label>Màu sắc (cho text)</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.watermark.color}
                    onChange={(e) => handleSettingsChange('watermark', 'color', e.target.value)}
                    disabled={!pdfSettings.watermark.enabled || pdfSettings.watermark.url}
                  />
                  <Form.Text>Chỉ áp dụng cho watermark text</Form.Text>
                </div>

                <div className="col-6">
                  <Form.Label>Font size (cho text)</Form.Label>
                  <Form.Control
                    type="number"
                    min="10"
                    max="100"
                    value={pdfSettings.watermark.fontSize}
                    onChange={(e) => handleSettingsChange('watermark', 'fontSize', parseInt(e.target.value))}
                    disabled={!pdfSettings.watermark.enabled || pdfSettings.watermark.url}
                  />
                  <Form.Text>Chỉ áp dụng cho watermark text</Form.Text>
                </div>
              </div>
            </Tab>

            <Tab eventKey="font" title="🎨 Font & Màu sắc">
              <div className="row g-3">
                <div className="col-6">
                  <Form.Label>Font family</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontFamily}
                    onChange={(e) => handleSettingsChange('general', 'fontFamily', e.target.value)}
                  >
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                    <option value="DejaVu Sans">DejaVu Sans</option>
                  </Form.Select>
                </div>

                {/* FONT STYLE */}
                <div className="col-6">
                  <Form.Label>Font style</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontStyle}
                    onChange={(e) => handleSettingsChange('general', 'fontStyle', e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                    <option value="oblique">Oblique</option>
                  </Form.Select>
                </div>

                {/* FONT SIZE */}
                <div className="col-6">
                  <Form.Label>Font size</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontSize}
                    onChange={(e) => handleSettingsChange('general', 'fontSize', e.target.value)}
                  >
                    <option value="10px">10px - Rất nhỏ</option>
                    <option value="11px">11px - Nhỏ</option>
                    <option value="12px">12px - Vừa</option>
                    <option value="13px">13px - Trung bình</option>
                    <option value="14px">14px - Lớn</option>
                    <option value="15px">15px - Rất lớn</option>
                    <option value="16px">16px - Tiêu đề</option>
                    <option value="18px">18px - Tiêu đề lớn</option>
                  </Form.Select>
                </div>

                {/* FONT WEIGHT */}
                <div className="col-6">
                  <Form.Label>Độ đậm</Form.Label>
                  <Form.Select
                    value={pdfSettings.fontWeight}
                    onChange={(e) => handleSettingsChange('general', 'fontWeight', e.target.value)}
                  >
                    <option value="300">Light (300)</option>
                    <option value="400">Normal (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semi Bold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra Bold (800)</option>
                  </Form.Select>
                </div>

                {/* LINE HEIGHT */}
                <div className="col-6">
                  <Form.Label>Khoảng cách dòng</Form.Label>
                  <Form.Range
                    min="1"
                    max="2.5"
                    step="0.1"
                    value={pdfSettings.lineHeight}
                    onChange={(e) => handleSettingsChange('general', 'lineHeight', parseFloat(e.target.value))}
                  />
                  <small>Hiện tại: {pdfSettings.lineHeight}</small>
                </div>

                <div className="col-6">
                  <Form.Label>Màu chính</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.primaryColor}
                    onChange={(e) => handleSettingsChange('general', 'primaryColor', e.target.value)}
                  />
                </div>

                {/* MÀU CHỮ */}
                <div className="col-6">
                  <Form.Label>Màu chữ</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.fontColor}
                    onChange={(e) => handleSettingsChange('general', 'fontColor', e.target.value)}
                  />
                </div>

                {/* MÀU NỀN */}
                <div className="col-6">
                  <Form.Label>Màu nền</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.backgroundColor}
                    onChange={(e) => handleSettingsChange('general', 'backgroundColor', e.target.value)}
                  />
                </div>

                {/* MÀU BORDER */}
                <div className="col-6">
                  <Form.Label>Màu viền</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.borderColor}
                    onChange={(e) => handleSettingsChange('general', 'borderColor', e.target.value)}
                  />
                </div>

                {/* MÀU HEADER */}
                <div className="col-6">
                  <Form.Label>Màu header</Form.Label>
                  <Form.Control
                    type="color"
                    value={pdfSettings.headerBgColor}
                    onChange={(e) => handleSettingsChange('general', 'headerBgColor', e.target.value)}
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
                    onChange={(e) => handleSettingsChange('general', 'pageOrientation', e.target.value)}
                  >
                    <option value="portrait">Portrait (Dọc)</option>
                    <option value="landscape">Landscape (Ngang)</option>
                  </Form.Select>
                </div>
                <div className="col-6">
                  <Form.Label>Kích thước trang</Form.Label>
                  <Form.Select
                    value={pdfSettings.pageSize}
                    onChange={(e) => handleSettingsChange('general', 'pageSize', e.target.value)}
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
                    onChange={(e) => handleSettingsChange('general', 'showHeader', e.target.checked)}
                  />
                </div>
                <div className="col-12">
                  <Form.Check
                    type="switch"
                    label="Hiển thị chữ ký bác sĩ"
                    checked={pdfSettings.showDoctorSignature}
                    onChange={(e) => handleSettingsChange('general', 'showDoctorSignature', e.target.checked)}
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