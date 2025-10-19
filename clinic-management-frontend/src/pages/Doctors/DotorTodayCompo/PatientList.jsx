import React, { useState } from "react";
import { ListGroup, Spinner, Badge } from "react-bootstrap";
import Pagination from "../../../Components/Pagination/Pagination"; // Import custom Pagination (adjust path if needed)

const PatientList = ({
  todayPatients,
  isLoading,
  selectedTodayPatient,
  setSelectedTodayPatient,
  getStatusVariant,
  getStatusText,
}) => {
  const [currentPage, setCurrentPage] = useState(0); //  State cho pagination
  const itemsPerPage = 8; 

  // Page count cho pagination
  const pageCount = Math.ceil(todayPatients.length / itemsPerPage);

  //  Slice items cho trang hiện tại
  const currentItems = todayPatients.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  //  Handle page change
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
          currentItems.map((patient, index) => (
            <ListGroup.Item
              key={patient.id || index}
              action
              active={selectedTodayPatient?.id === patient.id}
              onClick={() => setSelectedTodayPatient(selectedTodayPatient?.id === patient.id ? null : patient)}
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
          ))
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