import React, { useState, useEffect } from "react";
import { Col, Card, Table, Button, Form, Modal, Spinner, Alert } from "react-bootstrap";
import PDFPreviewEditor from "../PrintsPDF/PDFPreviewEditor";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  
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

  // FIX: HÀM CHỌN GỢI Ý - LẤY ĐẦY ĐỦ THÔNG TIN TỪ AI
  const handleSelectSuggestion = (medicine) => {
    console.log("🎯 Dữ liệu thuốc từ AI:", medicine);
    
    const newUnitPrice = medicine.Price ? parseFloat(medicine.Price) : 0;
    const quantity = newRow.quantity || 1;
    const newTotalPrice = quantity * newUnitPrice;
    
    // TẠO LIỀU DÙNG MẶC ĐỊNH TỪ THÔNG TIN AI
    const defaultDosage = generateDosageFromAI(medicine);
    
    setNewRow(prev => ({
      ...prev,
      medicine: medicine.MedicineName,
      unitPrice: newUnitPrice,
      totalPrice: newTotalPrice,
      dosage: defaultDosage
    }));
    setSuggestions([]);
    
    console.log("✅ Đã điền thông tin:", {
      name: medicine.MedicineName,
      price: newUnitPrice,
      dosage: defaultDosage
    });
  };

  // HÀM PHỤ TRỢ ĐỂ TẠO LIỀU DÙNG TỪ THÔNG TIN AI
  const generateDosageFromAI = (medicine) => {
    if (medicine.Reason) {
      // Phân tích lý do để gợi ý liều dùng
      const reason = medicine.Reason.toLowerCase();
      if (reason.includes("giảm đau") || reason.includes("đau răng")) {
        return "1 viên/lần, 2-3 lần/ngày sau khi ăn";
      } else if (reason.includes("kháng sinh") || reason.includes("nhiễm khuẩn")) {
        return "1 viên/lần, 2 lần/ngày (sáng, tối)";
      } else if (reason.includes("bảo vệ dạ dày") || reason.includes("omeprazole")) {
        return "1 viên/ngày, uống trước khi ăn sáng 30 phút";
      }
      return `Theo chỉ định: ${medicine.Reason.substring(0, 60)}...`;
    }
    return "Theo chỉ định của bác sĩ";
  };

  // FUNCTION PREVIEW PDF - ĐẢM BẢO DỮ LIỆU LUÔN MỚI NHẤT
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
      // THÊM CÁC TRƯỜNG CẦN THIẾT CHO VIỆC CHỈNH SỬA
      appointment_id: selectedTodayPatient.id || selectedTodayPatient.AppointmentId,
      patient_id: selectedTodayPatient.PatientId || selectedTodayPatient.patient_id,
      originalData: {
        prescriptionRows: [...prescriptionRows], // COPY DỮ LIỆU MỚI NHẤT
        symptoms,
        diagnosis,
        services,
        diagnoses
      },
      timestamp: Date.now() // THÊM TIMESTAMP ĐỂ ĐẢM BẢO DỮ LIỆU MỚI
    };

    console.log('📤 Data preview toa thuốc gửi đến editor (LẦN MỚI):', previewData);

    try {
      // XÓA DỮ LIỆU CŨ TRƯỚC KHI LƯU MỚI
      sessionStorage.removeItem('pdfEditorData');
      sessionStorage.removeItem('shouldRefreshOnReturn');
      sessionStorage.removeItem('editorSource');
      
      // Lưu data MỚI NHẤT vào sessionStorage
      sessionStorage.setItem('pdfEditorData', JSON.stringify(previewData));
      sessionStorage.setItem('shouldRefreshOnReturn', 'true');
      sessionStorage.setItem('editorSource', 'prescription');

      // CHUYỂN HƯỚNG TRONG CÙNG TAB
      navigate('/doctor/print-pdf-editor', { 
        state: { 
          pdfData: previewData,
          source: 'prescription',
          timestamp: Date.now()
        }
      });

      setToast({
        show: true,
        message: "✅ Đang chuyển đến trình chỉnh sửa PDF...",
        variant: "success",
      });

    } catch (error) {
      console.error('Error navigating to PDF editor:', error);
      setToast({
        show: true,
        message: "❌ Lỗi khi chuyển đến trình chỉnh sửa PDF",
        variant: "danger",
      });
    }
  };

  // FUNCTION XỬ LÝ KHI DỮ LIỆU ĐƯỢC CẬP NHẬT TỪ EDITOR
  const handleEditorDataUpdate = (updatedData) => {
    if (updatedData.prescriptionRows) {
      setPrescriptionRows(updatedData.prescriptionRows);
    }
    if (updatedData.diagnosis) {
      // Nếu bạn có setDiagnosis prop, thêm vào đây
      // setDiagnosis(updatedData.diagnosis);
    }
    
    setToast({
      show: true,
      message: "✅ Đã cập nhật dữ liệu từ trình chỉnh sửa PDF",
      variant: "success",
    });
  };

  // KIỂM TRA KHI COMPONENT MOUNT XEM CÓ DỮ LIỆU CẦN CẬP NHẬT TỪ EDITOR KHÔNG
  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem('shouldRefreshOnReturn');
    const editorSource = sessionStorage.getItem('editorSource');
    const editorData = sessionStorage.getItem('pdfEditorData');
    
    // Chỉ xử lý nếu dữ liệu đến từ PrescriptionSection
    if (shouldRefresh === 'true' && editorSource === 'prescription' && editorData) {
      try {
        const parsedData = JSON.parse(editorData);
        
        // KIỂM TRA TIMESTAMP ĐỂ ĐẢM BẢO LÀ DỮ LIỆU MỚI
        const currentTimestamp = Date.now();
        const dataTimestamp = parsedData.timestamp || 0;
        
        // Chỉ cập nhật nếu dữ liệu không quá cũ (trong vòng 10 phút)
        if (currentTimestamp - dataTimestamp < 10 * 60 * 1000) {
          // Cập nhật dữ liệu từ editor
          if (parsedData.originalData) {
            handleEditorDataUpdate(parsedData.originalData);
          }
          console.log('✅ Đã cập nhật dữ liệu MỚI từ PDF editor');
        } else {
          console.log('⚠️ Dữ liệu từ PDF editor đã quá cũ, bỏ qua');
        }
        
      } catch (error) {
        console.error('Error processing editor return data:', error);
      } finally {
        // LUÔN RESET FLAG SAU KHI XỬ LÝ
        sessionStorage.removeItem('shouldRefreshOnReturn');
        sessionStorage.removeItem('editorSource');
        sessionStorage.removeItem('pdfEditorData');
      }
    }
  }, []);

  // XÓA DỮ LIỆU KHI COMPONENT UNMOUNT ĐỂ TRÁNH DÙNG DỮ LIỆU CŨ
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('shouldRefreshOnReturn');
      sessionStorage.removeItem('editorSource');
      sessionStorage.removeItem('pdfEditorData');
    };
  }, []);

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
                            <div 
                              className="suggestion-dropdown"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                zIndex: 1000,
                                maxHeight: '200px',
                                overflowY: 'auto'
                              }}
                            >
                              {suggestions.map((s, i) => (
                                <div 
                                  key={i} 
                                  className="suggestion-item p-2 border-bottom"
                                  onClick={() => handleSelectSuggestion(s)}
                                  style={{
                                    cursor: 'pointer', 
                                    backgroundColor: '#f8f9fa',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                >
                                  <div><strong>{s.MedicineName}</strong> ({s.Unit})</div>
                                  <div className="text-success">💰 {s.Price?.toLocaleString()}₫</div>
                                  <div className="text-muted small mt-1">{s.Reason}</div>
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
                      <div 
                        className="suggestion-dropdown"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        {suggestions.map((s, i) => (
                          <div 
                            key={i} 
                            className="suggestion-item p-2 border-bottom"
                            onClick={() => handleSelectSuggestion(s)}
                            style={{
                              cursor: 'pointer', 
                              backgroundColor: '#f8f9fa',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          >
                            <div><strong>{s.MedicineName}</strong> ({s.Unit})</div>
                            <div className="text-success">💰 {s.Price?.toLocaleString()}₫</div>
                            <div className="text-muted small mt-1">{s.Reason}</div>
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