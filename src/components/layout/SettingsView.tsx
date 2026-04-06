import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateChecker } from "@/lib/updater";
import { useMetaStore, type PerformanceSpeedUnit } from "@/store/meta-store";
import { cn } from "@/lib/utils";
import { BugReportForm } from "./BugReportForm";
import { SidebarCustomizationCard } from "./SidebarCustomizationCard";
import { UpdateSettingsCard } from "./UpdateSettingsCard";
import {
  ArchiveX,
  PanelLeft,
  FileClock,
  Gauge,
  Code2,
  Keyboard,
  PencilLine,
  Trash2,
  Bug,
  Settings,
  Layers3,
  RefreshCw,
} from "lucide-react";

type SettingsSection = "interface" | "sidebar" | "session" | "shortcuts" | "updates" | "support";

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "interface", label: "Interface", icon: PanelLeft },
  { id: "sidebar", label: "Sidebar Layout", icon: Layers3 },
  { id: "session", label: "Session Data", icon: FileClock },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "updates", label: "Updates", icon: RefreshCw },
  { id: "support", label: "Support", icon: Bug },
];

interface SettingsViewProps {
  onClearSession?: () => void;
}

function isPerformanceSpeedUnit(value: string): value is PerformanceSpeedUnit {
  return value === "mph" || value === "kph";
}

