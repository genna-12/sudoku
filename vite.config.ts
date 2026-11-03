import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Versione mostrata nel menù: commit corto + data della build (per capire se due dispositivi hanno la stessa).
function versione(): string {
  let sha = 'dev';
  try {
    sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    /* fuori da git */
  }
  const d = new Date();
  const gg = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${gg}/${mm} ${hh}:${mi} · ${sha}`;
}

// base: il sito vive su https://genna-12.github.io/sudoku/
export default defineConfig({
  base: '/sudoku/',
  define: { __APP_VERSIONE__: JSON.stringify(versione()) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icona.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sudoku di coppia',
        short_name: 'Sudoku',
        description: 'Sudoku e Killer Sudoku in due, sulla stessa griglia.',
        lang: 'it',
        theme_color: '#0a1613',
        background_color: '#0a1613',
        display: 'standalone',
        start_url: '/sudoku/',
        scope: '/sudoku/',
        icons: [
          { src: 'icona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // clientsClaim: il service worker nuovo prende in carico subito le pagine aperte dopo "Aggiorna";
      // skipWaiting resta false: aspetta il tocco sul bottone (registerType 'prompt').
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], clientsClaim: true, skipWaiting: false, cleanupOutdatedCaches: true },
    }),
  ],
  test: { environment: 'node' },
} as Parameters<typeof defineConfig>[0]);
