import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { visualizer } from 'rollup-plugin-visualizer';


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '127.0.0.1',
    port: 8080,
    allowedHosts: [
      '8080-ive021p9xja0plpccs950-6532622b.e2b.dev',
      'localhost',
      '127.0.0.1',
      '.e2b.dev'
    ],
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    
    // Bundle analyzer - generates stats.html after build
    mode === 'production' && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target bundle size budget: 800KB
    chunkSizeWarningLimit: 500, // Lower warning limit to enforce smaller chunks
    
    // Enable tree shaking and optimization
    minify: 'terser',
    
    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    
    rollupOptions: {
      output: {
        // Optimized manual chunks for better code splitting
        manualChunks: (id) => {
          // Node modules chunking strategy
          if (id.includes('node_modules')) {
            // Core React libraries
            if (['react', 'react-dom'].some(lib => id.includes(lib))) {
              return 'vendor-react';
            }
            
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            
            // TanStack Query
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            
            // Form libraries
            if (['react-hook-form', '@hookform', 'zod'].some(lib => id.includes(lib))) {
              return 'vendor-form';
            }
            
            // Radix UI components - split by category
            if (id.includes('@radix-ui')) {
              if (['dialog', 'popover', 'dropdown-menu', 'context-menu'].some(comp => id.includes(comp))) {
                return 'vendor-ui-overlay';
              }
              if (['button', 'input', 'select', 'checkbox', 'radio-group'].some(comp => id.includes(comp))) {
                return 'vendor-ui-form';
              }
              if (['accordion', 'tabs', 'collapsible', 'toggle'].some(comp => id.includes(comp))) {
                return 'vendor-ui-layout';
              }
              return 'vendor-ui-misc';
            }
            
            // Utilities and icons
            if (['lucide-react', 'clsx', 'class-variance-authority', 'tailwind-merge'].some(lib => id.includes(lib))) {
              return 'vendor-utils';
            }
            
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            
            // Date and time libraries
            if (['date-fns'].some(lib => id.includes(lib))) {
              return 'vendor-date';
            }
            
            // Charts and data visualization
            if (['recharts'].some(lib => id.includes(lib))) {
              return 'vendor-charts';
            }
            
            // Other large libraries
            if (['embla-carousel', 'vaul', 'sonner', 'cmdk'].some(lib => id.includes(lib))) {
              return 'vendor-ui-enhanced';
            }
            
            // Remaining node_modules
            return 'vendor-misc';
          }
          
          // Application code chunking
          if (id.includes('src/')) {
            // AI Generation feature (largest chunk)
            if (id.includes('src/features/ai-generation')) {
              // Split AI generation into smaller chunks
              if (id.includes('components')) {
                return 'feature-ai-generation-components';
              }
              if (id.includes('hooks')) {
                return 'feature-ai-generation-hooks';
              }
              return 'feature-ai-generation-core';
            }
            
            // Other features
            if (id.includes('src/features/')) {
              const featureName = id.match(/src\/features\/([^\/]+)/)?.[1];
              return featureName ? `feature-${featureName}` : 'features-misc';
            }
            
            // Components
            if (id.includes('src/components/ui')) {
              return 'components-ui';
            }
            if (id.includes('src/components/')) {
              return 'components-shared';
            }
            
            // Pages (already lazy loaded)
            if (id.includes('src/pages/')) {
              return 'pages';
            }
            
            // Hooks and utilities
            if (id.includes('src/hooks/') || id.includes('src/lib/')) {
              return 'utils-shared';
            }
          }
        },
        
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || ['unknown'];
          const extension = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extension)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(extension)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        
        // Optimize chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
      
      // Tree shaking configuration
      treeshake: {
        preset: 'recommended',
        manualPureFunctions: ['console.log', 'console.info', 'console.debug'],
      },
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
    ],
    exclude: [
      // Large libraries that should be loaded dynamically
      'recharts',
      'embla-carousel-react',
    ],
  },
}));
