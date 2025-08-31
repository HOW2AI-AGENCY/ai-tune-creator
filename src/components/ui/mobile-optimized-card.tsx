import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface MobileOptimizedCardProps extends React.ComponentProps<typeof Card> {
  /**
   * Enable touch-friendly interactions
   */
  touchOptimized?: boolean;
  /**
   * Enable haptic feedback on supported devices
   */
  hapticFeedback?: boolean;
  /**
   * Mobile-specific styling
   */
  mobileVariant?: 'default' | 'compact' | 'full-width';
  /**
   * Swipe actions
   */
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /**
   * Long press action
   */
  onLongPress?: () => void;
  /**
   * Children components
   */
  children?: React.ReactNode;
}

const MobileOptimizedCard = React.forwardRef<HTMLDivElement, MobileOptimizedCardProps>(
  ({ 
    className, 
    touchOptimized = true, 
    hapticFeedback = false,
    mobileVariant = 'default',
    onSwipeLeft,
    onSwipeRight,
    onLongPress,
    children,
    ...props 
  }, ref) => {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [currentX, setCurrentX] = React.useState(0);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    
    const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
      if (!isMobile || (!onSwipeLeft && !onSwipeRight && !onLongPress)) return;
      
      const touch = e.touches[0];
      setStartX(touch.clientX);
      setCurrentX(touch.clientX);
      
      // Start long press timer
      if (onLongPress) {
        longPressTimer.current = setTimeout(() => {
          if (hapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate(50); // Short haptic feedback
          }
          onLongPress();
        }, 500);
      }
    }, [isMobile, onSwipeLeft, onSwipeRight, onLongPress, hapticFeedback]);
    
    const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
      if (!isMobile) return;
      
      const touch = e.touches[0];
      setCurrentX(touch.clientX);
      
      const deltaX = Math.abs(touch.clientX - startX);
      if (deltaX > 10) {
        setIsDragging(true);
        // Clear long press timer on movement
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }, [isMobile, startX]);
    
    const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
      if (!isMobile) return;
      
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      if (isDragging) {
        const deltaX = currentX - startX;
        const threshold = 100; // Minimum swipe distance
        
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && onSwipeRight) {
            if (hapticFeedback && 'vibrate' in navigator) {
              navigator.vibrate(30);
            }
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            if (hapticFeedback && 'vibrate' in navigator) {
              navigator.vibrate(30);
            }
            onSwipeLeft();
          }
        }
      }
      
      setIsDragging(false);
      setStartX(0);
      setCurrentX(0);
    }, [isMobile, isDragging, currentX, startX, onSwipeLeft, onSwipeRight, hapticFeedback]);
    
    const mobileVariantStyles = {
      'default': '',
      'compact': 'p-3 rounded-lg',
      'full-width': 'rounded-none border-x-0 mx-0'
    };
    
    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-200",
          touchOptimized && isMobile && [
            "touch-manipulation",
            "select-none",
            "active:scale-[0.98]",
            "active:shadow-sm"
          ],
          isDragging && "transition-none",
          isMobile && mobileVariantStyles[mobileVariant],
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        {children}
      </Card>
    );
  }
);
MobileOptimizedCard.displayName = "MobileOptimizedCard";

// Specific mobile-optimized card components
const MobileCardHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CardHeader>
>(({ className, ...props }, ref) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  return (
    <CardHeader
      ref={ref}
      className={cn(
        isMobile && "pb-2 px-3 pt-3",
        className
      )}
      {...props}
    />
  );
});
MobileCardHeader.displayName = "MobileCardHeader";

const MobileCardContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CardContent>
>(({ className, ...props }, ref) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  return (
    <CardContent
      ref={ref}
      className={cn(
        isMobile && "px-3 py-2",
        className
      )}
      {...props}
    />
  );
});
MobileCardContent.displayName = "MobileCardContent";

const MobileCardFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CardFooter>
>(({ className, ...props }, ref) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  return (
    <CardFooter
      ref={ref}
      className={cn(
        isMobile && "px-3 pb-3 pt-2",
        className
      )}
      {...props}
    />
  );
});
MobileCardFooter.displayName = "MobileCardFooter";

export { 
  MobileOptimizedCard, 
  MobileCardHeader,
  MobileCardContent,
  MobileCardFooter,
  CardTitle,
  CardDescription
};