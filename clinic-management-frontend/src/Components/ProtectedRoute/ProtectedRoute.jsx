import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import userService from "../../services/userService";
import { path } from "../../utils/constant";

const ProtectedRoute = ({ role, children }) => {
  const [isAllowed, setIsAllowed] = React.useState(null);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await userService.getDashboard(role);
        const userRole = res?.user?.role;

        if (userRole === role) {
          setIsAllowed(true);
          setIsLoggedIn(true);
        } else {
          setIsAllowed(false);
          setIsLoggedIn(true);
        }
      } catch (err) {
        setIsAllowed(false);
        setIsLoggedIn(false);
      }
    };

    checkAccess();
  }, [role]);

  if (isAllowed === null) return <div>Loading...</div>;

  if (!isAllowed) {
    return (
      <Navigate
        to={isLoggedIn ? path.UNAUTHORIZED : path.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
