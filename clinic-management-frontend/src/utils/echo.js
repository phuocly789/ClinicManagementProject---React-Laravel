import Echo from "laravel-echo";
import Pusher from "pusher-js";
import websocketConfig from "../config/websocketConfig";

window.Pusher = Pusher;

export const createEchoClient = () => {
    const scheme = websocketConfig.reverbScheme || 'http';
    const useTLS = scheme === 'https';

    console.log('🔌 WebSocket Config:', {
        host: websocketConfig.reverbHost,
        port: websocketConfig.reverbPort,
        scheme: scheme,
        useTLS: useTLS,
        key: websocketConfig.reverbKey,
        fullUrl: `${scheme === 'https' ? 'wss' : 'ws'}://${websocketConfig.reverbHost}:${websocketConfig.reverbPort}`
    });

    // ✅ Test raw WebSocket trước
    const testWs = new WebSocket(`ws://${websocketConfig.reverbHost}:${websocketConfig.reverbPort}/app/${websocketConfig.reverbKey}`);

    testWs.onopen = () => {
        console.log('✅ Raw WebSocket test: SUCCESS');
        testWs.close();
    };

    testWs.onerror = (error) => {
        console.error('❌ Raw WebSocket test: FAILED', error);
    };

    const echo = new Echo({
        broadcaster: "reverb",
        key: websocketConfig.reverbKey,
        wsHost: websocketConfig.reverbHost,
        wsPort: Number(websocketConfig.reverbPort),
        wssPort: Number(websocketConfig.reverbPort),
        forceTLS: false,
        enabledTransports: ['ws'],
        disableStats: true,
        encrypted: useTLS,
        authEndpoint: `${websocketConfig.apiUrl}/broadcasting/auth`,
        auth: {
            headers: {
                'Accept': 'application/json',
            }
        },

        // ✅ Debug callbacks
        enableLogging: true,
        logToConsole: true,
    });

    // ✅ Listen to connection events
    echo.connector.pusher.connection.bind('connected', () => {
        console.log('✅ Echo connected successfully');
    });

    echo.connector.pusher.connection.bind('error', (err) => {
        console.error('❌ Echo connection error:', err);
    });

    echo.connector.pusher.connection.bind('disconnected', () => {
        console.log('🔌 Echo disconnected');
    });

    return echo;
};