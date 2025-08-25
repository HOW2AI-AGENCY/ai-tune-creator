import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    allowedHosts: [
      "8080-ive021p9xja0plpccs950-6532622b.e2b.dev",
      "localhost",
      "127.0.0.1",
      ".e2b.dev"
    ],
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
        // manualChunks: (id: string) => {
        //   // React и основные библиотеки
        //   if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
        //     return 'vendor-react';
        //   }
          
        //   // UI библиотеки Radix
        //   if (id.includes('@radix-ui/')) {
        //     return 'vendor-ui';
        //   }
          
        //   // State management и формы
        //   if (id.includes('@tanstack/react-query')) {
        //     return 'vendor-query';
        //   }
          
        //   if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform/')) {
        //     return 'vendor-form';
        //   }
          
        //   // Supabase
        //   if (id.includes('@supabase/')) {
        //     return 'vendor-supabase';
        //   }
          
        //   // Утилиты и иконки
        //   if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority') || id.includes('date-fns')) {
        //     return 'vendor-utils';
        //   }
          
        //   // AI Generation модуль
        //   if (id.includes('src/features/ai-generation/')) {
        //     return 'ai-generation';
        //   }
          
        //   // Mobile компоненты
        //   if (id.includes('src/components/mobile/') || id.includes('src/pages/mobile/')) {
        //     return 'mobile';
        //   }
          
        //   // Остальные node_modules
        //   if (id.includes('node_modules/')) {
        //     return 'vendor';
        //   }
        // }
      }
    }
  }
}));
