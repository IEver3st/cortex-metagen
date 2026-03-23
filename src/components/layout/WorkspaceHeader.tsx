import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { VehicleDropdown } from "@/components/VehicleDropdown";

export const WorkspaceHeader = memo(function WorkspaceHeader() {
  return (
    <div className="border-b border-border/70 bg-card/80 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="panel-label">Workspace</p>
            <Badge variant="outline">Vehicle manager</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Create, copy, and remove vehicle entries without leaving the active layout.
          </p>
        </div>
        <VehicleDropdown hideSelector />
      </div>
    </div>
  );
});
