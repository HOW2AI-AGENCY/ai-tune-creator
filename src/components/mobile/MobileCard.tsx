import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined" | "filled";
  padding?: "none" | "sm" | "md" | "lg";
  rounded?: "none" | "sm" | "md" | "lg" | "xl";
  interactive?: boolean;
  onClick?: () => void;
}

export const MobileCard = forwardRef<HTMLDivElement, MobileCardProps>(({
  children,
  className,
  variant = "default",
  padding = "md",
  rounded = "lg",
  interactive = false,
  onClick,
  ...props
}, ref) => {
  const variants = {
    default: "bg-card border border-border",
    elevated: "bg-card shadow-lg border-0",
    outlined: "bg-transparent border-2 border-border",
    filled: "bg-muted border-0"
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

  return (
    <div
      ref={ref}
      className={cn(
        "mobile-card",
        variants[variant],
        paddings[padding],
        roundings[rounded],
        interactive && [
          "cursor-pointer tap-highlight",
          "transition-all duration-200",
          "active:scale-[0.98]",
          "hover:shadow-md"
        ],
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
});