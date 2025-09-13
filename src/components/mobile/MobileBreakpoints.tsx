import { ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface MobileBreakpointsProps {
  children: ReactNode;
  mobile?: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
  showOn?: "mobile" | "tablet" | "desktop" | "mobile-tablet" | "tablet-desktop";
}

/**
 * MobileBreakpoints - Conditional rendering based on screen size
 * Provides a declarative way to show different content on different screen sizes
 */
export function MobileBreakpoints({ 
  children, 
  mobile, 
  tablet, 
  desktop,
  showOn 
}: MobileBreakpointsProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Handle showOn prop for conditional visibility
  if (showOn) {
    const shouldShow = 
      (showOn === "mobile" && isMobile) ||
      (showOn === "tablet" && isTablet) ||
      (showOn === "desktop" && isDesktop) ||
      (showOn === "mobile-tablet" && (isMobile || isTablet)) ||
      (showOn === "tablet-desktop" && (isTablet || isDesktop));
    
    return shouldShow ? <>{children}</> : null;
  }

  // Handle device-specific content
  if (mobile && isMobile) return <>{mobile}</>;
  if (tablet && isTablet) return <>{tablet}</>;
  if (desktop && isDesktop) return <>{desktop}</>;

  // Default content
  return <>{children}</>;
}

/**
 * MobileOnly - Show content only on mobile devices
 */
export function MobileOnly({ children }: { children: ReactNode }) {
  return <MobileBreakpoints showOn="mobile">{children}</MobileBreakpoints>;
}

/**
 * TabletOnly - Show content only on tablet devices
 */
export function TabletOnly({ children }: { children: ReactNode }) {
  return <MobileBreakpoints showOn="tablet">{children}</MobileBreakpoints>;
}

/**
 * DesktopOnly - Show content only on desktop devices
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return <MobileBreakpoints showOn="desktop">{children}</MobileBreakpoints>;
}

/**
 * MobileTablet - Show content on mobile and tablet devices
 */
export function MobileTablet({ children }: { children: ReactNode }) {
  return <MobileBreakpoints showOn="mobile-tablet">{children}</MobileBreakpoints>;
}

/**
 * TabletDesktop - Show content on tablet and desktop devices
 */
export function TabletDesktop({ children }: { children: ReactNode }) {
  return <MobileBreakpoints showOn="tablet-desktop">{children}</MobileBreakpoints>;
}