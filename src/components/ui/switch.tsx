import { useCallback } from "react"

import { cn } from "@/lib/utils"

/**
 * Custom Switch implementation that avoids the Radix UI compose-refs infinite
 * re-render loop with React 19. Maintains the same API surface (checked,
 * onCheckedChange, size, disabled, className) and identical visual output.
 */
function Switch({
  className,
  size = "default",
  checked = false,
  onCheckedChange,
  disabled,
  required,
  name,
  value = "on",
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  size?: "sm" | "default"
  checked?: boolean

  onCheckedChange?: (checked: boolean) => void
  required?: boolean
  name?: string
  value?: string
}) {
  const state = checked ? "checked" : "unchecked"

  const handleClick = useCallback(() => {
    if (disabled) return
    onCheckedChange?.(!checked)
  }, [disabled, checked, onCheckedChange])

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-required={required}
      data-slot="switch"
      data-state={state}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        data-state={state}
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] rtl:data-[state=checked]:-translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 rtl:data-[state=unchecked]:-translate-x-0"
        )}
      />
      {name && (
        <input
          type="checkbox"
          aria-hidden
          tabIndex={-1}
          name={name}
          value={value}
          checked={checked}
          required={required}
          disabled={disabled}
          readOnly
          style={{
            position: "absolute",
            pointerEvents: "none",
            opacity: 0,
            margin: 0,
            width: 0,
            height: 0,
          }}
        />
      )}
    </button>
  )
}

export { Switch }
