import Echo from "laravel-echo";
import Pusher from "pusher-js";
import websocketConfig from "../config/websocketConfig";

window.Pusher = Pusher;

export const createEchoClient = () => {
    return new Echo({
        broadcaster: "reverb",
        key: websocketConfig.reverbKey,
        wsHost: websocketConfig.reverbHost,
        wsPort: Number(websocketConfig.reverbPort),
        wssPort: Number(websocketConfig.reverbPort),
        forceTLS: false,
        enabledTransports: ["ws", "wss"],
        disableStats: true,
    });
};
