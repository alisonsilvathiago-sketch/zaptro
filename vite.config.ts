import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
