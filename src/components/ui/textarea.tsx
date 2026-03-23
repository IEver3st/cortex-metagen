import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-input/60 placeholder:text-muted-foreground flex min-h-24 w-full rounded-lg border px-3 py-2 text-sm text-foreground shadow-none outline-none transition-[border-color,background-color,color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
