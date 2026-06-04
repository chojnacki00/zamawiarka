import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false
      },
      manifest: {
        name: 'GastroManager',
        short_name: 'GastroManager',
        description: 'Aplikacja do zarządzania restauracją i zamówieniami',
        theme_color: '#ffffff',
        background_color: '#f5f5f7',
        display: 'standalone',
        icons: [
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})