import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Use relative paths so the build works both as:
  //   - A D365 web resource (served from /WebResources/gbb_/wogenerator/)
  //   - A standalone static site (any host)
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Use underscores + hex-only hashes — Dataverse web resource names disallow hyphens
        chunkFileNames: 'assets/[name]_[hash].js',
        entryFileNames: 'assets/[name]_[hash].js',
        assetFileNames: 'assets/[name]_[hash][extname]',
        hashCharacters: 'hex',
        manualChunks: {
          msal: ['@azure/msal-browser', '@azure/msal-react'],
          fluent: ['@fluentui/react-components', '@fluentui/react-icons'],
          query: ['@tanstack/react-query'],
          map: ['leaflet', 'react-leaflet', '@turf/boolean-point-in-polygon', '@turf/helpers'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios', 'date-fns'],
        },
      },
    },
  },
  server: {
    port: 5173,
    cors: true,
  },
});
