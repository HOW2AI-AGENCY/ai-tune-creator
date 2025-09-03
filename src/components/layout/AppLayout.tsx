import { ReactNode, useEffect, memo, useCallback } from "react";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

const SidebarRouteSync = memo(function SidebarRouteSync() {
  const { setOpen } = useSidebar();
  const location = useLocation();

  useEffect(() => {
    const shouldCollapse = location.pathname.startsWith("/generate");
    setOpen(!shouldCollapse);
  }, [location.pathname, setOpen]);

  return null;
});

export const AppLayout = memo<AppLayoutProps>(function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <SidebarRouteSync />
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
});