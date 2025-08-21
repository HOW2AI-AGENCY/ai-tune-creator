import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Увеличиваем лимит предупреждений до 800KB
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manual chunks для оптимизации bundle size
        manualChunks: {
          // Основные React библиотеки
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // UI библиотеки Radix
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider'
          ],
          
          // State management и формы
          'vendor-query': ['@tanstack/react-query'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Supabase и БД
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // Утилиты и иконки
          'vendor-utils': [
            'clsx', 
            'tailwind-merge', 
            'class-variance-authority',
            'lucide-react',
            'date-fns'
          ],
          
          // AI Generation модуль (если большой)
          'ai-generation': [
            './src/features/ai-generation/index.ts'
          ]
        }
      }
    }
  }
}));
