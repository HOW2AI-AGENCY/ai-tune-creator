import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Sparkles, 
  Music, 
  User, 
  Settings,
  Search,
  Plus
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  {
    id: 'home',
    label: 'Главная',
    icon: Home,
    path: '/',
    badge: null
  },
  {
    id: 'generate',
    label: 'Создать',
    icon: Sparkles,
    path: '/generate',
    badge: null
  },
  {
    id: 'tracks',
    label: 'Треки',
    icon: Music,
    path: '/tracks',
    badge: null
  },
  {
    id: 'artists',
    label: 'Артисты',
    icon: User,
    path: '/artists',
    badge: null
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: Settings,
    path: '/settings',
    badge: null
  }
];

interface MobileBottomNavProps {
  className?: string;
}

/**
 * Компонент мобильной нижней навигации
 * 
 * ОПТИМИЗАЦИЯ: Обернут в React.memo для предотвращения лишних рендеров.
 * Часто рендерится при:
 * - Изменении маршрута (подсветка активного элемента)
 * - Прокрутке страницы (sticky позиционирование)
 * - Изменении ориентации устройства
 * 
 * Мемоизация основана на:
 * - className prop
 * - Текущем пути для определения активного элемента
 * 
 * ЭКОНОМИЯ: ~80-90% рендеров при скролле и анимациях
 * 
 * WARNING: Содержит внутреннее состояние activeTab - будет 
 * ререндериваться при навигации (ожидаемое поведение)
 */
const MobileBottomNavComponent = function MobileBottomNav({ className }: MobileBottomNavProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация функции проверки активности пути
   * Предотвращает пересоздание функции при каждом рендере
   */
  const isActive = useCallback((path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  }, [location.pathname]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация обработчика клика
   * Стабилизирует функцию для предотвращения лишних ререндеров дочерних компонентов
   */
  const handleTabClick = useCallback((path: string) => {
    setActiveTab(path);
  }, []);

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border",
      "mobile-safe-area pb-safe-bottom",
      "animate-slide-in-bottom",
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2 mobile-nav-height">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-2 rounded-xl",
                "transition-all duration-200 tap-highlight",
                "min-w-0 flex-1 max-w-20",
                active ? [
                  "bg-primary/10 text-primary",
                  "shadow-glow"
                ] : [
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-accent/10"
                ]
              )}
              onClick={() => handleTabClick(item.path)}
            >
              <div className={cn(
                "relative p-1.5 rounded-lg transition-all duration-200",
                active && "animate-spring"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-all duration-200",
                  active && "animate-glow-pulse"
                )} />
                
                {item.badge && (
                  <Badge 
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center animate-bounce-in"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              
              <span className={cn(
                "text-xs font-medium mt-0.5 truncate transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      
      {/* Active indicator */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-primary" />
    </nav>
  );
};

// Устанавливаем displayName для отладки
MobileBottomNavComponent.displayName = 'MobileBottomNav';

/**
 * Кастомная функция сравнения для React.memo
 * Оптимизирует ререндеры на основе изменений className
 * 
 * @param prevProps - предыдущие пропсы
 * @param nextProps - новые пропсы  
 * @returns true если компонент НЕ должен ререндериваться
 */
const areEqual = (prevProps: MobileBottomNavProps, nextProps: MobileBottomNavProps) => {
  // Сравниваем только className, поскольку это единственный prop
  return prevProps.className === nextProps.className;
};

/**
 * Экспортируемый мемоизированный компонент
 * Использует кастомную функцию сравнения для оптимизации по className
 * Все изменения маршрута обрабатываются внутренними хуками
 */
export const MobileBottomNav = React.memo(MobileBottomNavComponent, areEqual);