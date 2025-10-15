import { useCallback } from "react";

export const usePrintDocument = () => {
    const printDocument = useCallback(({ title, patient, tableData }) => {
        if (!patient) return;

        const printWindow = window.open("", "_blank");
        const date = new Date().toLocaleDateString("vi-VN");

        let tableHtml = "";
        if (tableData && tableData.length) {
            const headers = Object.keys(tableData[0]);
            tableHtml = `
        <table border="1" cellspacing="0" cellpadding="5" width="100%">
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${tableData
                    .map(
                        (row) =>
                            `<tr>${headers.map((h) => `<td>${row[h] || ""}</td>`).join("")}</tr>`
                    )
                    .join("")}
          </tbody>
        </table>
      `;
        }

        printWindow.document.write(`
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: "Times New Roman", serif; padding: 20px; }
          h2 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <p><strong>Bệnh nhân:</strong> ${patient.name}</p>
        <p><strong>Giờ khám:</strong> ${patient.time}</p>
        <p><strong>Ngày:</strong> ${date}</p>
        ${tableHtml}
      </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, []);

    return { printDocument };
};
