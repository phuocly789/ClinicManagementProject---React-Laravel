// src/components/ReportModalContent.jsx
import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

const ReportModalContent = ({ reportData, confirmAction, setShowReportModal }) => {
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    confirmAction('saveReport', reportData.testId, notes);
    setShowReportModal(false);
  };

  const handleCancel = () => {
    setShowReportModal(false);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Nhiệm vụ:</Form.Label>
            <Form.Control 
              type="text" 
              value={reportData.taskName} 
              readOnly 
              className="bg-light"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Thời gian:</Form.Label>
            <Form.Control 
              type="text" 
              value={reportData.time} 
              readOnly 
              className="bg-light"
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-4">
        <Form.Label className="fw-semibold">Ghi chú báo cáo:</Form.Label>
        <Form.Control 
          as="textarea" 
          rows={4} 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required 
          placeholder="Nhập ghi chú chi tiết về kết quả và quá trình thực hiện..."
          className="focus-ring"
        />
        <Form.Text className="text-muted">
          Mô tả chi tiết kết quả thực hiện và các ghi chú quan trọng
        </Form.Text>
      </Form.Group>

      <div className="d-flex justify-content-end gap-2">
        <Button 
          variant="outline-secondary" 
          onClick={handleCancel}
          className="d-flex align-items-center"
        >
          <i className="fas fa-times me-2"></i> Hủy
        </Button>
        <Button 
          variant="success" 
          type="submit" 
          className="d-flex align-items-center"
        >
          <i className="fas fa-save me-2"></i> Lưu báo cáo
        </Button>
      </div>
    </Form>
  );
};

export default ReportModalContent;