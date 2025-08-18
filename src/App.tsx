import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TranslationProvider } from "@/hooks/useTranslation";
import { AppDataProvider } from "@/providers/AppDataProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects"; 
import Artists from "./pages/Artists";
import AIGeneration from "./pages/AIGeneration";
import AIGenerationStudio from "./pages/AIGenerationStudio";
import Tracks from "./pages/Tracks";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import TrackDetailsDemo from "./pages/TrackDetailsDemo";

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
  const isMobile = useIsMobile();
  const Layout = isMobile ? MobileLayout : AppLayout;

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/*" element={
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
      } />
    </Routes>
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
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      {/* Temporarily disable AppDataProvider to fix IndexedDB issues */}
      {/* <AppDataProvider> */}
        <TranslationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </TranslationProvider>
      {/* </AppDataProvider> */}
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
