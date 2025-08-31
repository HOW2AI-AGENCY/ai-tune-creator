import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

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
    
    // PWA Service Worker (disabled temporarily for build optimization)
    false && VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precaching strategy
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // Runtime caching
        runtimeCaching: [
          // Cache AI service API calls with network first strategy
          {
            urlPattern: /^https:\/\/api\.(suno|mureka)\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ai-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                // Remove auth headers from cache key for better hit rates
                return `${request.url}`;
              },
            },
          },
          
          // Cache Supabase API calls
          {
            urlPattern: /^https:\/\/.*\.supabase\.co/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
          
          // Cache audio files with cache first strategy
          {
            urlPattern: /\.(mp3|wav|m4a|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
          
          // Cache images with cache first strategy
          {
            urlPattern: /\.(png|jpg|jpeg|svg|webp|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          
          // Cache fonts with cache first strategy
          {
            urlPattern: /\.(woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          
          // Cache other static assets
          {
            urlPattern: /^https:\/\/cdn\./i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      
      // PWA manifest
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'AI Tune Creator',
        short_name: 'AI Tunes',
        description: 'Create music with AI - Suno and Mureka powered music generation platform',
        theme_color: '#1a1a2e',
        background_color: '#0f0f23',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['music', 'entertainment', 'productivity'],
        lang: 'en',
        dir: 'ltr',
      },
      
      devOptions: {
        enabled: mode === 'development',
      },
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
          const info = assetInfo.name.split('.');
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
