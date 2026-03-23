import { useMemo, useState } from "react";
import { AlertTriangle, FileWarning, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ValidationIssue } from "@/lib/xml-validator";

interface WarningsDockProps {
  issues: ValidationIssue[];
  fileName?: string;
  onDismiss: () => void;
  placement?: "floating" | "footer";
}

export function WarningsDock({ issues, fileName, onDismiss, placement = "floating" }: WarningsDockProps) {
  const [open, setOpen] = useState(false);

  const { errors, warnings } = useMemo(() => {
    const groupedErrors = issues.filter((issue) => issue.severity === "error");
    const groupedWarnings = issues.filter((issue) => issue.severity === "warning");
    return { errors: groupedErrors, warnings: groupedWarnings };
  }, [issues]);

  if (!issues.length) return null;

  const hasErrors = errors.length > 0;
  const summary = `${errors.length} error${errors.length === 1 ? "" : "s"}${errors.length && warnings.length ? ", " : ""}${warnings.length} warning${warnings.length === 1 ? "" : "s"}`;
  const Icon = hasErrors ? XCircle : AlertTriangle;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={placement === "floating" ? "icon-sm" : "icon-xs"}
            className={placement === "floating" ? "h-9 w-9 border border-border/80 bg-card/90 hover:bg-accent" : "h-4 w-4 text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"}
            onClick={() => setOpen(true)}
            aria-label={summary}
          >
            <Icon className={hasErrors ? "text-destructive" : "text-primary"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={placement === "floating" ? "left" : "top"}>{summary}</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-border/80 bg-card p-0 shadow-sm" showCloseButton={false}>
          <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <p className="panel-label">Validation</p>
                  <Badge variant={hasErrors ? "destructive" : "default"}>{summary}</Badge>
                </div>
                <DialogTitle className="flex items-center gap-2 text-base font-medium text-card-foreground">
                  <FileWarning className="size-4 text-primary" />
                  Review import issues
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {fileName ? `Source: ${fileName}` : "The active workspace contains issues that need attention."}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onDismiss}>
                  Dismiss issues
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2 p-4">
              {issues.map((issue, index) => {
                const IssueIcon = issue.severity === "error" ? XCircle : AlertTriangle;
                const badgeVariant = issue.severity === "error" ? "destructive" : "default";

                return (
                  <div key={`${issue.message}-${index}`} className="surface-panel flex items-start gap-3 px-4 py-3">
                    <IssueIcon className={issue.severity === "error" ? "mt-0.5 size-4 text-destructive" : "mt-0.5 size-4 text-primary"} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={badgeVariant}>{issue.severity}</Badge>
                        <span className="text-xs text-muted-foreground">Line {issue.line}</span>
                      </div>
                      <p className="text-sm text-card-foreground">{issue.message}</p>
                      {issue.context ? <p className="text-xs text-muted-foreground">{issue.context}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
