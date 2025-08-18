import { ReactNode } from "react";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { useLocation } from "react-router-dom";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const location = useLocation();
  const isOnline = useNetworkStatus();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "AI Tune Creator";
    if (path === "/generate") return "Generate Music";
    if (path === "/tracks") return "My Library";
    if (path === "/projects") return "Projects";
    if (path === "/artists") return "Artists";
    if (path === "/settings") return "Settings";
    return "AI Tune Creator";
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    if (path === "/generate") return "Create amazing music with AI";
    if (path === "/tracks") return "Your music collection";
    if (path === "/projects") return "Organize your work";
    return undefined;
  };

  const showHeader = !location.pathname.startsWith("/auth");
  const showBottomNav = !location.pathname.startsWith("/auth");

  return (
    <div className="min-h-screen bg-background mobile-layout">
      {/* Mobile-specific viewport meta and CSS variables */}
      <div 
        className="mobile-viewport-height flex flex-col"
        style={{
          height: '100dvh', // Dynamic viewport height for mobile
        }}
      >
        {/* Mobile Header */}
        {showHeader && (
          <MobileHeader
            title={getPageTitle()}
            subtitle={getPageSubtitle()}
            showBack={location.pathname !== "/" && location.pathname !== "/dashboard"}
            onBack={() => window.history.back()}
            showSearch={location.pathname === "/tracks" || location.pathname === "/projects"}
            showNotifications={true}
            notificationCount={0}
            showMenu={true}
            isOnline={isOnline}
          />
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          "mobile-content-area",
          showBottomNav && "pb-16", // Space for bottom nav
          "bg-background"
        )}>
          <div className="min-h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {showBottomNav && <MobileBottomNav />}
      </div>
    </div>
  );
}