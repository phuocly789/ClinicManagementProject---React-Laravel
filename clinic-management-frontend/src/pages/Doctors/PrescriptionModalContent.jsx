import React, { useState, useEffect } from "react";
import { Form, Button, ListGroup } from "react-bootstrap";

const API_BASE_URL = "http://localhost:8000";

const PrescriptionModalContent = ({ onSubmit, onClose, defaultData }) => {
  const [medicine, setMedicine] = useState(defaultData?.medicine || "");
  const [quantity, setQuantity] = useState(defaultData?.quantity || "");
  const [dosage, setDosage] = useState(defaultData?.dosage || "");
  const [suggestions, setSuggestions] = useState([]);

  // 🔍 Gợi ý thuốc khi gõ
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (medicine.trim().length >= 2) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/doctor/medicines/search?q=${encodeURIComponent(medicine)}`);
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
  }, [medicine]);

  const handleSelectSuggestion = (name) => {
    setMedicine(name);
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ medicine, quantity, dosage });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3 text-start">
        <Form.Label>Tên thuốc</Form.Label>
        <Form.Control
          type="text"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          autoFocus
        />
        {suggestions.length > 0 && (
          <ListGroup className="mt-1 shadow-sm">
            {suggestions.map((s, i) => (
              <ListGroup.Item
                key={i}
                action
                onClick={() => handleSelectSuggestion(s.MedicineName)}
              >
                {s.MedicineName} ({s.Unit}) - {s.Price.toLocaleString()}₫
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Form.Group>

      <Form.Group className="mb-3 text-start">
        <Form.Label>Số lượng</Form.Label>
        <Form.Control
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3 text-start">
        <Form.Label>Liều dùng</Form.Label>
        <Form.Control
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
        />
      </Form.Group>

      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit">
          Lưu
        </Button>
      </div>
    </Form>
  );
};

export default PrescriptionModalContent;
