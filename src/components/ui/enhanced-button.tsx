import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-button active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-button active:scale-[0.98]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.95]",
        link: "text-primary underline-offset-4 hover:underline active:scale-[0.98]",
        // Enhanced variants
        gradient: "bg-gradient-primary text-primary-foreground hover:shadow-glow active:scale-[0.98]",
        glass: "bg-gradient-glass backdrop-blur-xl border border-border/50 hover:bg-accent/20 active:scale-[0.98]",
        telegram: "bg-[--tg-button] text-[--tg-button-text] hover:bg-[--tg-button]/90 shadow-button active:scale-[0.98]",
        floating: "bg-primary text-primary-foreground shadow-elevated hover:shadow-glow hover:translate-y-[-2px] active:scale-[0.95] active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        fab: "h-14 w-14 rounded-full",
      },
      animation: {
        none: "",
        bounce: "hover:animate-bounce-subtle",
        glow: "hover:animate-pulse-glow",
        float: "hover:animate-float",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, animation, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(enhancedButtonVariants({ variant, size, animation, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, enhancedButtonVariants }