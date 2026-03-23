import { GripVertical } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  direction,
  ...props
}: React.ComponentProps<typeof Group> & {
  direction?: "horizontal" | "vertical"
}) {
  return (
    <Group
      orientation={direction ?? props.orientation}
      className={cn(
        "flex h-full w-full data-[group-orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel {...props} />
}

function ResizableHandle({
  className,
  withHandle,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      className={cn(
        "relative flex w-1.5 items-center justify-center bg-border/70 transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border data-[group-orientation=vertical]:h-1.5 data-[group-orientation=vertical]:w-full data-[group-orientation=vertical]:after:left-0 data-[group-orientation=vertical]:after:top-1/2 data-[group-orientation=vertical]:after:h-px data-[group-orientation=vertical]:after:w-full data-[group-orientation=vertical]:after:-translate-y-1/2 hover:bg-primary/30",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border/80 bg-card text-muted-foreground shadow-sm data-[group-orientation=vertical]:h-3 data-[group-orientation=vertical]:w-4">
          <GripVertical className="size-3" />
        </div>
      ) : null}
    </Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
