import * as React from "react"

import { cn } from "~lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-[0_20px_45px_rgba(15,23,42,0.08)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("flex flex-col space-y-1.5 p-4", className)} ref={ref} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 className={cn("text-sm font-semibold leading-none tracking-tight", className)} ref={ref} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p className={cn("text-sm text-muted-foreground", className)} ref={ref} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("p-4 pt-0", className)} ref={ref} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
