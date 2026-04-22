import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Evita ReferenceError em produção: `main.tsx` usa __APP_RELEASE__ no log de deploy. */
const appRelease =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.VITE_APP_RELEASE ||
  'local'

export default defineConfig({
  define: {
    __APP_RELEASE__: JSON.stringify(appRelease),
  },
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5174,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store',
    },
     proxy: {
      '/supabase-api': {
        target: 'https://kgktwaziasxgeseucsoy.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-api/, ''),
      },
      /** API SendGrid (`server/`) — `VITE_ZAPTRO_MAIL_API_URL=/zaptro-mail-api` */
      '/zaptro-mail-api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zaptro-mail-api/, ''),
      },
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        /** Rolldown/Vite 8: `manualChunks` como função — separa bibliotecas pesadas do bundle principal. */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@tanstack')) return 'vendor-virtual';
          if (id.includes('react-router')) return 'vendor-react';
          if (id.includes('react-dom')) return 'vendor-react';
          if (id.includes('/react/') && id.includes('node_modules/react/')) return 'vendor-react';
        },
      },
    },
  },
})
