import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // The GitHub Pages demo lives under /la-patatheque/; the real site at the domain root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
