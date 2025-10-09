import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';

const EventModalContent = ({ editingEventId, events, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: '', date: new Date().toISOString().split('T')[0], time: '', duration: 30, type: 'work', description: ''
  });

  useEffect(() => {
    if (editingEventId && events.length > 0) {
      const event = events.find(e => e.id === editingEventId);
      if (event) setFormData(event);
    } else if (!editingEventId) {
      setFormData({ ...formData, date: new Date().toISOString().split('T')[0] });
    }
  }, [editingEventId, events]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Tiêu đề</Form.Label>
        <Form.Control type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Ngày</Form.Label>
        <Form.Control type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Thời gian</Form.Label>
        <Form.Control type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} required />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Thời lượng (phút)</Form.Label>
        <Form.Control type="number" value={formData.duration} onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})} min="15" step="15" />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Loại lịch</Form.Label>
        <Form.Select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
          <option value="work">Lịch khám bệnh</option>
          <option value="personal">Lịch cá nhân</option>
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Mô tả</Form.Label>
        <Form.Control as="textarea" rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
      </Form.Group>
      <Button variant="primary" type="submit" className="me-2">Lưu Lịch</Button>
      <Button variant="secondary" onClick={onClose}>Hủy</Button>
    </Form>
  );
};

export default EventModalContent;