import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sổ Tay Của Tớ',
        short_name: 'Sổ Tay',
        description: 'Ứng dụng ghi chép nhật ký, ảnh, cảm xúc và chi tiêu hàng ngày',
        theme_color: '#ffb5a7',
        background_color: '#fdfaf9',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg', // using existing favicon
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
