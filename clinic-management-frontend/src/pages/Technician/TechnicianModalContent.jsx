// src/components/TechnicianModalContent.jsx
import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';

const TechnicianModalContent = ({ testResultData, onSubmit }) => {
  const [notes, setNotes] = useState(testResultData.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(notes);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label><strong>Bệnh nhân:</strong></Form.Label>
        <Form.Control 
          type="text" 
          value={testResultData.patient} 
          readOnly 
          className="bg-light"
        />
      </Form.Group>
      
      <Form.Group className="mb-3">
        <Form.Label><strong>Dịch vụ:</strong></Form.Label>
        <Form.Control 
          type="text" 
          value={testResultData.service} 
          readOnly 
          className="bg-light"
        />
      </Form.Group>
      
      <Form.Group className="mb-3">
        <Form.Label><strong>Kết quả:</strong></Form.Label>
        <Form.Control 
          as="textarea" 
          rows={5} 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required 
          placeholder="Nhập kết quả xét nghiệm..."
          className="focus-ring"
        />
        <Form.Text className="text-muted">
          Nhập kết quả chi tiết của xét nghiệm
        </Form.Text>
      </Form.Group>
      
      <div className="d-flex justify-content-end gap-2">
        <Button variant="success" type="submit" className="d-flex align-items-center">
          <i className="fas fa-save me-2"></i> Lưu kết quả
        </Button>
      </div>
    </Form>
  );
};

export default TechnicianModalContent;