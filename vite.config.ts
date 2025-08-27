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
        // Manual chunks для оптимизации bundle size (рекомендация из аудита)
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            'embla-carousel-react',
            'vaul'
          ],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'feature-ai-generation': ['src/features/ai-generation'],
        }
      }
    }
  }
}));
