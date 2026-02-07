import { memo } from "react";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import { VehicleDropdown } from "@/components/VehicleDropdown";
import { PresetPicker } from "@/components/PresetPicker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Code, FolderOpen, Save, PenLine, Minus, Square, X } from "lucide-react";

interface ToolbarProps {
  onOpenFile?: () => void;
  onSaveFile?: () => void;
}

// Cache the Tauri window API import to avoid repeated dynamic imports
let _windowApiPromise: Promise<typeof import("@tauri-apps/api/window")> | null = null;
function getWindowApi() {
  if (!_windowApiPromise) {
    _windowApiPromise = import("@tauri-apps/api/window");
  }
  return _windowApiPromise;
}

async function minimizeWindow() {
  try {
    const { getCurrentWindow } = await getWindowApi();
    getCurrentWindow().minimize();
  } catch {}
}

async function toggleMaximize() {
  try {
    const { getCurrentWindow } = await getWindowApi();
    getCurrentWindow().toggleMaximize();
  } catch {}
}

async function closeWindow() {
  try {
    const { getCurrentWindow } = await getWindowApi();
    getCurrentWindow().close();
  } catch {}
}

export const Toolbar = memo(function Toolbar({ onOpenFile, onSaveFile }: ToolbarProps) {
  const activeTab = useMetaStore((s) => s.activeTab);
  const setActiveTab = useMetaStore((s) => s.setActiveTab);
  const codePreviewVisible = useMetaStore((s) => s.codePreviewVisible);
  const toggleCodePreview = useMetaStore((s) => s.toggleCodePreview);
  const editorEditMode = useMetaStore((s) => s.editorEditMode);
  const toggleEditorEditMode = useMetaStore((s) => s.toggleEditorEditMode);
  const hasSelection = useMetaStore((s) => s.activeVehicleId !== null);

  return (
    <div
      className="@container/toolbar flex items-center gap-1 pl-3 pr-0 py-0 border-b bg-card select-none overflow-hidden"
      data-tauri-drag-region
    >
      {/* Left: logo + vehicle controls */}
      <div className="flex items-center gap-2 min-w-0 shrink" data-tauri-drag-region>
        <div className="flex items-center gap-1 shrink-0 py-2" data-tauri-drag-region>
          <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "#2CD672", fontFamily: "var(--font-hud)" }}>
            CORTEX
          </span>
          <span className="text-sm font-bold tracking-tight hidden @[500px]/toolbar:inline" style={{ color: "#2CD672", fontFamily: "var(--font-hud)" }}>
            METAGEN
          </span>
        </div>

        <Separator orientation="vertical" className="h-4 shrink-0" />
        <VehicleDropdown />
        {hasSelection && (
          <div className="hidden @[700px]/toolbar:flex items-center gap-2 shrink-0">
            <Separator orientation="vertical" className="h-4" />
            <PresetPicker />
          </div>
        )}
      </div>

      {/* Center: mode selector — hidden below 600px */}
      {hasSelection && (
        <div className="hidden @[600px]/toolbar:flex items-center shrink-0" data-tauri-drag-region>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MetaFileType)}>
            <TabsList variant="line" className="h-7 gap-0 bg-transparent p-0 rounded-none">
              <TabsTrigger value="handling" className="text-xs h-6 px-2 rounded-none border-none bg-transparent whitespace-nowrap">
                Handling
              </TabsTrigger>
              <Separator orientation="vertical" className="h-4" />
              <TabsTrigger value="vehicles" className="text-xs h-6 px-2 rounded-none border-none bg-transparent whitespace-nowrap">
                Vehicles
              </TabsTrigger>
              <Separator orientation="vertical" className="h-4" />
              <div className="relative flex items-center mx-0.5 px-0.5">
                <TabsTrigger value="carcols" className="text-xs h-6 px-2 rounded-none border-none bg-transparent whitespace-nowrap">
                  Sirens
                </TabsTrigger>
                <span className="w-px h-3 bg-border/60" />
                <TabsTrigger value="modkits" className="text-xs h-6 px-2 rounded-none border-none bg-transparent whitespace-nowrap">
                  ModKits
                </TabsTrigger>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground/50 leading-none whitespace-nowrap pointer-events-none">
                  carcols.meta
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <TabsTrigger value="carvariations" className="text-xs h-6 px-2 rounded-none border-none bg-transparent whitespace-nowrap">
                CarVariations
              </TabsTrigger>
              <Separator orientation="vertical" className="h-4" />
              <TabsTrigger value="vehiclelayouts" className="text-xs h-6 px-2 rounded-none border-none bg-transparent whitespace-nowrap">
                Layouts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Spacer to push right section */}
      <div className="flex-1 min-w-1" data-tauri-drag-region />

      {/* Right: actions + window controls — window controls always visible */}
      <div className="flex items-center h-full shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs"
          onClick={onOpenFile}
          title="Open file"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden @[900px]/toolbar:inline">Open</span>
        </Button>
        {hasSelection && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 text-xs"
              onClick={onSaveFile}
              title="Save file"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden @[900px]/toolbar:inline">Save</span>
            </Button>

            <div className="hidden @[650px]/toolbar:block">
              <Button
                variant={editorEditMode ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 gap-1 text-xs ${editorEditMode ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30" : ""}`}
                onClick={toggleEditorEditMode}
                title={editorEditMode ? "Switch to read-only" : "Enable edit mode"}
              >
                <PenLine className="h-3.5 w-3.5" />
                <span className="hidden @[900px]/toolbar:inline">{editorEditMode ? "Editing" : "Edit"}</span>
              </Button>
            </div>
          </>
        )}

        <div className="hidden @[550px]/toolbar:block">
          <Button
            variant={codePreviewVisible ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={toggleCodePreview}
            title={codePreviewVisible ? "Hide code preview" : "Show code preview"}
          >
            <Code className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-5" />

        <div className="flex items-center h-full">
          <button
            onClick={minimizeWindow}
            className="inline-flex items-center justify-center w-11 h-9 hover:bg-muted-foreground/10 transition-colors"
            title="Minimize"
          >
            <Minus className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={toggleMaximize}
            className="inline-flex items-center justify-center w-11 h-9 hover:bg-muted-foreground/10 transition-colors"
            title="Maximize"
          >
            <Square className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={closeWindow}
            className="inline-flex items-center justify-center w-11 h-9 hover:bg-red-500 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
});
