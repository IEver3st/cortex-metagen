import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked = false,
  onCheckedChange,
  disabled,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      data-slot="checkbox"
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => {
        if (!disabled) onCheckedChange?.(!checked)
      }}
      className={cn(
        "peer inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-background text-primary shadow-xs transition-all outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Check className={cn("size-3.5 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
    </button>
  )
}

export { Checkbox }
