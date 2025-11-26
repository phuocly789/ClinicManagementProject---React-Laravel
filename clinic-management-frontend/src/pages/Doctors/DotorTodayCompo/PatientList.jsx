import React, { useState, useEffect, useRef } from "react";
import { ListGroup, Spinner, Badge, Alert } from "react-bootstrap";
import Pagination from "../../../Components/Pagination/Pagination";

const PatientList = ({
  todayPatients,
  isLoading,
  selectedTodayPatient,
  onPatientSelect,
  getStatusVariant,
  getStatusText,
  refreshTrigger,
  isExaminationInProgress, // Thêm prop mới để kiểm tra trạng thái khám hiện tại
  currentExaminationPatient, // Thêm prop để biết bệnh nhân đang được khám
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const itemsPerPage = 8;
  const listRef = useRef(null);

  // Tính toán pagination
  const pageCount = Math.ceil(todayPatients.length / itemsPerPage);
  const currentItems = todayPatients.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  /**
   * Xử lý thay đổi trang
   */
  const handlePageChange = ({ selected }) => {
    setCurrentPage(selected);
  };

  /**
   * Xử lý khi chọn bệnh nhân
   */
  const handlePatientSelect = (patient) => {
    console.log("Check patient: ", patient);
    if (
      isExaminationInProgress &&
      currentExaminationPatient?.id !== patient.id
    ) {
      setShowAlert(true);
      // Tự động ẩn alert sau 5 giây
      setTimeout(() => setShowAlert(false), 5000);
      return;
    }

    // Chỉ select nếu chưa active
    if (selectedTodayPatient?.id !== patient.id) {
      // setSelectedTodayPatient(patient);
      onPatientSelect(patient);
    }
  };

  // EFFECT: Reset về trang đầu khi danh sách thay đổi
  useEffect(() => {
    setCurrentPage(0);
  }, [todayPatients.length, refreshTrigger]);

  // EFFECT: Tự động chuyển đến trang có bệnh nhân được chọn
  useEffect(() => {
    if (selectedTodayPatient && todayPatients.length > 0) {
      const selectedIndex = todayPatients.findIndex(
        (patient) => patient.id === selectedTodayPatient.id
      );

      if (selectedIndex !== -1) {
        const page = Math.floor(selectedIndex / itemsPerPage);
        setCurrentPage(page);
      }
    }
  }, [selectedTodayPatient, todayPatients, itemsPerPage]);

  // EFFECT: Auto-scroll đến bệnh nhân được chọn trong view hiện tại
  useEffect(() => {
    if (selectedTodayPatient && listRef.current) {
      const selectedIndex = currentItems.findIndex(
        (patient) => patient.id === selectedTodayPatient.id
      );

      if (selectedIndex !== -1) {
        const selectedElement = listRef.current.children[selectedIndex];
        if (selectedElement) {
          selectedElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    }
  }, [selectedTodayPatient, currentItems]);

  return (
    <div className="patient-list-container">
      {/* Alert thông báo */}
      {showAlert && (
        <Alert variant="warning" className="mb-2 py-2">
          <div className="d-flex justify-content-between align-items-center">
            <small>
              <i className="fas fa-exclamation-triangle me-2"></i>
              Đang khám {currentExaminationPatient?.name}. Vui lòng hoàn thành
              khám hiện tại trước khi bắt đầu khám bệnh nhân mới.
            </small>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowAlert(false)}
              style={{ fontSize: "0.7rem" }}
            />
          </div>
        </Alert>
      )}

      {/* Danh sách bệnh nhân */}
      <ListGroup variant="flush" className="patient-list" ref={listRef}>
        {isLoading ? (
          // Loading state
          <ListGroup.Item className="text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" />
            <p className="mt-2 text-muted mb-0">
              Đang tải danh sách bệnh nhân...
            </p>
          </ListGroup.Item>
        ) : todayPatients.length === 0 ? (
          // Empty state
          <ListGroup.Item className="text-center py-4 text-muted">
            <i className="fas fa-users fs-4 mb-2"></i>
            <p className="mb-0">Không có bệnh nhân nào hôm nay</p>
          </ListGroup.Item>
        ) : (
          // Danh sách bệnh nhân
          currentItems.map((patient, index) => {
            const isActive = selectedTodayPatient?.id === patient.id;
            const isBeingExamined =
              currentExaminationPatient?.id === patient.id;
            const statusVariant = getStatusVariant(patient.status);
            const isDisabled =
              isExaminationInProgress && !isBeingExamined && !isActive;

            return (
              <ListGroup.Item
                key={patient.id || `patient-${index}`}
                action
                active={isActive}
                disabled={isDisabled}
                onClick={() => handlePatientSelect(patient)}
                className={`patient-item ${statusVariant} ${
                  isDisabled ? "patient-item-disabled" : ""
                }`}
                style={{
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease-in-out",
                  backgroundColor: isActive
                    ? "#007bff"
                    : isDisabled
                    ? "#f8f9fa"
                    : "",
                  color: isActive
                    ? "white"
                    : isDisabled
                    ? "#6c757d"
                    : "inherit",
                  borderLeft: isActive
                    ? "4px solid #0056b3"
                    : isBeingExamined
                    ? "4px solid #28a745"
                    : "4px solid transparent",
                  borderBottom: "1px solid #dee2e6",
                  opacity: isDisabled ? 0.6 : 1,
                }}
              >
                <div className="d-flex w-100 justify-content-between align-items-start">
                  {/* Thông tin bệnh nhân */}
                  <div className="flex-grow-1 me-3">
                    <h6 className="mb-1 fw-semibold">
                      {patient.time} - {patient.name}
                      {isBeingExamined && (
                        <i
                          className="fas fa-stethoscope ms-2 text-success"
                          title="Đang khám"
                        ></i>
                      )}
                    </h6>
                    <small
                      className="d-block"
                      style={{
                        opacity: isActive ? 0.9 : isDisabled ? 0.5 : 0.7,
                        fontSize: "0.85rem",
                      }}
                    >
                      {patient.age} tuổi • {patient.gender} • {patient.phone}
                    </small>
                    {patient.queue_position && (
                      <small
                        className="d-block mt-1"
                        style={{
                          opacity: isActive ? 0.8 : isDisabled ? 0.5 : 0.6,
                          fontSize: "0.8rem",
                        }}
                      >
                        Số thứ tự: <strong>{patient.queue_position}</strong>
                      </small>
                    )}
                  </div>

                  {/* Badge trạng thái */}
                  <Badge
                    bg={isActive ? "light" : statusVariant}
                    text={isActive ? "dark" : "white"}
                    className="flex-shrink-0"
                    style={{
                      minWidth: "80px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {getStatusText(patient.status)}
                    {isBeingExamined && " ⚡"}
                  </Badge>
                </div>
              </ListGroup.Item>
            );
          })
        )}
      </ListGroup>

      {/* Pagination */}
      {!isLoading && todayPatients.length > itemsPerPage && (
        <div className="mt-3">
          <Pagination
            pageCount={pageCount}
            onPageChange={handlePageChange}
            currentPage={currentPage}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};

export default PatientList;
