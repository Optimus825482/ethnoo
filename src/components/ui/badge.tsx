import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import * as React from "react"

const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg border border-transparent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-accent/10 text-primary",
        secondary: "bg-muted text-muted-foreground",
        destructive: "bg-red-50 text-destructive dark:bg-red-950/30",
        outline: "border-border text-foreground",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants, type BadgeProps }
