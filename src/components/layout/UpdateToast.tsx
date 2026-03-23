import { AnimatePresence, motion } from "motion/react";
import { ArrowDownCircle, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UpdateCheckerResult } from "@/lib/updater";

interface UpdateToastProps {
  update: UpdateCheckerResult;
}

export function UpdateToast({ update }: UpdateToastProps) {
  const isVisible = update.available && !update.dismissed;

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.aside
          className="pointer-events-auto fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#07101d]/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />

          <div className="space-y-4 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                {update.installing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Update Ready</p>
                <h3 className="text-sm font-semibold text-white">Cortex Metagen v{update.latest} is available</h3>
                <p className="text-xs leading-5 text-slate-300">
                  {update.installing ? `Installing update... ${update.progressPercent}%` : update.statusNote}
                </p>
              </div>
            </div>

            {update.notes ? (
              <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3 text-xs leading-5 text-slate-300">
                <p className="mb-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">Release Notes</p>
                <p className="whitespace-pre-wrap">{update.notes}</p>
              </div>
            ) : null}

            {update.installing ? (
              <div className="space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-300 transition-[width] duration-200"
                    style={{ width: `${Math.max(update.progressPercent, 4)}%` }}
                  />
                </div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Download progress {update.progressPercent}%
                </p>
              </div>
            ) : null}

            {update.error ? <p className="text-xs text-rose-300">{update.error}</p> : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="h-9 bg-cyan-300 px-3 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
                disabled={update.installing}
                onClick={() => {
                  void update.install();
                }}
              >
                {update.installing ? (
                  <>
                    <LoaderCircle className="mr-1.5 size-3.5 animate-spin" /> Installing
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="mr-1.5 size-3.5" /> Install Update
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="h-9 px-3 text-xs text-slate-300 hover:bg-white/6 hover:text-white"
                disabled={update.installing}
                onClick={update.dismiss}
              >
                Not now
              </Button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
