/**
 * Utility để tạo HTML cho việc in ấn phiếu dịch vụ hoặc toa thuốc.
 * @param {string} type - 'service' hoặc 'prescription'
 * @param {Object} patient - Object bệnh nhân { name, age, gender, phone }
 * @param {string} symptoms - Triệu chứng
 * @param {string} diagnosis - Chẩn đoán
 * @param {Object} tests - Object tests { test1: bool, ... }
 * @param {Array} prescriptionRows - Mảng đơn thuốc [{ medicine, quantity, dosage }, ...]
 * @param {Object} testLabels - Object label dịch vụ { test1: 'Tên dịch vụ', ... }
 * @returns {string} - HTML string đầy đủ để in
 */
export const generatePrintHtml = (
  type,
  patient,
  symptoms = '',
  diagnosis = '',
  tests = {},
  prescriptionRows = [],
  testLabels = {}
) => {
  if (!patient) {
    throw new Error('Patient data is required for printing.');
  }

  const { name: patientName, age, gender, phone } = patient;
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
        <p><strong>Triệu chứng:</strong> ${symptoms}</p>
        <p><strong>Chẩn đoán:</strong> ${diagnosis}</p>
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
  } else {
    throw new Error('Invalid type: must be "service" or "prescription"');
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

  return html;
};

/**
 * Hàm tiện ích để in trực tiếp (tùy chọn, nếu muốn dùng luôn).
 * @param {string} html - HTML string từ generatePrintHtml
 * @param {React.RefObject} printRef - Ref đến div in ấn
 */
export const printHtml = (html, printRef) => {
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