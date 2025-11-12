import React, { useState, useEffect, useCallback } from "react";
import { Col, Card, Form, Button, Spinner } from "react-bootstrap";

const API_BASE_URL = 'http://localhost:8000';

const DiagnosisSection = ({
  symptoms: initialSymptoms,
  setSymptoms: setInitialSymptoms,
  diagnosis: initialDiagnosis,
  setDiagnosis: setInitialDiagnosis,
  isFormDisabled,
  prescriptionRows,
  setPrescriptionRows,
  setToast,
  onDiagnosisUpdate,
}) => {
  // FIX: SỬ DỤNG DIRECTLY TỪ PROPS, KHÔNG DÙNG STATE LOCAL
  const symptoms = initialSymptoms || '';
  const diagnosis = initialDiagnosis || '';
  
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // FIX: XÓA CÁC USE EFFECT GÂY RE-RENDER, XỬ LÝ TRỰC TIẾP
  const handleSymptomsChange = useCallback((e) => {
    setInitialSymptoms(e.target.value);
  }, [setInitialSymptoms]);

  const handleDiagnosisChange = useCallback((e) => {
    setInitialDiagnosis(e.target.value);
  }, [setInitialDiagnosis]);

  // FIX: GỢI Ý CHẨN ĐOÁN - CODE ĐẦY ĐỦ
  useEffect(() => {
    const trimmedSymptoms = symptoms?.trim();
    if (!trimmedSymptoms || trimmedSymptoms.length < 3) {
      setDiagnosisSuggestions([]);
      return;
    }

    setDiagnosisLoading(true);
    const timeout = setTimeout(async () => {
      const fetchUrl = `${API_BASE_URL}/api/doctor/ai/suggestion?symptoms=${encodeURIComponent(trimmedSymptoms)}&type=diagnosis`;

      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setDiagnosisSuggestions(data);
        } else {
          throw new Error("Dữ liệu gợi ý chẩn đoán không phải mảng JSON");
        }
      } catch (err) {
        console.error("AI diagnosis error:", err);
        setToast({
          show: true,
          message: `Lỗi gợi ý chẩn đoán: ${err.message}`,
          variant: "danger",
        });
        setDiagnosisSuggestions([]);
      } finally {
        setDiagnosisLoading(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [symptoms, setToast]);

  // FIX: GỢI Ý THUỐC - CODE ĐẦY ĐỦ
  useEffect(() => {
    const trimmedDiagnosis = diagnosis?.trim();
    if (!trimmedDiagnosis || trimmedDiagnosis.length < 3) {
      setAiSuggestions([]);
      return;
    }

    setAiLoading(true);
    const timeout = setTimeout(async () => {
      const fetchUrl = `${API_BASE_URL}/api/doctor/ai/suggestion?diagnosis=${encodeURIComponent(trimmedDiagnosis)}&type=medicine`;

      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setAiSuggestions(data);
        } else {
          throw new Error("Dữ liệu gợi ý thuốc không phải mảng JSON");
        }
      } catch (err) {
        console.error("AI medicine error:", err);
        setToast({
          show: true,
          message: `Lỗi gợi ý thuốc: ${err.message}`,
          variant: "danger",
        });
        setAiSuggestions([]);
      } finally {
        setAiLoading(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [diagnosis, setToast]);

  // FIX: XỬ LÝ CHỌN GỢI Ý CHẨN ĐOÁN
  const handleSelectDiagnosis = useCallback((suggestedDiagnosis) => {
    const newDiagnosis = suggestedDiagnosis.DiagnosisName;
    setInitialDiagnosis(newDiagnosis);
    setToast({
      show: true,
      message: `✅ Đã chọn chẩn đoán: "${newDiagnosis}"`,
      variant: "success",
    });
    setDiagnosisSuggestions([]);
  }, [setInitialDiagnosis, setToast]);

  // FIX: XỬ LÝ THÊM THUỐC TỪ GỢI Ý
  const handleAddMedicine = useCallback((item) => {
    const existingItem = prescriptionRows.find(row => row.medicine === item.MedicineName);
    if (existingItem) {
      const updatedRows = prescriptionRows.map(row =>
        row.medicine === item.MedicineName
          ? { ...row, quantity: row.quantity + 1 }
          : row
      );
      setPrescriptionRows(updatedRows);
    } else {
      setPrescriptionRows(prev => [...prev, { 
        medicine: item.MedicineName, 
        quantity: 1, 
        dosage: '' 
      }]);
    }
    setToast({ 
      show: true, 
      message: `✅ Đã thêm "${item.MedicineName}" vào toa thuốc.`, 
      variant: "success" 
    });
  }, [prescriptionRows, setPrescriptionRows, setToast]);

  // FIX: CẬP NHẬT DIAGNOSES KHI CÓ THAY ĐỔI
  useEffect(() => {
    if (onDiagnosisUpdate && (symptoms || diagnosis)) {
      onDiagnosisUpdate({
        Symptoms: symptoms || '',
        Diagnosis: diagnosis || '',
      });
    }
  }, [symptoms, diagnosis, onDiagnosisUpdate]);

  return (
    <Col md={12}>
      <Card className="mb-3 border-light shadow-sm">
        <Card.Header className="text-start fw-bold">
          1. Chẩn đoán
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3 text-start">
            <Form.Label>Triệu chứng</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={symptoms}
              onChange={handleSymptomsChange}
              disabled={isFormDisabled}
              placeholder="Nhập triệu chứng (ví dụ: ho, sốt, đau đầu...)"
            />
            {diagnosisLoading && (
              <div className="text-center mt-2">
                <Spinner animation="border" size="sm" /> Đang tải gợi ý chẩn đoán...
              </div>
            )}
            {diagnosisSuggestions.length > 0 && (
              <div className="ai-suggestions mt-2">
                <h6>🧠 Gợi ý chẩn đoán dựa trên triệu chứng:</h6>
                <ul className="mb-0">
                  {diagnosisSuggestions.map((item, i) => (
                    <li key={`${item.DiagnosisName}-${i}`}>
                      <div className="diagnosis-info d-flex justify-content-between align-items-center">
                        <span><b>{item.DiagnosisName}</b> — <i>{item.Reason}</i></span>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleSelectDiagnosis(item)}
                          disabled={isFormDisabled}
                        >
                          Chọn
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Form.Group>
          <Form.Group className="mb-3 text-start">
            <Form.Label>Chẩn đoán sơ bộ</Form.Label>
            <Form.Control
              type="text"
              value={diagnosis}
              onChange={handleDiagnosisChange}
              disabled={isFormDisabled}
              placeholder="Chọn từ gợi ý trên để tự động fill"
            />
            {aiLoading && (
              <div className="text-center mt-2">
                <Spinner animation="border" size="sm" /> Đang tải gợi ý thuốc...
              </div>
            )}
            {aiSuggestions.length > 0 && (
              <div className="ai-suggestions mt-2">
                <h6>🧠 Gợi ý thuốc phù hợp (dựa trên chẩn đoán):</h6>
                <ul className="mb-0">
                  {aiSuggestions.map((item, i) => (
                    <li key={`${item.MedicineName}-${i}`}>
                      <div className="medicine-info d-flex justify-content-between align-items-center">
                        <span><b>{item.MedicineName}</b> — <i>{item.Reason}</i></span>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleAddMedicine(item)}
                          disabled={isFormDisabled}
                        >
                          + Thêm
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Form.Group>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default React.memo(DiagnosisSection);