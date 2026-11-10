import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Бумеранг — Экосистема', // <-- НОВОЕ ИМЯ (это сломает старый кэш PWA)
        short_name: 'Бумеранг',        // <-- НОВОЕ ИМЯ
        description: 'Премиальная экосистема с кэшбеком и рефералами',
        theme_color: '#0B0F19',        // <-- ТЕМНЫЙ ЦВЕТ (под нашу тему)
        background_color: '#0B0F19',   // <-- ТЕМНЫЙ ЦВЕТ
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Заставляем Service Worker всегда проверять актуальность index.html
        navigateFallbackDenylist: [/^\/api/],
      }
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});