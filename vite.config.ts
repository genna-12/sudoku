import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base: il sito vive su https://genna-12.github.io/sudoku/
export default defineConfig({
  base: '/sudoku/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icona.svg'],
      manifest: {
        name: 'Sudoku di coppia',
        short_name: 'Sudoku',
        description: 'Sudoku e Killer Sudoku in due, sulla stessa griglia.',
        lang: 'it',
        theme_color: '#0b1410',
        background_color: '#0b1410',
        display: 'standalone',
        start_url: '/sudoku/',
        scope: '/sudoku/',
        icons: [
          { src: 'icona-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
    }),
  ],
  test: { environment: 'node' },
} as Parameters<typeof defineConfig>[0]);
