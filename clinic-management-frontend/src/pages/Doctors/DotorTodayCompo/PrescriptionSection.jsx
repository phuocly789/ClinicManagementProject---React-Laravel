import React, { useState, useEffect } from "react";
import { Col, Card, Table, Button, Form } from "react-bootstrap";

const PrescriptionSection = ({
  prescriptionRows,
  setPrescriptionRows,
  removePrescription,
  handleRemoveWithConfirm,
  isFormDisabled,
  selectedTodayPatient,
  symptoms,
  diagnosis,
  services,
  setToast,
  diagnoses,
}) => {
  const API_BASE_URL = 'http://localhost:8000';
  const [editingIndex, setEditingIndex] = useState(null);
  const [newRow, setNewRow] = useState({
    medicine: '',
    quantity: '',
    dosage: '',
    unitPrice: 0,
    totalPrice: 0
  });
  const [suggestions, setSuggestions] = useState([]);

  // Reset form khi chuyển trạng thái
  useEffect(() => {
    if (editingIndex === null) {
      setNewRow({
        medicine: '',
        quantity: '',
        dosage: '',
        unitPrice: 0,
        totalPrice: 0
      });
    } else {
      setNewRow({ ...prescriptionRows[editingIndex] });
    }
  }, [editingIndex, prescriptionRows]);

  // Search gợi ý thuốc
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (newRow.medicine.trim().length >= 2) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/doctor/medicines/search?q=${encodeURIComponent(newRow.medicine)}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              }
            }
          );
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
  }, [newRow.medicine]);

  const handleSelectSuggestion = (name, price) => {
    const newUnitPrice = price || 0;
    const quantity = newRow.quantity || 1;
    const newTotalPrice = quantity * newUnitPrice;
    
    setNewRow(prev => ({
      ...prev,
      medicine: name,
      unitPrice: newUnitPrice,
      totalPrice: newTotalPrice
    }));
    setSuggestions([]);
  };

  const handleFieldChange = (field, value) => {
    let updatedRow = { ...newRow };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedRow[field] = field === 'quantity' ? value : Number(value);
      
      const quantity = field === 'quantity' ? value : newRow.quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : newRow.unitPrice;
      updatedRow.totalPrice = (quantity || 0) * (unitPrice || 0);
    } else {
      updatedRow[field] = value;
    }
    
    setNewRow(updatedRow);
  };

  const startEditing = (index) => {
    setEditingIndex(index);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setSuggestions([]);
  };

  const handleAddNew = () => {
    if (!newRow.medicine.trim() || !newRow.quantity || !newRow.dosage.trim()) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng điền đầy đủ thông tin thuốc!",
        variant: "warning",
      });
      return;
    }

    if (newRow.unitPrice < 0) {
      setToast({
        show: true,
        message: "⚠️ Đơn giá không được âm!",
        variant: "warning",
      });
      return;
    }

    const newMedicine = {
      medicine: newRow.medicine.trim(),
      quantity: Number(newRow.quantity),
      dosage: newRow.dosage.trim(),
      unitPrice: Number(newRow.unitPrice),
      totalPrice: Number(newRow.quantity) * Number(newRow.unitPrice)
    };

    setPrescriptionRows(prev => [...prev, newMedicine]);
    
    setNewRow({
      medicine: '',
      quantity: '',
      dosage: '',
      unitPrice: 0,
      totalPrice: 0
    });
    
    setToast({
      show: true,
      message: "✅ Thêm thuốc thành công!",
      variant: "success",
    });
  };

  const handleUpdate = () => {
    if (!newRow.medicine.trim() || !newRow.quantity || !newRow.dosage.trim()) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng điền đầy đủ thông tin thuốc!",
        variant: "warning",
      });
      return;
    }

    const updatedMedicine = {
      medicine: newRow.medicine.trim(),
      quantity: Number(newRow.quantity),
      dosage: newRow.dosage.trim(),
      unitPrice: Number(newRow.unitPrice),
      totalPrice: Number(newRow.quantity) * Number(newRow.unitPrice)
    };

    const updatedRows = [...prescriptionRows];
    updatedRows[editingIndex] = updatedMedicine;
    setPrescriptionRows(updatedRows);
    
    cancelEditing();
    
    setToast({
      show: true,
      message: "✅ Cập nhật thuốc thành công!",
      variant: "success",
    });
  };

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
        type: 'prescription',
        patient_name: selectedTodayPatient.name || 'N/A',
        age: String(selectedTodayPatient.age || 'N/A'),
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
        diagnoses: diagnoses || [],
        services: services || [],
      };

      const response = await fetch(`${API_BASE_URL}/api/print/prescription/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(printData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'TOA_THUOC.pdf';
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
        throw new Error(errorText || `Lỗi server: ${response.status}`);
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
                <th width="25%">Tên thuốc</th>
                <th width="10%">Số lượng</th>
                <th width="20%">Liều dùng</th>
                <th width="15%">Đơn giá (VND)</th>
                <th width="15%">Thành tiền (VND)</th>
                <th width="15%">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionRows.map((row, index) => (
                <tr key={index}>
                  {editingIndex === index ? (
                    <>
                      <td>
                        <Form.Group style={{ position: 'relative' }}>
                          <Form.Control
                            type="text"
                            value={newRow.medicine}
                            onChange={(e) => handleFieldChange('medicine', e.target.value)}
                            required
                          />
                          {suggestions.length > 0 && (
                            <div className="suggestion-dropdown">
                              {suggestions.map((s, i) => (
                                <div 
                                  key={i} 
                                  className="suggestion-item p-2 border-bottom"
                                  onClick={() => handleSelectSuggestion(s.MedicineName, s.Price)}
                                  style={{cursor: 'pointer', backgroundColor: '#f8f9fa'}}
                                >
                                  {s.MedicineName} ({s.Unit}) - {s.Price?.toLocaleString()}₫
                                </div>
                              ))}
                            </div>
                          )}
                        </Form.Group>
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="1"
                          value={newRow.quantity}
                          onChange={(e) => handleFieldChange('quantity', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={newRow.dosage}
                          onChange={(e) => handleFieldChange('dosage', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min="0"
                          step="100"
                          value={newRow.unitPrice}
                          onChange={(e) => handleFieldChange('unitPrice', e.target.value)}
                          required
                        />
                      </td>
                      <td className="align-middle">
                        {newRow.totalPrice?.toLocaleString() || 0}
                      </td>
                      <td>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={handleUpdate}
                        >
                          💾 Lưu
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="ms-1 mt-1"
                          onClick={cancelEditing}
                        >
                          ❌ Hủy
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
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
                          🗑️ Xóa
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="ms-1 mt-1"
                          onClick={() => startEditing(index)}
                          disabled={isFormDisabled}
                        >
                          ✏️ Sửa
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              
              {/* Dòng thêm mới */}
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <td>
                  <Form.Group style={{ position: 'relative' }}>
                    <Form.Control
                      type="text"
                      placeholder="Nhập tên thuốc..."
                      value={newRow.medicine}
                      onChange={(e) => handleFieldChange('medicine', e.target.value)}
                      disabled={editingIndex !== null}
                    />
                    {suggestions.length > 0 && editingIndex === null && (
                      <div className="suggestion-dropdown">
                        {suggestions.map((s, i) => (
                          <div 
                            key={i} 
                            className="suggestion-item p-2 border-bottom"
                            onClick={() => handleSelectSuggestion(s.MedicineName, s.Price)}
                            style={{cursor: 'pointer', backgroundColor: '#f8f9fa'}}
                          >
                            {s.MedicineName} ({s.Unit}) - {s.Price?.toLocaleString()}₫
                          </div>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="1"
                    placeholder="0"
                    value={newRow.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="Liều dùng..."
                    value={newRow.dosage}
                    onChange={(e) => handleFieldChange('dosage', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={newRow.unitPrice}
                    onChange={(e) => handleFieldChange('unitPrice', e.target.value)}
                    disabled={editingIndex !== null}
                  />
                </td>
                <td className="align-middle">
                  <strong>{newRow.totalPrice?.toLocaleString() || 0}</strong>
                </td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddNew}
                    disabled={editingIndex !== null || isFormDisabled}
                  >
                    ➕ Thêm
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
          
          {prescriptionRows.length === 0 && (
            <div className="text-center text-muted py-3">
              Chưa có thuốc nào trong đơn. Hãy thêm thuốc bằng cách điền thông tin vào dòng cuối cùng.
            </div>
          )}
        </Card.Body>
      </Card>
      
      <Button
        variant="outline-success"
        onClick={handlePrint}
        disabled={!selectedTodayPatient || prescriptionRows.length === 0}
        className="no-print"
      >
        🖨️ Xuất toa thuốc
      </Button>
    </Col>
  );
};

export default PrescriptionSection;