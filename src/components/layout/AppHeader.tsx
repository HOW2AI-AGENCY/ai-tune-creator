import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/**
 * Компонент шапки приложения с переключением темы и профилем пользователя
 * Удалена мемоизация для улучшения реактивности
 */
export const AppHeader = memo(function AppHeader() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialTheme = savedTheme || systemTheme;
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация функции переключения темы
   * Предотвращает пересоздание функции при каждом рендере
   */
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }, [theme]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация функции получения инициалов
   * Стабильная функция, не зависит от props/state
   */
  const getUserInitials = useCallback((email: string) => {
    return email.substring(0, 2).toUpperCase();
  }, []);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация обработчика выхода
   * Предотвращает пересоздание функции при каждом рендере
   */
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({ title: "Вы вышли", description: "Сессия завершена" });
      navigate("/auth");
    } catch (e: any) {
      toast({ 
        title: "Ошибка выхода", 
        description: e?.message || "Попробуйте снова", 
        variant: "destructive" 
      });
    }
  }, [signOut, toast, navigate]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация отображаемого имени пользователя
   * Пересчитывается только при изменении данных пользователя
   */
  const userDisplayName = useMemo(() => {
    return user?.user_metadata?.full_name || "Music Creator";
  }, [user?.user_metadata?.full_name]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация инициалов пользователя  
   * Пересчитывается только при изменении email
   */
  const userInitials = useMemo(() => {
    return user?.email ? getUserInitials(user.email) : "U";
  }, [user?.email, getUserInitials]);

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-foreground">AI Music Platform</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userDisplayName}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});
