import { useEffect, useState } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import "bootstrap/dist/css/bootstrap.min.css";

window.Pusher = Pusher;

const WebSocketDemo = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [events, setEvents] = useState([]);
  const [echo, setEcho] = useState(null);

  // ===== Kết nối Reverb WebSocket =====
  const connectWebSocket = () => {
    try {
      console.log("🔌 Connecting to WebSocket...");

      const echoInstance = new Echo({
        broadcaster: "reverb",
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT),
        forceTLS: false,
        enabledTransports: ["ws", "wss"],
      });

      echoInstance.connector.pusher.connection.bind("connected", () => {
        setIsConnected(true);
        addEvent("✅ Connected to WebSocket", "success");
        console.log("✅ Connected to WebSocket");
      });

      echoInstance.connector.pusher.connection.bind("disconnected", () => {
        setIsConnected(false);
        addEvent("❌ Disconnected from WebSocket", "danger");
        console.log("❌ Disconnected from WebSocket");
      });

      echoInstance.connector.pusher.connection.bind("error", (error) => {
        console.error("WebSocket error:", error);
        addEvent(`❌ Error: ${error.message || "Unknown error"}`, "danger");
      });

      setEcho(echoInstance);
    } catch (error) {
      console.error("Failed to connect:", error);
      addEvent(`❌ Failed to connect: ${error.message}`, "danger");
    }
  };

  // ===== Subscribe Channel =====
  const subscribeToChannel = () => {
    if (!echo) {
      console.log("❌ Not connected yet!");
      addEvent("❌ Not connected yet!", "danger");
      return;
    }

    try {
      echo
        .channel(import.meta.env.VITE_REVERB_CHANNEL || "appointments")
        .listen(
          import.meta.env.VITE_REVERB_EVENT || "AppointmentUpdated",
          (data) => {
            console.log("📅 Event received:", data);
            addEvent(
              `📅 ${data.patient_name || data.message || "Appointment"} - ${
                data.status || ""
              } (Action: ${data.action || ""})`,
              "info"
            );
          }
        );

      setIsSubscribed(true);
      addEvent(
        `✅ Subscribed to channel ${
          import.meta.env.VITE_REVERB_CHANNEL || "appointments"
        }`,
        "success"
      );
    } catch (error) {
      addEvent(`❌ Failed to subscribe: ${error.message}`, "danger");
    }
  };

  // ===== Gửi yêu cầu test event =====
  const triggerTestEvent = async () => {
    try {
      addEvent("🧪 Triggering test event...", "secondary");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/test-broadcast`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        addEvent(
          "✅ Test event triggered! Wait for incoming event...",
          "success"
        );
      } else {
        addEvent("❌ Failed to trigger event", "danger");
      }
    } catch (error) {
      addEvent(`❌ Error: ${error.message}`, "danger");
    }
  };

  // ===== Thêm event vào log =====
  const addEvent = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents((prev) => [{ message, type, timestamp }, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    return () => {
      if (echo) echo.disconnect();
    };
  }, [echo]);

  return (
    <div className="container py-5">
      <div className="card shadow-lg mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold mb-0">🚀 WebSocket Test Dashboard</h3>
            <span
              className={`badge rounded-pill ${
                isConnected ? "bg-success" : "bg-danger"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="row text-center mb-4">
            <div className="col-md-4">
              <div className="border rounded p-3 bg-light">
                <small className="text-muted d-block">WebSocket Host</small>
                <strong>
                  {import.meta.env.VITE_REVERB_HOST}:
                  {import.meta.env.VITE_REVERB_PORT}
                </strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded p-3 bg-light">
                <small className="text-muted d-block">App Key</small>
                <strong className="text-break">
                  {import.meta.env.VITE_REVERB_APP_KEY}
                </strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded p-3 bg-light">
                <small className="text-muted d-block">Status</small>
                <strong
                  className={isSubscribed ? "text-success" : "text-muted"}
                >
                  {isSubscribed ? "✓ Subscribed" : "○ Not subscribed"}
                </strong>
              </div>
            </div>
          </div>

          <div className="d-flex gap-3 mb-4">
            <button
              onClick={connectWebSocket}
              disabled={isConnected}
              className={`btn ${
                isConnected ? "btn-secondary" : "btn-primary"
              } flex-fill`}
            >
              {isConnected ? "✓ Connected" : "🔌 Connect"}
            </button>

            <button
              onClick={subscribeToChannel}
              disabled={!isConnected || isSubscribed}
              className={`btn ${
                isSubscribed ? "btn-secondary" : "btn-success"
              } flex-fill`}
            >
              {isSubscribed ? "✓ Subscribed" : "📡 Subscribe"}
            </button>

            <button
              onClick={triggerTestEvent}
              disabled={!isSubscribed}
              className={`btn ${
                !isSubscribed ? "btn-secondary" : "btn-warning text-white"
              } flex-fill`}
            >
              🧪 Test Event
            </button>
          </div>
        </div>
      </div>

      {/* ===== Event Logs ===== */}
      <div className="card shadow-lg mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">📋 Events Log</h5>
            <button
              onClick={() => setEvents([])}
              className="btn btn-sm btn-outline-secondary"
            >
              Clear
            </button>
          </div>

          <div className="overflow-auto" style={{ maxHeight: "400px" }}>
            {events.length === 0 ? (
              <div className="text-center text-muted py-5">
                <p className="mb-1">No events yet...</p>
                <small>Click "Connect" to start listening</small>
              </div>
            ) : (
              events.map((event, index) => (
                <div key={index} className={`alert alert-${event.type} mb-2`}>
                  <div className="d-flex justify-content-between align-items-start">
                    <span>{event.message}</span>
                    <small className="text-muted">{event.timestamp}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketDemo;
