const websocketConfig = {
    apiUrl: import.meta.env.VITE_API_URL || "http://125.212.218.44:8000",
    reverbKey: import.meta.env.VITE_REVERB_APP_KEY,
    reverbHost: import.meta.env.VITE_REVERB_HOST || "125.212.218.44",
    apiUrl: import.meta.env.VITE_BACKEND_URL?.replace('/api', '') || "http://125.212.218.44:8000",
    reverbKey: import.meta.env.VITE_REVERB_APP_KEY,
    reverbPort: import.meta.env.VITE_REVERB_PORT || "8080",
    reverbScheme: import.meta.env.VITE_REVERB_SCHEME || "http",
};

export default websocketConfig;