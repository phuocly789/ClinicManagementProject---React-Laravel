import Lottie from "lottie-react";
import loadingAnimation from "../../../assets/lottie/loading.json";

const Loading = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-64 h-64">
        <Lottie animationData={loadingAnimation} loop={true} />
      </div>
    </div>
  );
};

export default Loading;
