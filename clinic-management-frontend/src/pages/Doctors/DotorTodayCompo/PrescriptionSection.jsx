import React from "react";
import { Col, Card, Table, Button } from "react-bootstrap";

const PrescriptionSection = ({
  prescriptionRows,
  removePrescription,
  handleRemoveWithConfirm,
  handleOpenAddModal,
  handleEdit,
  isFormDisabled,
  printDocument,
  selectedTodayPatient,
}) => {
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
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionRows.map((row, index) => (
                <tr key={index}>
                  <td>{row.medicine}</td>
                  <td>{row.quantity}</td>
                  <td>{row.dosage}</td>
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
        onClick={() => printDocument('prescription')}
        disabled={!selectedTodayPatient || prescriptionRows.length === 0}
        className="no-print"
      >
        Xuất toa thuốc
      </Button>
    </Col>
  );
};

export default PrescriptionSection;