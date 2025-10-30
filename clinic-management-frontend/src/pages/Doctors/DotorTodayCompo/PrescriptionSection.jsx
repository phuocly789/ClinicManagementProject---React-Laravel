import React, { useState, useEffect } from "react";
import { Col, Card, Table, Button, Form, Modal, Spinner, Alert } from "react-bootstrap";
import PDFPreviewEditor from "../PrintsPDF/PDFPreviewEditor";

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

  // THÊM STATE CHO PDF PREVIEW
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);
  const [previewHTML, setPreviewHTML] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

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

  // FUNCTION PREVIEW PDF - MỞ TRANG MỚI
  const handlePreview = async () => {
    if (!selectedTodayPatient || prescriptionRows.length === 0) {
      setToast({
        show: true,
        message: "⚠️ Vui lòng chọn bệnh nhân và thêm ít nhất một đơn thuốc trước khi xem trước.",
        variant: "warning",
      });
      return;
    }

    const previewData = {
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

    console.log('📤 Data preview toa thuốc gửi lên BE:', previewData);

    // Lưu data vào sessionStorage để trang mới có thể truy cập
    try {
      sessionStorage.setItem('pdfPreviewData', JSON.stringify(previewData));
      sessionStorage.setItem('prescriptionRows', JSON.stringify(prescriptionRows));
      sessionStorage.setItem('selectedPatient', JSON.stringify(selectedTodayPatient));
      sessionStorage.setItem('diagnoses', JSON.stringify(diagnoses));
      sessionStorage.setItem('services', JSON.stringify(services));
      
      // Mở trang mới trong tab mới
      const newWindow = window.open('/pdf-editor', '_blank');
      
      if (!newWindow) {
        setToast({
          show: true,
          message: "⚠️ Trình duyệt đã chặn popup. Vui lòng cho phép popup để mở editor PDF.",
          variant: "warning",
        });
        return;
      }

      setToast({
        show: true,
        message: "✅ Đang mở trình chỉnh sửa PDF trong tab mới...",
        variant: "success",
      });

    } catch (error) {
      console.error('Error opening new window:', error);
      setToast({
        show: true,
        message: "❌ Lỗi khi mở trình chỉnh sửa PDF",
        variant: "danger",
      });
    }
  };

  // LOAD PREVIEW HTML - CẢI THIỆN VỚI XỬ LÝ LỖI CHI TIẾT
  const loadPreviewHTML = async (data) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/print/preview-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Kiểm tra HTTP status
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Lỗi server'}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setPreviewHTML(result.html);
        console.log('✅ Preview HTML loaded successfully');
      } else {
        const errorMsg = result.message || 'Lỗi không xác định từ server';
        setPreviewError(errorMsg);
        console.error('❌ Preview API error:', errorMsg);
        setToast({
          show: true,
          message: `Lỗi tải preview: ${errorMsg}`,
          variant: "danger",
        });
      }
    } catch (error) {
      const errorMsg = `Lỗi kết nối: ${error.message}`;
      setPreviewError(errorMsg);
      console.error('❌ Preview load error:', error);
      setToast({
        show: true,
        message: `Lỗi tải preview: ${error.message}`,
        variant: "danger",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // RELOAD PREVIEW - CẢI THIỆN
  const reloadPreview = () => {
    if (pdfPreviewData) {
      console.log('🔄 Reloading preview...');
      loadPreviewHTML(pdfPreviewData);
    } else {
      console.warn('⚠️ No preview data to reload');
    }
  };

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
        a.download = `TOA_THUOC_${selectedTodayPatient.name || 'benh_nhan'}.pdf`;
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
      
      <div className="d-flex gap-2">
        <Button
          variant="outline-info"
          onClick={handlePreview}
          disabled={!selectedTodayPatient || prescriptionRows.length === 0}
          className="no-print"
        >
          👁️ Xem trước PDF
        </Button>
        
        <Button
          variant="outline-success"
          onClick={handlePrint}
          disabled={!selectedTodayPatient || prescriptionRows.length === 0}
          className="no-print"
        >
          🖨️ Xuất toa thuốc
        </Button>
      </div>

      {/* MODAL PREVIEW TOA THUỐC - VẪN GIỮ ĐỂ DỰ PHÒNG */}
      <Modal show={showPDFPreview} onHide={() => setShowPDFPreview(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>👁️ Xem trước Toa Thuốc</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ minHeight: '500px' }}>
          <PDFPreviewEditor
            previewHTML={previewHTML}
            isLoadingPreview={isLoadingPreview}
            onReloadPreview={reloadPreview}
            type="prescription"
            error={previewError}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPDFPreview(false)}>
            Đóng
          </Button>
          <Button 
            variant="success" 
            onClick={() => {
              handlePrint();
              setShowPDFPreview(false);
            }}
            disabled={isLoadingPreview || previewError}
          >
            {isLoadingPreview ? <Spinner size="sm" /> : '💾 Tải về PDF'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Col>
  );
};

export default PrescriptionSection;