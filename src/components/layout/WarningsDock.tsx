import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X, XCircle } from "lucide-react";
import type { ValidationIssue } from "@/lib/xml-validator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WarningsDockProps {
  issues: ValidationIssue[];
  fileName?: string;
  onDismiss: () => void;
  placement?: "floating" | "footer";
}

export function WarningsDock({ issues, fileName, onDismiss, placement = "floating" }: WarningsDockProps) {
  const [open, setOpen] = useState(false);

  const { errors, warnings } = useMemo(() => {
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    return { errors, warnings };
  }, [issues]);

  if (!issues || issues.length === 0) return null;

  const label =
    `${errors.length} error${errors.length === 1 ? "" : "s"}` +
    (errors.length > 0 && warnings.length > 0 ? ", " : "") +
    `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`;

  return (
    <>
      <TooltipProvider>
        <div className={placement === "floating" ? "fixed bottom-3 right-3 z-40" : ""}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className={`border bg-card/95 flex items-center justify-center transition-colors ${
                  placement === "floating" ? "h-9 w-9" : "h-6 w-6 rounded-sm"
                } ${
                  errors.length > 0
                    ? "border-red-500/40 hover:bg-red-500/10"
                    : "border-yellow-500/40 hover:bg-yellow-500/10"
                }`}
                aria-label={label}
              >
                {errors.length > 0 ? (
                  <XCircle className={placement === "floating" ? "h-4 w-4 text-red-400" : "h-3.5 w-3.5 text-red-400"} />
                ) : (
                  <AlertTriangle className={placement === "floating" ? "h-4 w-4 text-yellow-400" : "h-3.5 w-3.5 text-yellow-400"} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={placement === "floating" ? "left" : "top"}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">Click to view</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-background/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-label="Close warnings"
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 border-t bg-card"
              initial={{ y: 260 }}
              animate={{ y: 0 }}
              exit={{ y: 260 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="h-10 px-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2 text-xs">
                  {errors.length > 0 ? (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                  )}
                  <span className="font-medium">{label}</span>
                  {fileName && <span className="text-muted-foreground">in {fileName}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 hover:bg-muted/40"
                    title="Dismiss warnings"
                  >
                    Dismiss
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="h-8 w-8 flex items-center justify-center hover:bg-muted/40"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Close</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                {issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 px-3 py-2 text-[11px] border-b border-border/30 last:border-b-0 hover:bg-muted/20"
                  >
                    {issue.severity === "error" ? (
                      <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground shrink-0">Ln {issue.line}</span>
                        <span className="text-foreground/90">{issue.message}</span>
                      </div>
                      {issue.context && (
                        <div className="font-mono text-[10px] text-muted-foreground/60 truncate mt-0.5">
                          {issue.context}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
