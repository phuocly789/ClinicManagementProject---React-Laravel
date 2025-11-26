const websocketConfig = {
    apiUrl: import.meta.env.VITE_API_URL || "http://125.212.218.44:8000",
    reverbKey: import.meta.env.VITE_REVERB_APP_KEY,
    reverbHost: import.meta.env.VITE_REVERB_HOST || "125.212.218.44",
    reverbPort: import.meta.env.VITE_REVERB_PORT || "8080",
};

export default websocketConfig;