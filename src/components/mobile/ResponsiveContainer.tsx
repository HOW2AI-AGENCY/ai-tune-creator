import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  centerContent?: boolean;
}

const maxWidths = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full"
};

const paddings = {
  none: "",
  sm: "px-2 sm:px-4",
  md: "px-4 sm:px-6 lg:px-8",
  lg: "px-6 sm:px-8 lg:px-12"
};

/**
 * ResponsiveContainer - Universal container for responsive layouts
 * Provides consistent spacing and max-width constraints across all screen sizes
 */
export const ResponsiveContainer = forwardRef<HTMLDivElement, ResponsiveContainerProps>(({
  children,
  className,
  maxWidth = "full",
  padding = "md",
  centerContent = true,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full",
        maxWidths[maxWidth],
        paddings[padding],
        centerContent && "mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

ResponsiveContainer.displayName = "ResponsiveContainer";