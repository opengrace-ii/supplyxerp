import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      '/scan': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        changeOrigin: true,
      },
      '/move': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        changeOrigin: true,
      },
      '/consume': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        changeOrigin: true,
      },
      '/inventory': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        changeOrigin: true,
      },
      '/trace': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080',
        changeOrigin: true,
      },
    },
  },
});
