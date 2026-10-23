/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Colores del sistema definido en la Tabla 29 del documento.
const VERDE_OSCURO = '#165232';
const FONDO_CLARO = '#F7F8F2';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // El usuario decide cuándo aplicar una versión nueva (aviso de actualización de Workbox).
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Ganadería JR',
        short_name: 'JR',
        description: 'Registro y consulta en campo para la trazabilidad bovina y el seguimiento de leche y carne.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: VERDE_OSCURO,
        background_color: FONDO_CLARO,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todos los recursos de la aplicación quedan en caché: tras la primera descarga
        // las jornadas siguientes no necesitan red para abrir la aplicación.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
