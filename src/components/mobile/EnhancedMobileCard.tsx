import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useTelegramHaptics } from "@/hooks/useTelegramWebApp";

interface EnhancedMobileCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outlined" | "glass" | "telegram";
  padding?: "none" | "sm" | "md" | "lg";
  rounded?: "none" | "sm" | "md" | "lg" | "xl";
  interactive?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy';
  elevation?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
}

export const EnhancedMobileCard = forwardRef<HTMLDivElement, EnhancedMobileCardProps>(({
  children,
  className,
  variant = "default",
  padding = "md",
  rounded = "lg",
  interactive = false,
  hapticFeedback = 'light',
  elevation = "sm",
  onClick,
  ...props
}, ref) => {
  const { impactFeedback } = useTelegramHaptics();

  const variants = {
    default: "bg-card border border-border",
    elevated: "bg-card shadow-elevated border-0",
    outlined: "bg-transparent border-2 border-border",
    glass: "bg-card/50 backdrop-blur-xl border border-border/50",
    telegram: "bg-[--tg-secondary-bg] border border-[--tg-secondary-bg]/20"
  };

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6"
  };

  const roundings = {
    none: "",
    sm: "rounded-sm",
    md: "rounded-md", 
    lg: "rounded-lg",
    xl: "rounded-xl"
  };

  const elevations = {
    none: "",
    sm: "shadow-card",
    md: "shadow-elevated",
    lg: "shadow-glow"
  };

  const handleClick = () => {
    if (interactive && impactFeedback) {
      impactFeedback(hapticFeedback);
    }
    onClick?.();
  };

  return (
    <div
      ref={ref}
      className={cn(
        "mobile-card transition-all duration-200 ease-out",
        variants[variant],
        paddings[padding],
        roundings[rounded],
        elevations[elevation],
        interactive && [
          "cursor-pointer tap-highlight",
          "active:scale-[0.98]",
          "hover:shadow-elevated hover:translate-y-[-1px]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        ],
        className
      )}
      onClick={handleClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

EnhancedMobileCard.displayName = "EnhancedMobileCard";