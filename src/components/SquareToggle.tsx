import { memo } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SquareToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  variant?: "checkbox" | "slider";
}

export const SquareToggle = memo(function SquareToggle({
  checked,
  onCheckedChange,
  label,
  ariaLabel,
  disabled = false,
  variant = "checkbox",
}: SquareToggleProps) {
  const accessibleLabel = ariaLabel ?? label ?? "Toggle";

  if (variant === "slider") {
    return (
      <div className={cn("inline-flex items-center", label ? "gap-2" : undefined)}>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={accessibleLabel} disabled={disabled} />
        {label ? <span className="text-sm text-foreground">{label}</span> : null}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", label ? "gap-2" : undefined)}>
      <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.08 }}>
        <Button
          type="button"
          variant={checked ? "default" : "outline"}
          size="icon-xs"
          aria-label={accessibleLabel}
          aria-pressed={checked}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            "size-5 rounded-sm",
            checked ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <Check className={cn("size-3 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
        </Button>
      </motion.div>
      {label ? <span className="text-sm text-foreground">{label}</span> : null}
    </div>
  );
});
