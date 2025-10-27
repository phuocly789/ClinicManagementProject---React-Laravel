import React from "react";
import { Col, Card, Table, Button } from "react-bootstrap";

const PrescriptionSection = ({
  prescriptionRows,
  removePrescription,
  handleRemoveWithConfirm,
  handleOpenAddModal,
  handleEdit,
  isFormDisabled,
  selectedTodayPatient,
  symptoms,
  diagnosis,
  services,
  setToast,
  diagnoses,
}) => {
  const API_BASE_URL = 'http://localhost:8000';

  const handlePrint = async () => {
    if (!selectedTodayPatient || prescriptionRows.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn bệnh nhân và thêm ít nhất một đơn thuốc trước khi in.",
        variant: "warning",
      });
      return;
    }

    try {
      const printData = {
        patient_name: selectedTodayPatient.name || 'N/A',
        age: selectedTodayPatient.age?.toString() || 'N/A',
        gender: selectedTodayPatient.gender || 'N/A',
        phone: selectedTodayPatient.phone || 'N/A',
        appointment_date: selectedTodayPatient.date
          ? new Date(selectedTodayPatient.date).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
        appointment_time: selectedTodayPatient.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        doctor_name: selectedTodayPatient.doctor_name || 'Bác sĩ chưa rõ',
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
        diagnoses: diagnoses || [], // Sử dụng diagnoses từ props
        services: services || [], // Sử dụng services từ props
      };

      console.log('Sending data to API:', printData);

      const response = await fetch(`${API_BASE_URL}/api/print/prescription/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(printData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'toa_thuoc_preview.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({
          show: true,
          message: "✅ Xuất toa thuốc thành công!",
          variant: "success",
        });
      } else {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(errorText || 'Lỗi server.');
      }
    } catch (error) {
      console.error('Error exporting prescription:', error);
      setToast({
        show: true,
        message: `Lỗi khi xuất toa thuốc: ${error.message}`,
        variant: "danger",
      });
    }
  };

  return (
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
                <th>Đơn giá (VND)</th>
                <th>Thành tiền (VND)</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionRows.map((row, index) => (
                <tr key={index}>
                  <td>{row.medicine}</td>
                  <td>{row.quantity}</td>
                  <td>{row.dosage}</td>
                  <td>{row.unitPrice?.toLocaleString() || 0}</td>
                  <td>{row.totalPrice?.toLocaleString() || 0}</td>
                  <td>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRemoveWithConfirm(index)}
                      disabled={isFormDisabled}
                    >
                      Xóa
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="ms-2"
                      onClick={() => handleEdit(index)}
                      disabled={isFormDisabled}
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
            disabled={isFormDisabled}
          >
            Thêm thuốc vào đơn
          </Button>
        </Card.Body>
      </Card>
      <Button
        variant="outline-success"
        onClick={handlePrint}
        disabled={!selectedTodayPatient || prescriptionRows.length === 0}
        className="no-print"
      >
        Xuất toa thuốc
      </Button>
    </Col>
  );
};

export default PrescriptionSection;