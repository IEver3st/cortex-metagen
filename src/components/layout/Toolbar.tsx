import { memo, useMemo, useState } from "react";
import { useMetaStore } from "@/store/meta-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { createDefaultVehicle } from "@/lib/presets";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { serializeActiveTab } from "@/lib/xml-serializer";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BugReportForm } from "./BugReportForm";
import { Code, Save, Minus, Square, X, History, Undo2, Redo2, Settings, PanelLeft, Search, PackageCheck, ChevronDown, Pin, FolderTree, Bug } from "lucide-react";
import { HiOutlineCode } from "react-icons/hi";
import type { MetaFileType } from "@/store/meta-store";
interface ToolbarProps {
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSaveFile?: () => void;
  onExportAll?: () => Promise<void>;
  onOpenRecentFile?: (path: string) => void;
  onOpenRecentWorkspace?: (path: string) => void;
  recentFiles?: string[];
  onGoHome?: () => void;
  onGoSettings?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  uiView?: "home" | "workspace" | "settings" | "merge";
}

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
  } catch (error) {
    console.warn("Failed to minimize window:", error);
  }
}

async function toggleMaximize() {
  try {
    const { getCurrentWindow } = await getWindowApi();
    getCurrentWindow().toggleMaximize();
  } catch (error) {
    console.warn("Failed to toggle maximize window:", error);
  }
}

async function closeWindow() {
  try {
    const { getCurrentWindow } = await getWindowApi();
    getCurrentWindow().close();
  } catch (error) {
    console.warn("Failed to close window:", error);
  }
}

