import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Alert, Spinner } from 'react-bootstrap';
import TechnicianSection from '../../pages/Technician/TechnicianSection';
import technicianService from '../../services/technicianService';
import TechSchedule from './TechSchedule';

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

      console.log('🔄 [TechnicianDashboard] Đang gọi API getAssignedServices...');
      const servicesResponse = await technicianService.getAssignedServices(1);

      console.log('📦 [TechnicianDashboard] API Response:', servicesResponse);
      console.log('📊 [TechnicianDashboard] Response data:', servicesResponse.data);

      if (servicesResponse && servicesResponse.success && Array.isArray(servicesResponse.data)) {
        console.log('✅ [TechnicianDashboard] Data nhận được:', servicesResponse.data);
        console.log('📋 [TechnicianDashboard] Số lượng items:', servicesResponse.data.length);

        setTestResultsData(servicesResponse.data);
      } else {
        console.log('❌ [TechnicianDashboard] Cấu trúc response không đúng');
        setTestResultsData([]);
      }

    } catch (err) {
      console.error('💥 [TechnicianDashboard] Error fetching data:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      setTestResultsData([]);
    } finally {
      setLoading(false);
    }
  };

  const switchSection = (sectionId) => {
    console.log('🔄 [TechnicianDashboard] Switching to section:', sectionId);
    setCurrentSection(sectionId);
    setError('');
    setSuccess('');
    
    // Fetch data mới khi chuyển section nếu cần
    if (sectionId === 'test-results') {
      fetchInitialData();
    }
  };

  const confirmAction = (action, ...params) => {
    console.log('🔍 [TechnicianDashboard] confirmAction called:', { action, params });
    setCurrentAction(action);
    setActionParams(params);
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🚀 [TechnicianDashboard] executeAction:', { 
        currentAction, 
        actionParams 
      });

      switch (currentAction) {
        case 'updateTestResult':
          await updateTestResult(actionParams[0], actionParams[1], actionParams[2]);
          break;
        case 'editTestResult':
          await editTestResult(actionParams[0], actionParams[1], actionParams[2], actionParams[3]);
          break;
        default:
          console.warn('⚠️ [TechnicianDashboard] Action không xác định:', currentAction);
          break;
      }

      setSuccess('Thao tác thành công!');
      console.log('✅ [TechnicianDashboard] Action completed successfully');
      
    } catch (err) {
      console.error('❌ [TechnicianDashboard] Error executing action:', err);
      setError('Thao tác thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
      setCurrentAction(null);
      setActionParams([]);
    }
  };

  const updateTestResult = async (testId, patient, service) => {
    console.log('📝 [TechnicianDashboard] updateTestResult:', { testId, patient, service });
    // Thêm logic update thực tế ở đây
    setSuccess(`Đã cập nhật kết quả cho ${patient}`);
  };

  const editTestResult = async (testId, patient, service, result) => {
    console.log('✏️ [TechnicianDashboard] editTestResult:', { testId, patient, service, result });
    // Thêm logic edit thực tế ở đây
    setSuccess(`Đã chỉnh sửa kết quả cho ${patient}`);
  };

  // ✅ THÊM DEBUG CHO updateStats
  const updateStats = () => {
    console.log('📊 [TechnicianDashboard] updateStats called - refreshing data...');
    fetchInitialData(); // Refresh data khi cần
  };

  const clearMessages = () => {
    console.log('🧹 [TechnicianDashboard] Clearing messages');
    setError('');
    setSuccess('');
  };

  // ✅ THÊM DEBUG RENDER
  console.log('🎯 [TechnicianDashboard] Rendering with:', {
    currentSection,
    testResultsDataLength: testResultsData.length,
    loading,
    error: !!error,
    success: !!success
  });

  return (
    <div className="d-flex min-vh-100 bg-light">
      <div className="flex-grow-1 p-4">
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

          {/* Loading Spinner */}
          {loading && (
            <div className="text-center mb-3">
              <Spinner animation="border" variant="primary" />
              <span className="ms-2">Đang tải dữ liệu...</span>
            </div>
          )}

          {/* Debug Info */}
          {currentSection === 'test-results' && testResultsData.length > 0 && (
            <Alert variant="info" className="mb-3">
              <strong>Debug:</strong> Đã tải {testResultsData.length} dịch vụ từ API
            </Alert>
          )}

          {/* Render Sections */}
          {currentSection === 'schedule' && (
            <TechSchedule />
          )}

          {currentSection === 'test-results' && (
            <TechnicianSection
              testResultsData={testResultsData}
              confirmAction={confirmAction}
              updateStats={updateStats}
              loading={loading}
            />
          )}

          {/* Debug current section */}
          <div className="mt-3 text-center">
            <small className="text-muted">
              Section hiện tại: <strong>{currentSection}</strong> | 
              Data items: <strong>{testResultsData.length}</strong> | 
              Loading: <strong>{loading ? 'Yes' : 'No'}</strong>
            </small>
          </div>
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