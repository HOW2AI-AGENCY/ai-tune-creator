import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const accessibleButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-primary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-secondary",
        ghost: "hover:bg-accent hover:text-accent-foreground focus-visible:ring-primary",
        link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof accessibleButtonVariants> {
  asChild?: boolean;
  /**
   * Accessible label for screen readers when button content is not descriptive
   */
  ariaLabel?: string;
  /**
   * Additional context for screen readers
   */
  ariaDescription?: string;
  /**
   * Whether this button is currently pressed (for toggle buttons)
   */
  pressed?: boolean;
  /**
   * Loading state with accessible feedback
   */
  loading?: boolean;
  /**
   * Show focus ring always (useful for keyboard navigation demos)
   */
  alwaysShowFocus?: boolean;
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    ariaLabel,
    ariaDescription,
    pressed,
    loading = false,
    alwaysShowFocus = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Generate unique ID for aria-describedby if description is provided
    const descriptionId = React.useId();
    
    return (
      <>
        <Comp
          className={cn(
            accessibleButtonVariants({ variant, size, className }),
            alwaysShowFocus && "ring-2 ring-ring ring-offset-2",
            loading && "cursor-wait"
          )}
          ref={ref}
          disabled={disabled || loading}
          aria-label={ariaLabel}
          aria-pressed={pressed !== undefined ? pressed : undefined}
          aria-describedby={ariaDescription ? descriptionId : undefined}
          aria-busy={loading}
          {...props}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div 
                className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Loading...</span>
              {children}
            </div>
          ) : (
            children
          )}
        </Comp>
        {ariaDescription && (
          <span id={descriptionId} className="sr-only">
            {ariaDescription}
          </span>
        )}
      </>
    );
  }
);
AccessibleButton.displayName = "AccessibleButton";

export { AccessibleButton, accessibleButtonVariants };