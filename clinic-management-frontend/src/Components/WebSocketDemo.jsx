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

  // Config
  const config = {
    apiUrl: import.meta.env.VITE_API_URL || "http://125.212.218.44:8000",
    reverbKey: import.meta.env.VITE_REVERB_APP_KEY,
    reverbHost: import.meta.env.VITE_REVERB_HOST || "125.212.218.44",
    reverbPort: import.meta.env.VITE_REVERB_PORT || "8080",
    channel: import.meta.env.VITE_REVERB_CHANNEL || "appointments",
    eventName: import.meta.env.VITE_REVERB_EVENT || ".appointment.updated",
  };

  // ===== Kết nối Reverb WebSocket =====
  const connectWebSocket = () => {
    try {
      console.log("🔌 Connecting to WebSocket...");
      addEvent(
        `🔌 Connecting to ${config.reverbHost}:${config.reverbPort}...`,
        "secondary"
      );

      const echoInstance = new Echo({
        broadcaster: "reverb",
        key: config.reverbKey,
        wsHost: config.reverbHost,
        wsPort: Number(config.reverbPort),
        wssPort: Number(config.reverbPort),
        forceTLS: false,
        enabledTransports: ["ws", "wss"],
        disableStats: true,
      });

      echoInstance.connector.pusher.connection.bind("connected", () => {
        setIsConnected(true);
        addEvent("✅ Connected to WebSocket successfully!", "success");
        console.log("✅ Connected to WebSocket");
      });

      echoInstance.connector.pusher.connection.bind("disconnected", () => {
        setIsConnected(false);
        setIsSubscribed(false);
        addEvent("❌ Disconnected from WebSocket", "danger");
        console.log("❌ Disconnected from WebSocket");
      });

      echoInstance.connector.pusher.connection.bind("error", (error) => {
        console.error("WebSocket error:", error);
        addEvent(
          `❌ Connection Error: ${error.error?.data?.message || "Unknown error"
          }`,
          "danger"
        );
      });

      echoInstance.connector.pusher.connection.bind(
        "state_change",
        (states) => {
          console.log("State changed:", states);
          addEvent(`🔄 State: ${states.previous} → ${states.current}`, "info");
        }
      );

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
      addEvent("❌ Not connected yet!", "warning");
      return;
    }

    try {
      addEvent(`📡 Subscribing to channel: ${config.channel}...`, "secondary");

      const channel = echo.channel(config.channel);

      // Listen cho event với dấu chấm ở đầu
      channel.listen(config.eventName, (data) => {
        console.log("📅 Event received:", data);
        addEvent(
          `📅 ${data.patient_name || "Patient"} - Status: ${data.status || "N/A"
          } (${data.action || "updated"})`,
          "info"
        );

        // Log chi tiết
        console.table(data);
      });

      // Subscribe success callback
      channel.subscribed(() => {
        setIsSubscribed(true);
        addEvent(`✅ Subscribed to channel: ${config.channel}`, "success");
        console.log(`✅ Subscribed to ${config.channel}`);
      });

      // Subscribe error callback
      channel.error((error) => {
        console.error("Subscribe error:", error);
        addEvent(`❌ Subscribe failed: ${error.message}`, "danger");
      });
    } catch (error) {
      console.error("Subscribe error:", error);
      addEvent(`❌ Failed to subscribe: ${error.message}`, "danger");
    }
  };

  // ===== Gửi yêu cầu test event =====
  const triggerTestEvent = async () => {
    try {
      addEvent("🧪 Triggering test event...", "secondary");
      console.log(`🧪 Calling API: ${config.apiUrl}/api/test-broadcast`);

      const response = await fetch(`${config.apiUrl}/api/test-broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (response.ok) {
        addEvent(
          "✅ Test event triggered! Waiting for WebSocket event...",
          "success"
        );
        console.log("API Response:", result);

        // Log data sẽ được broadcast
        if (result.data) {
          addEvent(
            `📤 Broadcasting: ${result.data.patient_name} (ID: ${result.data.id})`,
            "info"
          );
        }
      } else {
        addEvent(
          `❌ API Error: ${result.message || "Failed to trigger event"}`,
          "danger"
        );
      }
    } catch (error) {
      console.error("Trigger error:", error);
      addEvent(`❌ Network Error: ${error.message}`, "danger");
    }
  };

  // ===== Disconnect =====
  const disconnect = () => {
    if (echo) {
      echo.disconnect();
      setEcho(null);
      setIsConnected(false);
      setIsSubscribed(false);
      addEvent("🔌 Manually disconnected", "warning");
    }
  };

  // ===== Thêm event vào log =====
  const addEvent = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("vi-VN");
    setEvents((prev) => [{ message, type, timestamp }, ...prev.slice(0, 49)]);
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
              className={`badge rounded-pill fs-6 ${isConnected ? "bg-success" : "bg-danger"
                }`}
            >
              {isConnected ? "● Connected" : "○ Disconnected"}
            </span>
          </div>

          {/* Config Info */}
          <div className="row text-center mb-4">
            <div className="col-md-3">
              <div className="border rounded p-3 bg-light">
                <small className="text-muted d-block">WebSocket Host</small>
                <strong className="text-break small">
                  {config.reverbHost}:{config.reverbPort}
                </strong>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-3 bg-light">
                <small className="text-muted d-block">App Key</small>
                <strong className="text-break small">
                  {config.reverbKey.substring(0, 12)}...
                </strong>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-3 bg-light">
                <small className="text-muted d-block">Channel</small>
                <strong className="text-break small">{config.channel}</strong>
              </div>
            </div>
            <div className="col-md-3">
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

          {/* Action Buttons */}
          <div className="d-flex gap-2 mb-4">
            <button
              onClick={connectWebSocket}
              disabled={isConnected}
              className={`btn ${isConnected ? "btn-secondary" : "btn-primary"
                } flex-fill`}
            >
              {isConnected ? "✓ Connected" : "🔌 Connect"}
            </button>

            <button
              onClick={subscribeToChannel}
              disabled={!isConnected || isSubscribed}
              className={`btn ${isSubscribed ? "btn-secondary" : "btn-success"
                } flex-fill`}
            >
              {isSubscribed ? "✓ Subscribed" : "📡 Subscribe"}
            </button>

            <button
              onClick={triggerTestEvent}
              disabled={!isSubscribed}
              className={`btn ${!isSubscribed ? "btn-secondary" : "btn-warning text-white"
                } flex-fill`}
            >
              🧪 Test Event
            </button>

            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="btn btn-outline-danger"
            >
              🔌 Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Event Logs */}
      <div className="card shadow-lg">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">📋 Events Log ({events.length})</h5>
            <button
              onClick={() => setEvents([])}
              className="btn btn-sm btn-outline-secondary"
            >
              🗑️ Clear
            </button>
          </div>

          <div className="overflow-auto" style={{ maxHeight: "500px" }}>
            {events.length === 0 ? (
              <div className="text-center text-muted py-5">
                <div className="display-1 mb-3">📭</div>
                <p className="mb-1 fw-bold">No events yet</p>
                <small>Click "Connect" → "Subscribe" → "Test Event"</small>
              </div>
            ) : (
              events.map((event, index) => (
                <div
                  key={index}
                  className={`alert alert-${event.type} mb-2 py-2 fade show`}
                  style={{ fontSize: "0.9rem" }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <span className="flex-grow-1">{event.message}</span>
                    <small className="text-muted ms-2 text-nowrap">
                      {event.timestamp}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-3">
        <details className="small text-muted">
          <summary className="cursor-pointer">🔧 Debug Info</summary>
          <pre className="mt-2 p-3 bg-light rounded">
            {`Event Name: ${config.eventName}
API URL: ${config.apiUrl}/api/test-broadcast
WebSocket: ws://${config.reverbHost}:${config.reverbPort}
Connection: ${isConnected ? "Active" : "Inactive"}
Subscription: ${isSubscribed ? "Active" : "Inactive"}`}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default WebSocketDemo;
