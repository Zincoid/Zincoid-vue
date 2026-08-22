import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import pkg from './package.json'

const buildVersion = () => ({
  name: 'vite-plugin-build-version',
  apply: 'build',
  transformIndexHtml(html) {
    const now = Date.now()
    return {
      html,
      tags: [
        {
          tag: 'meta',
          attrs: { name: 'build-version', content: `${pkg.version}-${now.toString(36)}` },
          injectTo: 'head'
        },
        {
          tag: 'meta',
          attrs: { name: 'build-time', content: new Date(now).toISOString() },
          injectTo: 'head'
        }
      ]
    }
  }
})

export default defineConfig({
  plugins: [vue(), buildVersion()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/thumbnails': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
})
