import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { useTelegramHaptics } from "@/hooks/useTelegramWebApp";

interface TelegramNativeButtonProps extends ButtonProps {
  children: ReactNode;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
  telegramStyle?: boolean;
}

export const TelegramNativeButton = forwardRef<HTMLButtonElement, TelegramNativeButtonProps>(({
  children,
  className,
  onClick,
  hapticFeedback = 'medium',
  telegramStyle = true,
  variant = "default",
  ...props
}, ref) => {
  const { impactFeedback } = useTelegramHaptics();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    impactFeedback?.(hapticFeedback);
    onClick?.(e);
  };

  const telegramStyles = telegramStyle ? {
    default: "bg-[--tg-button] text-[--tg-button-text] hover:bg-[--tg-button]/90 shadow-button",
    secondary: "bg-[--tg-secondary-bg] text-[--tg-text] hover:bg-[--tg-secondary-bg]/80",
    outline: "border-2 border-[--tg-button] text-[--tg-button] hover:bg-[--tg-button] hover:text-[--tg-button-text]",
    ghost: "text-[--tg-link] hover:bg-[--tg-secondary-bg]/50",
    link: "text-[--tg-link] underline-offset-4 hover:underline",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  } : {};

  return (
    <Button
      ref={ref}
      variant={variant}
      className={cn(
        "relative overflow-hidden",
        "transition-all duration-200 ease-out",
        "active:scale-[0.98] active:transition-none",
        "tap-highlight",
        telegramStyle && telegramStyles[variant as keyof typeof telegramStyles],
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
});

TelegramNativeButton.displayName = "TelegramNativeButton";