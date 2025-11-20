import React, { useState, useEffect, useCallback } from "react";
import { Col, Card, Form, Button, Spinner } from "react-bootstrap";
import doctorService from "../../../services/doctorService";

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
  const symptoms = initialSymptoms || '';
  const diagnosis = initialDiagnosis || '';

  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSymptomsChange = useCallback((e) => {
    setInitialSymptoms(e.target.value);
  }, [setInitialSymptoms]);

  const handleDiagnosisChange = useCallback((e) => {
    setInitialDiagnosis(e.target.value);
  }, [setInitialDiagnosis]);

  // FIX: XỬ LÝ API GỢI Ý CHẨN ĐOÁN - ĐÃ SỬA
  useEffect(() => {
    const trimmedSymptoms = symptoms?.trim();
    if (!trimmedSymptoms || trimmedSymptoms.length < 3) {
      setDiagnosisSuggestions([]);
      return;
    }

    setDiagnosisLoading(true);
    const timeout = setTimeout(async () => {
      try {
        console.log('🔍 Gọi API suggestDiagnosis với symptoms:', trimmedSymptoms);
        const response = await doctorService.suggestDiagnosis(trimmedSymptoms);
        console.log('🔍 API Response:', response);
        
        let suggestions = [];
        
        // FIX: API TRẢ VỀ ARRAY TRỰC TIẾP, KHÔNG PHẢI response.data
        if (Array.isArray(response)) {
          suggestions = response;
          console.log('✅ Case 1: response là array trực tiếp');
        }
        // DỰ PHÒNG: nếu có response.data
        else if (response && Array.isArray(response.data)) {
          suggestions = response.data;
          console.log('✅ Case 2: response.data là array');
        }
        else {
          console.warn('⚠️ Cấu trúc response không xác định:', response);
        }

        console.log('📊 Suggestions cuối cùng:', suggestions);

        if (suggestions.length > 0) {
          // CHUẨN HÓA DỮ LIỆU
          const normalizedSuggestions = suggestions.map(item => ({
            DiagnosisName: item.DiagnosisName || item.name || item.diagnosis || 'Không có tên',
            Reason: item.Reason || item.reason || item.description || item.explanation || 'Không có mô tả'
          }));
          
          setDiagnosisSuggestions(normalizedSuggestions);
          console.log('✅ Đã set diagnosis suggestions:', normalizedSuggestions);
        } else {
          setDiagnosisSuggestions([]);
          console.log('ℹ️ Không có gợi ý chẩn đoán nào');
        }

      } catch (err) {
        console.error("❌ AI diagnosis error:", err);
        console.error("❌ Error details:", err.response?.data || err.message);
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

  // FIX: XỬ LÝ API GỢI Ý THUỐC - ĐÃ SỬA
  useEffect(() => {
    const trimmedDiagnosis = diagnosis?.trim();
    if (!trimmedDiagnosis || trimmedDiagnosis.length < 3) {
      setAiSuggestions([]);
      return;
    }

    setAiLoading(true);
    const timeout = setTimeout(async () => {
      try {
        console.log('🔍 Gọi API suggestMedicine với diagnosis:', trimmedDiagnosis);
        const response = await doctorService.suggestMedicine(trimmedDiagnosis);
        console.log('🔍 API Response:', response);
        
        let suggestions = [];
        
        // FIX: API TRẢ VỀ ARRAY TRỰC TIẾP, KHÔNG PHẢI response.data
        if (Array.isArray(response)) {
          suggestions = response;
          console.log('✅ Case 1: response là array trực tiếp');
        }
        // DỰ PHÒNG: nếu có response.data
        else if (response && Array.isArray(response.data)) {
          suggestions = response.data;
          console.log('✅ Case 2: response.data là array');
        }
        else {
          console.warn('⚠️ Cấu trúc response không xác định:', response);
        }

        console.log('📊 Medicine suggestions cuối cùng:', suggestions);

        if (suggestions.length > 0) {
          // CHUẨN HÓA DỮ LIỆU
          const normalizedSuggestions = suggestions.map(item => ({
            MedicineName: item.MedicineName || item.name || item.medicine || item.medication || 'Không có tên',
            Reason: item.Reason || item.reason || item.description || item.explanation || 'Không có mô tả'
          }));
          
          setAiSuggestions(normalizedSuggestions);
          console.log('✅ Đã set medicine suggestions:', normalizedSuggestions);
        } else {
          setAiSuggestions([]);
          console.log('ℹ️ Không có gợi ý thuốc nào');
        }

      } catch (err) {
        console.error("❌ AI medicine error:", err);
        console.error("❌ Error details:", err.response?.data || err.message);
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

  // CÁC FUNCTION KHÁC GIỮ NGUYÊN
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