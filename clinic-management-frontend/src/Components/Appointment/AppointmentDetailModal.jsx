import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function AppointmentDetailModal({ show, onClose, appointment }) {
  if (!show || !appointment) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg rounded-3">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold text-dark">
              Chi tiết lịch khám
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body text-dark">
            <table className="table table-borderless mb-0">
              <tbody>
                <tr>
                  <th style={{ width: "35%" }}>Mã lịch hẹn:</th>
                  <td>{appointment?.id}</td>
                </tr>
                <tr>
                  <th>Bệnh nhân:</th>
                  <td>{appointment?.full_name}</td>
                </tr>
                <tr>
                  <th>Bác sĩ:</th>
                  <td>{appointment?.doctor}</td>
                </tr>
                <tr>
                  <th>Chuyên khoa:</th>
                  <td>{appointment?.specialty}</td>
                </tr>
                <tr>
                  <th>Ngày khám:</th>
                  <td>{appointment?.date}</td>
                </tr>
                <tr>
                  <th>Giờ khám:</th>
                  <td>{appointment?.time}</td>
                </tr>
                <tr>
                  <th>Trạng thái:</th>
                  <td>{appointment?.status}</td>
                </tr>
                <tr>
                  <th>Triệu chứng:</th>
                  <td>{appointment?.notes}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="modal-footer border-0">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
