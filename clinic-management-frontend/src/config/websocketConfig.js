const websocketConfig = {
    apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
    reverbKey: import.meta.env.VITE_REVERB_APP_KEY,
    reverbHost: import.meta.env.VITE_REVERB_HOST || "localhost",
    reverbPort: import.meta.env.VITE_REVERB_PORT || "8080",
};

export default websocketConfig;