import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Alert, Spinner } from 'react-bootstrap';
import TechnicianSidebar from '../../Components/Sidebar/TechnicianSidebar';
import Pagination from '../../Components/Pagination/Pagination';
import Loading from '../../Components/Loading/Loading';
import CustomToast from '../../Components/CustomToast/CustomToast';
import ScheduleSection from '../../pages/Technician/ScheduleSection';
import TechnicianSection from '../../pages/Technician/TechnicianSection';
import TechnicianModalContent from '../../pages/Technician/TechnicianModalContent';
import TechnicianReportModal from '../../pages/Technician//TechnicianReportModal';
import technicianService from '../../services/technicianService';

const TechnicianDashboard = () => {
  const [currentSection, setCurrentSection] = useState('test-results');
  const [scheduleData, setScheduleData] = useState([]);
  const [testReportData, setTestReportData] = useState([]);
  const [testResultsData, setTestResultsData] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTestResultModal, setShowTestResultModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [actionParams, setActionParams] = useState([]);
  const [reportData, setReportData] = useState({ testId: '', taskName: '', time: '' });
  const [testResultData, setTestResultData] = useState({ id: '', patient: '', service: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch initial data - CHỈ LẤY DANH SÁCH DỊCH VỤ
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // ✅ CHỈ GỌI API getAssignedServices (DUY NHẤT TỒN TẠI)
      const servicesResponse = await technicianService.getAssignedServices(1);
      
      if (servicesResponse.data.success) {
        console.log('✅ Danh sách dịch vụ:', servicesResponse.data);
        // Có thể set data vào state nếu cần
        // setTestResultsData(servicesResponse.data.data);
      }
      
      // ❌ COMMENT TẤT CẢ API KHÔNG TỒN TẠI
      /*
      const scheduleResponse = await technicianService.getSchedule();
      setScheduleData(scheduleResponse.data);
      
      const testResultsResponse = await technicianService.getTestResults();
      setTestResultsData(testResultsResponse.data);
      
      const testReportsResponse = await technicianService.getTestReports();
      setTestReportData(testReportsResponse.data);
      */
      
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      console.error('Error fetching initial data:', err);
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
      
      switch (currentAction) {
        case 'completeTask':
          await completeTask(actionParams[0], actionParams[1], actionParams[2]);
          break;
        case 'updateTestResult':
          await updateTestResult(actionParams[0], actionParams[1], actionParams[2]);
          break;
        case 'editTestResult':
          await editTestResult(actionParams[0], actionParams[1], actionParams[2], actionParams[3]);
          break;
        case 'saveReport':
          await saveReport(actionParams[0], actionParams[1]);
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

  // ❌ TẠM THỜI COMMENT CÁC HÀM GỌI API KHÔNG TỒN TẠI
  /*
  const completeTask = async (testId, task, time) => {
    try {
      await technicianService.updateTaskStatus(testId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      setScheduleData(prev => 
        prev.map(item => 
          item.testId === testId && item.time === time && item.status === 'Đang thực hiện' 
            ? { ...item, status: 'Hoàn thành' } 
            : item
        )
      );
      
      setTestResultsData(prev => 
        prev.map(t => t.id === testId ? { ...t, status: 'Hoàn thành' } : t)
      );
      
      openReportModal(testId, task, time);
    } catch (err) {
      throw new Error('Không thể hoàn thành nhiệm vụ');
    }
  };
  */

  const openReportModal = (testId, task, time) => {
    setReportData({ testId, taskName: task, time });
    setShowReportModal(true);
  };

  // ❌ TẠM THỜI COMMENT
  /*
  const saveReport = async (testId, notes) => {
    try {
      const reportData = {
        testId,
        notes,
        reportedAt: new Date().toISOString(),
        status: 'completed'
      };

      await technicianService.saveTestReport(reportData);

      const patient = testResultsData.find(t => t.id === testId)?.patient;
      const service = testResultsData.find(t => t.id === testId)?.service;
      const existingReport = testReportData.find(r => r.testId === testId);
      
      if (!existingReport) {
        const newReport = {
          testId,
          name: `${patient} - ${service}`,
          date: new Date().toLocaleDateString('vi-VN'),
          status: 'Hoàn thành',
          notes
        };
        
        setTestReportData(prev => [...prev, newReport]);
      }

      setSuccess(`Báo cáo cho ${patient} đã được lưu thành công.`);
    } catch (err) {
      throw new Error('Không thể lưu báo cáo');
    }
  };
  */

  const updateTestResult = (testId, patient, service) => {
    setTestResultData({ id: testId, patient, service, notes: '' });
    setShowTestResultModal(true);
  };

  const editTestResult = (testId, patient, service, result) => {
    setTestResultData({ id: testId, patient, service, notes: result });
    setShowTestResultModal(true);
  };

  // ❌ TẠM THỜI COMMENT
  /*
  const handleTestResultSubmit = async (notes) => {
    try {
      setLoading(true);
      
      await technicianService.updateTestResult(testResultData.id, {
        result: notes,
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      setTestResultsData(prev => 
        prev.map(t => 
          t.id === testResultData.id 
            ? { ...t, status: 'Hoàn thành', result: notes } 
            : t
        )
      );

      const existingReport = testReportData.find(r => r.testId === testResultData.id);
      if (!existingReport) {
        const newReport = {
          testId: testResultData.id,
          name: `${testResultData.patient} - ${testResultData.service}`,
          date: new Date().toLocaleDateString('vi-VN'),
          status: 'Hoàn thành',
          notes
        };
        
        await technicianService.saveTestReport(newReport);
        setTestReportData(prev => [...prev, newReport]);
      }

      setShowTestResultModal(false);
      setSuccess(`Kết quả xét nghiệm cho ${testResultData.patient} đã được cập nhật thành công.`);
    } catch (err) {
      setError('Không thể cập nhật kết quả xét nghiệm');
      console.error('Error updating test result:', err);
    } finally {
      setLoading(false);
    }
  };
  */

  const updateStats = () => {
    const completed = testResultsData.filter(t => t.status === 'Hoàn thành').length;
    document.getElementById('completedTests') && (document.getElementById('completedTests').textContent = completed);
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

          {/* ❌ TẠM THỜI ẨN SCHEDULE SECTION VÌ KHÔNG CÓ DATA */}
          {/*
          {currentSection === 'schedule' && (
            <ScheduleSection 
              scheduleData={scheduleData}
              testReportData={testReportData}
              confirmAction={confirmAction}
              openReportModal={openReportModal}
              loading={loading}
            />
          )}
          */}
          
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

      {/* ❌ TẠM THỜI COMMENT MODALS */}
      {/*
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Xác nhận</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p id="confirmMessage">
            {currentAction === 'completeTask' && `Bạn có muốn hoàn thành nhiệm vụ "${actionParams[1]}"?`}
            {currentAction === 'updateTestResult' && `Bạn có muốn cập nhật kết quả xét nghiệm cho ${actionParams[1]}?`}
            {currentAction === 'editTestResult' && `Bạn có muốn chỉnh sửa kết quả xét nghiệm cho ${actionParams[1]}?`}
            {currentAction === 'saveReport' && `Bạn có muốn lưu báo cáo cho nhiệm vụ "${reportData.taskName}"?`}
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

      <Modal show={showTestResultModal} onHide={() => setShowTestResultModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Cập nhật/Chỉnh sửa kết quả xét nghiệm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <TechnicianModalContent 
            testResultData={testResultData}
            onSubmit={handleTestResultSubmit}
            loading={loading}
          />
        </Modal.Body>
      </Modal>

      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Báo cáo nhiệm vụ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <TechnicianModalContent 
            reportData={reportData}
            confirmAction={confirmAction}
            setShowReportModal={setShowReportModal}
            loading={loading}
          />
        </Modal.Body>
      </Modal>
      */}
    </div>
  );
};

export default TechnicianDashboard;