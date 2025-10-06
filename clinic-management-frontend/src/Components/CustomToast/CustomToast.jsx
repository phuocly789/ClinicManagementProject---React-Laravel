import React, { useEffect } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { Modal, Button } from "react-bootstrap";
import "./CustomToast.css";

const typeConfig = {
  success: {
    icon: <CheckCircle className="w-10 h-10 text-success" />,
    bg: "bg-light text-success border-success",
  },
  error: {
    icon: <XCircle className="w-10 h-10 text-danger" />,
    bg: "bg-light text-danger border-danger",
  },
  info: {
    icon: <Info className="w-10 h-10 text-info" />,
    bg: "bg-light text-info border-info",
  },
  warning: {
    icon: <AlertTriangle className="w-10 h-10 text-warning" />,
    bg: "bg-light text-warning border-warning",
  },
};

export default function CustomToast({ type = "success", message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const { icon, bg } = typeConfig[type] || typeConfig.info;

  return (
    <Modal
      show={true}
      onHide={onClose}
      centered
      backdrop="static"
      className="custom-toast"
      onClick={onClose}
    >
      <Modal.Body className={`p-4 rounded ${bg} border text-center`}>
        <Button
          variant="link"
          className="position-absolute top-0 end-0 p-2 text-secondary"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>
        <div className="d-flex flex-column align-items-center gap-3">
          {icon}
          <h2 className="mb-0">{message}</h2>
          <p className="mb-0 text-muted">Nhấn bất kỳ đâu để đóng</p>
        </div>
      </Modal.Body>
    </Modal>
  );
}