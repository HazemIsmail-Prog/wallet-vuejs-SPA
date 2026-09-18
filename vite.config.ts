import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // server: {
    // host: true,
    // port: 5173,
    // proxy: {
      // '/api': 'http://127.0.0.1:8000',
      // '/sanctum': 'http://127.0.0.1:8000',
    // },
  // },
})