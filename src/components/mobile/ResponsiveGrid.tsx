import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  minItemWidth?: string;
  autoFit?: boolean;
}

const gaps = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8"
};

/**
 * ResponsiveGrid - Adaptive grid layout component
 * Automatically adjusts column count based on screen size and content
 */
export const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "md",
  minItemWidth,
  autoFit = false,
  ...props
}, ref) => {
  const getGridClasses = () => {
    if (autoFit && minItemWidth) {
      return `grid-cols-[repeat(auto-fit,minmax(${minItemWidth},1fr))]`;
    }
    
    return cn(
      "grid",
      columns.mobile && `grid-cols-${columns.mobile}`,
      columns.tablet && `md:grid-cols-${columns.tablet}`,
      columns.desktop && `lg:grid-cols-${columns.desktop}`
    );
  };

  return (
    <div
      ref={ref}
      className={cn(
        "grid w-full",
        getGridClasses(),
        gaps[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

ResponsiveGrid.displayName = "ResponsiveGrid";

/**
 * ResponsiveGridItem - Grid item with responsive sizing options
 */
interface ResponsiveGridItemProps {
  children: ReactNode;
  className?: string;
  span?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ResponsiveGridItem = forwardRef<HTMLDivElement, ResponsiveGridItemProps>(({
  children,
  className,
  span,
  ...props
}, ref) => {
  const getSpanClasses = () => {
    if (!span) return "";
    
    return cn(
      span.mobile && `col-span-${span.mobile}`,
      span.tablet && `md:col-span-${span.tablet}`,
      span.desktop && `lg:col-span-${span.desktop}`
    );
  };

  return (
    <div
      ref={ref}
      className={cn(
        getSpanClasses(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

ResponsiveGridItem.displayName = "ResponsiveGridItem";