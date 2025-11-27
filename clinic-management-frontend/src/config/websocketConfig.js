const websocketConfig = {
    apiUrl: import.meta.env.VITE_BACKEND_URL?.replace('/api', '') || "http://localhost:8000",
    reverbKey: import.meta.env.VITE_REVERB_APP_KEY,
    reverbHost: "localhost",
    reverbPort: import.meta.env.VITE_REVERB_PORT || "8080",
    reverbScheme: import.meta.env.VITE_REVERB_SCHEME || "http",
};

export default websocketConfig;