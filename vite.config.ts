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
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
  }
})
