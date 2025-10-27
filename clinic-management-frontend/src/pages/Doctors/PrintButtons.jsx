import React from "react";
import { Button } from "react-bootstrap";
import { usePrintDocument } from "./usePrintDocument";

const PrintButtons = ({ patient, requestedTests, prescriptionRows }) => {
  const { printDocument } = usePrintDocument();

  const handlePrintService = () => {
    const tableData = Object.keys(requestedTests).map((key) => ({
      "Dịch vụ": key,
      "Đã yêu cầu": requestedTests[key] ? "✅" : "",
    }));

    printDocument({
      title: "PHIẾU CHỈ ĐỊNH DỊCH VỤ CẬN LÂM SÀNG",
      patient,
      tableData,
    });
  };

  const handlePrintPrescription = () => {
    const tableData = prescriptionRows.map((row) => ({
      "Tên thuốc": row.medicine,
      "Số lượng": row.quantity,
      "Liều dùng": row.dosage,
    }));

    printDocument({
      title: "TOA THUỐC",
      patient,
      tableData,
    });
  };

  return (
    <div className="mb-3 mt-2">
      <Button
        variant="outline-primary"
        size="sm"
        onClick={handlePrintService}
        disabled={!patient}
        className="me-2"
      >
        Xuất phiếu dịch vụ
      </Button>
      <Button
        variant="outline-success"
        size="sm"
        onClick={handlePrintPrescription}
        disabled={!patient || prescriptionRows.length === 0}
      >
        Xuất toa thuốc
      </Button>
    </div>
  );
};

export default PrintButtons;
