import React, { useEffect } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import "./CustomToast.css";

const typeConfig = {
  success: {
    icon: <CheckCircle className="w-10 h-10 text-green-500" />,
    bg: "bg-green-50 text-green-700",
  },
  error: {
    icon: <XCircle className="w-10 h-10 text-red-500" />,
    bg: "bg-red-50 text-red-700",
  },
  info: {
    icon: <Info className="w-10 h-10 text-blue-500" />,
    bg: "bg-blue-50 text-blue-700",
  },
  warning: {
    icon: <AlertTriangle className="w-10 h-10 text-yellow-500" />,
    bg: "bg-yellow-50 text-yellow-700",
  },
};

export default function CustomToast({ type = "success", message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, []);

  const { icon, bg } = typeConfig[type] || typeConfig.info;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm toast-fade"
      onClick={onClose}
    >
      <div
        className={`max-w-md w-full mx-auto px-6 py-5 rounded-xl shadow-xl ${bg} flex flex-col items-center text-center gap-3 toast-popup relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>
        {icon}
        <h2 className="text-lg font-semibold">{message}</h2>
        <p className="text-sm opacity-80">Click anywhere to close</p>
      </div>
    </div>
  );
}
