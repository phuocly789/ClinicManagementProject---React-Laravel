import React, { useState, useEffect, useCallback } from 'react';
import { Container, Button, Modal, Alert, Spinner } from 'react-bootstrap';
import TechnicianSection from '../../pages/Technician/TechnicianSection';
import technicianService from '../../services/technicianService';
import TechSchedule from './TechSchedule';

const TechnicianDashboard = () => {
  const [currentSection, setCurrentSection] = useState('test-results');
  const [testResultsData, setTestResultsData] = useState([]);
  const [completedServicesData, setCompletedServicesData] = useState([]); // ✅ THÊM STATE MỚI
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [actionParams, setActionParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dataVersion, setDataVersion] = useState(0);

  // Fetch initial data - SỬA LẠI
  useEffect(() => {
    fetchInitialData();
  }, []);

  // THÊM DEBUG ĐỂ XEM CẤU TRÚC THỰC TẾ
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 [TechnicianDashboard] Đang gọi API...');

      const [servicesResponse, completedResponse] = await Promise.all([
        technicianService.getAssignedServices(1),
        technicianService.getCompletedServices()
      ]);

      console.log('🔍 [DEBUG] RAW Assigned Response:', servicesResponse);
      console.log('🔍 [DEBUG] RAW Completed Response:', completedResponse);

      // ✅ SỬA LẠI: API TRẢ VỀ TRỰC TIẾP ARRAY, KHÔNG CÓ SUCCESS FIELD
      // 1. Xử lý assigned services - response.data đã là array
      const assignedData = servicesResponse?.data || [];
      console.log('✅ Assigned data after fix:', {
        data: assignedData,
        isArray: Array.isArray(assignedData),
        length: assignedData.length
      });
      setTestResultsData(Array.isArray(assignedData) ? assignedData : []);

      // 2. Xử lý completed services - response.data đã là array  
      const completedData = completedResponse?.data || [];
      console.log('✅ Completed data after fix:', {
        data: completedData,
        isArray: Array.isArray(completedData),
        length: completedData.length
      });
      setCompletedServicesData(Array.isArray(completedData) ? completedData : []);

      setDataVersion(prev => prev + 1);

    } catch (err) {
      console.error('💥 [TechnicianDashboard] Error:', err);
      setError('Không thể tải dữ liệu.');
      setTestResultsData([]);
      setCompletedServicesData([]);
    } finally {
      setLoading(false);
    }
  };
  
  const switchSection = (sectionId) => {
    console.log('🔄 [TechnicianDashboard] Switching to section:', sectionId);
    setCurrentSection(sectionId);
    setError('');
    setSuccess('');

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

      console.log('🚀 [TechnicianDashboard] executeAction:', currentAction);

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
    setSuccess(`Đã cập nhật kết quả cho ${patient}`);
  };

  const editTestResult = async (testId, patient, service, result) => {
    console.log('✏️ [TechnicianDashboard] editTestResult:', { testId, patient, service, result });
    setSuccess(`Đã chỉnh sửa kết quả cho ${patient}`);
  };

  // ✅ CẬP NHẬT updateStats
  const updateStats = useCallback(() => {
    console.log('📊 [TechnicianDashboard] updateStats called');

    // Debounce logic
    const now = Date.now();
    if (window.lastUpdateCall && (now - window.lastUpdateCall < 2000)) {
      console.log('⏰ [TechnicianDashboard] Debounced updateStats');
      return;
    }
    window.lastUpdateCall = now;

    // Reload data sau 1 giây
    setTimeout(() => {
      fetchInitialData(); // ✅ RELOAD CẢ 2 DATA
    }, 1000);
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  console.log('🎯 [TechnicianDashboard] Rendering with:', {
    currentSection,
    testResultsDataLength: testResultsData.length,
    completedServicesDataLength: completedServicesData.length,
    loading,
    dataVersion
  });

  return (
    <div className="d-flex min-vh-100 bg-light">
      <div className="flex-grow-1 p-4">
        <Container fluid>
          {/* Alert Messages */}
          {error && (
            <Alert variant="danger" dismissible onClose={clearMessages}>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={clearMessages}>
              <i className="fas fa-check-circle me-2"></i>
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

          {/* Render Sections */}
          {currentSection === 'schedule' && <TechSchedule />}

          {currentSection === 'test-results' && (
            <TechnicianSection
              testResultsData={testResultsData}
              completedServicesData={completedServicesData} // ✅ TRUYỀN DATA MỚI
              confirmAction={confirmAction}
              updateStats={updateStats}
              loading={loading}
              dataVersion={dataVersion}
            />
          )}

          {/* Debug Info */}
          <div className="mt-3 text-center">
            <small className="text-muted">
              Section: <strong>{currentSection}</strong> |
              Assigned: <strong>{testResultsData.length}</strong> |
              Completed: <strong>{completedServicesData.length}</strong> |
              Version: <strong>{dataVersion}</strong>
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
          <p>
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