import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AI Business Card Scanner',
        short_name: 'CardScanner',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ee0020ff',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'favicon.ico',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
