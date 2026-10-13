import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import dynamicImport from 'vite-plugin-dynamic-import'
import { execSync } from 'node:child_process'

const git = (cmd, fallback) => { try { return execSync(`git ${cmd}`, { cwd: __dirname }).toString().trim() } catch { return fallback } }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dynamicImport()],
  define: {
    __APP_COMMIT__: JSON.stringify(git('rev-parse --short HEAD', 'dev')),
    __APP_BUILT__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
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
      },
      // short links from emails (/s/inv-fa-090-09-2026-k3x9) are served by the API
      '^/s/[a-z0-9-]+$': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => `/api${path}`
      }
    }
  },
  build: {
    outDir: 'build'
  }
})
