import { motion, AnimatePresence } from "motion/react";
import { History, X, ArrowRight } from "lucide-react";

interface SessionRestoreToastProps {
  open: boolean;
  vehicleCount: number;
  timestamp?: number;
  onRestore: () => void;
  onDismiss: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function SessionRestoreToast({
  open,
  vehicleCount,
  timestamp,
  onRestore,
  onDismiss,
}: SessionRestoreToastProps) {
  const timeLabel = timestamp ? formatRelativeTime(timestamp) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            opacity: { duration: 0.15 },
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-[#0a1a2e]/95 backdrop-blur-sm shadow-2xl shadow-black/40">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 shrink-0">
              <History className="size-4 text-primary" />
            </div>

            <div className="flex flex-col gap-0.5 min-w-[180px]">
              <p className="text-sm font-semibold text-slate-100">
                Session available
              </p>
              <p className="text-xs text-slate-400">
                {vehicleCount} vehicle{vehicleCount === 1 ? "" : "s"}
                {timeLabel && <span className="text-slate-500"> · {timeLabel}</span>}
              </p>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRestore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-colors hover:bg-primary/90"
              >
                <span>Restore</span>
                <ArrowRight className="size-3" />
              </motion.button>

              <button
                onClick={onDismiss}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}