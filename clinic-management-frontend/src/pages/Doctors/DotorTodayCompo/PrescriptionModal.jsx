import React from "react";
import { Modal } from "react-bootstrap";
import PrescriptionModalContent from '../PrescriptionModalContent'; // Giả sử bạn có file này

const PrescriptionModal = ({ show, onHide, defaultData, onSubmit }) => {
  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton>
        <Modal.Title>
          {defaultData ? 'Sửa thông tin thuốc' : 'Thêm thuốc mới'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <PrescriptionModalContent
          onSubmit={onSubmit}
          onClose={onHide}
          defaultData={defaultData}
        />
      </Modal.Body>
    </Modal>
  );
};

export default PrescriptionModal;