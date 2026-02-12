import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import type { ValidationIssue } from "@/lib/xml-validator";
import { WarningsDock } from "./WarningsDock";

const allTypes: MetaFileType[] = ["handling", "vehicles", "carcols", "modkits", "carvariations", "vehiclelayouts"];

interface StatusBarProps {
  workspacePath?: string | null;
  workspaceMetaFileCount?: number;
  validationIssues?: ValidationIssue[];
  validationFileName?: string;
  onDismissValidation?: () => void;
}

export const StatusBar = memo(function StatusBar({
  workspacePath,
  workspaceMetaFileCount = 0,
  validationIssues,
  validationFileName,
  onDismissValidation,
}: StatusBarProps) {
  const vehicles = useMetaStore((s) => s.vehicles);
  const filePath = useMetaStore((s) => s.filePath);
  const isDirty = useMetaStore((s) => s.isDirty);
  const lastAutoSavedAt = useMetaStore((s) => s.lastAutoSavedAt);
  const activeTab = useMetaStore((s) => s.activeTab);
  const activeVehicleId = useMetaStore((s) => s.activeVehicleId);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;

  const count = Object.keys(vehicles).length;
  const workspaceName = workspacePath?.split(/[/\\]/).pop();

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
    <div className="flex items-center justify-between px-3 py-1 border-t border-[#131a2b] bg-[#050d21] text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        {workspaceName && (
          <span className="text-primary/80">
            Workspace: {workspaceName} ({workspaceMetaFileCount} files)
          </span>
        )}
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
        {validationIssues && validationIssues.length > 0 && onDismissValidation && (
          <WarningsDock
            issues={validationIssues}
            fileName={validationFileName}
            onDismiss={onDismissValidation}
            placement="footer"
          />
        )}
        <AnimatePresence>
          {isDirty && (
            <motion.span
              className="text-yellow-400 font-semibold"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [1, 0.5, 1], scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.2 } }}
            >
              ● UNSAVED CHANGES
            </motion.span>
          )}
        </AnimatePresence>
        {lastAutoSavedAt && (
          <span className="text-[10px] text-muted-foreground/80">
            Auto-saved {new Date(lastAutoSavedAt).toLocaleTimeString()}
          </span>
        )}
        <span className="truncate max-w-[300px]" title={filePath ?? undefined}>
          {pathDisplay}
        </span>
      </div>
    </div>
  );
});
