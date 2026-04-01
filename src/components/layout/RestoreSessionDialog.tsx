import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { History, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RestoreSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleCount: number;
  timestamp?: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RestoreSessionDialog = memo(function RestoreSessionDialog({
  open,
  vehicleCount,
  timestamp,
  onRestore,
  onDiscard,
}: RestoreSessionDialogProps) {
  const timeLabel = timestamp ? new Date(timestamp).toLocaleString() : null;

  const handleDiscard = useCallback(() => {
    onDiscard();
  }, [onDiscard]);

  const handleRestore = useCallback(() => {
    onRestore();
  }, [onRestore]);

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
          }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-4 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/95 to-slate-800/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md">
            {/* Icon */}
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10"
            >
              <History className="h-5 w-5 text-cyan-400" />
            </motion.div>

            {/* Content */}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-100">
                Restore previous session?
              </span>
              <span className="text-xs text-slate-400">
                {vehicleCount > 0
                  ? `${vehicleCount} vehicle${vehicleCount === 1 ? "" : "s"}${timeLabel ? ` · ${timeLabel}` : ""}`
                  : "Draft session available"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                className="h-8 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                Start fresh
              </Button>
              <Button
                size="sm"
                onClick={handleRestore}
                className="h-8 bg-cyan-500/10 text-xs text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              >
                Restore
              </Button>
            </div>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDiscard}
              className="h-7 w-7 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Animated accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="absolute -bottom-px left-2 right-2 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});
