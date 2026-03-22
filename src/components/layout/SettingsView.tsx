import { useEffect, useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { SquareToggle } from "@/components/SquareToggle";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useMetaStore, type PerformanceSpeedUnit } from "@/store/meta-store";
import { BugReportForm } from "./BugReportForm";
import {
  ArchiveX,
  PanelLeft,
  FileClock,
  Gauge,
  Code2,
  PencilLine,
  Trash2,
  Bug,
} from "lucide-react";

interface SettingsViewProps {
  onClearSession?: () => void;
}

function isPerformanceSpeedUnit(value: string): value is PerformanceSpeedUnit {
  return value === "mph" || value === "kph";
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
  const performanceSpeedUnit = useMetaStore((s) => s.performanceSpeedUnit);
  const setPerformanceSpeedUnit = useMetaStore((s) => s.setPerformanceSpeedUnit);
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
    <div className="relative h-full w-full overflow-y-auto bg-[#040d1a] font-sans text-slate-100">
      {/* Background Decorative Element (Subtle Gradient) */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#040d1a] via-[#06152a] to-[#040d1a] opacity-50 pointer-events-none" />
      
      <div className="relative px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
            <p className="text-sm text-slate-400">
              Configure your interface preferences and manage local session data.
            </p>
          </div>

          <div className="space-y-8">
            {/* Interface Section */}
            <section className="space-y-4">
              <SectionHeader title="Interface" />
              <div className="divide-y divide-[#1b2b46] rounded-md border border-[#1b2b46] bg-[#0b1424]">
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
                  icon={<Gauge className="size-4" />}
                  title="Performance Speed Unit"
                  description="Choose whether handling estimates use imperial (MPH) or metric (KPH)."
                  control={
                    <Select
                      value={performanceSpeedUnit}
                      onValueChange={(value) => {
                        if (isPerformanceSpeedUnit(value)) {
                          setPerformanceSpeedUnit(value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[164px] border-[#1b2b46] bg-[#0b1424] text-xs text-slate-200">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent className="border-[#1b2b46] bg-[#0b1424] text-slate-100">
                        <SelectItem value="mph">MPH (Imperial)</SelectItem>
                        <SelectItem value="kph">KPH (Metric)</SelectItem>
                      </SelectContent>
                    </Select>
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
              <div className="rounded-md border border-[#1b2b46] bg-[#0b1424] p-4 space-y-4">
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileClock className="size-4 shrink-0 text-slate-400" />
                      <span className="text-sm font-medium text-slate-200">Recent file history</span>
                    </div>
                    <p className="text-xs text-slate-500">{recentFiles.length} entries stored locally</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={clearRecentFiles}
                    >
                      <Trash2 className="size-3.5 mr-1" /> Clear Recent Files
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={onClearSession}
                    >
                      <ArchiveX className="size-3.5 mr-1" /> Reset Session
                    </Button>
                  </div>
                </div>

                <Separator className="bg-[#1b2b46]" />

                <p className="text-xs text-slate-500">
                  Clearing recent files only removes the recent file/workspace list. Resetting session clears the full local workspace snapshot.
                </p>
              </div>
            </section>

            {/* Support Section */}
            <section className="space-y-4">
              <SectionHeader title="Support" />
              <div className="rounded-md border border-[#1b2b46] bg-[#0b1424]">
                <div className="flex items-start gap-4 p-4 border-b border-[#1b2b46]">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded bg-white/[0.03] border border-white/5 text-slate-300">
                    <Bug className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium leading-none text-slate-200">Report a Bug</h4>
                    <p className="text-xs text-slate-500">
                      Found something broken? Submit a report and it will be filed directly on GitHub.
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <BugReportForm />
                </div>
              </div>
            </section>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-[#1b2b46] flex items-center justify-end text-[10px] uppercase tracking-widest text-slate-500">
            <span>Cortex Metagen v{appVersion}</span>
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
    <div className="flex items-center justify-between p-4 transition-colors hover:bg-white/[0.02]">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded bg-white/[0.03] border border-white/5 text-slate-300">
          {icon}
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium leading-none text-slate-200">{title}</h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
