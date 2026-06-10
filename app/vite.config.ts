import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// CSP injected only in production builds (the Vite dev server needs ws:// for HMR).
// Note: 'unsafe-inline' styles are required by framer-motion/CodeMirror; wasm + jsdelivr by Pyodide.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.anthropic.com https://api.openai.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com",
  "worker-src 'self' blob:",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  base: '/nauka-app/',
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*'],
      manifest: {
        name: 'NaukaApp',
        short_name: 'Nauka',
        description: 'Aplikacja do nauki programowania',
        theme_color: '#09090f',
        background_color: '#09090f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/nauka-app/',
        icons: [
          { src: 'icons/icon-192.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/pyodide\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pyodide-cache',
              expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'codemirror': ['codemirror', '@codemirror/lang-python', '@codemirror/theme-one-dark', '@codemirror/view', '@codemirror/state'],
          'framer': ['framer-motion'],
          'data': ['./src/data/flashcards.json', './src/data/quizzes.json', './src/data/exercises.json', './src/data/explanations.json', './src/data/materials.json'],
        },
      },
    },
  },
});
