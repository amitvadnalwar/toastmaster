import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { CLUB_NAME } from './src/lib/constants';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const base = env.VITE_BASE_PATH ?? '/';

  return {
    base,
    resolve: {
      alias: { '@': resolve(__dirname, './src') },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: CLUB_NAME,
          short_name: 'TMCPSE',
          description: 'Toastmasters club management app',
          theme_color: '#8B1A1A',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
          // A new service worker must sit in "waiting" until the user taps
          // the update banner (see UpdatePrompt.tsx) — skipWaiting/clientsClaim
          // would make it activate immediately on install, silently, which is
          // exactly the behavior the banner is replacing.
          clientsClaim: false,
          skipWaiting: false,
          navigateFallback: 'index.html',
        },
      }),
    ],
  };
});
