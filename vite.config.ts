import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('three')) return 'three';
          if (id.includes('framer-motion')) return 'framer';
          if (id.includes('qr-code-styling')) return 'qr';
        },
      },
    },
  },
})
