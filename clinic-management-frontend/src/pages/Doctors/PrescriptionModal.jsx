import React, { useState } from 'react';

const PrescriptionModal = ({ show, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    medicineName: '',
    medicineQuantity: '',
    medicineDosage: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      medicine: formData.medicineName,
      quantity: formData.medicineQuantity,
      dosage: formData.medicineDosage
    });
    setFormData({ medicineName: '', medicineQuantity: '', medicineDosage: '' });
  };

  if (!show) return null;

  return (
    <div id="prescription-modal" className="modal active">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Thêm Thuốc Vào Đơn</h2>
        <form id="prescription-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="medicine-name">Tên thuốc</label>
            <input type="text" id="medicine-name" value={formData.medicineName} onChange={(e) => setFormData({...formData, medicineName: e.target.value})} required />
          </div>
          <div className="form-group">
            <label htmlFor="medicine-quantity">Số lượng</label>
            <input type="text" id="medicine-quantity" value={formData.medicineQuantity} onChange={(e) => setFormData({...formData, medicineQuantity: e.target.value})} required />
          </div>
          <div className="form-group">
            <label htmlFor="medicine-dosage">Liều dùng</label>
            <input type="text" id="medicine-dosage" value={formData.medicineDosage} onChange={(e) => setFormData({...formData, medicineDosage: e.target.value})} required />
          </div>
          <button type="submit">Thêm Thuốc</button>
          <button type="button" className="secondary" onClick={onClose}>Hủy</button>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionModal;