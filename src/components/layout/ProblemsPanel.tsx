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
  error: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-sky-500",
};

const severityTextColor: Record<string, string> = {
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-sky-400",
};

const severityDot: Record<string, string> = {
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
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
      className="border-t border-[#0f1a2e] bg-[#060e1f]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-[#0f1a2e]">
        <button
          type="button"
          className="flex items-center gap-2.5 text-[11px] font-semibold tracking-wide text-slate-400 hover:text-slate-200 transition-colors uppercase"
          onClick={onToggleVisible}
        >
          <FileWarning className="size-3.5 text-slate-500" />
          <span>Problems</span>

          {counts.errors > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-px rounded-full bg-red-500/15 text-[10px] font-medium text-red-400 tabular-nums">
              <span className="size-1.5 rounded-full bg-red-500" />
              {counts.errors}
            </span>
          )}
          {counts.warnings > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-px rounded-full bg-amber-500/15 text-[10px] font-medium text-amber-400 tabular-nums">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {counts.warnings}
            </span>
          )}
          {counts.infos > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-px rounded-full bg-sky-500/15 text-[10px] font-medium text-sky-400 tabular-nums">
              <span className="size-1.5 rounded-full bg-sky-500" />
              {counts.infos}
            </span>
          )}
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center size-6 rounded text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors"
          onClick={onDismiss}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Issue list */}
      <ScrollArea className="max-h-[180px]">
        <div className="py-1">
          {groups.map((group) => {
            const isCollapsed = collapsedFiles.has(group.fileName);
            return (
              <div key={group.fileName}>
                {/* File header */}
                <button
                  type="button"
                  className="group flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-white/[0.03] transition-colors"
                  onClick={() => toggleFile(group.fileName)}
                >
                  <span className={cn(
                    "transition-transform duration-150",
                    isCollapsed ? "rotate-0" : "rotate-90"
                  )}>
                    <ChevronRight className="size-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </span>
                  <span className={cn("size-1.5 rounded-full shrink-0", severityDot[group.worstSeverity])} />
                  <span className="font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                    {group.fileName}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-slate-600">
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
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
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
                              "flex items-start gap-2.5 w-full ml-5 mr-2 px-3 py-1.5 text-xs text-left",
                              "border-l-2 rounded-r",
                              accent,
                              "hover:bg-white/[0.03] transition-colors cursor-pointer"
                            )}
                            onClick={() => onClickIssue?.(issue)}
                          >
                            <Icon
                              className={cn("size-3 mt-0.5 shrink-0", textColor)}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-slate-200 leading-relaxed">
                                {displayMessage}
                              </span>
                              {issue.context && (
                                <p className="text-[10px] text-slate-500/80 mt-0.5 truncate leading-relaxed">
                                  {issue.context}
                                </p>
                              )}
                            </div>
                            {issue.line > 0 && (
                              <span className="text-[10px] text-slate-600 font-mono shrink-0 mt-0.5">
                                :{issue.line}
                              </span>
                            )}
                          </button>
                        );
                      })}
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
