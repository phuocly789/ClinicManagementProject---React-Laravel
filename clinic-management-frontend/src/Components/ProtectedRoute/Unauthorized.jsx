import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { path } from "../../utils/constant";

const Unauthorized = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(path.LOGIN, { replace: true });
    }, 5000); // tự động quay lại sau 5s
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen text-center bg-gray-50 px-4">
      <div>
        <h1 className="text-3xl font-bold mb-4 text-red-600">No Permission</h1>
        <p className="mb-6">
          Please log in with an account with appropriate permissions.
        </p>
        <button
          onClick={() => navigate(path.LOGIN)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
