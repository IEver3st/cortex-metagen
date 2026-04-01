import { useCallback, useEffect, useState } from "react";
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
          {/* Backdrop */}
          <motion.div
            key="ea-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Modal card */}
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
              "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
              "w-full max-w-[440px] rounded-2xl border border-amber-500/20",
              "bg-[#0c1520] shadow-2xl shadow-black/60",
              "overflow-hidden",
            )}
          >
            {/* Amber accent stripe */}
            <div className="h-[3px] w-full bg-gradient-to-r from-amber-600/60 via-amber-400 to-amber-600/60" />

            <div className="p-6">
              {/* Header row */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Animated signal dot */}
                  <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
                    <span className="absolute inline-flex size-3 animate-ping rounded-full bg-amber-400/40" />
                    <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-amber-400 uppercase select-none">
                        Early Access
                      </span>
                      <Zap className="size-3 text-amber-400/70" />
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-white/90">
                      {label} Editor
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <p className="text-[13px] leading-relaxed text-white/65">
                The <span className="font-medium text-white/85">{label}</span>{" "}
                editor is still being refined. Some features may be incomplete,
                and edge cases may exist that haven't been caught yet.
              </p>

              <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-amber-200/75">
                  Your feedback directly shapes this editor. If something breaks
                  or behaves unexpectedly, please{" "}
                  <span className="font-medium text-amber-300">report it</span>.
                  If you have ideas for improvements or missing features,{" "}
                  <span className="font-medium text-amber-300">
                    we want to hear them
                  </span>
                  .
                </p>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-2.5">
                <Button
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5 border border-amber-500/30 bg-amber-500/10 px-3 text-xs",
                    "text-amber-200 hover:bg-amber-500/20 hover:text-amber-100",
                    "focus-visible:ring-amber-400/40",
                  )}
                  onClick={handleOpenFeedback}
                >
                  <Bug className="size-3.5" />
                  Report a Bug
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5 border border-amber-500/30 bg-amber-500/10 px-3 text-xs",
                    "text-amber-200 hover:bg-amber-500/20 hover:text-amber-100",
                    "focus-visible:ring-amber-400/40",
                  )}
                  onClick={handleOpenFeedback}
                >
                  <Lightbulb className="size-3.5" />
                  Suggest a Feature
                </Button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="ml-auto text-[11px] text-white/35 transition-colors hover:text-white/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Don't show again
                </button>
              </div>
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
