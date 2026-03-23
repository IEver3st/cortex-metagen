import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  FileWarning,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { ValidationIssue } from "@/lib/xml-validator";

interface ProblemsGroup {
  fileName: string;
  issues: ValidationIssue[];
  worstSeverity: "error" | "warning" | "info";
}

interface ProblemsPanelProps {
  issues: ValidationIssue[];
  fileName?: string;
  onDismiss?: () => void;
  /** Called when user clicks on a specific issue. Receives the issue for navigation. */
  onClickIssue?: (issue: ValidationIssue) => void;
  /** Whether the panel is visible. */
  visible: boolean;
  /** Toggle panel visibility. */
  onToggleVisible?: () => void;
}

const severityIcon: Record<string, typeof AlertTriangle> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityAccent: Record<string, string> = {
  error: "border-l-red-500/50 hover:border-l-red-400 bg-red-500/[0.02] hover:bg-red-500/[0.05]",
  warning: "border-l-amber-500/50 hover:border-l-amber-400 bg-amber-500/[0.02] hover:bg-amber-500/[0.05]",
  info: "border-l-sky-500/50 hover:border-l-sky-400 bg-sky-500/[0.02] hover:bg-sky-500/[0.05]",
};

const severityTextColor: Record<string, string> = {
  error: "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.4)]",
  warning: "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]",
  info: "text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]",
};

const severityDot: Record<string, string> = {
  error: "bg-red-500 shadow-[0_0_6px_rgba(248,113,113,0.6)]",
  warning: "bg-amber-500 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
  info: "bg-sky-500 shadow-[0_0_6px_rgba(56,189,248,0.6)]",
};

const severityBadge: Record<string, string> = {
  error: "bg-red-500/10 border-red-500/20 text-red-400",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  info: "bg-sky-500/10 border-sky-500/20 text-sky-400",
};

function worstOf(issues: ValidationIssue[]): "error" | "warning" | "info" {
  let hasError = false;
  let hasWarning = false;
  for (const issue of issues) {
    if (issue.severity === "error") hasError = true;
    else if (issue.severity === "warning") hasWarning = true;
  }
  if (hasError) return "error";
  if (hasWarning) return "warning";
  return "info";
}

export const ProblemsPanel = memo(function ProblemsPanel({
  issues,
  fileName = "Workspace",
  onDismiss,
  onClickIssue,
  visible,
  onToggleVisible,
}: ProblemsPanelProps) {
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let infos = 0;
    for (const issue of issues) {
      if (issue.severity === "error") errors++;
      else if (issue.severity === "warning") warnings++;
      else infos++;
    }
    return { errors, warnings, infos, total: issues.length };
  }, [issues]);

  const groups = useMemo<ProblemsGroup[]>(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      const match = issue.message.match(/^\[([^\]]+)\]\s*/);
      const key = match ? match[1] : fileName;
      const existing = map.get(key) ?? [];
      existing.push(issue);
      map.set(key, existing);
    }
    return [...map.entries()].map(([name, fileIssues]) => ({
      fileName: name,
      issues: fileIssues,
      worstSeverity: worstOf(fileIssues),
    }));
  }, [issues, fileName]);

  const toggleFile = (file: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  if (!visible || issues.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="border-t border-primary/20 bg-background/95 backdrop-blur shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.5)] z-40 relative"
    >
      {/* Sleek Header */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <button
          type="button"
          className="flex items-center gap-3 text-[11px] font-bold tracking-widest text-primary/70 hover:text-primary transition-colors uppercase"
          onClick={onToggleVisible}
        >
          <FileWarning className="size-3.5" />
          <span>Problems</span>

          <div className="flex gap-1.5 ml-1">
            {counts.errors > 0 && (
              <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tabular-nums", severityBadge.error)}>
                <span className={cn("size-1.5 rounded-full", severityDot.error)} />
                {counts.errors}
              </span>
            )}
            {counts.warnings > 0 && (
              <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tabular-nums", severityBadge.warning)}>
                <span className={cn("size-1.5 rounded-full", severityDot.warning)} />
                {counts.warnings}
              </span>
            )}
            {counts.infos > 0 && (
              <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tabular-nums", severityBadge.info)}>
                <span className={cn("size-1.5 rounded-full", severityDot.info)} />
                {counts.infos}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-primary/20 transition-all hover:scale-105"
          onClick={onDismiss}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Issue list */}
      <ScrollArea className="max-h-[220px]">
        <div className="py-2 px-1">
          {groups.map((group) => {
            const isCollapsed = collapsedFiles.has(group.fileName);
            return (
              <div key={group.fileName} className="mb-1">
                {/* File header */}
                <button
                  type="button"
                  className="group flex items-center gap-2.5 w-[calc(100%-0.5rem)] mx-1 px-3 py-1.5 text-xs rounded-md hover:bg-primary/10 transition-colors"
                  onClick={() => toggleFile(group.fileName)}
                >
                  <span className={cn(
                    "transition-transform duration-200",
                    isCollapsed ? "rotate-0" : "rotate-90"
                  )}>
                    <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </span>
                  <span className={cn("size-2 rounded-full shrink-0", severityDot[group.worstSeverity])} />
                  <span className="font-semibold text-slate-300 group-hover:text-primary-foreground transition-colors tracking-wide">
                    {group.fileName}
                  </span>
                  <span className="ml-auto flex items-center justify-center min-w-5 h-5 px-1 bg-background/50 border border-border/50 rounded text-[10px] font-mono text-muted-foreground">
                    {group.issues.length}
                  </span>
                </button>

                {/* Issues */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1 mt-1 pb-2">
                        {group.issues.map((issue, idx) => {
                          const Icon = severityIcon[issue.severity] ?? Info;
                          const textColor = severityTextColor[issue.severity] ?? "text-slate-400";
                          const accent = severityAccent[issue.severity] ?? "border-l-slate-600";

                          const displayMessage = issue.message.replace(
                            /^\[[^\]]+\]\s*/,
                            ""
                          );

                          return (
                            <button
                              type="button"
                              key={`${group.fileName}-${idx}`}
                              className={cn(
                                "group/issue relative flex items-start gap-3 w-[calc(100%-2rem)] ml-8 mr-2 px-4 py-2 text-xs text-left",
                                "border-l-2 rounded-md shadow-sm",
                                accent,
                                "transition-all duration-200 cursor-pointer"
                              )}
                              onClick={() => onClickIssue?.(issue)}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent opacity-0 group-hover/issue:opacity-100 transition-opacity rounded-r-md pointer-events-none" />
                              <Icon
                                className={cn("size-3.5 mt-0.5 shrink-0 transition-transform group-hover/issue:scale-110", textColor)}
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-slate-200 font-medium leading-relaxed group-hover/issue:text-white transition-colors">
                                  {displayMessage}
                                </span>
                                {issue.context && (
                                  <p className="text-[10px] text-slate-400 mt-1 truncate leading-relaxed">
                                    {issue.context}
                                  </p>
                                )}
                              </div>
                              {issue.line > 0 && (
                                <span className="text-[10px] text-slate-500 font-mono shrink-0 mt-0.5 group-hover/issue:text-primary transition-colors bg-background/50 px-1.5 py-0.5 rounded border border-border/40">
                                  Ln {issue.line}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </motion.div>
  );
});
