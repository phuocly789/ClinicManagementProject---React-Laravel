import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        watch: {
            usePolling: true, // Hỗ trợ hot reload khi dùng Docker hoặc WSL
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            },
        },
        cors: {
            origin: ['http://localhost:8000'],
            credentials: true, // Cho phép gửi cookie
        },
    },
});
