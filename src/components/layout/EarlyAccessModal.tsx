import { useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bug, Lightbulb, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MetaFileType } from "@/store/meta-store";

// Modes that need the early-access warning (NOT handling/vehicles/merge)
const EARLY_ACCESS_MODES = new Set<MetaFileType>([
  "carcols",
  "carvariations",
  "vehiclelayouts",
  "modkits",
]);

const MODE_LABELS: Partial<Record<MetaFileType, string>> = {
  carcols: "Sirens / Carcols",
  carvariations: "Car Variations",
  vehiclelayouts: "Vehicle Layouts",
  modkits: "ModKits",
};

function getLsKey(mode: MetaFileType) {
  return `ea:${mode}:dismissed`;
}

function isDismissed(mode: MetaFileType): boolean {
  try {
    return localStorage.getItem(getLsKey(mode)) === "1";
  } catch {
    return false;
  }
}

function markDismissed(mode: MetaFileType): void {
  try {
    localStorage.setItem(getLsKey(mode), "1");
  } catch {
    // Storage unavailable — silently skip
  }
}

interface EarlyAccessModalProps {
  /** The mode the user just navigated to. Pass null to collapse. */
  mode: MetaFileType | null;
  onDismiss: () => void;
  onOpenFeedback: () => void;
}

export function EarlyAccessModal({
  mode,
  onDismiss,
  onOpenFeedback,
}: EarlyAccessModalProps) {
  const visible = mode !== null && EARLY_ACCESS_MODES.has(mode);

  const handleDismiss = useCallback(() => {
    if (mode) markDismissed(mode);
    onDismiss();
  }, [mode, onDismiss]);

  const handleOpenFeedback = useCallback(() => {
    if (mode) markDismissed(mode);
    onOpenFeedback();
    onDismiss();
  }, [mode, onDismiss, onOpenFeedback]);

  if (!visible || !mode) return null;

  const label = MODE_LABELS[mode] ?? mode;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop - using standard app overlay color */}
          <motion.div
            key="ea-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-background-app/80 data-[state=closed]:animate-out data-[state=open]:animate-in"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Modal card - using standard app modal styling */}
          <motion.div
            key="ea-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${label} early access notice`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
              "rounded-xl border bg-card p-4 shadow-sm",
              "sm:max-w-lg",
            )}
          >
            {/* Header row */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Animated signal dot - cyan accent */}
                <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
                  <span className="absolute inline-flex size-3 animate-ping rounded-full bg-cyan-400/40" />
                  <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-400 uppercase select-none">
                      Early Access
                    </span>
                    <Zap className="size-3 text-cyan-400/70" />
                  </div>
                  <p className="mt-0.5 text-base font-medium">
                    {label} Editor
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              The <span className="font-medium text-foreground">{label}</span>{" "}
              editor is still being refined. Some features may be incomplete,
              and edge cases may exist that haven't been caught yet.
            </p>

            <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
              <p className="text-xs leading-relaxed text-cyan-200/75">
                Your feedback directly shapes this editor. If something breaks
                or behaves unexpectedly, please{" "}
                <span className="font-medium text-cyan-300">report it</span>.
                If you have ideas for improvements or missing features,{" "}
                <span className="font-medium text-cyan-300">
                  we want to hear them
                </span>
                .
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 gap-1.5 border-cyan-500/30 bg-cyan-500/10 px-3 text-xs",
                  "text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300",
                )}
                onClick={handleOpenFeedback}
              >
                <Bug className="size-3.5" />
                Report a Bug
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 gap-1.5 border-cyan-500/30 bg-cyan-500/10 px-3 text-xs",
                  "text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300",
                )}
                onClick={handleOpenFeedback}
              >
                <Lightbulb className="size-3.5" />
                Suggest a Feature
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Don't show again
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Returns whether the given mode should show an early-access warning,
 * i.e. it's in the early-access set AND has not already been dismissed.
 */
export function shouldShowEarlyAccess(mode: MetaFileType): boolean {
  return EARLY_ACCESS_MODES.has(mode) && !isDismissed(mode);
}
