import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TranslationProvider } from "@/hooks/useTranslation";
import { AppDataProvider } from "@/providers/AppDataProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshCw } from "lucide-react";
import { PerformanceMonitor } from "@/components/debug/PerformanceMonitor";
// import { UpdateNotification } from "@/components/service-worker/UpdateNotification";
// import { serviceWorkerManager } from "@/lib/service-worker/sw-manager";

// Lazy load page components for better code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const Artists = lazy(() => import("./pages/Artists"));
const AIGeneration = lazy(() => import("./pages/AIGeneration"));
const AIGenerationStudio = lazy(() => import("./pages/AIGenerationStudio"));
const Tracks = lazy(() => import("./pages/Tracks"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TrackDetailsDemo = lazy(() => import("./pages/TrackDetailsDemo"));

/**
 * Optimized QueryClient configuration для AI Music Platform
 * 
 * PERFORMANCE: Настроен для минимального количества запросов к БД
 * CACHING: Агрессивное кеширование с intelligent invalidation
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // OPTIMIZATION: Longer stale times для reduced DB queries
      staleTime: 5 * 60 * 1000,      // 5 minutes stale time
      gcTime: 30 * 60 * 1000,     // 30 minutes cache time
      refetchOnWindowFocus: false,    // Don't refetch on tab focus
      refetchOnReconnect: true,       // Refetch on network reconnection
      retry: 2,                       // Reasonable retry count
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // OPTIMIZATION: Retry mutations с exponential backoff
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const Layout = isMobile ? MobileLayout : AppLayout;

  const PageLoader = () => (
    <div className="flex h-full w-full items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={
          <ProtectedRoute requireAuth={false}>
            <Auth />
          </ProtectedRoute>
        } />
        <Route path="/*" element={
          <ProtectedRoute requireAuth={true}>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/tracks" element={<Tracks />} />
                <Route path="/artists" element={<Artists />} />
                <Route path="/generate" element={<AIGenerationStudio />} />
                <Route path="/generate-old" element={<AIGeneration />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/demo/track-details" element={<TrackDetailsDemo />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}

/**
 * Application root с optimized provider hierarchy
 * 
 * PROVIDER ORDER:
 * 1. QueryClientProvider - React Query для server state
 * 2. AuthProvider - Authentication context  
 * 3. AppDataProvider - Global app state с caching
 * 4. TranslationProvider - i18n support
 * 5. TooltipProvider - UI tooltips
 */
const App = () => {
  // Установка темной темы по умолчанию
  useEffect(() => {
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Initialize service worker (disabled for build optimization)
  // useEffect(() => {
  //   serviceWorkerManager.init().catch(console.error);
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          {/* Temporarily disable AppDataProvider to fix IndexedDB issues */}
          {/* <AppDataProvider> */}
            <TranslationProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <PerformanceMonitor />
                  {/* <UpdateNotification /> */}
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <SidebarProvider>
                      <AppContent />
                    </SidebarProvider>
                  </BrowserRouter>
                </TooltipProvider>
            </TranslationProvider>
          {/* </AppDataProvider> */}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
