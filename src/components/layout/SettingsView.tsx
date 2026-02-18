import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getName, getVersion } from "@tauri-apps/api/app";
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

  const [appInfo, setAppInfo] = useState({ name: "", version: "" });

  useEffect(() => {
    Promise.all([getName(), getVersion()])
      .then(([name, version]) => setAppInfo({ name, version }))
      .catch(() => setAppInfo({ name: "Cortex Metagen", version: "" }));
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#040d1a] font-sans text-slate-100">
      <div className="px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-slate-500">
              Configure your interface preferences and manage local session data.
            </p>
          </div>

          <div className="space-y-8">
            {/* Interface Section */}
            <section className="space-y-4">
              <SectionHeader title="Interface" />
              <div className="divide-y divide-white/10 rounded-md border border-white/10 bg-white/[0.02]">
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
              <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 space-y-4">
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileClock className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium">Recent file history</span>
                    </div>
                    <p className="text-xs text-slate-500">{recentFiles.length} entries stored locally</p>
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

                <Separator className="bg-white/10" />

                <p className="text-xs text-slate-500">
                  Clearing history only removes recent-file entries. Resetting session clears the full local workspace snapshot.
                </p>
              </div>
            </section>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end text-[10px] uppercase tracking-widest text-slate-500">
            <span>{appInfo.name} v{appInfo.version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">{title}</h3>
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
    <div className="flex items-center justify-between p-4 transition-colors hover:bg-white/5">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded bg-white/5 border border-white/10">
          {icon}
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium leading-none">{title}</h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center shrink-0">{control}</div>
    </div>
  );
}
