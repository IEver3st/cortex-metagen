import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WorkspaceUnsavedBannerProps {
  open: boolean;
  workspaceName: string | null;
  onDismiss: () => void;
}

export const WorkspaceUnsavedBanner = memo(function WorkspaceUnsavedBanner({
  open,
  workspaceName,
  onDismiss,
}: WorkspaceUnsavedBannerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed left-4 right-4 top-14 z-40">
      <Card className="border-border/70 bg-card/95 py-0 shadow-sm">
        <CardContent className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Session restored
            </div>
            <div className="truncate text-sm text-foreground">
              Restored {workspaceName ?? "workspace"} with unsaved changes.
            </div>
          </div>
          <Button type="button" variant="outline" size="xs" onClick={onDismiss}>
            Dismiss
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});
