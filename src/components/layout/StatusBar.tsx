import { memo } from "react";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";

const allTypes: MetaFileType[] = ["handling", "vehicles", "carcols", "modkits", "carvariations", "vehiclelayouts"];

export const StatusBar = memo(function StatusBar() {
  const vehicles = useMetaStore((s) => s.vehicles);
  const filePath = useMetaStore((s) => s.filePath);
  const isDirty = useMetaStore((s) => s.isDirty);
  const activeTab = useMetaStore((s) => s.activeTab);
  const activeVehicleId = useMetaStore((s) => s.activeVehicleId);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;

  const count = Object.keys(vehicles).length;

  // Show folder + filename for breadcrumb
  const pathDisplay = filePath
    ? (() => {
        const parts = filePath.replace(/\\/g, "/").split("/");
        if (parts.length <= 2) return filePath;
        const folder = parts[parts.length - 2];
        const file = parts[parts.length - 1];
        return `${folder}/${file}`;
      })()
    : "No file open";

  return (
    <div className="flex items-center justify-between px-3 py-1 border-t bg-card text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>
          {count} vehicle{count !== 1 ? "s" : ""}
        </span>
        <span className="uppercase">{activeTab}.meta</span>
        {activeVehicle && (
          <span className="flex items-center gap-1">
            {allTypes.map((t) => (
              <span
                key={t}
                className={`px-1 rounded ${activeVehicle.loadedMeta?.has(t) ? "text-foreground/70" : "text-muted-foreground/30 line-through"}`}
              >
                {t}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isDirty && (
          <span className="text-yellow-500 font-medium">● Unsaved</span>
        )}
        <span className="truncate max-w-[300px]" title={filePath ?? undefined}>
          {pathDisplay}
        </span>
      </div>
    </div>
  );
});
