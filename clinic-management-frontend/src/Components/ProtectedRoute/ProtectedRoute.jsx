import { Navigate } from "react-router-dom";
import { useUser } from "../../context/userContext";
import { path } from "../../utils/constant";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useUser();

  if (loading) return <div>Đang tải...</div>;

  if (!user) return <Navigate to={path.LOGIN} />;

  // ✅ Kiểm tra quyền
  if (allowedRoles && !allowedRoles.includes(user.roles[0])) {
    return <Navigate to={path.UNAUTHORIZED} />;
  }

  return children;
};

export default ProtectedRoute;