export const Toolbar = memo(function Toolbar({
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onExportAll,
  onOpenRecentFile,
  onOpenRecentWorkspace,
  recentFiles = [],
  onGoHome,
  onGoSettings,
  onToggleSidebar,
  sidebarCollapsed = false,
  uiView = "home",
}: ToolbarProps) {
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeVehicleId = useMetaStore((s) => s.activeVehicleId);
  const activeTab = useMetaStore((s) => s.activeTab);
  const addVehicle = useMetaStore((s) => s.addVehicle);
  const updateHandling = useMetaStore((s) => s.updateHandling);
  const updateVehicles = useMetaStore((s) => s.updateVehicles);
  const updateCarcols = useMetaStore((s) => s.updateCarcols);
  const updateCarvariations = useMetaStore((s) => s.updateCarvariations);
  const updateVehicleLayouts = useMetaStore((s) => s.updateVehicleLayouts);
  const updateModkits = useMetaStore((s) => s.updateModkits);
  const codePreviewVisible = useMetaStore((s) => s.codePreviewVisible);
  const toggleCodePreview = useMetaStore((s) => s.toggleCodePreview);
  const workspacePath = useMetaStore((s) => s.workspacePath);
  const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;
  const hasSelection = vehicleList.length > 0;
  const isDirty = useMetaStore((s) => s.isDirty);
  const undo = useMetaStore((s) => s.undo);
  const redo = useMetaStore((s) => s.redo);
  const canUndo = useMetaStore((s) => s.canUndo);
  const canRedo = useMetaStore((s) => s.canRedo);
  const reopenVehicleTab = useMetaStore((s) => s.reopenVehicleTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const descriptors = useWorkspaceStore((s) => s.descriptors);
  const toggleCommandPalette = useWorkspaceStore((s) => s.toggleCommandPalette);

  const workspaceName = workspacePath?.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop();

  const searchMatches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return vehicleList.filter((entry) => (
      entry.name.toLowerCase().includes(query)
      || entry.vehicles.modelName.toLowerCase().includes(query)
      || entry.vehicles.handlingId.toLowerCase().includes(query)
    ));
  }, [searchTerm, vehicleList]);

  const handleCreateVehicle = () => {
    const nextName = `vehicle_${String(vehicleList.length + 1).padStart(2, "0")}`;
    const allTypes = new Set<MetaFileType>(["handling", "vehicles", "carcols", "carvariations", "vehiclelayouts", "modkits"]);
    addVehicle(createDefaultVehicle(nextName, allTypes));
  };

  const handleCopyVehicle = async () => {
    if (!hasSelection) return;
    const content = serializeActiveTab(activeTab, vehicleList);
    await navigator.clipboard.writeText(content);
    setCopiedXml(true);
    window.setTimeout(() => setCopiedXml(false), 1400);
  };

  const handleResetActiveTab = () => {
    if (!activeVehicleId || !activeVehicle) return;
    const baseline = createDefaultVehicle(activeVehicle.name, activeVehicle.loadedMeta);
    if (activeTab === "handling") return void updateHandling(activeVehicleId, baseline.handling);
    if (activeTab === "vehicles") return void updateVehicles(activeVehicleId, baseline.vehicles);
    if (activeTab === "carcols") return void updateCarcols(activeVehicleId, baseline.carcols);
    if (activeTab === "carvariations") return void updateCarvariations(activeVehicleId, baseline.carvariations);
    if (activeTab === "vehiclelayouts") return void updateVehicleLayouts(activeVehicleId, baseline.vehiclelayouts);
    updateModkits(activeVehicleId, baseline.modkits);
  };

  return (
    <TooltipProvider>
      <div
        className="relative flex items-center gap-2 pl-3 pr-0 py-0 border-b border-[#131a2b] bg-[#050d21] select-none overflow-hidden"
        data-tauri-drag-region
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center shrink-0 w-8 h-8 transition-opacity hover:opacity-80"
              onClick={onGoHome}
            >
              <HiOutlineCode className="h-5 w-5" style={{ color: "#8eaad0" }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Home</TooltipContent>
        </Tooltip>

        {/* Workspace switcher dropdown */}
        {workspaceName && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 px-2 h-7 rounded text-xs text-slate-300 hover:bg-[#14233b] hover:text-white transition-colors max-w-[180px]"
              >
                <span className="truncate font-medium">{workspaceName}</span>
                <ChevronDown className="h-3 w-3 shrink-0 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="text-xs">Switch Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {descriptors.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs">No workspaces</DropdownMenuItem>
              ) : (
                descriptors.slice(0, 10).map((ws) => {
                  const rootPath = ws.roots[0] ?? "";
                  return (
                    <DropdownMenuItem
                      key={ws.configPath}
                      className="text-xs flex items-center gap-2"
                      onClick={() => {
                        if (rootPath) onOpenRecentWorkspace?.(rootPath);
                      }}
                    >
                      {ws.pinned ? (
                        <Pin className="size-3 text-primary shrink-0" />
                      ) : (
                        <FolderTree className="size-3 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{ws.name}</span>
                    </DropdownMenuItem>
                  );
                })
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs"
                onClick={() => toggleCommandPalette()}
              >
                More workspaces...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {uiView === "workspace" && hasSelection && (
          <div className="absolute left-1/2 top-1/2 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 px-2">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8"
                    onClick={undo}
                    disabled={!canUndo()}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8"
                    onClick={redo}
                    disabled={!canRedo()}
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>

              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (searchMatches.length === 0) return;
                    reopenVehicleTab(searchMatches[0].id);
                  }}
                  placeholder="Search vehicles, models, handling IDs"
                  className="h-8 border-[#2b3b56] bg-[#111d33] pl-8 pr-9 text-xs text-slate-100 placeholder:text-slate-500"
                />
                {searchTerm.trim().length > 0 && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {searchMatches.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0" data-tauri-drag-region />

        <div className="flex items-center h-full shrink-0">
        {uiView === "workspace" && (
          <div className="mr-2 flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => onOpenFile?.()}>Import</Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={handleResetActiveTab} disabled={!activeVehicleId}>Reset</Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => void handleCopyVehicle()} disabled={!activeVehicleId}>{copiedXml ? "Copied" : "Copy"}</Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[11px]"
              disabled={isExporting || !hasSelection}
              onClick={async () => {
                if (!onExportAll || isExporting) return;
                setIsExporting(true);
                try {
                  await onExportAll();
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              Download
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={handleCreateVehicle}>+ New</Button>
            {onOpenFolder && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => onOpenFolder()}>Folder</Button>
            )}
            <Separator orientation="vertical" className="mx-1 h-5" />
          </div>
        )}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8"
                    disabled={recentFiles.length === 0}
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">Recent files</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Recent files</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentFiles.length === 0 && (
              <DropdownMenuItem disabled>No recent files</DropdownMenuItem>
            )}
            {recentFiles.map((path) => (
              <DropdownMenuItem
                key={path}
                className="text-xs"
                onClick={() => onOpenRecentFile?.(path)}
                title={path}
              >
                {path}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasSelection && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8"
                  onClick={onSaveFile}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Save</TooltipContent>
            </Tooltip>

            {isDirty && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-yellow-400/80" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Unsaved changes</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "h-8 w-8 transition-all duration-200",
                    isExporting
                      ? "text-primary animate-pulse cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  disabled={isExporting}
                  onClick={async () => {
                    if (!onExportAll || isExporting) return;
                    setIsExporting(true);
                    try {
                      await onExportAll();
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isExporting ? "Exporting…" : "Export all to data.zip"}
              </TooltipContent>
            </Tooltip>
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("h-8 w-8", codePreviewVisible ? "text-primary" : "text-muted-foreground")}
              onClick={toggleCodePreview}
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{codePreviewVisible ? "Hide code preview" : "Show code preview"}</TooltipContent>
        </Tooltip>

        <Dialog open={bugReportOpen} onOpenChange={setBugReportOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Bug className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Report a bug</TooltipContent>
          </Tooltip>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-200">Report a Bug</DialogTitle>
            </DialogHeader>
            <BugReportForm />
          </DialogContent>
        </Dialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("h-8 w-8", uiView === "settings" ? "text-primary" : "text-muted-foreground")}
              onClick={onGoSettings}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5" />

        <div className="flex items-center h-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleSidebar}
                className="inline-flex items-center justify-center w-11 h-9 hover:bg-muted-foreground/10 transition-colors"
              >
                <PanelLeft className={`h-4 w-4 ${sidebarCollapsed ? "text-muted-foreground/80" : "text-foreground/80"}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={minimizeWindow}
                className="inline-flex items-center justify-center w-11 h-9 hover:bg-muted-foreground/10 transition-colors"
              >
                <Minus className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Minimize</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleMaximize}
                className="inline-flex items-center justify-center w-11 h-9 hover:bg-muted-foreground/10 transition-colors"
              >
                <Square className="h-3 w-3 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Maximize</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={closeWindow}
                className="inline-flex items-center justify-center w-11 h-9 hover:bg-red-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close</TooltipContent>
          </Tooltip>
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
});
