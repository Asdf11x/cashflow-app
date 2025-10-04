import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // --- THIS IS THE ONLY SECTION YOU NEED ---
  server: {
    // This tells Vite to allow requests from any subdomain of ngrok-free.dev
    // This is the permanent fix.
    allowedHosts: ['.ngrok-free.dev', 'loca.lt'],
  },
  // ------------------------------------------
})
