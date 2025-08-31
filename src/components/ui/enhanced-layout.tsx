import * as React from 'react';
import { cn } from '@/lib/utils';

interface EnhancedLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const EnhancedLayout = React.forwardRef<HTMLDivElement, EnhancedLayoutProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("enhanced-layout min-h-screen", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

EnhancedLayout.displayName = "EnhancedLayout";