import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface SquareToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  variant?: "checkbox" | "slider";
}

const TOGGLE_SIZE = 20;
const THUMB_SIZE = 12;
const THUMB_OFFSET = 2;

export const SquareToggle = memo(function SquareToggle({
  checked,
  onCheckedChange,
  label,
  ariaLabel,
  disabled = false,
  variant = "checkbox",
}: SquareToggleProps) {
  const accessibleLabel = ariaLabel ?? label ?? "Toggle";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={accessibleLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex items-center group cursor-pointer",
        label && "gap-2",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {variant === "slider" ? (
        <motion.div
          className={cn(
            "relative flex items-center rounded-[3px] border",
            checked
              ? "bg-primary border-primary"
              : "bg-muted/30 border-border hover:bg-muted/40"
          )}
          style={{ width: TOGGLE_SIZE * 1.75, height: TOGGLE_SIZE }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className={cn(
              "rounded-[2px] border",
              checked
                ? "bg-background border-primary/20"
                : "bg-background border-border"
            )}
            style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
            animate={{ x: checked ? TOGGLE_SIZE * 0.75 - THUMB_OFFSET : THUMB_OFFSET }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        </motion.div>
      ) : (
        <motion.div
          className={cn(
            "flex items-center justify-center rounded-[3px] border-2",
            checked
              ? "bg-primary border-primary"
              : "bg-transparent border-muted-foreground/40 hover:border-muted-foreground/70"
          )}
          style={{ width: TOGGLE_SIZE, height: TOGGLE_SIZE }}
          animate={checked ? { scale: [1, 0.85, 1] } : { scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <AnimatePresence>
            {checked && (
              <motion.svg
                viewBox="0 0 14 14"
                fill="none"
                className="text-primary-foreground"
                style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <motion.path
                  d="M3 7L6 10L11 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, delay: 0.03 }}
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {label ? <span className="text-sm text-foreground select-none">{label}</span> : null}
    </button>
  );
});
