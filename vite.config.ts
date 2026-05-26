import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/mhp-inventory-system/',
  server: { port: 5176, host: '0.0.0.0' },
});
