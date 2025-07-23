import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', // Change from default 'dist' to 'build' for Railway compatibility
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
