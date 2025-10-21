import React from "react";
import "./Loading.css";

const Loading = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <div className="loading-overlay">
            <div className="spinner-gradient"></div>
            <p className="loading-text">Đang tải dữ liệu...</p>
        </div>
    );
};

export default Loading;
