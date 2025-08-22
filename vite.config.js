import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimizaciones de build
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'framer-motion'],
          supabase: ['@supabase/supabase-js'],
          stripe: ['@stripe/stripe-js', 'stripe'],
        },
      },
    },
    // Optimizar chunks
    chunkSizeWarningLimit: 1000,
    // Habilitar source maps solo en desarrollo
    sourcemap: false,
  },
  optimizeDeps: {
    // Pre-bundle dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'framer-motion',
    ],
  },
  server: {
    // Optimizaciones del servidor de desarrollo
    hmr: {
      overlay: false,
    },
  },
  // Optimizaciones de CSS
  css: {
    devSourcemap: false,
  },
})
