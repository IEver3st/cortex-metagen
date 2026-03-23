import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ValidationIssue } from "@/lib/xml-validator";

interface ValidationPanelProps {
  issues: ValidationIssue[];
  fileName?: string;
  onDismiss: () => void;
}

export function ValidationPanel({ issues, fileName, onDismiss }: ValidationPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  if (!issues.length) return null;

  return (
    <motion.div
      className="border-b border-border/70 bg-card"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Button
        variant="ghost"
        className="flex h-auto w-full items-center justify-between rounded-none px-4 py-3 hover:bg-accent"
        onClick={() => setExpanded((current) => !current)}
      >
        <div className="flex min-w-0 items-center gap-3 text-left">
          {errors.length ? <XCircle className="size-4 text-destructive" /> : <AlertTriangle className="size-4 text-primary" />}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {errors.length ? <Badge variant="destructive">{errors.length} errors</Badge> : null}
              {warnings.length ? <Badge variant="default">{warnings.length} warnings</Badge> : null}
            </div>
            {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="xs" onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}>
            Dismiss
          </Button>
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </Button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ScrollArea className="max-h-48 border-t border-border/70">
              <div className="space-y-2 p-3">
                {issues.map((issue, index) => {
                  const IssueIcon = issue.severity === "error" ? XCircle : AlertTriangle;
                  const badgeVariant = issue.severity === "error" ? "destructive" : "default";

                  return (
                    <div key={`${issue.message}-${index}`} className="surface-panel flex items-start gap-3 px-3 py-3">
                      <IssueIcon className={issue.severity === "error" ? "mt-0.5 size-4 text-destructive" : "mt-0.5 size-4 text-primary"} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={badgeVariant}>{issue.severity}</Badge>
                          <span className="text-[10px] text-muted-foreground">Line {issue.line}</span>
                        </div>
                        <p className="text-sm text-card-foreground">{issue.message}</p>
                        {issue.context ? <p className="truncate text-xs text-muted-foreground">{issue.context}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
