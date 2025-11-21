import React, { useState, useEffect, useCallback } from 'react';
import { Container, Button, Modal, Alert, Spinner } from 'react-bootstrap';
import TechnicianSection from '../../pages/Technician/TechnicianSection';
import technicianService from '../../services/technicianService';
import TechSchedule from './TechSchedule';

const TechnicianDashboard = () => {
  const [currentSection, setCurrentSection] = useState('test-results');
  const [testResultsData, setTestResultsData] = useState([]);
  const [completedServicesData, setCompletedServicesData] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [actionParams, setActionParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0
  });

  // TRONG TechnicianDashboard - render
  console.log('🎯 [DASHBOARD RENDER] Current state:', {
    testResultsData: testResultsData,
    completedServicesData: completedServicesData,
    testResultsLength: testResultsData.length,
    completedLength: completedServicesData.length,
    loading,
    dataVersion
  });

  // TRONG TechnicianSection - render
  console.log('🎯 [SECTION RENDER] Props received:', {
    testResultsData: testResultsData,
    completedServicesData: completedServicesData,
    testResultsLength: testResultsData?.length,
    completedLength: completedServicesData?.length,
    loading
  });

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);


  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔄 [TechnicianDashboard] Đang gọi API...');

      const [servicesResponse, completedResponse] = await Promise.all([
        technicianService.getAssignedServices(1),
        technicianService.getCompletedServices()
      ]);

      console.log('🔍 [DEBUG] Full API Responses STRUCTURE:', {
        assignedKeys: servicesResponse.data ? Object.keys(servicesResponse.data) : 'no data',
        completedKeys: completedResponse.data ? Object.keys(completedResponse.data) : 'no data',
        assignedData: servicesResponse.data,
        completedData: completedResponse.data
      });

      // ✅ SỬA LẠI: DATA NẰM TRỰC TIẾP TRONG RESPONSE.DATA
      const assignedData = Array.isArray(servicesResponse?.data)
        ? servicesResponse.data
        : servicesResponse?.data?.data || [];

      const completedData = Array.isArray(completedResponse?.data)
        ? completedResponse.data
        : completedResponse?.data?.data || [];

      console.log('✅ FINAL Data after correction:', {
        assignedData: assignedData.length,
        completedData: completedData.length,
        assignedFirstItem: assignedData[0],
        completedFirstItem: completedData[0]
      });

      setTestResultsData(assignedData);
      setCompletedServicesData(completedData);

      // Cập nhật pagination nếu có
      if (servicesResponse?.data?.pagination) {
        setPagination({
          currentPage: servicesResponse.data.pagination.current_page,
          lastPage: servicesResponse.data.pagination.last_page,
          total: servicesResponse.data.pagination.total
        });
      }

      setDataVersion(prev => prev + 1);

    } catch (err) {
      console.error('💥 [TechnicianDashboard] Error:', err);
      setError('Không thể tải dữ liệu: ' + (err.response?.data?.message || err.message));
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
    console.log('📊 [TechnicianDashboard] updateStats called - RELOADING DATA');

    // Debounce logic
    const now = Date.now();
    if (window.lastUpdateCall && (now - window.lastUpdateCall < 1000)) {
      console.log('⏰ [TechnicianDashboard] Debounced updateStats');
      return;
    }
    window.lastUpdateCall = now;

    // Reload data
    console.log('🔄 [TechnicianDashboard] Force reloading data...');
    fetchInitialData();
  }, []);

  // ✅ Manual refresh function
  const manualRefresh = () => {
    console.log('🔄 [TechnicianDashboard] Manual refresh triggered');
    fetchInitialData();
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // ✅ XỬ LÝ PHÂN TRANG
  const handlePageChange = (page) => {
    console.log('📄 [TechnicianDashboard] Page change:', page);

    technicianService.getAssignedServices(page)
      .then(response => {
        if (response.data?.success) {
          setTestResultsData(response.data.data || []);
          if (response.data.pagination) {
            setPagination({
              currentPage: response.data.pagination.current_page,
              lastPage: response.data.pagination.last_page,
              total: response.data.pagination.total
            });
          }
        }
      })
      .catch(err => {
        console.error('❌ Page change error:', err);
        setError('Không thể tải trang mới');
      });
  };

  console.log('🎯 [TechnicianDashboard] Rendering with:', {
    currentSection,
    testResultsDataLength: testResultsData.length,
    completedServicesDataLength: completedServicesData.length,
    loading,
    dataVersion,
    pagination
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


          {/* ✅ NÚT REFRESH MANUAL */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div></div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={manualRefresh}
              disabled={loading}
            >
              <i className="fas fa-sync-alt me-2"></i>
              {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
            </Button>
          </div>


          {currentSection === 'test-results' && (
            <TechnicianSection
              testResultsData={testResultsData}
              completedServicesData={completedServicesData}
              confirmAction={confirmAction}
              updateStats={updateStats}
              loading={loading}
              dataVersion={dataVersion}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3 text-center">
              <small className="text-muted">
                Section: <strong>{currentSection}</strong> |
                Assigned: <strong>{testResultsData.length}</strong> |
                Completed: <strong>{completedServicesData.length}</strong> |
                Version: <strong>{dataVersion}</strong>
              </small>
            </div>
          )}
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