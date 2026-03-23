import { useMemo, useState } from "react";
import { Check, Copy, Download, Plus, RotateCcw, Upload } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GenerateProjectDialog } from "@/components/layout/GenerateProjectDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const vehicles = useMetaStore((state) => state.vehicles);
  const activeTab = useMetaStore((state) => state.activeTab);
  const startNewProject = useMetaStore((state) => state.startNewProject);
  const uiView = useMetaStore((state) => state.uiView);

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
      <div className="fixed left-0 right-0 top-11 z-30 px-3 py-2">
        <Card className="rounded-xl border-border/70 bg-card/95 py-0 shadow-sm">
          <CardContent className="flex items-center gap-2 px-3 py-2">
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={onOpenFile}>
              <Upload className="size-3.5" />
              Import
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setResetOpen(true)}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={handleCopy} disabled={!hasVehicles}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Copy
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={onSaveFile} disabled={!hasVehicles}>
              <Download className="size-3.5" />
              Download
            </Button>
            <Button type="button" size="sm" className="ml-auto gap-1 text-xs" onClick={() => setGenerateOpen(true)}>
              <Plus className="size-3.5" />
              New
            </Button>
          </CardContent>
        </Card>
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
