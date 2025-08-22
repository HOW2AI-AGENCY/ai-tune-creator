import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobilePageWrapperProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  spacing?: "none" | "sm" | "md" | "lg";
}

export function MobilePageWrapper({ 
  children, 
  className, 
  padding = true,
  spacing = "md" 
}: MobilePageWrapperProps) {
  const spacingClasses = {
    none: "",
    sm: "space-y-3",
    md: "space-y-4", 
    lg: "space-y-6"
  };

  return (
    <div className={cn(
      "mobile-page-wrapper",
      padding && "px-4 py-4",
      spacingClasses[spacing],
      "safe-area-inset telegram-content-safe",
      className
    )}>
      {children}
    </div>
  );
}