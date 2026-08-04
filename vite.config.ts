import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const appBase = process.env.GITHUB_PAGES === 'true' ? '/soyiba.com/' : '/';
const withBase = (path: string) => `${appBase}${path.replace(/^\/+/, '')}`;

export default defineConfig({
  base: appBase,
  server: {
    allowedHosts: ['.loca.lt'],
  },
  preview: {
    allowedHosts: ['.loca.lt'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/favicon-32.png', 'assets/app-icon-192.png', 'assets/app-icon-512.png', 'assets/apple-touch-icon.png', 'assets/logo-soyiba.png', 'assets/logo-antioquia.png'],
      manifest: {
        name: 'soyIBA',
        short_name: 'soyIBA',
        description: 'PWA movil soyIBA',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: appBase,
        start_url: appBase,
        icons: [
          { src: withBase('assets/app-icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: withBase('assets/app-icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ]
});
