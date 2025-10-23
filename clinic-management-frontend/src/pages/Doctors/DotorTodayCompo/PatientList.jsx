import React, { useState } from "react";
import { ListGroup, Spinner, Badge } from "react-bootstrap";
import Pagination from "../../../Components/Pagination/Pagination";

const PatientList = ({
  todayPatients,
  isLoading,
  selectedTodayPatient,
  onPatientSelect,
  getStatusVariant,
  getStatusText,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8; 

  const pageCount = Math.ceil(todayPatients.length / itemsPerPage);
  const currentItems = todayPatients.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handlePageChange = ({ selected }) => {
    setCurrentPage(selected);
  };

  return (
    <div>
      <ListGroup variant="flush" className="patient-list">
        {isLoading ? (
          <ListGroup.Item className="text-center">
            <Spinner animation="border" size="sm" />
            <p className="mt-2 text-muted">Đang tải danh sách bệnh nhân...</p>
          </ListGroup.Item>
        ) : todayPatients.length === 0 ? (
          <ListGroup.Item className="text-center text-muted">
            Không có lịch hẹn hôm nay
          </ListGroup.Item>
        ) : (
          currentItems.map((patient, index) => {
            const isActive = selectedTodayPatient?.id === patient.id;
            return (
              <ListGroup.Item
                key={patient.id || index}
                action
                active={isActive}
                onClick={() => {
                  // 🆕 Chỉ select nếu chưa active, tránh toggle/re-click sau update
                  if (!isActive) {
                    onPatientSelect(patient);
                  }
                }}
                className={getStatusVariant(patient.status)}
              >
                <div className="d-flex w-100 justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{patient.time} - {patient.name}</h6>
                    <small>{patient.age} tuổi, {patient.gender} | {patient.phone}</small>
                  </div>
                  <Badge bg={getStatusVariant(patient.status)}>
                    {getStatusText(patient.status)}
                  </Badge>
                </div>
              </ListGroup.Item>
            );
          })
        )}
      </ListGroup>
      {!isLoading && todayPatients.length > 0 && (
        <Pagination
          pageCount={pageCount}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default PatientList;