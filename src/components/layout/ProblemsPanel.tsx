import { memo, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  XCircle,
  Info,
  ChevronUp,
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
  onClickIssue?: (issue: ValidationIssue) => void;
  visible: boolean;
  onToggleVisible?: () => void;
}

const severityIcon: Record<string, typeof AlertTriangle> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityConfig = {
  error: {
    dot: "bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.5)]",
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  warning: {
    dot: "bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  info: {
    dot: "bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
  },
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
  const [hovered, setHovered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const hasProblems = issues.length > 0;
  const worstOverall = useMemo(() => {
    if (counts.errors > 0) return "error";
    if (counts.warnings > 0) return "warning";
    return "info";
  }, [counts]);

  if (!hasProblems) return null;

  const config = severityConfig[worstOverall];

  const formatCount = (n: number) => n.toString().padStart(2, "0");

  return (
    <motion.div
      ref={panelRef}
      initial={false}
      animate={visible ? { height: "auto" } : { height: 28 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="border-t border-[#1a2744] bg-[#0a1628]/95 backdrop-blur-sm z-40 relative overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {!visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <button
              type="button"
              onClick={onToggleVisible}
              className="w-full h-full flex items-center px-3 gap-2 text-[11px] font-medium tracking-wide group"
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", config.dot)} />
                <span className={cn("font-semibold tracking-wider uppercase", config.text)}>
                  {counts.errors + counts.warnings} Problems
                </span>
              </div>

              <div className="flex items-center gap-1 ml-auto">
                {counts.errors > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25">
                    <XCircle className="size-3 text-red-400" />
                    <span className="text-[10px] font-mono text-red-300 tabular-nums">{formatCount(counts.errors)}</span>
                  </span>
                )}
                {counts.warnings > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25">
                    <AlertTriangle className="size-3 text-amber-400" />
                    <span className="text-[10px] font-mono text-amber-300 tabular-nums">{formatCount(counts.warnings)}</span>
                  </span>
                )}
              </div>

              <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors ml-2">
                {hovered ? "Click to expand" : ""}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between px-3 h-7 border-b border-[#1a2744] bg-[#0d1a2e]">
              <button
                type="button"
                onClick={onToggleVisible}
                className="flex items-center gap-2 text-[11px] font-medium tracking-wide group"
              >
                <FileWarning className="size-3.5 text-slate-500 group-hover:text-primary/80 transition-colors" />
                <span className="text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">
                  Problems
                </span>
                <div className="flex items-center gap-1 ml-1">
                  {counts.errors > 0 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25">
                      <span className="text-[10px] font-mono text-red-300 tabular-nums">{counts.errors}</span>
                    </span>
                  )}
                  {counts.warnings > 0 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25">
                      <span className="text-[10px] font-mono text-amber-300 tabular-nums">{counts.warnings}</span>
                    </span>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1">
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="inline-flex items-center justify-center size-5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 transition-all"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-[160px]">
              <div className="py-1 px-1 space-y-0.5">
                {groups.map((group) => {
                  const isCollapsed = collapsedFiles.has(group.fileName);
                  const groupConfig = severityConfig[group.worstSeverity];

                  return (
                    <div key={group.fileName}>
                      <button
                        type="button"
                        className="group w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-sm hover:bg-[#142238] transition-colors"
                        onClick={() => toggleFile(group.fileName)}
                      >
                        <span className={cn(
                          "transition-transform duration-150",
                          isCollapsed ? "rotate-0" : "rotate-90"
                        )}>
                          <ChevronUp className="size-3 text-slate-500 group-hover:text-slate-400 rotate-[-90deg]" />
                        </span>
                        <span className={cn("size-1.5 rounded-full shrink-0", groupConfig.dot)} />
                        <span className="font-medium text-slate-300 group-hover:text-slate-100 transition-colors truncate">
                          {group.fileName}
                        </span>
                        <span className={cn(
                          "ml-auto text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded",
                          groupConfig.bg, groupConfig.border, groupConfig.text
                        )}>
                          {group.issues.length}
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="ml-6 pl-1 border-l border-[#1a2744]">
                              {group.issues.map((issue, idx) => {
                                const Icon = severityIcon[issue.severity] ?? Info;
                                const issueConfig = severityConfig[issue.severity] ?? severityConfig.info;
                                const displayMessage = issue.message.replace(/^\[[^\]]+\]\s*/, "");

                                return (
                                  <button
                                    type="button"
                                    key={`${group.fileName}-${idx}`}
                                    className="group w-full flex items-start gap-2 px-2.5 py-1.5 text-[10px] text-left hover:bg-[#142238] transition-colors rounded-sm"
                                    onClick={() => onClickIssue?.(issue)}
                                  >
                                    <Icon className={cn("size-3 mt-0.5 shrink-0", issueConfig.text)} />
                                    <div className="min-w-0 flex-1">
                                      <span className="text-slate-300 group-hover:text-slate-100 transition-colors leading-relaxed block truncate">
                                        {displayMessage}
                                      </span>
                                      {issue.context && (
                                        <span className="text-[9px] text-slate-500 truncate block mt-0.5 font-mono">
                                          {issue.context}
                                        </span>
                                      )}
                                    </div>
                                    {issue.line > 0 && (
                                      <span className="text-[9px] text-slate-500 font-mono shrink-0 bg-[#0d1525] px-1 py-0.5 rounded border border-[#1a2744] group-hover:border-slate-600 transition-colors">
                                        Ln{issue.line}
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
        )}
      </AnimatePresence>
    </motion.div>
  );
});