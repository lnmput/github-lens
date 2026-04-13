import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(59,130,246,0.22)] hover:brightness-95",
        secondary:
          "border border-border/70 bg-secondary/90 text-secondary-foreground shadow-sm hover:bg-secondary hover:border-primary/20",
        outline:
          "border border-input/90 bg-background/85 text-foreground shadow-sm hover:border-primary/30 hover:bg-accent hover:text-accent-foreground",
        ghost:
          "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
        destructive:
          "bg-rose-600 text-white shadow-[0_10px_24px_rgba(225,29,72,0.22)] hover:bg-rose-700"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)

Button.displayName = "Button"

export { Button, buttonVariants }
