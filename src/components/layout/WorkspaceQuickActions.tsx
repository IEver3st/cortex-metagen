import { useMemo, useState } from "react";
import { Check, Copy, Download, Plus, RotateCcw, Upload } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GenerateProjectDialog } from "@/components/layout/GenerateProjectDialog";
import { Button } from "@/components/ui/button";
import { serializeActiveTab } from "@/lib/xml-serializer";
import { useMetaStore } from "@/store/meta-store";

interface WorkspaceQuickActionsProps {
  onOpenFile?: () => void;
  onSaveFile?: () => void;
}

export function WorkspaceQuickActions({
  onOpenFile,
  onSaveFile,
}: WorkspaceQuickActionsProps) {
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeTab = useMetaStore((s) => s.activeTab);
  const startNewProject = useMetaStore((s) => s.startNewProject);
  const uiView = useMetaStore((s) => s.uiView);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);
  const hasVehicles = vehicleList.length > 0;

  if (uiView !== "workspace") {
    return null;
  }

  const handleCopy = async () => {
    if (!hasVehicles) return;
    await navigator.clipboard.writeText(serializeActiveTab(activeTab, vehicleList));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <div className="fixed left-0 right-0 top-11 z-30 flex items-center gap-2 border-b border-border/40 bg-[#071224]/95 px-3 py-2 backdrop-blur-sm">
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onOpenFile}>
          <Upload className="size-3.5" /> Import
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setResetOpen(true)}>
          <RotateCcw className="size-3.5" /> Reset
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleCopy} disabled={!hasVehicles}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onSaveFile} disabled={!hasVehicles}>
          <Download className="size-3.5" /> Download
        </Button>
        <Button type="button" size="sm" className="ml-auto h-8 text-xs gap-1" onClick={() => setGenerateOpen(true)}>
          <Plus className="size-3.5" /> New
        </Button>
      </div>

      <GenerateProjectDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset current workspace?"
        description="This clears the current in-memory project and returns you to a clean start."
        confirmLabel="Reset Workspace"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => startNewProject()}
      />
    </>
  );
}
