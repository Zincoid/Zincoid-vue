import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import pkg from './package.json'

const buildMeta = () => ({
  name: 'vite-plugin-build-version',
  apply: 'build',
  transformIndexHtml(html) {
    const now = Date.now()
    return {
      html,
      tags: [
        {
          tag: 'meta',
          attrs: { name: 'version', content: pkg.version },
          injectTo: 'head'
        },
        {
          tag: 'meta',
          attrs: { name: 'build', content: now.toString(36) },
          injectTo: 'head'
        },
        {
          tag: 'meta',
          attrs: { name: 'time', content: new Date(now).toISOString() },
          injectTo: 'head'
        }
      ]
    }
  }
})

export default defineConfig({
  plugins: [vue(), buildMeta()],
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
