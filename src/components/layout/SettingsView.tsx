import { useEffect, useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { SquareToggle } from "@/components/SquareToggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMetaStore } from "@/store/meta-store";
import {
  ArchiveX,
  PanelLeft,
  FileClock,
  Code2,
  PencilLine,
  Trash2,
} from "lucide-react";

interface SettingsViewProps {
  onClearSession?: () => void;
}

export function SettingsView({
  onClearSession,
}: SettingsViewProps) {
  const sidebarCollapsed = useMetaStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useMetaStore((s) => s.setSidebarCollapsed);
  const codePreviewVisible = useMetaStore((s) => s.codePreviewVisible);
  const setCodePreviewVisible = useMetaStore((s) => s.setCodePreviewVisible);
  const editorEditMode = useMetaStore((s) => s.editorEditMode);
  const toggleEditorEditMode = useMetaStore((s) => s.toggleEditorEditMode);
  const recentFiles = useMetaStore((s) => s.recentFiles);
  const clearRecentFiles = useMetaStore((s) => s.clearRecentFiles);
  const [appVersion, setAppVersion] = useState<string>("…");

  useEffect(() => {
    let active = true;

    getVersion()
      .then((version) => {
        if (!active) return;
        setAppVersion(version);
      })
      .catch(() => {
        if (!active) return;
        setAppVersion("unknown");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto bg-background font-sans text-foreground">
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your interface preferences and manage local session data.
            </p>
          </div>

          <div className="space-y-8">
            {/* Interface Section */}
            <section className="space-y-4">
              <SectionHeader title="Interface" />
              <div className="divide-y divide-border rounded-md border border-border bg-card">
                <SettingRow
                  icon={<PanelLeft className="size-4" />}
                  title="Compact Sidebar"
                  description="Minimize the navigation rail to icons only."
                  control={
                    <SquareToggle
                      checked={sidebarCollapsed}
                      onCheckedChange={setSidebarCollapsed}
                      ariaLabel="Compact Sidebar"
                      variant="slider"
                    />
                  }
                />
                <SettingRow
                  icon={<Code2 className="size-4" />}
                  title="Live Code Preview"
                  description="Display the generated XML output alongside the editor."
                  control={
                    <SquareToggle
                      checked={codePreviewVisible}
                      onCheckedChange={setCodePreviewVisible}
                      ariaLabel="Live Code Preview"
                      variant="slider"
                    />
                  }
                />
                <SettingRow
                  icon={<PencilLine className="size-4" />}
                  title="Direct Edit Mode"
                  description="Enable manual editing of the XML code panel."
                  control={
                    <SquareToggle
                      checked={editorEditMode}
                      onCheckedChange={(checked) => {
                        if (checked !== editorEditMode) toggleEditorEditMode();
                      }}
                      ariaLabel="Direct Edit Mode"
                      variant="slider"
                    />
                  }
                />
              </div>
            </section>

            {/* Session Section */}
            <section className="space-y-4">
              <SectionHeader title="Session Data" />
              <div className="rounded-md border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileClock className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium">Recent file history</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{recentFiles.length} entries stored locally</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={clearRecentFiles}
                    >
                      <Trash2 className="size-3.5 mr-1" /> Clear History
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={onClearSession}
                    >
                      <ArchiveX className="size-3.5 mr-1" /> Reset Session
                    </Button>
                  </div>
                </div>

                <Separator className="bg-border" />

                <p className="text-xs text-muted-foreground">
                  Clearing history only removes recent-file entries. Resetting session clears the full local workspace snapshot.
                </p>
              </div>
            </section>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-border flex items-center justify-end text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Cortex Metagen v{appVersion}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{title}</h3>
  );
}

interface SettingRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  control: ReactNode;
}

function SettingRow({ icon, title, description, control }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between p-4 transition-colors hover:bg-muted/20">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded bg-muted/20 border border-border">
          {icon}
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium leading-none">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
