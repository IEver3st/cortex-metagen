import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
      <motion.div
        className={cn(
          "h-5 w-5 rounded-[2px] border-2 flex items-center justify-center",
          checked
            ? "bg-primary border-primary"
            : "bg-transparent border-muted-foreground/40 hover:border-muted-foreground/70"
        )}
        animate={checked ? { scale: [1, 0.85, 1] } : { scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="text-primary-foreground"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <motion.path
                d="M2 6L5 9L10 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
      <span className="text-sm text-foreground select-none">{label}</span>
    </button>
  );
});
