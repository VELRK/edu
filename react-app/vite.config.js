import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // In production the app lives at /edu/react-app/dist/
    // In dev the Vite dev server runs at localhost:5173 with proxy
    base: mode === 'production' ? '/edu/react-app/dist/' : '/',

    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_DEV_SERVER ?? 'http://localhost:8080/edu',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
