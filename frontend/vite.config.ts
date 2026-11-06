import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // frontend-admin's own dev server is already running on 5174 in this
    // environment — pick a port clearly out of its way.
    port: 5175,
    strictPort: true,
  },
})
