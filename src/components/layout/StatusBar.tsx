import { memo } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ValidationIssue } from "@/lib/xml-validator";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";

import { WarningsDock } from "./WarningsDock";

const ALL_TYPES: MetaFileType[] = ["handling", "vehicles", "carcols", "modkits", "carvariations", "vehiclelayouts"];

interface StatusBarProps {
  workspacePath?: string | null;
  workspaceMetaFileCount?: number;
  validationIssues?: ValidationIssue[];
  validationFileName?: string;
  onDismissValidation?: () => void;
  problemsPanelVisible?: boolean;
  onToggleProblemsPanel?: () => void;
}

function SegmentSeparator() {
  return <span className="status-separator">|</span>;
}

export const StatusBar = memo(function StatusBar({
  workspacePath,
  workspaceMetaFileCount = 0,
  validationIssues,
  validationFileName,
  onDismissValidation,
  problemsPanelVisible = true,
  onToggleProblemsPanel,
}: StatusBarProps) {
  const vehicles = useMetaStore((state) => state.vehicles);
  const filePath = useMetaStore((state) => state.filePath);
  const isDirty = useMetaStore((state) => state.isDirty);
  const lastAutoSavedAt = useMetaStore((state) => state.lastAutoSavedAt);
  const activeTab = useMetaStore((state) => state.activeTab);
  const activeVehicleId = useMetaStore((state) => state.activeVehicleId);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;

  const workspaceName = workspacePath?.split(/[/\\]/).pop();
  const vehicleCount = Object.keys(vehicles).length;
  const pathDisplay = filePath
    ? (() => {
        const parts = filePath.replace(/\\/g, "/").split("/");
        if (parts.length <= 2) return filePath;
        return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
      })()
    : "No file open";

  return (
    <div className="flex h-5 items-center justify-between gap-3 border-t border-primary/25 bg-primary px-3 font-display text-[9px] tracking-[0.08em] text-primary-foreground">
      <div className="flex min-w-0 items-center gap-1 uppercase">
        {workspaceName ? (
          <>
            <span className="truncate">{workspaceName}</span>
            <SegmentSeparator />
            <span>{workspaceMetaFileCount} files</span>
            <SegmentSeparator />
          </>
        ) : null}
        <span>{vehicleCount} vehicles</span>
        <SegmentSeparator />
        <span>{activeTab}.meta</span>
        {activeVehicle ? (
          <>
            <SegmentSeparator />
            <div className="flex items-center gap-1 normal-case tracking-normal">
              {ALL_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={activeVehicle.loadedMeta?.has(type) ? "outline" : "secondary"}
                  className="border-primary-foreground/25 bg-transparent px-1.5 py-0 text-[9px] font-medium tracking-[0.08em] text-primary-foreground/90"
                >
                  {type}
                </Badge>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-1 uppercase">
        {validationIssues && validationIssues.length > 0 && onDismissValidation ? (
          <WarningsDock
            issues={validationIssues}
            fileName={validationFileName}
            onDismiss={onDismissValidation}
            placement="footer"
          />
        ) : null}

        {validationIssues && validationIssues.length > 0 && onToggleProblemsPanel ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-4 w-auto px-1 text-[9px] tracking-[0.08em] text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"
            onClick={onToggleProblemsPanel}
          >
            {problemsPanelVisible ? "Hide" : "Show"} problems
          </Button>
        ) : null}

        <AnimatePresence>
          {isDirty ? (
            <motion.span
              className="text-primary-foreground"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: [1, 0.65, 1], y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" }, y: { duration: 0.18 } }}
            >
              UNSAVED
            </motion.span>
          ) : null}
        </AnimatePresence>

        {lastAutoSavedAt ? (
          <>
            <SegmentSeparator />
            <span>Auto-saved {new Date(lastAutoSavedAt).toLocaleTimeString()}</span>
          </>
        ) : null}

        <SegmentSeparator />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-72 truncate normal-case tracking-normal text-primary-foreground/90">
              {pathDisplay}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{filePath ?? pathDisplay}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});
