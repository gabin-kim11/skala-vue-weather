import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/kma': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: () => '/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst',
      },
    },
  },
})
