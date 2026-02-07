import { memo } from "react";
import { cn } from "@/lib/utils";

interface SquareToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const SquareToggle = memo(function SquareToggle({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: SquareToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 group cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "h-5 w-5 rounded-[2px] border-2 transition-all duration-150 flex items-center justify-center",
          checked
            ? "bg-primary border-primary"
            : "bg-transparent border-muted-foreground/40 hover:border-muted-foreground/70"
        )}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-primary-foreground"
          >
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-foreground select-none">{label}</span>
    </button>
  );
});
