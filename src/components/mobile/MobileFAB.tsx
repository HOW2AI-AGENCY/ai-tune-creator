import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileFABProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  variant?: "primary" | "secondary";
  size?: "default" | "lg";
  position?: "bottom-right" | "bottom-center" | "bottom-left";
}

export function MobileFAB({
  children,
  onClick,
  className,
  variant = "primary",
  size = "default",
  position = "bottom-right"
}: MobileFABProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md"
  };

  const sizes = {
    default: "h-14 w-14",
    lg: "h-16 w-16"
  };

  const positions = {
    "bottom-right": "bottom-20 right-4",
    "bottom-center": "bottom-20 left-1/2 -translate-x-1/2",
    "bottom-left": "bottom-20 left-4"
  };

  return (
    <Button
      className={cn(
        "fixed z-40 rounded-full",
        "transition-all duration-200",
        "active:scale-95",
        "shadow-lg hover:shadow-xl",
        "tap-highlight",
        variants[variant],
        sizes[size],
        positions[position],
        className
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}