import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import dynamicImport from 'vite-plugin-dynamic-import'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dynamicImport()],
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      // shared with the API project (resource registry, sales calculations)
      '@/lib/crm': path.join(__dirname, '../src/lib/crm'),
      '@': path.join(__dirname, 'src'),
    },
  },
  server: {
    port: 3200,
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'build'
  }
})
