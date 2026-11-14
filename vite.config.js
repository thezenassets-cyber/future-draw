import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { adminApi } from './server/desk.js'
import { entriesApi } from './server/entries-api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), entriesApi(), adminApi()],
})
