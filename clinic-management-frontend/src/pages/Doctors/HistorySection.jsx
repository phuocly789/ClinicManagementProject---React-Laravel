import React from 'react';
import { Card, ListGroup, Table, Button, Badge } from 'react-bootstrap';

const HistorySection = ({ 
  currentSection,
  patients, 
  selectedPatient, 
  setSelectedPatient 
}) => {
  const renderPatientList = () => {
    return patients.map(patient => (
      <ListGroup.Item key={patient.patient_id} action onClick={() => setSelectedPatient(patient)}>
        <div className="d-flex w-100 justify-content-between">
          <h6 className="mb-1">{patient.name} - {patient.patient_id}</h6>
          <Badge bg="success">Xem chi tiết</Badge>
        </div>
      </ListGroup.Item>
    ));
  };

  const renderHistoryDetails = () => {
    if (!selectedPatient) return null;
    return (
      <>
        <Card.Header>
          <h5>Thông Tin Bệnh Nhân: {selectedPatient.name}</h5>
        </Card.Header>
        <Card.Body>
          <p><strong>Mã BN:</strong> {selectedPatient.patient_id}</p>
          <p><strong>Tuổi:</strong> {selectedPatient.age}</p>
          <p><strong>Giới tính:</strong> {selectedPatient.gender}</p>
          <p><strong>SĐT:</strong> {selectedPatient.phone}</p>
          <p><strong>Địa chỉ:</strong> {selectedPatient.address}</p>
          <Card.Header className="mt-3">
            <h6>Lịch Sử Khám Bệnh</h6>
          </Card.Header>
          {selectedPatient.history.map((visit, index) => {
            const testsList = visit.tests.length > 0 ? visit.tests.map((test, tIndex) => <li key={tIndex}>{test}</li>) : 'Không có';
            return (
              <Card.Body key={index}>
                <h6>Ngày khám: {visit.visit_date} - Giờ: {visit.time}</h6>
                <p><strong>Triệu chứng:</strong> {visit.symptoms}</p>
                <p><strong>Chẩn đoán:</strong> {visit.diagnosis}</p>
                <p><strong>Xét nghiệm:</strong> <ul>{testsList}</ul></p>
                <p><strong>Kết quả xét nghiệm:</strong> {visit.test_results}</p>
                <p><strong>Ghi chú:</strong> {visit.notes}</p>
                <Table striped bordered hover responsive className="mt-2">
                  <thead>
                    <tr>
                      <th>Tên thuốc</th>
                      <th>Số lượng</th>
                      <th>Liều dùng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visit.prescription.map((presc, pIndex) => (
                      <tr key={pIndex}>
                        <td>{presc.medicine}</td>
                        <td>{presc.quantity}</td>
                        <td>{presc.dosage}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <hr />
              </Card.Body>
            );
          })}
          <Button variant="secondary" onClick={() => setSelectedPatient(null)}>Quay lại danh sách</Button>
        </Card.Body>
      </>
    );
  };

  return (
    <div className={`section ${currentSection === 'history' ? 'active' : ''}`} id="history">
      <Card>
        <Card.Header>
          <h5>Lịch Sử Bệnh Nhân</h5>
        </Card.Header>
        {!selectedPatient ? (
          <Card.Body>
            <ListGroup variant="flush">
              {renderPatientList()}
            </ListGroup>
          </Card.Body>
        ) : (
          <Card.Body>
            {renderHistoryDetails()}
          </Card.Body>
        )}
      </Card>
    </div>
  );
};

export default HistorySection;