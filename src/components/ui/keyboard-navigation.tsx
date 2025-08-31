import * as React from 'react';
import { cn } from '@/lib/utils';

interface KeyboardNavigationProps {
  children: React.ReactNode;
  className?: string;
  trapFocus?: boolean;
  enableArrowKeys?: boolean;
  focusableSelector?: string;
  onFocusEscape?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export const KeyboardNavigationProvider = React.forwardRef<
  HTMLDivElement,
  KeyboardNavigationProps
>(({ 
  children, 
  className,
  trapFocus = false,
  enableArrowKeys = false,
  focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  onFocusEscape,
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn("keyboard-navigation", className)}
      {...props}
    >
      {children}
    </div>
  );
});

KeyboardNavigationProvider.displayName = "KeyboardNavigationProvider";

export const SkipLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<'a'> & {
    targetId: string;
    children: React.ReactNode;
  }
>(({ targetId, children, className, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  return (
    <a
      ref={ref}
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0",
        "bg-primary text-primary-foreground px-4 py-2 rounded-md z-50",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
});

SkipLink.displayName = "SkipLink";