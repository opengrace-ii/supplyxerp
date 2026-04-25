/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ['./tsconfig.app.json'] })],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000
    },
    hmr: {
      clientPort: 5173
    },
    proxy: {
      '/scan': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', changeOrigin: true },
      '/move': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', changeOrigin: true },
      '/consume': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', changeOrigin: true },
      '/inventory': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', changeOrigin: true },
      '/trace': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', changeOrigin: true },
      '/ws': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', ws: true, changeOrigin: true },
      '/api': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', changeOrigin: true },
      '/health': { target: process.env.VITE_BACKEND_URL ?? 'http://backend:8080', changeOrigin: true }
    }
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
        storybookTest({
          configDir: resolve(__dirname, '.storybook')
        })
      ],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{ browser: 'chromium' }]
        }
      }
    }]
  }
});