import { Music, Users, FolderOpen, Settings, Mic, Headphones, Zap } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import React, { useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Компонент боковой панели навигации приложения
 * Удалена мемоизация для улучшения реактивности
 */
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  // Auto-collapse on AI generation page
  const isAIGenerationPage = currentPath === "/generate" || currentPath.startsWith("/generate");
  const shouldCollapse = collapsed || isAIGenerationPage;

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация навигационных элементов
   * Предотвращает пересоздание массивов при каждом рендере
   * Пересчитывается только при изменении переводов
   */
  const mainNavItems = useMemo(() => [
    { title: t("dashboard"), url: "/", icon: Headphones },
    { title: t("artists"), url: "/artists", icon: Users },
    { title: t("projects"), url: "/projects", icon: FolderOpen },
    { title: "Треки", url: "/tracks", icon: Music },
    { title: t("aiGeneration"), url: "/generate", icon: Zap },
  ], [t]);

  const settingsNavItems = useMemo(() => [
    { title: t("settings"), url: "/settings", icon: Settings },
  ], [t]);


  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/lovable-uploads/3fa15532-e16b-48f1-8df1-cefb76ba2691.png" alt="App Icon" className="w-5 h-5 object-contain" />
          </div>
          {!shouldCollapse && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground">{t("appName")}</span>
              <span className="text-xs text-sidebar-foreground/60">{t("appSubtitle")}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                       <item.icon className="w-4 h-4" />
                       {!shouldCollapse && <span>{item.title}</span>}
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("account")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                       <item.icon className="w-4 h-4" />
                       {!shouldCollapse && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
