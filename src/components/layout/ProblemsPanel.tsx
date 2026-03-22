import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { ValidationIssue } from "@/lib/xml-validator";

interface ProblemsGroup {
  fileName: string;
  issues: ValidationIssue[];
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

const severityColor: Record<string, string> = {
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

const severityBg: Record<string, string> = {
  error: "bg-red-500/10 border-red-500/20",
  warning: "bg-yellow-500/10 border-yellow-500/20",
  info: "bg-blue-500/10 border-blue-500/20",
};

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
      // Try to extract file name from message prefix like "[filename.meta] ..."
      const match = issue.message.match(/^\[([^\]]+)\]\s*/);
      const key = match ? match[1] : fileName;
      const existing = map.get(key) ?? [];
      existing.push(issue);
      map.set(key, existing);
    }
    return [...map.entries()].map(([name, fileIssues]) => ({
      fileName: name,
      issues: fileIssues,
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
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="border-t border-[#131a2b] bg-[#050d21]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#131a2b]">
        <button
          type="button"
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          onClick={onToggleVisible}
        >
          <span>PROBLEMS</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#1b2c47] text-slate-400">
            {counts.total}
          </span>
          {counts.errors > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <XCircle className="size-3" />
              {counts.errors}
            </span>
          )}
          {counts.warnings > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-400">
              <AlertTriangle className="size-3" />
              {counts.warnings}
            </span>
          )}
          {counts.infos > 0 && (
            <span className="flex items-center gap-0.5 text-blue-400">
              <Info className="size-3" />
              {counts.infos}
            </span>
          )}
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 text-slate-500 hover:text-slate-300"
          onClick={onDismiss}
        >
          <X className="size-3" />
        </Button>
      </div>

      {/* Issue list */}
      <ScrollArea className="max-h-[200px]">
        <div className="px-2 py-1 space-y-0.5">
          {groups.map((group) => {
            const isCollapsed = collapsedFiles.has(group.fileName);
            return (
              <div key={group.fileName}>
                {/* File header */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 w-full px-1 py-1 rounded text-xs text-slate-300 hover:bg-[#14233b] transition-colors"
                  onClick={() => toggleFile(group.fileName)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3 text-slate-500" />
                  ) : (
                    <ChevronDown className="size-3 text-slate-500" />
                  )}
                  <span className="font-medium">{group.fileName}</span>
                  <span className="ml-auto text-[10px] text-slate-500">
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
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      {group.issues.map((issue, idx) => {
                        const Icon =
                          severityIcon[issue.severity] ?? Info;
                        const color =
                          severityColor[issue.severity] ?? "text-slate-400";

                        // Strip the "[filename]" prefix from the message for display
                        const displayMessage = issue.message.replace(
                          /^\[[^\]]+\]\s*/,
                          ""
                        );

                        return (
                          <button
                            type="button"
                            key={`${group.fileName}-${idx}`}
                            className={cn(
                              "flex items-start gap-2 w-full px-3 py-1 ml-4 rounded text-xs text-left",
                              "hover:bg-[#14233b] transition-colors cursor-pointer"
                            )}
                            onClick={() => onClickIssue?.(issue)}
                          >
                            <Icon
                              className={cn("size-3 mt-0.5 shrink-0", color)}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-slate-200">
                                {displayMessage}
                              </span>
                              {issue.context && (
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  {issue.context}
                                </p>
                              )}
                            </div>
                            {issue.line > 0 && (
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                Ln {issue.line}
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
