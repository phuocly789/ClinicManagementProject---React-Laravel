import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomToast from "../../../Components/CustomToast/CustomToast";
import { path } from "../../../utils/constant";
import authService from "../../../services/authService";
import dayjs from "dayjs";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";
  const expired = location.state?.expired || null;
  const fromLogin = location.state?.fromLogin || false;

  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [toast, setToast] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const showToast = (type, message) => setToast({ type, message });

  // 🕒 Khởi tạo thời gian hết hạn và đếm ngược
  useEffect(() => {
    console.log("🔥 expired từ backend:", expired);
    let expiryTime = null;

    if (expired) {
      expiryTime = dayjs(expired, "YYYY-MM-DD HH:mm:ss").valueOf();
      console.log("✅ Convert sang ms:", expiryTime);
      localStorage.setItem(`verifyEmailExpiry_${email}`, expiryTime);
    } else {
      const storedExpiry = localStorage.getItem(`verifyEmailExpiry_${email}`);
      if (storedExpiry) {
        expiryTime = parseInt(storedExpiry, 10);
        console.log("✅ Lấy từ localStorage:", expiryTime);
      }
    }

    if (expiryTime) {
      const now = dayjs().valueOf();
      const diffSeconds = Math.floor((expiryTime - now) / 1000);
      console.log("⏰ Chênh lệch (giây):", diffSeconds);

      if (diffSeconds > 0) {
        setTimeLeft(diffSeconds);
        setCanResend(false);
      } else {
        console.log("❌ Mã đã hết hạn!");
        setTimeLeft(0);
        setCanResend(true);
      }
    } else {
      console.log("⚠️ Không có expired time!");
      setTimeLeft(0);
      setCanResend(true);
    }
  }, [email, expired]);

  // ⏱ Countdown chạy từng giây
  useEffect(() => {
    if (timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timeLeft]);

  // 📨 Gửi lại mã
  const sendVerificationCode = async () => {
    setIsResending(true);
    try {
      const res = await authService.sendVerificationCode({ email });
      if (res?.success === true) {
        showToast("success", res.message);
        const newExpiry = dayjs().add(5, "minute").valueOf();
        localStorage.setItem(`verifyEmailExpiry_${email}`, newExpiry);
        setTimeLeft(300);
        setCanResend(false);
      } else {
        showToast("error", res.message);
      }
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra. Vui lòng thử lại.";
      showToast("error", backendMessage);
    } finally {
      setIsResending(false);
    }
  };

  // 🧮 Định dạng thời gian
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ✏️ Xử lý nhập mã
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setVerificationCode(newCode);
      const lastInput = document.getElementById("code-input-5");
      if (lastInput) lastInput.focus();
    }
  };

  // ✅ Xác thực email
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    const code = verificationCode.join("");

    if (code.length !== 6) {
      showToast("error", "Vui lòng nhập đủ 6 chữ số mã xác thực.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyEmail({ email, code });
      if (res?.success === false) {
        showToast("error", res?.message || "Xác thực thất bại.");
        return;
      }

      if (res?.success === true) {
        showToast("success", res.message || "Tài khoản đã được xác thực.");
        localStorage.removeItem(`verifyEmailExpiry_${email}`);
        setTimeout(() => {
          navigate(path.LOGIN, {
            state: {
              message: "Tài khoản đã được xác thực. Vui lòng đăng nhập lại.",
            },
          });
        }, 1500);
      }
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra. Vui lòng thử lại.";
      showToast("error", backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div
        className="card shadow-lg border-0 rounded-4 p-4"
        style={{ maxWidth: "420px", width: "100%" }}
      >
        <div className="text-center mb-4">
          <div
            className="bg-primary bg-opacity-10 rounded-circle d-flex justify-content-center align-items-center mx-auto mb-3"
            style={{ width: "70px", height: "70px" }}
          >
            <Mail className="text-primary" size={36} />
          </div>
          <h4 className="fw-bold text-dark">Verify Your Email</h4>
          <p className="text-muted small">
            We have sent a 6-digit verification code to
            <br />
            <span className="fw-semibold text-primary">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyEmail}>
          <div className="text-center mb-3">
            <label className="form-label fw-semibold">Nhập mã xác thực</label>
            <div className="d-flex justify-content-center gap-2">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  id={`code-input-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="form-control text-center fw-bold"
                  style={{ width: "45px", height: "45px", fontSize: "1.25rem" }}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {/* Timer hiển thị realtime */}
          <div className="text-center mb-3">
            {!canResend && timeLeft > 0 ? (
              <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                <Clock size={14} />
                The code will expire in: {formatTime(timeLeft)}
              </small>
            ) : (
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none text-primary fw-medium"
                onClick={sendVerificationCode}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <RefreshCw
                      size={14}
                      className="me-1 spinner-border spinner-border-sm"
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} className="me-1" />
                    Resend Code
                  </>
                )}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || verificationCode.join("").length !== 6}
            className="btn btn-primary w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Verification in progress...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Verify Email
              </>
            )}
          </button>
        </form>

        <div className="alert alert-light mt-4 text-center small mb-0">
          <strong>Note:</strong> If you did not receive the email, check your
          spam folder or click “Resend Code”.
        </div>
      </div>

      {toast && (
        <CustomToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
