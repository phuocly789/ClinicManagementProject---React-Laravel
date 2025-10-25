export const printDocument = (type, patientData, prescriptionRows, symptoms, diagnosis, services) => {
  if (!patientData || (type === 'prescription' && prescriptionRows.length === 0) || (type === 'service' && !services) || (type === 'invoice' && !prescriptionRows && !services)) {
    console.error('Invalid input data for printDocument:', { type, patientData, prescriptionRows, services });
    return;
  }

  // Normalize rows based on document type
  let rows = [];
  if (type === 'prescription') {
    rows = prescriptionRows.map((row, i) => ({
      id: i,
      name: row.medicine || '',
      qty: row.quantity || 1,
      dose: row.dosage || '',
      unit: row.unitPrice || 0,
      total: row.totalPrice || 0
    }));
  } else if (type === 'service') {
    rows = Object.entries(services || {})
      .filter(([key, value]) => value)
      .map(([key], i) => ({
        id: i,
        name: key || '',
        qty: 1,
        note: '',
        unit: 0,
        total: 0
      }));
  } else if (type === 'invoice') {
    const prescriptionRowsNormalized = prescriptionRows.map((row, i) => ({
      id: i,
      name: row.medicine || '',
      qty: row.quantity || 1,
      unit: row.unitPrice || 0,
      total: row.totalPrice || 0
    }));
    const serviceRowsNormalized = Object.entries(services || {})
      .filter(([key, value]) => value)
      .map(([key], i) => ({
        id: prescriptionRows.length + i,
        name: key || '',
        qty: 1,
        unit: 0,
        total: 0
      }));
    rows = [...prescriptionRowsNormalized, ...serviceRowsNormalized];
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const code = 'PK001';
  const doctor = 'BS. Nguyễn Văn A';
  const formattedDate = new Date(currentDate).toLocaleDateString('vi-VN');

  const totalSum = rows.reduce((sum, r) => sum + r.total, 0);

  // Format number to Vietnamese locale
  const formatNumber = (n) => Number(n || 0).toLocaleString('vi-VN');

  // Convert number to Vietnamese words
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

        if (hundred > 0) str += ones[hundred] + ' trăm';
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

  // Escape special characters to prevent HTML/JSON injection
  const escapeHtml = (str) => {
    if (typeof str !== 'string') return str || '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Sanitize rows to prevent injection
  const sanitizedRows = rows.map(row => ({
    id: row.id,
    name: escapeHtml(row.name),
    qty: row.qty,
    dose: escapeHtml(row.dose || ''),
    note: escapeHtml(row.note || ''),
    unit: row.unit,
    total: row.total
  }));

  // Determine title, table headers, and footer based on type
  let title = '';
  let tableHeaders = '';
  let tableRows = '';
  let footerLeft = 'Bệnh nhân';
  let footerRight = 'Bác sĩ';
  let showDiagnosisSection = true;
  let tableEditHeaders = '';
  let initialTableBody = '';

  if (type === 'prescription') {
    title = 'TOA THUỐC';
    tableHeaders = '<th>STT</th><th>Tên thuốc</th><th>Số lượng</th><th>Liều dùng</th><th>Đơn giá</th><th>Thành tiền</th>';
    tableRows = sanitizedRows.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td id="print-name-${i}">${escapeHtml(row.name)}</td>
        <td id="print-qty-${i}">${row.qty}</td>
        <td id="print-dose-${i}">${escapeHtml(row.dose)}</td>
        <td id="print-unit-${i}">${formatNumber(row.unit)}</td>
        <td id="print-total-${i}">${formatNumber(row.total)}</td>
      </tr>
    `).join('');
    tableEditHeaders = '<th>#</th><th>Tên thuốc</th><th>Số lượng</th><th>Liều dùng</th><th>Đơn giá (VNĐ)</th><th>Thành tiền (VNĐ)</th><th>Hành động</th>';
    initialTableBody = sanitizedRows.length > 0 ? sanitizedRows.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="editable-field" contenteditable="true" data-field="name" data-row="${row.id}">${escapeHtml(row.name)}</div></td>
        <td><input type="number" min="1" value="${row.qty}" data-field="qty" data-row="${row.id}"></td>
        <td><div class="editable-field" contenteditable="true" data-field="dose" data-row="${row.id}">${escapeHtml(row.dose)}</div></td>
        <td><input type="number" min="0" value="${row.unit}" data-field="unit" data-row="${row.id}"></td>
        <td><input type="number" min="0" value="${row.total}" readonly data-row="${row.id}"></td>
        <td style="text-align: center"><button class="btn danger btn-sm delete-row-btn" data-row-id="${row.id}">Xóa</button></td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;">Không có dữ liệu</td></tr>';
  } else if (type === 'service') {
    title = 'PHIẾU CHỈ ĐỊNH DỊCH VỤ CẬN LÂM SÀNG';
    tableHeaders = '<th>STT</th><th>Tên dịch vụ</th><th>Ghi chú</th><th>Đơn giá</th><th>Thành tiền</th>';
    tableRows = sanitizedRows.length > 0
      ? sanitizedRows.map((row, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td id="print-name-${i}">${escapeHtml(row.name)}</td>
            <td id="print-note-${i}">${escapeHtml(row.note)}</td>
            <td id="print-unit-${i}">${formatNumber(row.unit)}</td>
            <td id="print-total-${i}">${formatNumber(row.total)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" style="text-align:center;">Không có dịch vụ nào được chọn</td></tr>';
    footerRight = 'Bác sĩ chỉ định';
    tableEditHeaders = '<th>#</th><th>Tên dịch vụ</th><th>Ghi chú</th><th>Đơn giá (VNĐ)</th><th>Thành tiền (VNĐ)</th><th>Hành động</th>';
    initialTableBody = sanitizedRows.length > 0 ? sanitizedRows.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="editable-field" contenteditable="true" data-field="name" data-row="${row.id}">${escapeHtml(row.name)}</div></td>
        <td><div class="editable-field" contenteditable="true" data-field="note" data-row="${row.id}">${escapeHtml(row.note)}</div></td>
        <td><input type="number" min="0" value="${row.unit}" data-field="unit" data-row="${row.id}"></td>
        <td><input type="number" min="0" value="${row.total}" readonly data-row="${row.id}"></td>
        <td style="text-align: center"><button class="btn danger btn-sm delete-row-btn" data-row-id="${row.id}">Xóa</button></td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center;">Không có dữ liệu</td></tr>';
  } else if (type === 'invoice') {
    title = 'HÓA ĐƠN THANH TOÁN';
    tableHeaders = '<th>STT</th><th>Tên dịch vụ/thuốc</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th>';
    tableRows = sanitizedRows.length > 0
      ? sanitizedRows.map((row, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td id="print-name-${i}">${escapeHtml(row.name)}</td>
            <td id="print-qty-${i}">${row.qty}</td>
            <td id="print-unit-${i}">${formatNumber(row.unit)}</td>
            <td id="print-total-${i}">${formatNumber(row.total)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" style="text-align:center;">Không có dữ liệu</td></tr>';
    footerRight = 'Người lập hóa đơn';
    showDiagnosisSection = false;
    tableEditHeaders = '<th>#</th><th>Tên dịch vụ/thuốc</th><th>Số lượng</th><th>Đơn giá (VNĐ)</th><th>Thành tiền (VNĐ)</th><th>Hành động</th>';
    initialTableBody = sanitizedRows.length > 0 ? sanitizedRows.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="editable-field" contenteditable="true" data-field="name" data-row="${row.id}">${escapeHtml(row.name)}</div></td>
        <td><input type="number" min="1" value="${row.qty}" data-field="qty" data-row="${row.id}"></td>
        <td><input type="number" min="0" value="${row.unit}" data-field="unit" data-row="${row.id}"></td>
        <td><input type="number" min="0" value="${row.total}" readonly data-row="${row.id}"></td>
        <td style="text-align: center"><button class="btn danger btn-sm delete-row-btn" data-row-id="${row.id}">Xóa</button></td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center;">Không có dữ liệu</td></tr>';
  }

  // Generate HTML với layout controls bên trái - preview bên phải
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chỉnh sửa & In ${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      height: 100vh;
      overflow: hidden;
    }

    .app-container {
      display: flex;
      height: 100vh;
      gap: 0;
    }

    /* Controls Panel - Bên trái */
    .controls-panel {
      width: 450px;
      background: white;
      padding: 20px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      box-shadow: 2px 0 8px rgba(0,0,0,0.1);
    }

    .controls-panel h2 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.5em;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }

    .section {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }

    .section h3 {
      color: #495057;
      margin-bottom: 12px;
      font-size: 1.1em;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section h3::before {
      content: "📋";
      font-size: 1em;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #495057;
      font-size: 0.9em;
    }

    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 0.9em;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    .row {
      display: flex;
      gap: 10px;
    }

    .row .form-group {
      flex: 1;
    }

    .editable-field {
      min-height: 40px;
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      background: white;
      font-size: 0.9em;
      line-height: 1.4;
    }

    .editable-field:focus {
      outline: none;
      border-color: #3498db;
    }

    .toolbar {
      display: flex;
      gap: 5px;
      margin-bottom: 8px;
    }

    .toolbar button {
      padding: 4px 8px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8em;
    }

    .toolbar button:hover {
      background: #f8f9fa;
    }

    .toolbar button.active {
      background: #3498db;
      color: white;
      border-color: #3498db;
    }

    /* Table Controls */
    .table-controls {
      margin-top: 15px;
    }

    .table-edit {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8em;
      margin-bottom: 10px;
    }

    .table-edit th,
    .table-edit td {
      border: 1px solid #dee2e6;
      padding: 6px;
      text-align: left;
    }

    .table-edit th {
      background: #e9ecef;
      font-weight: 600;
    }

    .table-edit input {
      width: 100%;
      border: none;
      padding: 4px;
      background: transparent;
    }

    .table-edit input:focus {
      outline: none;
      background: #fff;
    }

    /* Buttons */
    .action-buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      font-weight: 500;
      transition: all 0.2s;
      flex: 1;
      min-width: 120px;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-success {
      background: #27ae60;
      color: white;
    }

    .btn-success:hover {
      background: #219a52;
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 0.8em;
      min-width: auto;
      flex: none;
    }

    /* Preview Panel - Bên phải */
    .preview-panel {
      flex: 1;
      background: #8b8b8b;
      padding: 20px;
      overflow: auto;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .preview-container {
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border-radius: 8px;
      overflow: hidden;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    .print-container {
      padding: 15mm;
      height: 100%;
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.4;
    }

    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 60px;
      color: rgba(0,0,0,0.1);
      font-weight: bold;
      pointer-events: none;
      z-index: 0;
    }

    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }

    .header h2 {
      margin: 0;
      font-size: 18pt;
      text-transform: uppercase;
      color: #222;
    }

    .header p {
      margin: 2px 0;
      font-size: 11pt;
    }

    .title {
      text-align: center;
      margin: 15px 0;
    }

    .title h3 {
      margin: 0;
      font-size: 16pt;
      font-weight: bold;
    }

    .info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 11pt;
    }

    .info div p {
      margin: 3px 0;
    }

    .info div p strong {
      color: #222;
    }

    .diagnosis {
      margin-bottom: 15px;
      font-size: 11pt;
    }

    .diagnosis p {
      margin: 3px 0;
    }

    table.print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
      margin-bottom: 15px;
    }

    table.print-table th,
    table.print-table td {
      border: 1px solid #333;
      padding: 6px 8px;
      text-align: left;
    }

    table.print-table th {
      background: #f8f9fa;
      text-align: center;
      font-weight: bold;
    }

    .total-row td {
      font-weight: bold;
      background: #f8f9fa;
    }

    .total-text {
      margin-bottom: 20px;
      font-size: 11pt;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }

    .footer div {
      text-align: center;
      width: 45%;
    }

    .signature {
      margin-top: 60px;
      font-style: italic;
      border-top: 1px solid #333;
      padding-top: 5px;
    }

    @media print {
      body * {
        visibility: hidden;
      }
      .preview-panel,
      .preview-panel * {
        visibility: visible;
      }
      .preview-panel {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 0;
        background: white;
      }
      .controls-panel {
        display: none;
      }
    }

    /* Scrollbar styling */
    .controls-panel::-webkit-scrollbar {
      width: 6px;
    }

    .controls-panel::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .controls-panel::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .controls-panel::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Controls Panel - Bên trái -->
    <div class="controls-panel">
      <h2>🛠️ Tùy chỉnh PDF</h2>
      
      <div class="section">
        <h3>Thông tin tài liệu</h3>
        <div class="form-group">
          <label>Loại tài liệu</label>
          <select class="form-control" id="docType">
            <option value="prescription" ${type === 'prescription' ? 'selected' : ''}>Toa thuốc</option>
            <option value="service" ${type === 'service' ? 'selected' : ''}>Phiếu chỉ định dịch vụ</option>
            <option value="invoice" ${type === 'invoice' ? 'selected' : ''}>Hóa đơn thanh toán</option>
          </select>
        </div>
        <div class="row">
          <div class="form-group">
            <label>Mã phiếu</label>
            <input type="text" class="form-control" id="docCode" value="${code}">
          </div>
          <div class="form-group">
            <label>Ngày lập</label>
            <input type="date" class="form-control" id="docDate" value="${currentDate}">
          </div>
        </div>
        <div class="form-group">
          <label>Bác sĩ</label>
          <input type="text" class="form-control" id="docDoctor" value="${doctor}">
        </div>
      </div>

      <div class="section">
        <h3>Thiết lập hiển thị</h3>
        <div class="form-group">
          <label>Font chữ</label>
          <select class="form-control" id="customFontFamily">
            <option value="Times New Roman">Times New Roman</option>
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>
        <div class="row">
          <div class="form-group">
            <label>Kích thước chữ (pt)</label>
            <input type="number" class="form-control" id="customFontSize" value="12" min="8" max="24">
          </div>
          <div class="form-group">
            <label>Kiểu chữ</label>
            <select class="form-control" id="globalStyle">
              <option value="normal">Bình thường</option>
              <option value="bold">Đậm</option>
              <option value="italic">Nghiêng</option>
              <option value="bold italic">Đậm & Nghiêng</option>
            </select>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>Thông tin bệnh nhân</h3>
        <div class="form-group">
          <label>Họ tên bệnh nhân</label>
          <div class="editable-field" contenteditable="true" id="patientName">${escapeHtml(patientData.name || 'Nguyễn Văn A')}</div>
        </div>
        <div class="row">
          <div class="form-group">
            <label>Tuổi</label>
            <input type="number" class="form-control" id="patientAge" value="${patientData.age || '35'}">
          </div>
          <div class="form-group">
            <label>Giới tính</label>
            <input type="text" class="form-control" id="patientGender" value="${patientData.gender || 'Nam'}">
          </div>
        </div>
        <div class="form-group">
          <label>Địa chỉ</label>
          <div class="editable-field" contenteditable="true" id="patientAddress">${escapeHtml(patientData.address || '123 Nguyễn Trãi, Quận 5, TP.HCM')}</div>
        </div>
        <div class="form-group">
          <label>Điện thoại</label>
          <input type="text" class="form-control" id="patientPhone" value="${patientData.phone || '0909xxxxxx'}">
        </div>
      </div>

      ${showDiagnosisSection ? `
      <div class="section">
        <h3>Thông tin khám bệnh</h3>
        <div class="form-group">
          <label>Triệu chứng</label>
          <div class="toolbar">
            <button type="button" data-style="bold">B</button>
            <button type="button" data-style="italic">I</button>
            <button type="button" data-style="underline">U</button>
          </div>
          <div class="editable-field" contenteditable="true" id="symptoms">${escapeHtml(symptoms || 'Ho, sốt nhẹ')}</div>
        </div>
        <div class="form-group">
          <label>Chẩn đoán</label>
          <div class="toolbar">
            <button type="button" data-style="bold">B</button>
            <button type="button" data-style="italic">I</button>
            <button type="button" data-style="underline">U</button>
          </div>
          <div class="editable-field" contenteditable="true" id="diagnosis">${escapeHtml(diagnosis || 'Viêm họng cấp')}</div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h3>Danh sách ${type === 'prescription' ? 'thuốc' : type === 'service' ? 'dịch vụ' : 'thuốc/dịch vụ'}</h3>
        <div class="table-controls">
          <table class="table-edit">
            <thead>
              <tr>${tableEditHeaders}</tr>
            </thead>
            <tbody id="table-body">
              ${initialTableBody}
            </tbody>
          </table>
          <button class="btn btn-secondary btn-sm" id="add-row-btn">
            + Thêm dòng
          </button>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-success" id="apply-btn">
          🔄 Cập nhật Preview
        </button>
        <button class="btn btn-primary" id="print-btn">
          🖨️ In / Lưu PDF
        </button>
        <button class="btn btn-secondary" id="close-btn">
          ❌ Đóng
        </button>
      </div>
    </div>

    <!-- Preview Panel - Bên phải -->
    <div class="preview-panel">
      <div class="preview-container">
        <div class="page">
          <div class="watermark">MẪU</div>
          <div class="print-container">
            <div class="header">
              <h2>PHÒNG KHÁM XYZ</h2>
              <p>Địa chỉ: Số 53 Võ Văn Ngân, TP. Thủ Đức</p>
              <p>Điện thoại: 024.3574.7788 — MST: 0100688738</p>
            </div>
            <div class="title" id="title">
              <h3>${escapeHtml(title)}</h3>
            </div>
            <div class="info" id="info">
              <div>
                <p><strong>Họ tên:</strong> <span id="info-patientName">${escapeHtml(patientData.name || 'Nguyễn Văn A')}</span></p>
                <p><strong>Tuổi:</strong> <span id="info-patientAge">${patientData.age || '35'}</span></p>
                <p><strong>Giới tính:</strong> <span id="info-patientGender">${patientData.gender || 'Nam'}</span></p>
                <p><strong>Địa chỉ:</strong> <span id="info-patientAddress">${escapeHtml(patientData.address || '123 Nguyễn Trãi, Quận 5, TP.HCM')}</span></p>
                <p><strong>Điện thoại:</strong> <span id="info-patientPhone">${patientData.phone || '0909xxxxxx'}</span></p>
              </div>
              <div>
                <p><strong>Mã:</strong> <span id="info-code">${code}</span></p>
                <p><strong>Ngày lập:</strong> <span id="info-date">${formattedDate}</span></p>
                <p><strong>Bác sĩ:</strong> <span id="info-doctor">${doctor}</span></p>
              </div>
            </div>
            ${showDiagnosisSection ? `
            <div class="diagnosis" id="diagnosis-section">
              <p><strong>Triệu chứng:</strong> <span id="diag-symptoms">${escapeHtml(symptoms || 'Ho, sốt nhẹ')}</span></p>
              <p><strong>Chẩn đoán:</strong> <span id="diag-diagnosis">${escapeHtml(diagnosis || 'Viêm họng cấp')}</span></p>
            </div>
            ` : ''}
            <table class="print-table" id="print-table">
              <thead>
                <tr>${tableHeaders}</tr>
              </thead>
              <tbody id="print-body">${tableRows}</tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="${type === 'prescription' ? 5 : 4}" style="text-align: right; font-weight: bold;">
                    Tổng cộng:
                  </td>
                  <td id="total-sum" style="font-weight: bold;">
                    ${formatNumber(totalSum)} VNĐ
                  </td>
                </tr>
              </tfoot>
            </table>
            <p class="total-text">
              <strong>Số tiền viết bằng chữ:</strong> 
              <span id="total-words">${numberToVietnameseWords(totalSum)}</span>
            </p>
            <div class="footer">
              <div>
                <p><strong>${footerLeft}</strong></p>
                <p>(Ký và ghi rõ họ tên)</p>
                <div class="signature"></div>
              </div>
              <div>
                <p><strong>${footerRight}</strong></p>
                <p>(Ký và ghi rõ họ tên)</p>
                <div class="signature"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    console.log('Print window script loaded successfully');
    let rows = ${JSON.stringify(sanitizedRows)};
    let totalSum = ${totalSum};
    const docType = '${type}';
    
    // Định nghĩa các hàm utility
    function formatNumber(n) { return Number(n || 0).toLocaleString("vi-VN"); }
    
    function numberToVietnameseWords(num) {
      const ones = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
      const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
      const units = ["", "nghìn", "triệu", "tỷ"];
      if (num === 0) return "Không đồng";
      let result = ""; let unitIndex = 0; let numStr = Math.floor(num).toString();
      while (numStr.length > 0) {
        let group = parseInt(numStr.slice(-3)) || 0; numStr = numStr.slice(0, -3);
        if (group > 0) {
          let str = ""; let hundred = Math.floor(group / 100); let ten = Math.floor((group % 100) / 10); let one = group % 10;
          if (hundred > 0) str += ones[hundred] + " trăm";
          if (ten > 1) {str += (str ? " " : "") + tens[ten]; if (one > 0) str += " " + ones[one];}
          else if (ten === 1) {str += (str ? " " : "") + "mười"; if (one > 0) str += " " + ones[one];}
          else if (one > 0) str += (str ? " " : "") + ones[one];
          str += " " + units[unitIndex]; result = (str.trim() + (result ? " " : "") + result).trim();
        }
        unitIndex++;
      }
      return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
    }
    
    // Event delegation cho tất cả các button
    document.addEventListener('click', function(e) {
      console.log('Click detected:', e.target);
      
      // Xử lý nút xóa
      if (e.target.classList.contains('delete-row-btn')) {
        const rowId = parseInt(e.target.getAttribute('data-row-id'));
        console.log('Delete row clicked:', rowId);
        deleteRow(rowId);
        return;
      }
      
      // Xử lý các nút khác
      if (e.target.id === 'add-row-btn') {
        console.log('Add row clicked');
        addRow();
        return;
      }
      
      if (e.target.id === 'apply-btn') {
        console.log('Apply clicked');
        updatePreview();
        return;
      }
      
      if (e.target.id === 'print-btn') {
        console.log('Print clicked');
        printWindow();
        return;
      }
      
      if (e.target.id === 'close-btn') {
        console.log('Close clicked');
        closeWindow();
        return;
      }
      
      // Xử lý toolbar buttons
      if (e.target.hasAttribute('data-style')) {
        const style = e.target.getAttribute('data-style');
        const toolbar = e.target.closest('.toolbar');
        if (toolbar) {
          const field = toolbar.nextElementSibling;
          toggleStyle(field, style);
        }
      }
    });
    
    // Xử lý input với event delegation
    document.addEventListener('input', function(e) {
      if (e.target.matches('[data-field][data-row]')) {
        console.log('Table input detected');
        handleTableInput(e);
      }
    });
    
    // Định nghĩa các hàm chức năng
    function toggleStyle(field, style) {
      try {
        document.execCommand(style);
        field.focus();
      } catch (e) {
        console.error('Error in toggleStyle:', e);
      }
    }
    
    function updatePreview() {
      try {
        console.log('Updating preview...');
        
        // Cập nhật thông tin tài liệu
        const docCode = document.getElementById('docCode').value;
        const docDate = document.getElementById('docDate').value;
        const docDoctor = document.getElementById('docDoctor').value;
        
        document.getElementById('info-code').textContent = docCode;
        document.getElementById('info-date').textContent = new Date(docDate).toLocaleDateString('vi-VN');
        document.getElementById('info-doctor').textContent = docDoctor;
        
        // Cập nhật thông tin bệnh nhân
        const patientName = document.getElementById('patientName').innerHTML;
        const patientAge = document.getElementById('patientAge').value;
        const patientGender = document.getElementById('patientGender').value;
        const patientAddress = document.getElementById('patientAddress').innerHTML;
        const patientPhone = document.getElementById('patientPhone').value;
        
        document.getElementById('info-patientName').innerHTML = patientName;
        document.getElementById('info-patientAge').textContent = patientAge;
        document.getElementById('info-patientGender').textContent = patientGender;
        document.getElementById('info-patientAddress').innerHTML = patientAddress;
        document.getElementById('info-patientPhone').textContent = patientPhone;
        
        // Cập nhật thông tin khám bệnh
        if (docType === 'prescription') {
          const symptoms = document.getElementById('symptoms').innerHTML;
          const diagnosis = document.getElementById('diagnosis').innerHTML;
          document.getElementById('diag-symptoms').innerHTML = symptoms;
          document.getElementById('diag-diagnosis').innerHTML = diagnosis;
        }
        
        // Cập nhật bảng
        const printBody = document.getElementById('print-body');
        printBody.innerHTML = '';
        
        if (rows.length === 0) {
          const colspan = docType === 'prescription' ? 6 : docType === 'service' ? 5 : 5;
          printBody.innerHTML = '<tr><td colspan="' + colspan + '" style="text-align:center;">Không có dữ liệu</td></tr>';
        } else {
          rows.forEach(function(row, i) {
            const tr = document.createElement('tr');
            let rowHtml = '<td style="text-align:center;">' + (i + 1) + '</td>' +
                          '<td>' + (row.name || '') + '</td>';
            
            if (docType === 'prescription') {
              rowHtml += '<td>' + row.qty + '</td>' +
                         '<td>' + (row.dose || '') + '</td>';
            } else if (docType === 'service') {
              rowHtml += '<td>' + (row.note || '') + '</td>';
            } else {
              rowHtml += '<td>' + row.qty + '</td>';
            }
            
            rowHtml += '<td>' + formatNumber(row.unit) + '</td>' +
                       '<td>' + formatNumber(row.total) + '</td>';
            
            tr.innerHTML = rowHtml;
            printBody.appendChild(tr);
          });
        }
        
        // Cập nhật tổng tiền
        totalSum = rows.reduce(function(sum, r) { return sum + (r.total || 0); }, 0);
        document.getElementById('total-sum').textContent = formatNumber(totalSum) + ' VNĐ';
        document.getElementById('total-words').textContent = numberToVietnameseWords(totalSum);
        
        // Cập nhật font và style
        const customFont = document.getElementById('customFontFamily').value;
        const customSize = document.getElementById('customFontSize').value + 'pt';
        const printContainer = document.querySelector('.print-container');
        
        if (printContainer) {
          printContainer.style.fontFamily = customFont + ', serif';
          printContainer.style.fontSize = customSize;
        }
        
        console.log('Preview updated successfully');
      } catch (e) {
        console.error('Error in updatePreview:', e);
      }
    }
    
    function addRow() {
      try {
        const newId = Date.now();
        const newRow = { 
          id: newId, 
          name: '', 
          qty: 1, 
          unit: 0, 
          total: 0 
        };
        
        if (docType === 'prescription') {
          newRow.dose = '';
        } else if (docType === 'service') {
          newRow.note = '';
        }
        
        rows.push(newRow);
        
        const tbody = document.getElementById('table-body');
        const tr = document.createElement('tr');
        
        let rowHtml = '<td>' + rows.length + '</td>' +
          '<td><div class="editable-field" contenteditable="true" data-field="name" data-row="' + newId + '"></div></td>';
        
        if (docType === 'prescription') {
          rowHtml += '<td><input type="number" min="1" value="1" data-field="qty" data-row="' + newId + '"></td>' +
            '<td><div class="editable-field" contenteditable="true" data-field="dose" data-row="' + newId + '"></div></td>';
        } else if (docType === 'service') {
          rowHtml += '<td><div class="editable-field" contenteditable="true" data-field="note" data-row="' + newId + '"></div></td>';
        } else {
          rowHtml += '<td><input type="number" min="1" value="1" data-field="qty" data-row="' + newId + '"></td>';
        }
        
        rowHtml += '<td><input type="number" min="0" value="0" data-field="unit" data-row="' + newId + '"></td>' +
          '<td><input type="number" min="0" value="0" readonly data-row="' + newId + '"></td>' +
          '<td style="text-align: center"><button class="btn danger btn-sm delete-row-btn" data-row-id="' + newId + '">Xóa</button></td>';
        
        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
        updatePreview();
        
        console.log('Row added successfully');
      } catch (e) {
        console.error('Error in addRow:', e);
      }
    }
    
    function deleteRow(id) {
      try {
        console.log('Deleting row:', id);
        rows = rows.filter(function(r) { return r.id !== id; });
        const tbody = document.getElementById('table-body');
        
        // Cập nhật toàn bộ table
        let html = '';
        if (rows.length > 0) {
          rows.forEach(function(row, i) {
            html += '<tr><td>' + (i + 1) + '</td>' +
              '<td><div class="editable-field" contenteditable="true" data-field="name" data-row="' + row.id + '">' + (row.name || '') + '</div></td>';
            
            if (docType === 'prescription') {
              html += '<td><input type="number" min="1" value="' + (row.qty || 1) + '" data-field="qty" data-row="' + row.id + '"></td>' +
                '<td><div class="editable-field" contenteditable="true" data-field="dose" data-row="' + row.id + '">' + (row.dose || '') + '</div></td>';
            } else if (docType === 'service') {
              html += '<td><div class="editable-field" contenteditable="true" data-field="note" data-row="' + row.id + '">' + (row.note || '') + '</div></td>';
            } else {
              html += '<td><input type="number" min="1" value="' + (row.qty || 1) + '" data-field="qty" data-row="' + row.id + '"></td>';
            }
            
            html += '<td><input type="number" min="0" value="' + (row.unit || 0) + '" data-field="unit" data-row="' + row.id + '"></td>' +
              '<td><input type="number" min="0" value="' + (row.total || 0) + '" readonly data-row="' + row.id + '"></td>' +
              '<td style="text-align: center"><button class="btn danger btn-sm delete-row-btn" data-row-id="' + row.id + '">Xóa</button></td></tr>';
          });
          tbody.innerHTML = html;
        } else {
          const colspan = docType === 'prescription' ? 7 : docType === 'service' ? 6 : 6;
          tbody.innerHTML = '<tr><td colspan="' + colspan + '" style="text-align:center;">Không có dữ liệu</td></tr>';
        }
        updatePreview();
        
        console.log('Row deleted successfully');
      } catch (e) {
        console.error('Error in deleteRow:', e);
      }
    }
    
    function handleTableInput(e) {
      try {
        const rowId = parseInt(e.target.dataset.row);
        const field = e.target.dataset.field;
        const rowIndex = rows.findIndex(function(r) { return r.id === rowId; });
        
        if (rowIndex > -1) {
          if (field === 'name' || field === 'dose' || field === 'note') {
            rows[rowIndex][field] = e.target.textContent || e.target.value;
          } else {
            rows[rowIndex][field] = parseFloat(e.target.value) || 0;
          }
          
          if (field === 'qty' || field === 'unit') {
            rows[rowIndex].total = (parseFloat(rows[rowIndex].qty) || 0) * (parseFloat(rows[rowIndex].unit) || 0);
            const totalInput = e.target.closest('tr').querySelector('input[readonly]');
            if (totalInput) totalInput.value = rows[rowIndex].total;
          }
        }
      } catch (e) {
        console.error('Error in handleTableInput:', e);
      }
    }
    
    function printWindow() {
      try {
        updatePreview();
        window.print();
      } catch (e) {
        console.error('Error in printWindow:', e);
      }
    }
    
    function closeWindow() {
      try {
        if (confirm('Bạn có chắc muốn đóng cửa sổ này?')) {
          window.close();
        }
      } catch (e) {
        console.error('Error in closeWindow:', e);
      }
    }
    
    // Khởi tạo khi trang load xong
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM fully loaded and initialized');
      updatePreview();
    });
  </script>
</body>
</html>`;

  try {
    console.log('Generated HTML length:', html.length);
    const printWin = window.open('', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
    if (!printWin) {
      console.error('Failed to open new window. Please check if pop-ups are blocked.');
      alert('Không thể mở cửa sổ mới. Vui lòng cho phép pop-up cho trang web này.');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    
    // Focus vào cửa sổ mới
    printWin.focus();
  } catch (e) {
    console.error('Error writing to new window:', e);
    alert('Có lỗi xảy ra khi mở cửa sổ in: ' + e.message);
  }
};