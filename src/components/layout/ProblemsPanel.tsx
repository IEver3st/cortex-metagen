import { memo, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronRight, FileWarning, X, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ValidationIssue } from "@/lib/xml-validator";

interface ProblemsGroup {
  fileName: string;
  issues: ValidationIssue[];
  worstSeverity: "error" | "warning";
}

interface ProblemsPanelProps {
  issues: ValidationIssue[];
  fileName?: string;
  onDismiss?: () => void;
  onClickIssue?: (issue: ValidationIssue) => void;
  visible: boolean;
  onToggleVisible?: () => void;
}

const severityIcon: Record<ValidationIssue["severity"], typeof AlertTriangle> = {
  error: XCircle,
  warning: AlertTriangle,
};

const severityConfig = {
  error: {
    dot: "bg-destructive",
    text: "text-destructive",
    badge: "destructive" as const,
  },
  warning: {
    dot: "bg-primary",
    text: "text-primary",
    badge: "default" as const,
  },
};

function worstOf(issues: ValidationIssue[]): "error" | "warning" {
  if (issues.some((issue) => issue.severity === "error")) return "error";
  return "warning";
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

    for (const issue of issues) {
      if (issue.severity === "error") errors += 1;
      else if (issue.severity === "warning") warnings += 1;
    }

    return { errors, warnings, total: issues.length };
  }, [issues]);

  const groups = useMemo<ProblemsGroup[]>(() => {
    const grouped = new Map<string, ValidationIssue[]>();

    for (const issue of issues) {
      const match = issue.message.match(/^\[([^\]]+)\]\s*/);
      const key = match ? match[1] : fileName;
      const existing = grouped.get(key) ?? [];
      existing.push(issue);
      grouped.set(key, existing);
    }

    return [...grouped.entries()].map(([name, fileIssues]) => ({
      fileName: name,
      issues: fileIssues,
      worstSeverity: worstOf(fileIssues),
    }));
  }, [issues, fileName]);

  if (!issues.length) return null;

  const worstOverall = counts.errors > 0 ? "error" : "warning";
  const worstConfig = severityConfig[worstOverall];

  const toggleFile = (nextFile: string) => {
    setCollapsedFiles((state) => {
      const next = new Set(state);
      if (next.has(nextFile)) next.delete(nextFile);
      else next.add(nextFile);
      return next;
    });
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="relative z-40 overflow-hidden border-t border-border/70 bg-card/95 shadow-sm"
    >
      {!visible ? (
        <button
          type="button"
          onClick={onToggleVisible}
          className="flex h-7 w-full items-center gap-2 px-3 text-[11px] font-medium tracking-[0.08em] uppercase transition-colors hover:bg-muted/30"
        >
          <span className={cn("size-2 rounded-full", worstConfig.dot)} />
          <span className={cn(worstConfig.text)}>{counts.errors + counts.warnings} problems</span>
          <div className="ml-auto flex items-center gap-1">
            {counts.errors > 0 ? <Badge variant="destructive">{counts.errors} errors</Badge> : null}
            {counts.warnings > 0 ? <Badge variant="default">{counts.warnings} warnings</Badge> : null}
          </div>
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}>
          <div className="flex h-10 items-center justify-between border-b border-border/60 px-3">
            <div className="flex items-center gap-2 text-xs">
              <FileWarning className={cn("size-3.5", worstConfig.text)} />
              <span className="font-medium">Problems</span>
              {counts.errors > 0 ? <Badge variant="destructive">{counts.errors} errors</Badge> : null}
              {counts.warnings > 0 ? <Badge variant="default">{counts.warnings} warnings</Badge> : null}
            </div>

            <div className="flex items-center gap-2">
              {onDismiss ? (
                <Button variant="ghost" size="xs" onClick={onDismiss} className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground">
                  Dismiss
                </Button>
              ) : null}
              {onToggleVisible ? (
                <Button variant="ghost" size="icon-xs" onClick={onToggleVisible} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </div>

          <ScrollArea className="max-h-[18rem]">
            <div className="space-y-1 p-1.5">
              {groups.map((group) => {
                const isCollapsed = collapsedFiles.has(group.fileName);
                const groupConfig = severityConfig[group.worstSeverity];

                return (
                  <div key={group.fileName} className="rounded-lg border border-border/60 bg-muted/20">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start gap-2 rounded-b-none rounded-t-lg px-2.5 text-left text-[11px]"
                      onClick={() => toggleFile(group.fileName)}
                    >
                      <ChevronRight className={cn("size-3 transition-transform", !isCollapsed && "rotate-90", groupConfig.text)} />
                      <span className={cn("size-1.5 rounded-full", groupConfig.dot)} />
                      <span className="truncate font-medium text-foreground/90">{group.fileName}</span>
                      <Badge variant={groupConfig.badge} className="ml-auto">{group.issues.length}</Badge>
                    </Button>

                    <AnimatePresence initial={false}>
                      {!isCollapsed ? (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="border-t border-border/50"
                        >
                          {group.issues.map((issue, index) => {
                            const Icon = severityIcon[issue.severity];
                            const issueConfig = severityConfig[issue.severity];
                            const displayMessage = issue.message.replace(/^\[[^\]]+\]\s*/, "");

                            return (
                              <Button
                                type="button"
                                key={`${group.fileName}-${index}`}
                                variant="ghost"
                                size="sm"
                                className="h-auto w-full items-start justify-start gap-2 rounded-none px-2.5 py-2 text-left text-[11px] last:rounded-b-lg hover:bg-accent/60"
                                onClick={() => onClickIssue?.(issue)}
                              >
                                <Icon className={cn("mt-0.5 size-3 shrink-0", issueConfig.text)} />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <span className="block truncate leading-relaxed text-foreground/90">{displayMessage}</span>
                                  {issue.context ? (
                                    <span className="block truncate font-mono text-[10px] text-muted-foreground">{issue.context}</span>
                                  ) : null}
                                </div>
                                {issue.line > 0 ? <Badge variant="outline">Ln {issue.line}</Badge> : null}
                              </Button>
                            );
                          })}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </motion.div>
  );
});
