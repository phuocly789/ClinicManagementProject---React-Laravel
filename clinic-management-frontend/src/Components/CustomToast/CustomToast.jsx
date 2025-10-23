import React, { useEffect } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import "./CustomToast.css";

const typeConfig = {
  success: {
    icon: <CheckCircle size={40} />,
    bg: "bg-success-subtle text-success-emphasis border border-success",
    iconColor: "text-success",
  },
  error: {
    icon: <XCircle size={40} />,
    bg: "bg-danger-subtle text-danger-emphasis border border-danger",
    iconColor: "text-danger",
  },
  info: {
    icon: <Info size={40} />,
    bg: "bg-info-subtle text-info-emphasis border border-info",
    iconColor: "text-info",
  },
  warning: {
    icon: <AlertTriangle size={40} />,
    bg: "bg-warning-subtle text-warning-emphasis border border-warning",
    iconColor: "text-warning",
  },
};

export default function CustomToast({ type = "success", message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, []);

  const { icon, bg, iconColor } = typeConfig[type] || typeConfig.info;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center toast-fade"
      style={{
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className={`mx-auto px-4 py-4 rounded-3 shadow-lg ${bg} d-flex flex-column align-items-center text-center gap-3 toast-popup position-relative`}
        style={{ maxWidth: "28rem", width: "90%" }}
      >
        <button
          onClick={onClose}
          className="position-absolute top-0 end-0 btn btn-link text-secondary p-2"
          style={{ textDecoration: "none" }}
        >
          <X size={20} />
        </button>
        <div className={iconColor}>{icon}</div>
        <h2 className={`fs-5 fw-semibold mb-0 ${iconColor}`}>{message}</h2>
        <p className={`small mb-0 opacity-75 ${iconColor}`}>
          Click anywhere to close
        </p>
      </div>
    </div>
  );
}
