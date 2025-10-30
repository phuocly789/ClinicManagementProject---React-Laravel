import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Alert, Spinner } from 'react-bootstrap';
import TechnicianSidebar from '../../Components/Sidebar/TechnicianSidebar';
import TechnicianSection from '../../pages/Technician/TechnicianSection';
import technicianService from '../../services/technicianService';

const TechnicianDashboard = () => {
  const [currentSection, setCurrentSection] = useState('test-results');
  const [testResultsData, setTestResultsData] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [actionParams, setActionParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 Đang gọi API getAssignedServices...');
      const servicesResponse = await technicianService.getAssignedServices(1);

      console.log('📦 API Response:', servicesResponse);
      console.log('📊 Response data:', servicesResponse.data);

      // ✅ SỬA LẠI THEO CẤU TRÚC THỰC TẾ
      // servicesResponse = {success: true, data: Array(3), pagination: {...}}
      // servicesResponse.data = Array(3) - ĐÂY CHÍNH LÀ DATA CẦN LẤY!

      if (servicesResponse && servicesResponse.success && Array.isArray(servicesResponse.data)) {
        console.log('✅ Data nhận được:', servicesResponse.data);
        console.log('📋 Số lượng items:', servicesResponse.data.length);

        // ✅ SET DATA VÀO STATE - ĐÚNG CẤU TRÚC!
        setTestResultsData(servicesResponse.data);
      } else {
        console.log('❌ Cấu trúc response không đúng');
        setTestResultsData([]);
      }

    } catch (err) {
      console.error('💥 Error fetching data:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      setTestResultsData([]);
    } finally {
      setLoading(false);
    }
  };

  const switchSection = (sectionId) => {
    setCurrentSection(sectionId);
    setError('');
    setSuccess('');
  };

  const confirmAction = (action, ...params) => {
    setCurrentAction(action);
    setActionParams(params);
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    try {
      setLoading(true);
      setError('');

      // Xử lý các action ở đây
      switch (currentAction) {
        case 'updateTestResult':
          await updateTestResult(actionParams[0], actionParams[1], actionParams[2]);
          break;
        case 'editTestResult':
          await editTestResult(actionParams[0], actionParams[1], actionParams[2], actionParams[3]);
          break;
        default:
          break;
      }

      setSuccess('Thao tác thành công!');
    } catch (err) {
      setError('Thao tác thất bại. Vui lòng thử lại.');
      console.error('Error executing action:', err);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
      setCurrentAction(null);
      setActionParams([]);
    }
  };

  const updateTestResult = (testId, patient, service) => {
    console.log('Cập nhật kết quả:', testId, patient, service);
    setSuccess(`Đã cập nhật kết quả cho ${patient}`);
  };

  const editTestResult = (testId, patient, service, result) => {
    console.log('Chỉnh sửa kết quả:', testId, patient, service, result);
    setSuccess(`Đã chỉnh sửa kết quả cho ${patient}`);
  };

  const updateStats = () => {
    // Cập nhật thống kê nếu cần
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <TechnicianSidebar currentSection={currentSection} switchSection={switchSection} />
      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        <Container fluid>
          {/* Alert Messages */}
          {error && (
            <Alert variant="danger" dismissible onClose={clearMessages}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={clearMessages}>
              {success}
            </Alert>
          )}

          {loading && (
            <div className="text-center mb-3">
              <Spinner animation="border" variant="success" />
              <span className="ms-2">Đang xử lý...</span>
            </div>
          )}

          {/* Test Component để debug */}
          {currentSection === 'test-results' && testResultsData.length > 0 && (
            <Alert variant="info" className="mb-3">
              <strong>Debug:</strong> Đã tải {testResultsData.length} dịch vụ từ API
            </Alert>
          )}

          {currentSection === 'test-results' && (
            <TechnicianSection
              testResultsData={testResultsData}
              confirmAction={confirmAction}
              updateStats={updateStats}
              loading={loading}
            />
          )}
        </Container>
      </div>

      {/* Confirm Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Xác nhận</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p id="confirmMessage">
            {currentAction === 'updateTestResult' && `Bạn có muốn cập nhật kết quả xét nghiệm cho ${actionParams[1]}?`}
            {currentAction === 'editTestResult' && `Bạn có muốn chỉnh sửa kết quả xét nghiệm cho ${actionParams[1]}?`}
          </p>
          {loading && (
            <div className="text-center">
              <Spinner animation="border" size="sm" variant="success" />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={executeAction} disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={loading}>
            Hủy
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TechnicianDashboard;