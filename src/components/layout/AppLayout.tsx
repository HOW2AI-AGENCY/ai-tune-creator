import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

function SidebarRouteSync() {
  const { setOpen } = useSidebar();
  const location = useLocation();

  useEffect(() => {
    const shouldCollapse = location.pathname.startsWith("/generate");
    setOpen(!shouldCollapse);
  }, [location.pathname, setOpen]);

  return null;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <SidebarRouteSync />
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </>
  );
}