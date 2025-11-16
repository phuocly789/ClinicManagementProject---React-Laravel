import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import receptionistService from "../../services/receptionistService";
import Pagination from "../../Components/Pagination/Pagination";
import CustomToast from "../../Components/CustomToast/CustomToast";
import dayjs from "dayjs";
export default function NotificationManagement() {
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const pageSize = 10;

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  useEffect(() => {
    getNotifications(current);
  }, [current]);

  const getNotifications = async (page = current) => {
    try {
      setIsLoading(true);
      const res = await receptionistService.getNotifications(
        page + 1,
        pageSize
      );
      if (res && res.success === true) {
        setNotifications(res?.data?.data);
        setPageCount(res?.data?.totalPages);
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Lỗi server");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = ({ selected }) => {
    setCurrent(selected);
  };

  return (
    <>
      <div
        style={{
          padding: "30px 40px",
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <span
            style={{ fontSize: "28px", marginRight: "10px", color: "#e91e63" }}
          >
            <Mail style={{ width: "32px", height: "32px" }} />
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            Quản Lý Danh Sách Thông Báo
          </h4>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "20px",
          }}
        >
          <button
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "10px 20px",
              fontSize: "15px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            + Tạo Thông Báo Mới
          </button>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #333",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#D9D9D9",
                  borderBottom: "2px solid #333",
                }}
              >
                {[
                  "Tên Bệnh Nhân",
                  "Ngày Hẹn",
                  "Giờ Hẹn",
                  "Lời Nhắn",
                  "Hành Động",
                ].map((title) => (
                  <th
                    className="text-center"
                    key={title}
                    style={{
                      padding: "15px 20px",
                      textAlign: title === "Hành Động" ? "center" : "left",
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#333",
                      borderRight: "1px solid #333",
                    }}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {notifications.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #333",
                  }}
                  className="text-center"
                >
                  <td
                    style={{
                      padding: "18px 20px",
                      fontSize: "14px",
                      color: "#333",
                      borderRight: "1px solid #333",
                    }}
                  >
                    {item?.full_name}
                  </td>

                  <td
                    style={{
                      padding: "18px 20px",
                      fontSize: "14px",
                      color: "#333",
                      borderRight: "1px solid #333",
                    }}
                  >
                    {dayjs(item?.date).format("DD/MM/YYYY")}
                  </td>

                  <td
                    style={{
                      padding: "18px 20px",
                      fontSize: "14px",
                      color: "#333",
                      borderRight: "1px solid #333",
                    }}
                  >
                    {item?.time}
                  </td>

                  <td
                    style={{
                      padding: "18px 20px",
                      fontSize: "14px",
                      color: "#666",
                      fontStyle: "italic",
                      borderRight: "1px solid #333",
                    }}
                  >
                    {item?.message}
                  </td>

                  <td
                    style={{
                      padding: "18px 20px",
                      textAlign: "center",
                    }}
                  >
                    <button
                      style={{
                        color: "#007bff",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        marginRight: "15px",
                        textDecoration: "underline",
                      }}
                    >
                      Sửa
                    </button>

                    <button
                      style={{
                        color: "#dc3545",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        textDecoration: "underline",
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <Pagination
            pageCount={pageCount}
            onPageChange={handlePageChange}
            currentPage={current}
          />
        )}
      </div>
      {toast && (
        <CustomToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