export function SettingsView({ onClearSession }: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("interface");

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
  const update = useUpdateChecker();
  const appVersion = update.currentVersion ?? "...";

  return (
    <div className="h-full w-full bg-background-app flex overflow-hidden">
      {/* Vertical settings nav */}
      <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-card/30 py-5">
        <div className="mb-4 flex items-center gap-2.5 px-4">
          <div className="flex size-7 items-center justify-center rounded bg-primary/10 border border-primary/20">
            <Settings className="size-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-foreground">Settings</span>
        </div>

        <Separator className="mb-3" />

        <nav className="flex flex-col gap-0.5 px-2">
          {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                activeSection === id
                  ? "bg-primary/10 text-primary border border-primary/20 font-medium"
                  : "text-muted-foreground border border-transparent hover:bg-muted/30 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="text-[11px] truncate">{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-4 pt-4">
          <Separator className="mb-3" />
          <p className="font-display text-[9px] uppercase tracking-widest text-muted-foreground/50">
            v{appVersion}
          </p>
        </div>
      </aside>

      {/* Section content */}
      <ScrollArea className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="mx-auto max-w-2xl px-8 py-8 space-y-8"
          >
            {activeSection === "interface" && (
              <>
                <SectionHeading
                  icon={<PanelLeft className="size-4 text-primary" />}
                  title="Interface"
                  description="Adjust how the application looks and behaves."
                />
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  <SettingRow
                    icon={<PanelLeft className="size-4" />}
                    title="Compact Sidebar"
                    description="Minimize the navigation rail to icons only."
                    control={
                      <Switch
                        checked={sidebarCollapsed}
                        onCheckedChange={setSidebarCollapsed}
                        aria-label="Compact Sidebar"
                      />
                    }
                  />
                  <SettingRow
                    icon={<Code2 className="size-4" />}
                    title="Live Code Preview"
                    description="Display the generated XML output alongside the editor."
                    control={
                      <Switch
                        checked={codePreviewVisible}
                        onCheckedChange={setCodePreviewVisible}
                        aria-label="Live Code Preview"
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
                        <SelectTrigger className="h-9 w-[164px]">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
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
                      <Switch
                        checked={editorEditMode}
                        onCheckedChange={toggleEditorEditMode}
                        aria-label="Direct Edit Mode"
                      />
                    }
                  />
                </div>
              </>
            )}

            {activeSection === "sidebar" && (
              <>
                <SectionHeading
                  icon={<Layers3 className="size-4 text-primary" />}
                  title="Sidebar Layout"
                  description="Reorder items, rename them, and configure per-workspace overrides."
                />
                <SidebarCustomizationCard />
              </>
            )}

            {activeSection === "session" && (
              <>
                <SectionHeading
                  icon={<FileClock className="size-4 text-primary" />}
                  title="Session Data"
                  description="Manage locally stored session and file history."
                />
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileClock className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium text-card-foreground">Recent file history</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{recentFiles.length} entries stored locally</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={clearRecentFiles}
                      >
                        <Trash2 className="size-3.5 mr-1.5" /> Clear Recent Files
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={onClearSession}
                      >
                        <ArchiveX className="size-3.5 mr-1.5" /> Reset Session
                      </Button>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground leading-5">
                    Clearing recent files only removes the recent file/workspace list. Resetting session clears the full local workspace snapshot.
                  </p>
                </div>
              </>
            )}

            {activeSection === "shortcuts" && (
              <>
                <SectionHeading
                  icon={<Keyboard className="size-4 text-primary" />}
                  title="Hotkeys & Shortcuts"
                  description="Keyboard shortcuts available throughout the application."
                />
                <div className="rounded-lg border border-border bg-card">
                  <ShortcutRow
                    icon={<Keyboard className="size-4" />}
                    title="Open workspace switcher"
                    description="Zoom out into the workspace swapper and preview other workspaces."
                    shortcut="Ctrl+`"
                  />
                  <ShortcutRow
                    icon={<Keyboard className="size-4" />}
                    title="Jump to a workspace"
                    description="Switch directly to the first nine workspaces by index."
                    shortcut="Ctrl+1–9"
                  />
                  <ShortcutRow
                    icon={<Keyboard className="size-4" />}
                    title="Navigate the switcher"
                    description="Move the highlight, preview, confirm, or cancel from the keyboard."
                    shortcut="Arrow keys / Enter / Escape"
                  />
                  <ShortcutRow
                    icon={<Keyboard className="size-4" />}
                    title="Open command palette"
                    description="Search actions, navigation, and workspace commands."
                    shortcut="Ctrl+Shift+P"
                  />
                  <ShortcutRow
                    icon={<Keyboard className="size-4" />}
                    title="Open file"
                    description="Import a single `.meta` or `.xml` file."
                    shortcut="Ctrl+O"
                  />
                  <ShortcutRow
                    icon={<Keyboard className="size-4" />}
                    title="Save current file"
                    description="Write the active metadata document back to disk."
                    shortcut="Ctrl+S"
                  />
                  <ShortcutRow
                    icon={<Keyboard className="size-4" />}
                    title="Undo and redo"
                    description="Step backward or forward through recent editor changes."
                    shortcut="Ctrl+Z / Ctrl+Y"
                    last
                  />
                </div>
              </>
            )}

            {activeSection === "updates" && (
              <>
                <SectionHeading
                  icon={<RefreshCw className="size-4 text-primary" />}
                  title="Updates"
                  description="Check for and install application updates."
                />
                <UpdateSettingsCard update={update} />
              </>
            )}

            {activeSection === "support" && (
              <>
                <SectionHeading
                  icon={<Bug className="size-4 text-primary" />}
                  title="Support"
                  description="Report bugs and get help with Cortex Metagen."
                />
                <div className="rounded-lg border border-border bg-card">
                  <div className="flex items-start gap-4 p-4 border-b border-border">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted/30 border border-border text-muted-foreground">
                      <Bug className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium leading-none text-card-foreground">Report a Bug</h4>
                      <p className="text-xs text-muted-foreground">
                        Found something broken? Submit a report and it will be filed directly on GitHub.
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <BugReportForm />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}

interface SectionHeadingProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function SectionHeading({ icon, title, description }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
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
    <div className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded bg-muted/30 border border-border text-muted-foreground">
          {icon}
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium leading-none text-card-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground leading-5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

interface ShortcutRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  shortcut: string;
  last?: boolean;
}

function ShortcutRow({ icon, title, description, shortcut, last = false }: ShortcutRowProps) {
  return (
    <div className={last ? undefined : "border-b border-border"}>
      <SettingRow
        icon={icon}
        title={title}
        description={description}
        control={
          <div className="rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
            {shortcut}
          </div>
        }
      />
    </div>
  );
}
