import React, { useState, useEffect } from 'react';
import { Form, Button, ListGroup } from "react-bootstrap"; // Import Bootstrap nếu dùng

const API_BASE_URL = 'http://localhost:8000';

const PrescriptionModal = ({ show, onHide, defaultData, onSubmit }) => {
  const [formData, setFormData] = useState({
    medicine: '',
    quantity: '',
    dosage: ''
  });
  const [suggestions, setSuggestions] = useState([]);

  // Prefill form với defaultData khi edit (hoặc reset khi add mới)
  useEffect(() => {
    if (show) {
      if (defaultData) {
        // Edit mode
        setFormData({
          medicine: defaultData.medicine || '',
          quantity: defaultData.quantity || '',
          dosage: defaultData.dosage || ''
        });
      } else {
        // Add mode: Reset form
        setFormData({ medicine: '', quantity: '', dosage: '' });
      }
    }
  }, [show, defaultData]);

  // Search gợi ý thuốc (debounce 300ms, như PrescriptionModalContent)
  useEffect(() => {
    if (!show) return;
    const delayDebounce = setTimeout(async () => {
      if (formData.medicine.trim().length >= 2) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/doctor/medicines/search?q=${encodeURIComponent(formData.medicine)}`);
          if (response.ok) {
            const data = await response.json();
            setSuggestions(data);
          }
        } catch (err) {
          console.error("Lỗi khi tìm thuốc:", err);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [formData.medicine, show]);

  const handleSelectSuggestion = (name) => {
    setFormData(prev => ({ ...prev, medicine: name }));
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.medicine.trim() || !formData.quantity.trim() || !formData.dosage.trim()) {
      alert('Vui lòng điền đầy đủ thông tin thuốc!'); // Có thể thay bằng toast từ TodaySection
      return;
    }

    // Submit data đúng format cho handleModalSubmit
    onSubmit({
      medicine: formData.medicine,
      quantity: formData.quantity, // Giữ string hoặc parseInt nếu cần
      dosage: formData.dosage
    });

    // Reset form sau submit (TodaySection sẽ handle editIndex)
    setFormData({ medicine: '', quantity: '', dosage: '' });
    setSuggestions([]);
    onHide(); // Close modal
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}> {/* Overlay */}
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{defaultData ? 'Sửa Thuốc' : 'Thêm Thuốc Vào Đơn'}</h2>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <Form onSubmit={handleSubmit}>
            <div className="modal-body">
              <Form.Group className="mb-3">
                <Form.Label>Tên thuốc</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.medicine}
                  onChange={(e) => setFormData({ ...formData, medicine: e.target.value })}
                  required
                  autoFocus
                />
                {suggestions.length > 0 && (
                  <ListGroup className="mt-1">
                    {suggestions.map((s, i) => (
                      <ListGroup.Item key={i} action onClick={() => handleSelectSuggestion(s.MedicineName)}>
                        {s.MedicineName} ({s.Unit}) - {s.Price?.toLocaleString()}₫
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Số lượng</Form.Label>
                <Form.Control
                  type="number"  // Đổi thành number cho validate tốt hơn
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Liều dùng</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  required
                />
              </Form.Group>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" type="button" onClick={onHide}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                {defaultData ? 'Cập Nhật' : 'Thêm Thuốc'}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModal;