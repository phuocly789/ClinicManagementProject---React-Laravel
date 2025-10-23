import React, { useState, useEffect } from 'react';
import { Form, Button, ListGroup } from "react-bootstrap";

const API_BASE_URL = 'http://localhost:8000';

const PrescriptionModal = ({ show, onHide, defaultData, onSubmit }) => {
  const [formData, setFormData] = useState({
    medicine: '',
    quantity: '',
    dosage: '',
    unitPrice: 0,
    totalPrice: 0
  });
  const [suggestions, setSuggestions] = useState([]);

  // Prefill form với defaultData khi edit (hoặc reset khi add mới)
  useEffect(() => {
    if (show) {
      if (defaultData) {
        setFormData({
          medicine: defaultData.medicine || '',
          quantity: defaultData.quantity || '',
          dosage: defaultData.dosage || '',
          unitPrice: defaultData.unitPrice || 0,
          totalPrice: defaultData.totalPrice || 0
        });
      } else {
        setFormData({ medicine: '', quantity: '', dosage: '', unitPrice: 0, totalPrice: 0 });
      }
    }
  }, [show, defaultData]);

  // Search gợi ý thuốc (debounce 300ms)
  useEffect(() => {
    if (!show) return;
    const delayDebounce = setTimeout(async () => {
      if (formData.medicine.trim().length >= 2) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/doctor/medicines/search?q=${encodeURIComponent(formData.medicine)}`);
          if (response.ok) {
            const data = await response.json();
            console.log('API response:', data); // Log dữ liệu từ API
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

  const handleSelectSuggestion = (name, price) => {
    const newUnitPrice = price || 0;
    const newTotalPrice = formData.quantity ? formData.quantity * newUnitPrice : 0;
    setFormData(prev => ({
      ...prev,
      medicine: name,
      unitPrice: newUnitPrice,
      totalPrice: newTotalPrice
    }));
    console.log('Selected suggestion:', { name, price, unitPrice: newUnitPrice, totalPrice: newTotalPrice }); // Log khi chọn gợi ý
    setSuggestions([]);
  };

  const handleQuantityChange = (e) => {
    const newQuantity = e.target.value;
    const newTotalPrice = newQuantity ? newQuantity * formData.unitPrice : 0;
    setFormData(prev => ({
      ...prev,
      quantity: newQuantity,
      totalPrice: newTotalPrice
    }));
    console.log('Quantity changed:', { quantity: newQuantity, totalPrice: newTotalPrice }); // Log khi thay đổi quantity
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.medicine.trim() || !formData.quantity.trim() || !formData.dosage.trim()) {
      alert('Vui lòng điền đầy đủ thông tin thuốc!');
      return;
    }

    onSubmit({
      medicine: formData.medicine,
      quantity: formData.quantity,
      dosage: formData.dosage,
      unitPrice: formData.unitPrice,
      totalPrice: formData.totalPrice
    });
    console.log('Submitted data:', formData); // Log dữ liệu gửi đi
    setFormData({ medicine: '', quantity: '', dosage: '', unitPrice: 0, totalPrice: 0 });
    setSuggestions([]);
    onHide();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
                      <ListGroup.Item key={i} action onClick={() => handleSelectSuggestion(s.MedicineName, s.Price)}>
                        {s.MedicineName} ({s.Unit}) - {s.Price?.toLocaleString()}₫
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Số lượng</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={handleQuantityChange}
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