import React, { useState, useEffect, useRef } from "react";
import { ListGroup, Spinner, Badge } from "react-bootstrap";
import Pagination from "../../../Components/Pagination/Pagination";

const PatientList = ({
  todayPatients,
  isLoading,
  selectedTodayPatient,
  onPatientSelect,
  getStatusVariant,
  getStatusText,
  refreshTrigger,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;
  const listRef = useRef(null);

  const pageCount = Math.ceil(todayPatients.length / itemsPerPage);
  const currentItems = todayPatients.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handlePageChange = ({ selected }) => {
    setCurrentPage(selected);
  };

  // THÊM USE EFFECT: Reset về trang đầu khi danh sách thay đổi
  useEffect(() => {
    setCurrentPage(0);
  }, [todayPatients.length, refreshTrigger]);

  // THÊM USE EFFECT: Tự động tìm và highlight bệnh nhân được chọn
  useEffect(() => {
    if (selectedTodayPatient && listRef.current) {
      // Tìm item trong current items
      const selectedIndex = currentItems.findIndex(patient => 
        patient.id === selectedTodayPatient.id
      );
      
      if (selectedIndex !== -1) {
        // Có thể thêm logic scroll vào view nếu cần
        const selectedElement = listRef.current.children[selectedIndex];
        if (selectedElement) {
          selectedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
          });
        }
      }
    }
  }, [selectedTodayPatient, currentItems]);

  // THÊM: Tìm trang có chứa bệnh nhân được chọn
  useEffect(() => {
    if (selectedTodayPatient && todayPatients.length > 0) {
      const selectedIndex = todayPatients.findIndex(patient => 
        patient.id === selectedTodayPatient.id
      );
      
      if (selectedIndex !== -1) {
        const page = Math.floor(selectedIndex / itemsPerPage);
        setCurrentPage(page);
      }
    }
  }, [selectedTodayPatient, todayPatients, itemsPerPage]);

  return (
    <div>
      <ListGroup 
        variant="flush" 
        className="patient-list"
        ref={listRef}
      >
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
                  // Chỉ select nếu chưa active, tránh toggle/re-click sau update
                  if (!isActive) {
                    onPatientSelect(patient);
                  }
                }}
                className={getStatusVariant(patient.status)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  backgroundColor: isActive ? '#007bff' : '',
                  color: isActive ? 'white' : 'inherit',
                  borderLeft: isActive ? '4px solid #0056b3' : '4px solid transparent'
                }}
              >
                <div className="d-flex w-100 justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{patient.time} - {patient.name}</h6>
                    <small style={{ opacity: isActive ? 0.9 : 0.7 }}>
                      {patient.age} tuổi, {patient.gender} | {patient.phone}
                    </small>
                  </div>
                  <Badge 
                    bg={getStatusVariant(patient.status)}
                    style={{ 
                      filter: isActive ? 'brightness(0.9)' : 'none' 
                    }}
                  >
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