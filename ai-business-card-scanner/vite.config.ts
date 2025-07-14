// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa';

// export default defineConfig({
//   plugins: [
//     react(),
//     VitePWA({
//       registerType: 'autoUpdate',
//       manifest: {
//         name: 'AI Business Card Scanner',
//         short_name: 'CardScanner',
//         start_url: '/',
//         display: 'standalone',
//         background_color: '#ffffff',
//         theme_color: '#6200ee',
//         icons: [
//           {
//             src: 'icon-192.png',
//             sizes: '192x192',
//             type: 'image/png',
//           },
//           {
//             src: 'icon-512.png',
//             sizes: '512x512',
//             type: 'image/png',
//           },
//         ],
//       },
//     }),
//   ],
// });
// vite.config.ts
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
        short_name: 'Card Scanner',
        description: 'Scan and save business cards with AI',
        theme_color: '#b91c1c',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
