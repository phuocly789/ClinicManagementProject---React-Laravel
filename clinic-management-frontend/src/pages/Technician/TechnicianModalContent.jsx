// src/components/TechnicianModalContent.jsx
import React, { useState } from 'react';
import { Form, Button, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';

const TechnicianModalContent = ({ testResultData, onSubmit, onCancel, isLoading = false }) => {
  const [result, setResult] = useState(testResultData.result || '');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // HÀM CHUYỂN DỊCH LỖI BE SANG FE
  const translateError = (error) => {
    console.error('🔴 Backend Error:', error);
    
    const backendMessage = error.response?.data?.message || error.message || '';
    
    const errorMap = {
      'Service not found': 'Không tìm thấy thông tin dịch vụ',
      'Patient not found': 'Không tìm thấy thông tin bệnh nhân',
      'Result already submitted': 'Kết quả đã được gửi trước đó',
      'Cannot submit result': 'Không thể gửi kết quả',
      'Network Error': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet',
      'Request failed with status code 404': 'Không tìm thấy dữ liệu',
      'Request failed with status code 500': 'Lỗi máy chủ. Vui lòng thử lại sau',
      'timeout of 5000ms exceeded': 'Quá thời gian chờ phản hồi',
      'No data to save': 'Không có dữ liệu để lưu',
      'Chỉ có thể nhập kết quả khi dịch vụ đang ở trạng thái "Đang thực hiện"': 'Chỉ có thể nhập kết quả khi dịch vụ đang ở trạng thái "Đang thực hiện"'
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (backendMessage.includes(key) || error.message.includes(key)) {
        return value;
      }
    }

    if (backendMessage) {
      return `Lỗi: ${backendMessage}`;
    }

    return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
  };

  // HÀM HIỂN THỊ CONFIRMATION VỚI SWEETALERT2
  const showConfirmation = async (options) => {
    const result = await Swal.fire({
      title: options.title || 'Xác nhận hành động',
      text: options.message || 'Bạn có chắc muốn thực hiện hành động này?',
      icon: options.icon || 'question',
      showCancelButton: true,
      confirmButtonColor: options.confirmColor || '#3085d6',
      cancelButtonColor: options.cancelColor || '#d33',
      confirmButtonText: options.confirmText || 'Xác nhận',
      cancelButtonText: options.cancelText || 'Hủy',
      showLoaderOnConfirm: options.showLoader || false,
      preConfirm: options.preConfirm || undefined,
      allowOutsideClick: () => !Swal.isLoading()
    });

    return result;
  };

  // HÀM HIỂN THỊ THÔNG BÁO THÀNH CÔNG
  const showSuccessAlert = (message) => {
    Swal.fire({
      title: 'Thành công!',
      text: message,
      icon: 'success',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK'
    });
  };

  // HÀM XỬ LÝ LỖI VÀ HIỂN THỊ THÔNG BÁO
  const handleError = (error, customMessage = '') => {
    const translatedError = translateError(error);
    console.error('❌ Error:', error);
    
    Swal.fire({
      title: 'Lỗi!',
      text: customMessage || translatedError,
      icon: 'error',
      confirmButtonColor: '#d33',
      confirmButtonText: 'OK'
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!result.trim()) {
      newErrors.result = 'Kết quả không được để trống';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Hiển thị confirmation trước khi lưu kết quả
    const confirmResult = await showConfirmation({
      title: 'Lưu kết quả xét nghiệm',
      text: `Bạn có chắc muốn lưu kết quả xét nghiệm cho bệnh nhân ${testResultData.patient}?`,
      icon: 'question',
      confirmText: 'Lưu kết quả',
      cancelText: 'Hủy',
      showLoader: true,
      preConfirm: async () => {
        try {
          setIsSubmitting(true);

          // Prepare data for submission - CHỈ GỬI KẾT QUẢ
          const submissionData = {
            result: result.trim()
          };

          // Gọi hàm onSubmit từ props
          await onSubmit(submissionData);

          return `Đã lưu kết quả xét nghiệm cho ${testResultData.patient}`;
        } catch (error) {
          const translatedError = translateError(error);
          throw new Error(translatedError);
        } finally {
          setIsSubmitting(false);
        }
      }
    });

    if (confirmResult.isConfirmed) {
      showSuccessAlert(confirmResult.value);
    }
  };

  const handleInputChange = (value) => {
    setResult(value);
    
    // Clear error when user starts typing
    if (errors.result) {
      setErrors(prev => ({
        ...prev,
        result: ''
      }));
    }
  };

  const handleReset = async () => {
    const hasChanges = result !== (testResultData.result || '');

    if (!hasChanges) {
      setResult(testResultData.result || '');
      setErrors({});
      return;
    }

    const result = await showConfirmation({
      title: 'Đặt lại form',
      text: 'Bạn có chắc muốn đặt lại kết quả về giá trị ban đầu?',
      icon: 'warning',
      confirmText: 'Đặt lại',
      cancelText: 'Hủy',
      confirmColor: '#f0ad4e'
    });

    if (result.isConfirmed) {
      setResult(testResultData.result || '');
      setErrors({});
      showSuccessAlert('Đã đặt lại kết quả về giá trị ban đầu');
    }
  };

  const handleCancel = async () => {
    const hasChanges = result !== (testResultData.result || '');

    if (hasChanges) {
      const result = await showConfirmation({
        title: 'Hủy bỏ thay đổi',
        text: 'Bạn có chắc muốn hủy bỏ? Kết quả chưa lưu sẽ bị mất.',
        icon: 'warning',
        confirmText: 'Hủy bỏ',
        cancelText: 'Tiếp tục chỉnh sửa',
        confirmColor: '#d33'
      });

      if (result.isConfirmed && onCancel) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* Patient and Service Information */}
      <Card className="mb-4 border-0 bg-light">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-primary">
                  <i className="fas fa-user me-2"></i>
                  Bệnh nhân
                </Form.Label>
                <Form.Control 
                  type="text" 
                  value={testResultData.patient} 
                  readOnly 
                  className="bg-white border-primary"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-primary">
                  <i className="fas fa-stethoscope me-2"></i>
                  Dịch vụ
                </Form.Label>
                <Form.Control 
                  type="text" 
                  value={testResultData.service} 
                  readOnly 
                  className="bg-white border-primary"
                />
              </Form.Group>
            </Col>
          </Row>
          
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-muted">
                  Mã dịch vụ
                </Form.Label>
                <Form.Control 
                  type="text" 
                  value={testResultData.serviceCode || `#${testResultData.service_order_id}`} 
                  readOnly 
                  className="bg-white"
                  size="sm"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-muted">
                  Ngày chỉ định
                </Form.Label>
                <Form.Control 
                  type="text" 
                  value={testResultData.orderDate} 
                  readOnly 
                  className="bg-white"
                  size="sm"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-muted">
                  Bác sĩ chỉ định
                </Form.Label>
                <Form.Control 
                  type="text" 
                  value={testResultData.doctor || 'N/A'} 
                  readOnly 
                  className="bg-white"
                  size="sm"
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Test Results Section - CHỈ CÓ KẾT QUẢ */}
      <Card className="mb-4 border-primary">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <i className="fas fa-vial me-2"></i>
            Kết Quả Xét Nghiệm
          </h5>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              Kết quả xét nghiệm <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control 
              as="textarea" 
              rows={12}
              value={result}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Nhập kết quả xét nghiệm chi tiết..."
              className={errors.result ? 'is-invalid border-2' : 'border-2'}
              required
              disabled={isSubmitting || isLoading}
            />
            {errors.result && (
              <Form.Text className="text-danger">
                <i className="fas fa-exclamation-circle me-1"></i>
                {errors.result}
              </Form.Text>
            )}
            <Form.Text className="text-muted">
              Vui lòng nhập đầy đủ và chính xác kết quả xét nghiệm. Kết quả sẽ được lưu vào hệ thống.
            </Form.Text>
          </Form.Group>
        </Card.Body>
      </Card>

      {/* Validation Alert */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="warning" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Vui lòng kiểm tra lại các trường thông tin bắt buộc
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <Button 
            variant="outline-secondary" 
            onClick={handleReset}
            disabled={isSubmitting || isLoading}
            className="me-2"
          >
            {isSubmitting ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="fas fa-redo me-2"></i>}
            Đặt lại
          </Button>
          {onCancel && (
            <Button 
              variant="outline-danger" 
              onClick={handleCancel}
              disabled={isSubmitting || isLoading}
            >
              <i className="fas fa-times me-2"></i>
              Hủy bỏ
            </Button>
          )}
        </div>
        
        <div className="d-flex gap-2">
          <Button 
            variant="success" 
            type="submit"
            disabled={isSubmitting || isLoading || !result.trim()}
            className="d-flex align-items-center px-4"
          >
            {isSubmitting || isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang lưu...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle me-2"></i> 
                Lưu Kết Quả
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Status Info */}
      <div className="mt-3 p-2 bg-light rounded">
        <small className="text-muted">
          <i className="fas fa-info-circle me-1"></i>
          Trạng thái: <span className="fw-bold text-warning">Đang chờ kết quả</span>
          {result.trim() && (
            <span className="ms-2">
              → <span className="fw-bold text-success">Sẵn sàng hoàn thành</span>
            </span>
          )}
        </small>
      </div>
    </Form>
  );
};

export default TechnicianModalContent;