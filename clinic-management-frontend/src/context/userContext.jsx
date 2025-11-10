// userContext.js
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import userService from "../services/userService";
import { path } from "../utils/constant";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user info khi mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = Cookies.get("token");

        // Chỉ gọi API nếu có token
        if (token) {
          const res = await userService.getMe();
          if (res?.user) {
            setUser(res.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Không lấy được user:", error);
        setUser(null);
        // Xóa token nếu không hợp lệ
        Cookies.remove("token");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await userService.handleLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Luôn xóa token và reset user
      Cookies.remove("token", { path: "/" });
      setUser(null);
      navigate(path.LOGIN);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, handleLogout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
