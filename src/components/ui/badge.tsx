import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/12 text-primary",
        secondary: "border-border bg-muted text-muted-foreground",
        destructive: "border-destructive/30 bg-destructive/12 text-destructive",
        outline: "border-border bg-transparent text-foreground/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
