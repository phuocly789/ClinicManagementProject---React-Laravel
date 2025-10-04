// NotFound.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
      {/* Large 404 */}
      <h1 className="text-8xl font-extrabold text-gray-800 mb-4">404</h1>

      {/* Sub-text */}
      <p className="text-2xl text-gray-600 mb-6">Oops! Page not found.</p>

      {/* Simple SVG illustration */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-40 h-40 mb-8 text-gray-300"
        fill="none"
        viewBox="0 0 64 64"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="32" cy="32" r="30" stroke="#D1D5DB" />
        <line
          x1="20"
          y1="20"
          x2="44"
          y2="44"
          stroke="#9CA3AF"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1="44"
          y1="20"
          x2="20"
          y2="44"
          stroke="#9CA3AF"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>

      {/* Button quay về trang chủ */}
      <button
        onClick={() => navigate("/")}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform duration-300 hover:scale-105"
      >
        Quay về trang chủ
      </button>
    </div>
  );
};

export default NotFound;
