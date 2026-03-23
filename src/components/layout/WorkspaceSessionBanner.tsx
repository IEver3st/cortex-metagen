import { memo } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WorkspaceSessionBannerProps {
  open: boolean;
  workspaceName: string | null;
  onDismiss: () => void;
}

export const WorkspaceSessionBanner = memo(function WorkspaceSessionBanner({
  open,
  workspaceName,
  onDismiss,
}: WorkspaceSessionBannerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-4">
      <Card className="pointer-events-auto border-border/70 bg-card/95 py-0 shadow-sm">
        <CardContent className="flex items-center gap-3 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Restored unsaved workspace{workspaceName ? ` | ${workspaceName}` : ""}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label="Dismiss restored workspace banner"
          >
            <X className="size-3" strokeWidth={1.5} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});
