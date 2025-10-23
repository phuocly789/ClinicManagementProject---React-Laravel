export const printDocument = (type, patientData, prescriptionRows, symptoms, diagnosis, services) => {
  if (!patientData || (type === 'prescription' && prescriptionRows.length === 0) || (type === 'service' && !services) || (type === 'invoice' && !prescriptionRows && !services)) return;

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
  const code = '';
  const doctor = '';
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

  // Determine title, table headers, and footer based on type
  let title = '';
  let tableHeaders = '';
  let tableRows = '';
  let footerLeft = 'Bệnh nhân';
  let footerRight = 'Bác sĩ';
  let showDiagnosisSection = true;

  if (type === 'prescription') {
    title = 'TOA THUỐC';
    tableHeaders = '<th>STT</th><th>Tên thuốc</th><th>Số lượng</th><th>Liều dùng</th><th>Đơn giá</th><th>Thành tiền</th>';
    tableRows = rows.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td id="print-name-${i}">${row.name}</td>
        <td id="print-qty-${i}">${row.qty}</td>
        <td id="print-dose-${i}">${row.dose}</td>
        <td id="print-unit-${i}">${formatNumber(row.unit)}</td>
        <td id="print-total-${i}">${formatNumber(row.total)}</td>
      </tr>
    `).join('');
  } else if (type === 'service') {
    title = 'PHIẾU CHỈ ĐỊNH DỊCH VỤ CẬN LÂM SÀNG';
    tableHeaders = '<th>STT</th><th>Tên dịch vụ</th><th>Ghi chú</th><th>Đơn giá</th><th>Thành tiền</th>';
    tableRows = rows.length > 0
      ? rows.map((row, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td id="print-name-${i}">${row.name}</td>
            <td id="print-note-${i}">${row.note}</td>
            <td id="print-unit-${i}">${formatNumber(row.unit)}</td>
            <td id="print-total-${i}">${formatNumber(row.total)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" style="text-align:center;">Không có dịch vụ nào được chọn</td></tr>';
    footerRight = 'Bác sĩ chỉ định';
  } else if (type === 'invoice') {
    title = 'HÓA ĐƠN THANH TOÁN';
    tableHeaders = '<th>STT</th><th>Tên dịch vụ/thuốc</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th>';
    tableRows = rows.length > 0
      ? rows.map((row, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td id="print-name-${i}">${row.name}</td>
            <td id="print-qty-${i}">${row.qty}</td>
            <td id="print-unit-${i}">${formatNumber(row.unit)}</td>
            <td id="print-total-${i}">${formatNumber(row.total)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" style="text-align:center;">Không có dữ liệu</td></tr>';
    footerRight = 'Người lập hóa đơn';
    showDiagnosisSection = false;
  }

  const html = '<!DOCTYPE html>' +
    '<html lang="vi">' +
    '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>Chỉnh sửa & In ' + title + '</title>' +
      '<style>' +
        'html, body { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; }' +
        ':root { --page-width: 210mm; --page-height: 297mm; --mm: 1mm; --font-family: "Times New Roman", serif; --font-size: 12px; --global-bold: normal; --global-italic: normal; --global-underline: none; }' +
        'body { font-family: var(--font-family); font-size: var(--font-size); font-weight: var(--global-bold); font-style: var(--global-italic); text-decoration: var(--global-underline); color: #000; background: #fff; line-height: 1.3; box-sizing: border-box; }' +
        '.app { display: flex; gap: 0; align-items: flex-start; max-width: 100vw; margin: 0; padding: 0; background: #fff; box-sizing: border-box; height: 100vh; }' +
        '.controls { width: 440px; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); overflow-y: auto; max-height: 100vh; }' +
        '.controls h3 { margin: 0 0 16px; font-size: 20px; color: #333; font-weight: 600; }' +
        '.style-section { border: 1px solid #e0e0e0; padding: 10px; border-radius: 6px; margin-bottom: 10px; background: #f9f9f9; }' +
        '.style-section h4 { margin: 0 0 10px; font-size: 16px; color: #333; }' +
        '.toolbar { display: flex; gap: 5px; margin-bottom: 5px; padding: 5px; background: #f0f0f0; border-radius: 4px; }' +
        '.toolbar button { padding: 4px 8px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 3px; font-size: 12px; }' +
        '.toolbar button:hover { background: #e0e0e0; }' +
        '.toolbar button.active { background: #0b63d6; color: #fff; }' +
        '.editable-field { min-height: 40px; padding: 8px; border: 1px solid #d0d0d0; border-radius: 6px; background: #fafafa; font-family: var(--font-family); font-size: var(--font-size); line-height: 1.4; }' +
        '.editable-field:focus { border-color: #0b63d6; outline: none; background: #fff; }' +
        'label { display: block; font-size: 14px; margin: 10px 0 5px; color: #444; font-weight: 500; }' +
        'input[type="text"], input[type="number"], input[type="date"], select { width: 100%; padding: 10px; box-sizing: border-box; font-size: 14px; border: 1px solid #d0d0d0; border-radius: 6px; background: #fafafa; transition: border-color 0.2s; }' +
        'input:focus, select:focus { border-color: #0b63d6; outline: none; }' +
        '.row { display: flex; gap: 12px; }' +
        '.row > * { flex: 1; }' +
        '.btn { display: inline-block; padding: 10px 16px; margin: 8px 8px 0 0; border-radius: 6px; cursor: pointer; border: 1px solid #888; background: #fff; font-size: 14px; transition: background-color 0.2s, color 0.2s; }' +
        '.btn.primary { background: #0b63d6; color: #fff; border-color: #0b63d6; }' +
        '.btn.primary:hover { background: #094bb0; }' +
        '.btn.danger { background: #f44336; color: #fff; border-color: #f44336; }' +
        '.btn.danger:hover { background: #d32f2f; }' +
        '.btn.apply { background: #4caf50; color: #fff; border-color: #4caf50; }' +
        '.btn.apply:hover { background: #45a049; }' +
        '.table-edit { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }' +
        '.table-edit th, .table-edit td { border: 1px solid #e0e0e0; padding: 8px; text-align: left; }' +
        '.table-edit th { background: #f7f7f7; text-align: center; font-weight: 600; color: #333; }' +
        '.table-edit .editable-field { min-height: 30px; padding: 4px; border: none; background: transparent; width: 100%; }' +
        '.preview-wrap { flex: 1; height: 100vh; }' +
        '.page { width: var(--page-width); height: var(--page-height); margin: 0 auto; background: #fff; box-shadow: none; padding: 0; box-sizing: border-box; position: relative; overflow: hidden; page-break-after: avoid; }' +
        '@page { size: A4 portrait; margin: 0mm; orientation: portrait; max-height: 100%; max-width: 100%; }' +
        '.print-container { border: 1.5px solid #333; height: 100%; box-sizing: border-box; padding: 5px; position: relative; z-index: 1; page-break-inside: avoid; font-family: var(--font-family); font-size: var(--font-size); font-weight: var(--global-bold); font-style: var(--global-italic); text-decoration: var(--global-underline); line-height: 1.2; }' +
        '.watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 50px; color: rgba(0, 0, 0, 0.1); font-weight: 700; text-transform: uppercase; pointer-events: none; z-index: 0; white-space: nowrap; }' +
        '.header { text-align: center; border-bottom: 1.5px solid #333; padding-bottom: 6px; margin-bottom: 6px; }' +
        '.header h2 { margin: 0; font-size: 1.5em; text-transform: uppercase; color: #222; font-weight: 700; }' +
        '.header p { margin: 2px 0; font-size: 0.9em; color: #444; }' +
        '.title { text-align: center; margin: 8px 0 12px; }' +
        '.title h3 { margin: 0; font-size: 1.3em; font-weight: 600; color: #222; }' +
        '.info { display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 8px; gap: 8px; }' +
        '.info div p { margin: 2px 0; color: #333; }' +
        '.info div p strong { color: #222; }' +
        '.diagnosis { font-size: 0.9em; margin-bottom: 8px; }' +
        '.diagnosis p { margin: 2px 0; }' +
        '.diagnosis p strong { color: #222; }' +
        'table.print-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-bottom: 12px; }' +
        'table.print-table th, table.print-table td { border: 1px solid #333; padding: 4px 6px; text-align: left; }' +
        'table.print-table th { background: #f0f0f0; text-align: center; font-weight: 600; color: #222; }' +
        'table.print-table td { color: #333; }' +
        'table.print-table .total-row td { font-weight: 600; background: #f7f7f7; }' +
        '.total-text { font-size: 0.9em; margin-bottom: 12px; color: #222; }' +
        '.total-text strong { color: #222; }' +
        '.footer { display: flex; justify-content: space-between; margin-top: 20px; font-size: 0.9em; color: #333; }' +
        '.footer div { width: 45%; text-align: center; }' +
        '.signature { margin-top: 40px; font-style: italic; border-top: 1px solid #333; padding-top: 6px; width: 200px; margin-left: auto; margin-right: auto; }' +
        '@media print {' +
          'html, body { height: 100% !important; width: 100% !important; overflow: hidden !important; }' +
          'body { background: #fff !important; margin: 0 !important; padding: 0 !important; line-height: 1.15 !important; }' +
          '.app { gap: 0 !important; padding: 0 !important; background: #fff !important; height: 100vh !important; }' +
          '.controls { display: none !important; }' +
          '.page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: var(--page-width) !important; height: var(--page-height) !important; overflow: hidden !important; }' +
          '@page { size: A4 portrait !important; margin: 0mm !important; orientation: portrait !important; }' +
          '.print-container { border: none !important; padding: 3mm !important; height: 100% !important; box-sizing: border-box !important; page-break-inside: avoid !important; }' +
          '.watermark { color: rgba(0, 0, 0, 0.05) !important; }' +
          'table.print-table { font-size: 0.85em !important; margin-bottom: 8px !important; }' +
          'table.print-table th, table.print-table td { padding: 3px 4px !important; }' +
          '.header { padding-bottom: 4px !important; margin-bottom: 4px !important; }' +
          '.info { gap: 6px !important; }' +
          '.diagnosis { margin-bottom: 6px !important; }' +
          '.footer { margin-top: 20px !important; }' +
          '.signature { margin-top: 30px !important; }' +
          '.header, .info, .diagnosis, .total-text, .footer, .signature { page-break-inside: avoid !important; }' +
          '.print-container > * { page-break-inside: avoid !important; }' +
          'body { -webkit-print-color-adjust: exact !important; }' +
        '}' +
        '.btn-sm { padding: 4px 8px; font-size: 12px; }' +
      '</style>' +
    '</head>' +
    '<body>' +
      '<div class="app">' +
        '<div class="controls">' +
          '<h3>Chỉnh sửa phiếu / toa</h3>' +
          '<div class="style-section">' +
            '<h4>Thiết lập font & style toàn bộ</h4>' +
            '<label>Font chữ</label>' +
            '<select id="customFontFamily">' +
              '<option value="Times New Roman">Times New Roman</option>' +
              '<option value="Arial">Arial</option>' +
              '<option value="Helvetica">Helvetica</option>' +
              '<option value="Georgia">Georgia</option>' +
              '<option value="Verdana">Verdana</option>' +
              '<option value="Courier New">Courier New</option>' +
            '</select>' +
            '<label>Kích cỡ chữ (px)</label>' +
            '<input type="number" id="customFontSize" value="12" min="8" max="24" placeholder="Nhập size (px)">' +
            '<label>Kiểu chữ toàn bộ</label>' +
            '<select id="globalStyle">' +
              '<option value="normal">Bình thường</option>' +
              '<option value="bold">Đậm</option>' +
              '<option value="italic">Nghiêng</option>' +
              '<option value="underline">Gạch chân</option>' +
              '<option value="bold italic">Đậm & Nghiêng</option>' +
              '<option value="bold underline">Đậm & Gạch chân</option>' +
              '<option value="italic underline">Nghiêng & Gạch chân</option>' +
              '<option value="bold italic underline">Đậm, Nghiêng & Gạch chân</option>' +
            '</select>' +
          '</div>' +
          '<label>Loại tài liệu</label>' +
          '<select id="type">' +
            '<option value="prescription"' + (type === 'prescription' ? ' selected' : '') + '>Toa thuốc</option>' +
            '<option value="service"' + (type === 'service' ? ' selected' : '') + '>Phiếu chỉ định dịch vụ</option>' +
            '<option value="invoice"' + (type === 'invoice' ? ' selected' : '') + '>Hóa đơn thanh toán</option>' +
          '</select>' +
          '<label>Họ tên bệnh nhân</label>' +
          '<div class="editable-field" contenteditable="true" id="patientName">' + (patientData.name || 'Nguyễn Văn A') + '</div>' +
          '<div class="row">' +
            '<div><label>Tuổi</label><input type="number" min="0" id="patientAge" value="' + (patientData.age || '35') + '"></div>' +
            '<div><label>Giới tính</label><input type="text" id="patientGender" value="' + (patientData.gender || 'Nam') + '"></div>' +
          '</div>' +
          '<label>Địa chỉ</label>' +
          '<div class="editable-field" contenteditable="true" id="patientAddress">' + (patientData.address || '123 Nguyễn Trãi, Quận 5, TP.HCM') + '</div>' +
          '<label>Điện thoại</label>' +
          '<input type="text" id="patientPhone" value="' + (patientData.phone || '0909xxxxxx') + '">' +
          '<div class="row">' +
            '<div><label>Mã phiếu / toa</label><input type="text" id="code" value="' + code + '"></div>' +
            '<div><label>Ngày lập</label><input type="date" id="date" value="' + currentDate + '"></div>' +
          '</div>' +
          '<label>Bác sĩ</label>' +
          '<input type="text" id="doctor" value="' + doctor + '">' +
          (type === 'prescription' ? `
            <label>Triệu chứng</label>
            <div class="toolbar" data-field="symptoms">
              <button type="button" onclick="toggleBold('symptoms')" id="bold-symptoms">B</button>
              <button type="button" onclick="toggleItalic('symptoms')" id="italic-symptoms">I</button>
              <button type="button" onclick="toggleUnderline('symptoms')" id="underline-symptoms">U</button>
            </div>
            <div id="symptoms" class="editable-field" contenteditable="true">${symptoms || 'Ho, sốt nhẹ'}</div>
            <label>Chẩn đoán</label>
            <div class="toolbar" data-field="diagnosis">
              <button type="button" onclick="toggleBold('diagnosis')" id="bold-diagnosis">B</button>
              <button type="button" onclick="toggleItalic('diagnosis')" id="italic-diagnosis">I</button>
              <button type="button" onclick="toggleUnderline('diagnosis')" id="underline-diagnosis">U</button>
            </div>
            <div id="diagnosis" class="editable-field" contenteditable="true">${diagnosis || 'Viêm họng cấp'}</div>
          ` : '') +
          '<h4>Danh sách ' + (type === 'prescription' ? 'thuốc' : type === 'service' ? 'dịch vụ' : 'thuốc/dịch vụ') + '</h4>' +
          '<table class="table-edit">' +
            '<thead><tr>' +
              (type === 'prescription' ?
                '<th>#</th><th>Tên thuốc</th><th>Số lượng</th><th>Liều dùng</th><th>Đơn giá (VNĐ)</th><th>Thành tiền (VNĐ)</th><th>Hành động</th>' :
                type === 'service' ?
                '<th>#</th><th>Tên dịch vụ</th><th>Ghi chú</th><th>Đơn giá (VNĐ)</th><th>Thành tiền (VNĐ)</th><th>Hành động</th>' :
                '<th>#</th><th>Tên dịch vụ/thuốc</th><th>Số lượng</th><th>Đơn giá (VNĐ)</th><th>Thành tiền (VNĐ)</th><th>Hành động</th>'
              ) +
            '</tr></thead>' +
            '<tbody id="table-body">' +
              (rows.length > 0 ? rows.map((row, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><div class="editable-field" contenteditable="true" data-field="name" data-row="${row.id}">${row.name}</div></td>
                  ${type === 'prescription' ? `
                    <td><input type="number" min="1" value="${row.qty}" data-field="qty" data-row="${row.id}"></td>
                    <td><div class="editable-field" contenteditable="true" data-field="dose" data-row="${row.id}">${row.dose}</div></td>
                  ` : type === 'service' ? `
                    <td><div class="editable-field" contenteditable="true" data-field="note" data-row="${row.id}">${row.note}</div></td>
                  ` : `
                    <td><input type="number" min="1" value="${row.qty}" data-field="qty" data-row="${row.id}"></td>
                  `}
                  <td><input type="number" min="0" value="${row.unit}" data-field="unit" data-row="${row.id}"></td>
                  <td><input type="number" min="0" value="${row.total}" readonly data-row="${row.id}"></td>
                  <td style="text-align: center"><button class="btn danger btn-sm" onclick="deleteRow(${row.id})">Xóa</button></td>
                </tr>
              `).join('') : `
                <tr><td colspan="${type === 'prescription' ? 7 : 6}" style="text-align:center;">Không có dữ liệu</td></tr>
              `) +
            '</tbody>' +
          '</table>' +
          '<button class="btn" onclick="addRow()">+ Thêm hàng</button>' +
          '<button class="btn apply" onclick="updatePreview()">Áp dụng</button>' +
          '<button class="btn primary" onclick="printWindow()">In / Lưu PDF</button>' +
          '<button class="btn" onclick="closeWindow()">Đóng</button>' +
        '</div>' +
        '<div class="preview-wrap">' +
          '<div class="page">' +
            '<div class="watermark">MẪU</div>' +
            '<div class="print-container">' +
              '<div class="header">' +
                '<h2>PHÒNG KHÁM XYZ</h2>' +
                '<p>Địa chỉ: Số 53 Võ Văn Ngân, TP. Thủ Đức</p>' +
                '<p>Điện thoại: 024.3574.7788 — MST: 0100688738</p>' +
              '</div>' +
              '<div class="title" id="title"><h3>' + title + '</h3></div>' +
              '<div class="info" id="info">' +
                '<div>' +
                  '<p><strong>Họ tên:</strong> <span id="info-patientName">' + (patientData.name || 'Nguyễn Văn A') + '</span></p>' +
                  '<p><strong>Tuổi:</strong> <span id="info-patientAge">' + (patientData.age || '35') + '</span></p>' +
                  '<p><strong>Giới tính:</strong> <span id="info-patientGender">' + (patientData.gender || 'Nam') + '</span></p>' +
                  '<p><strong>Địa chỉ:</strong> <span id="info-patientAddress">' + (patientData.address || '123 Nguyễn Trãi, Quận 5, TP.HCM') + '</span></p>' +
                  '<p><strong>Điện thoại:</strong> <span id="info-patientPhone">' + (patientData.phone || '0909xxxxxx') + '</span></p>' +
                '</div>' +
                '<div>' +
                  '<p><strong>Mã:</strong> <span id="info-code">' + code + '</span></p>' +
                  '<p><strong>Ngày lập:</strong> <span id="info-date">' + formattedDate + '</span></p>' +
                  '<p><strong>Bác sĩ:</strong> <span id="info-doctor">' + doctor + '</span></p>' +
                '</div>' +
              '</div>' +
              (showDiagnosisSection ? `
                <div class="diagnosis" id="diagnosis">
                  <p><strong>Triệu chứng:</strong> <span id="diag-symptoms">${symptoms || 'Ho, sốt nhẹ'}</span></p>
                  <p><strong>Chẩn đoán:</strong> <span id="diag-diagnosis">${diagnosis || 'Viêm họng cấp'}</span></p>
                </div>
              ` : '') +
              '<table class="print-table" id="print-table">' +
                '<thead><tr>' + tableHeaders + '</tr></thead>' +
                '<tbody id="print-body">' + tableRows + '</tbody>' +
                '<tfoot><tr class="total-row"><td colspan="' + (type === 'prescription' ? 5 : 4) + '" style="text-align: right">Tổng cộng:</td><td id="total-sum">' + formatNumber(totalSum) + ' VNĐ</td></tr></tfoot>' +
              '</table>' +
              '<p class="total-text"><strong>Số tiền viết bằng chữ:</strong> <span id="total-words">' + numberToVietnameseWords(totalSum) + '</span></p>' +
              '<div class="footer">' +
                '<div><p><strong>' + footerLeft + '</strong></p><p>(Ký và ghi rõ họ tên)</p><div class="signature"></div></div>' +
                '<div><p><strong>' + footerRight + '</strong></p><p>(Ký và ghi rõ họ tên)</p><div class="signature"></div></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<script>' +
        '// Initialize rows and total sum' +
        'let rows = ' + JSON.stringify(rows) + '; let totalSum = ' + totalSum + ';' +
        'const docType = "' + type + '";' +
        'function formatNumber(n) { return Number(n || 0).toLocaleString("vi-VN"); }' +
        'function numberToVietnameseWords(num) {' +
          'const ones = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];' +
          'const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];' +
          'const units = ["", "nghìn", "triệu", "tỷ"];' +
          'if (num === 0) return "Không đồng";' +
          'let result = ""; let unitIndex = 0; let numStr = Math.floor(num).toString();' +
          'while (numStr.length > 0) {' +
            'let group = parseInt(numStr.slice(-3)) || 0; numStr = numStr.slice(0, -3);' +
            'if (group > 0) {' +
              'let str = ""; let hundred = Math.floor(group / 100); let ten = Math.floor((group % 100) / 10); let one = group % 10;' +
              'if (hundred > 0) str += ones[hundred] + " trăm";' +
              'if (ten > 1) {str += (str ? " " : "") + tens[ten]; if (one > 0) str += " " + ones[one];}' +
              'else if (ten === 1) {str += (str ? " " : "") + "mười"; if (one > 0) str += " " + ones[one];}' +
              'else if (one > 0) str += (str ? " " : "") + ones[one];' +
              'str += " " + units[unitIndex]; result = (str.trim() + (result ? " " : "") + result).trim();' +
            '}' +
            'unitIndex++;' +
          '}' +
          'return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";' +
        '}' +
        '// Toggle text styles for symptoms and diagnosis' +
        'function toggleBold(fieldId) { toggleStyle(fieldId, "bold", "strong"); }' +
        'function toggleItalic(fieldId) { toggleStyle(fieldId, "italic", "em"); }' +
        'function toggleUnderline(fieldId) { toggleStyle(fieldId, "underline", "u"); }' +
        'function toggleStyle(fieldId, style, tag) {' +
          'const editable = document.getElementById(fieldId);' +
          'const selection = window.getSelection();' +
          'if (selection.rangeCount && editable && editable.contains(selection.anchorNode)) {' +
            'const range = selection.getRangeAt(0);' +
            'const selectedText = range.toString().trim();' +
            'if (selectedText) {' +
              'const element = document.createElement(tag);' +
              'element.appendChild(range.extractContents());' +
              'range.insertNode(element);' +
              'selection.removeAllRanges();' +
              'selection.addRange(range);' +
              'updateStyleState(fieldId, style);' +
            '}' +
          '}' +
        '}' +
        'function updateStyleState(fieldId, style) {' +
          'const selection = window.getSelection();' +
          'if (selection.rangeCount) {' +
            'const range = selection.getRangeAt(0);' +
            'const container = range.commonAncestorContainer;' +
            'const btn = document.getElementById(style + "-" + fieldId);' +
            'if (btn) {' +
              'const isActive = style === "bold" ? (window.getComputedStyle(container).fontWeight === "bold" || parseInt(window.getComputedStyle(container).fontWeight) >= 600) : ' +
                              'style === "italic" ? window.getComputedStyle(container).fontStyle === "italic" : ' +
                              'style === "underline" ? window.getComputedStyle(container).textDecoration.includes("underline") : false;' +
              'btn.classList.toggle("active", isActive);' +
            '}' +
          '}' +
        '}' +
        '// Update global styles' +
        'function updateGlobalStyle() {' +
          'const styleSelect = document.getElementById("globalStyle").value;' +
          'const styles = {' +
            'normal: { bold: "normal", italic: "normal", underline: "none" },' +
            'bold: { bold: "bold", italic: "normal", underline: "none" },' +
            'italic: { bold: "normal", italic: "italic", underline: "none" },' +
            'underline: { bold: "normal", italic: "normal", underline: "underline" },' +
            '"bold italic": { bold: "bold", italic: "italic", underline: "none" },' +
            '"bold underline": { bold: "bold", italic: "normal", underline: "underline" },' +
            '"italic underline": { bold: "normal", italic: "italic", underline: "underline" },' +
            '"bold italic underline": { bold: "bold", italic: "italic", underline: "underline" }' +
          '};' +
          'const { bold, italic, underline } = styles[styleSelect];' +
          'document.documentElement.style.setProperty("--global-bold", bold);' +
          'document.documentElement.style.setProperty("--global-italic", italic);' +
          'document.documentElement.style.setProperty("--global-underline", underline);' +
        '}' +
        '// Update preview based on input changes' +
        'function updatePreview() {' +
          'const typeEl = document.getElementById("type");' +
          'const titleText = typeEl.value === "prescription" ? "TOA THUỐC" : typeEl.value === "service" ? "PHIẾU CHỈ ĐỊNH DỊCH VỤ CẬN LÂM SÀNG" : "HÓA ĐƠN THANH TOÁN";' +
          'document.getElementById("title").innerHTML = "<h3>" + titleText + "</h3>";' +
          'const customFont = document.getElementById("customFontFamily").value;' +
          'const customSize = document.getElementById("customFontSize").value + "px";' +
          'if (customFont) document.documentElement.style.setProperty("--font-family", customFont + ", serif");' +
          'if (customSize) document.documentElement.style.setProperty("--font-size", customSize);' +
          'updateGlobalStyle();' +
          '// Update patient info, code, doctor' +
          '["patientName", "patientAge", "patientGender", "patientAddress", "patientPhone", "code", "doctor"].forEach(id => {' +
            'const el = document.getElementById(id); if (el) {' +
              'const targetId = id === "symptoms" ? "diag-symptoms" : id === "diagnosis" ? "diag-diagnosis" : "info-" + id.replace("patient", "").toLowerCase();' +
              'const targetEl = document.getElementById(targetId); if (targetEl) targetEl.innerHTML = el.innerHTML || el.value;' +
            '}' +
          '});' +
          'document.getElementById("info-date").textContent = new Date(document.getElementById("date").value || "' + currentDate + '").toLocaleDateString("vi-VN");' +
          'if (docType === "prescription") {' +
            'const symptomsEl = document.getElementById("symptoms"); const diagnosisEl = document.getElementById("diagnosis");' +
            'if (symptomsEl) document.getElementById("diag-symptoms").innerHTML = symptomsEl.innerHTML;' +
            'if (diagnosisEl) document.getElementById("diag-diagnosis").innerHTML = diagnosisEl.innerHTML;' +
          '}' +
          '// Update table rows' +
          'const printBody = document.getElementById("print-body"); printBody.innerHTML = "";' +
          'if (rows.length === 0) {' +
            'const colspan = docType === "prescription" ? 6 : 5;' +
            'printBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;">Không có dữ liệu</td></tr>`;' +
          '} else {' +
            'rows.forEach((row, i) => {' +
              'const tr = document.createElement("tr");' +
              'tr.innerHTML = `<td style="text-align:center;">${i + 1}</td>` + ' +
                '(docType === "prescription" ? ' +
                  '`<td id="print-name-${i}">${getRowText("name", i)}</td><td id="print-qty-${i}">${row.qty}</td><td id="print-dose-${i}">${getRowText("dose", i)}</td>` : ' +
                  'docType === "service" ? ' +
                  '`<td id="print-name-${i}">${getRowText("name", i)}</td><td id="print-note-${i}">${getRowText("note", i)}</td>` : ' +
                  '`<td id="print-name-${i}">${getRowText("name", i)}</td><td id="print-qty-${i}">${row.qty}</td>`' +
                ') + ' +
                '`<td id="print-unit-${i}">${formatNumber(row.unit)}</td><td id="print-total-${i}">${formatNumber(row.total)}</td>`;' +
              'printBody.appendChild(tr);' +
            '});' +
          '}' +
          'totalSum = rows.reduce((sum, r) => sum + r.total, 0);' +
          'document.getElementById("total-sum").textContent = formatNumber(totalSum) + " VNĐ";' +
          'document.getElementById("total-words").textContent = numberToVietnameseWords(totalSum);' +
        '}' +
        'function getRowText(field, i) {' +
          'const el = document.querySelector(`[data-field="${field}"][data-row="${rows[i].id}"]`);' +
          'return el ? el.innerText : rows[i][field];' +
        '}' +
        '// Add new row to table' +
        'function addRow() {' +
          'const newId = Date.now();' +
          'rows.push({ id: newId, name: "", qty: 1, ' + (type === 'prescription' ? 'dose: "", ' : type === 'service' ? 'note: "", ' : '') + 'unit: 0, total: 0 });' +
          'const tbody = document.getElementById("table-body"); const tr = document.createElement("tr");' +
          'tr.innerHTML = `<td>${rows.length}</td>` + ' +
            '`<td><div class="editable-field" contenteditable="true" data-field="name" data-row="${newId}" oninput="handleTableInput(event)"></div></td>` + ' +
            (docType === "prescription" ?
              '`<td><input type="number" min="1" value="1" data-field="qty" data-row="${newId}" oninput="handleTableInput(event)"></td>` + ' +
              '`<td><div class="editable-field" contenteditable="true" data-field="dose" data-row="${newId}" oninput="handleTableInput(event)"></div></td>`' :
              docType === "service" ?
              '`<td><div class="editable-field" contenteditable="true" data-field="note" data-row="${newId}" oninput="handleTableInput(event)"></div></td>`' :
              '`<td><input type="number" min="1" value="1" data-field="qty" data-row="${newId}" oninput="handleTableInput(event)"></td>`'
            ) +
            '`<td><input type="number" min="0" value="0" data-field="unit" data-row="${newId}" oninput="handleTableInput(event)"></td>` + ' +
            '`<td><input type="number" min="0" value="0" readonly data-row="${newId}"></td>` + ' +
            '`<td style="text-align: center"><button class="btn danger btn-sm" onclick="deleteRow(${newId})">Xóa</button></td>`;' +
          'tbody.appendChild(tr); updatePreview();' +
        '}' +
        '// Delete row from table' +
        'function deleteRow(id) {' +
          'rows = rows.filter(r => r.id !== id);' +
          'const tbody = document.getElementById("table-body");' +
          'tbody.innerHTML = rows.length > 0 ? rows.map((row, i) => `<tr><td>${i + 1}</td>` + ' +
            '`<td><div class="editable-field" contenteditable="true" data-field="name" data-row="${row.id}" oninput="handleTableInput(event)">${row.name}</div></td>` + ' +
            (docType === "prescription" ?
              '`<td><input type="number" min="1" value="${row.qty}" data-field="qty" data-row="${row.id}" oninput="handleTableInput(event)"></td>` + ' +
              '`<td><div class="editable-field" contenteditable="true" data-field="dose" data-row="${row.id}" oninput="handleTableInput(event)">${row.dose}</div></td>`' :
              docType === "service" ?
              '`<td><div class="editable-field" contenteditable="true" data-field="note" data-row="${row.id}" oninput="handleTableInput(event)">${row.note}</div></td>`' :
              '`<td><input type="number" min="1" value="${row.qty}" data-field="qty" data-row="${row.id}" oninput="handleTableInput(event)"></td>`'
            ) +
            '`<td><input type="number" min="0" value="${row.unit}" data-field="unit" data-row="${row.id}" oninput="handleTableInput(event)"></td>` + ' +
            '`<td><input type="number" min="0" value="${row.total}" readonly data-row="${row.id}"></td>` + ' +
            '`<td style="text-align: center"><button class="btn danger btn-sm" onclick="deleteRow(${row.id})">Xóa</button></td></tr>`).join("") : ' +
            '`<tr><td colspan="${docType === "prescription" ? 7 : 6}" style="text-align:center;">Không có dữ liệu</td></tr>`;' +
          'updatePreview();' +
        '}' +
        '// Handle table input changes' +
        'function handleTableInput(e) {' +
          'const rowId = parseInt(e.target.dataset.row); const field = e.target.dataset.field; const rowIndex = rows.findIndex(r => r.id === rowId);' +
          'if (rowIndex > -1) {' +
            'if (field === "name" || field === "dose" || field === "note") { rows[rowIndex][field] = e.target.innerText; }' +
            'else { rows[rowIndex][field] = e.target.value; }' +
            'if (field === "qty" || field === "unit") {' +
              'rows[rowIndex].total = parseFloat(rows[rowIndex].qty || 0) * parseFloat(rows[rowIndex].unit || 0);' +
              'const totalInput = e.target.closest("tr").querySelector("input[readonly]");' +
              'if (totalInput) totalInput.value = rows[rowIndex].total;' +
            '}' +
          '}' +
        '}' +
        '// Print or save as PDF' +
        'function printWindow() { updatePreview(); window.print(); }' +
        '// Close window with confirmation' +
        'function closeWindow() { if (confirm("Bạn có chắc muốn đóng cửa sổ này?")) window.close(); }' +
        '// Initialize event listeners' +
        'document.addEventListener("DOMContentLoaded", () => {' +
          'if (docType === "prescription") {' +
            '["symptoms", "diagnosis"].forEach(id => {' +
              'const el = document.getElementById(id); if (el) {' +
                'el.addEventListener("input", () => { updateStyleState(id, "bold"); updateStyleState(id, "italic"); updateStyleState(id, "underline"); });' +
                'el.addEventListener("mouseup", () => { updateStyleState(id, "bold"); updateStyleState(id, "italic"); updateStyleState(id, "underline"); });' +
                'el.addEventListener("keyup", () => { updateStyleState(id, "bold"); updateStyleState(id, "italic"); updateStyleState(id, "underline"); });' +
              '}' +
            '});' +
          '}' +
          'document.querySelectorAll("[data-field][data-row]").forEach(el => el.addEventListener("input", handleTableInput));' +
          'document.getElementById("type").addEventListener("change", () => { location.reload(); });' +
          'updatePreview();' +
        '});' +
      '</script>' +
    '</body>' +
    '</html>';

  const printWin = window.open('', '_blank', 'width=800,height=1200,scrollbars=yes,resizable=yes');
  printWin.document.write(html);
  printWin.document.close();
};