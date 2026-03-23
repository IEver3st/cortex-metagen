import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WorkspaceRestoreBannerProps {
  open: boolean;
  workspaceName: string;
  onDismiss: () => void;
}

export const WorkspaceRestoreBanner = memo(function WorkspaceRestoreBanner({
  open,
  workspaceName,
  onDismiss,
}: WorkspaceRestoreBannerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed right-4 top-14 z-40">
      <Card className="border-border/70 bg-card/95 py-0 shadow-sm">
        <CardContent className="flex items-center gap-3 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
              Restored session
            </div>
            <div className="truncate text-xs text-foreground">
              Unsaved changes reopened in {workspaceName}
            </div>
          </div>
          <Button variant="ghost" size="xs" onClick={onDismiss}>
            Dismiss
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});
