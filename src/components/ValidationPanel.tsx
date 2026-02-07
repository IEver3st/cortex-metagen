import { AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ValidationIssue } from "@/lib/xml-validator";

interface ValidationPanelProps {
  issues: ValidationIssue[];
  fileName?: string;
  onDismiss: () => void;
}

export function ValidationPanel({ issues, fileName, onDismiss }: ValidationPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (issues.length === 0) return null;

  return (
    <motion.div
      className="border-b bg-card overflow-hidden"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-xs">
          {errors.length > 0 ? (
            <XCircle className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
          )}
          <span className="font-medium">
            {errors.length > 0
              ? `${errors.length} error${errors.length !== 1 ? "s" : ""}`
              : ""}
            {errors.length > 0 && warnings.length > 0 ? ", " : ""}
            {warnings.length > 0
              ? `${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`
              : ""}
          </span>
          {fileName && (
            <span className="text-muted-foreground">in {fileName}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/50"
          >
            Dismiss
          </button>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="max-h-48 overflow-y-auto border-t"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {issues.map((issue, idx) => (
              <motion.div
                key={idx}
                className="flex items-start gap-2 px-3 py-1 text-[11px] border-b border-border/30 last:border-b-0 hover:bg-muted/20"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                {issue.severity === "error" ? (
                  <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground shrink-0">
                      Ln {issue.line}
                    </span>
                    <span className="text-foreground/90">{issue.message}</span>
                  </div>
                  {issue.context && (
                    <div className="font-mono text-[10px] text-muted-foreground/60 truncate mt-0.5">
                      {issue.context}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
