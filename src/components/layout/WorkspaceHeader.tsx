import { memo } from "react";

import { VehicleDropdown } from "@/components/VehicleDropdown";

export const WorkspaceHeader = memo(function WorkspaceHeader() {
  return (
    <div className="border-b border-slate-700/25 bg-[#050d21] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
          <p className="text-[11px] text-slate-400">Create, copy, or remove vehicle entries from here.</p>
        </div>
        <VehicleDropdown hideSelector />
      </div>
    </div>
  );
});
