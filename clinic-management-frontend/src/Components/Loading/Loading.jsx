import Lottie from "lottie-react";
import loadingAnimation from "../../../assets/lottie/loading.json";

const Loading = () => {
  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-light bg-opacity-50 d-flex align-items-center justify-content-center z-50">
      <div className="w-25 h-25 rounded shadow">
        <Lottie animationData={loadingAnimation} loop={true} />
      </div>
    </div>
  );
};

export default Loading;