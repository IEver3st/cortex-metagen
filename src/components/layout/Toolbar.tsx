import { memo, useEffect, useMemo, useRef, useState } from "react";
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
import { Code, Save, Minus, Square, X, History, Undo2, Redo2, Settings, PanelLeft, Search, PackageCheck, Pin, FolderTree, Bug, Upload, RotateCcw, Copy, Check, Download, Plus, FolderOpen, MoreHorizontal } from "lucide-react";
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
  /** When set, immediately opens the feedback dialog on the given tab. */
  feedbackTrigger?: { tab: "bug" | "feature"; nonce: number } | null;
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
  feedbackTrigger,
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
  const [bugReportDefaultTab, setBugReportDefaultTab] = useState<"bug" | "feature">("bug");

  // Open the feedback dialog imperatively when feedbackTrigger changes
  useEffect(() => {
    if (!feedbackTrigger) return;
    setBugReportDefaultTab(feedbackTrigger.tab);
    setBugReportOpen(true);
  }, [feedbackTrigger]);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(1200);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setToolbarWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Progressive visibility thresholds (px). Actions fade out as toolbar shrinks.
  const showExportZip = toolbarWidth > 680;
  const showBugReport = toolbarWidth > 620;
  const showCodePreview = toolbarWidth > 560;
  const showHistory = toolbarWidth > 440;

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
        ref={toolbarRef}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border-b border-border/70 bg-background-app py-0 pl-3 pr-0 text-foreground select-none"
        data-tauri-drag-region
      >
        {/* Left: Logo + Primary Actions */}
        <div className="flex min-w-0 items-center gap-0.5">{onGoHome && (<Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-md border border-transparent hover:border-border/60 hover:bg-card/70"
                onClick={onGoHome}
              >
                <HiOutlineCode className="size-5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Home</TooltipContent>
          </Tooltip>
          )}

          {workspaceName && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="rounded-md border border-transparent hover:border-border/60 hover:bg-card/70">
                        <FolderTree className="size-4 text-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{workspaceName}</TooltipContent>
                </Tooltip>
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
                          className="flex items-center gap-2 text-xs"
                          onClick={() => {
                            if (rootPath) onOpenRecentWorkspace?.(rootPath);
                          }}
                        >
                          {ws.pinned ? (
                            <Pin className="size-3 shrink-0 text-primary" />
                          ) : (
                            <FolderTree className="size-3 shrink-0 text-muted-foreground" />
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
            </>
          )}

          {uiView === "workspace" && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />

              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={handleCreateVehicle}>
                      <Plus />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">New vehicle</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="mx-1 h-5" />

              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => onOpenFile?.()}>
                      <Upload />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Import</TooltipContent>
                </Tooltip>

                {onOpenFolder && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" onClick={() => onOpenFolder()}>
                        <FolderOpen />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Open folder</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </>
          )}
        </div>

        {/* Center: Search (workspace only) */}
        <div className="min-w-0 px-2" data-tauri-drag-region>
          {uiView === "workspace" && hasSelection && (
            <div className="mx-auto flex w-full min-w-0 max-w-[400px] items-center gap-2">
              <div className="flex shrink-0 items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={undo}
                      disabled={!canUndo()}
                    >
                      <Undo2 />
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
                      onClick={redo}
                      disabled={!canRedo()}
                    >
                      <Redo2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Redo (Ctrl+Y)</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-5" />

              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/80" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (searchMatches.length === 0) return;
                    reopenVehicleTab(searchMatches[0].id);
                  }}
                  placeholder="Search vehicles..."
                  className="h-8 w-full min-w-0 border-border bg-card/80 pl-8 pr-9 text-xs"
                />
                {searchTerm.trim().length > 0 && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {searchMatches.length}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions + Window controls */}
        <div className="flex h-full shrink-0 items-center gap-1">
          {uiView === "workspace" && (
            <>
              {/* Edit actions */}
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={handleResetActiveTab} disabled={!activeVehicleId}>
                      <RotateCcw />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Reset tab</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={() => void handleCopyVehicle()} disabled={!activeVehicleId}>
                      {copiedXml ? <Check className="text-primary" /> : <Copy />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{copiedXml ? "Copied!" : "Copy XML"}</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="mx-1 h-5" />

              {/* Export actions */}
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
                      <Download />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Download</TooltipContent>
                </Tooltip>

                {showExportZip && hasSelection && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          isExporting && "animate-pulse"
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
                        <PackageCheck />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isExporting ? "Exporting..." : "Export ZIP"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <Separator orientation="vertical" className="mx-1 h-5" />

              {/* Save */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onSaveFile}
                    disabled={!hasSelection}
                  >
                    <Save />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Save</TooltipContent>
              </Tooltip>

              {isDirty && (
                <span className="ml-[-4px] inline-flex size-2 rounded-full bg-primary/80" />
              )}

              <Separator orientation="vertical" className="mx-1 h-5" />
            </>
          )}

          {/* Secondary actions (responsive) */}
          {uiView === "workspace" && (
            <>
              {/* History - progressive */}
              {showHistory && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={recentFiles.length === 0}
                        >
                          <History />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Recent files</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Recent files</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {recentFiles.length === 0 ? (
                      <DropdownMenuItem disabled>No recent files</DropdownMenuItem>
                    ) : (
                      recentFiles.map((path) => (
                        <DropdownMenuItem
                          key={path}
                          className="text-xs"
                          onClick={() => onOpenRecentFile?.(path)}
                        >
                          {path}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Code preview - progressive */}
              {showCodePreview && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(codePreviewVisible && "text-primary")}
                      onClick={toggleCodePreview}
                    >
                      <Code />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{codePreviewVisible ? "Hide code" : "Show code"}</TooltipContent>
                </Tooltip>
              )}

              {/* Bug report - progressive */}
              {showBugReport && (
                <Dialog open={bugReportOpen} onOpenChange={setBugReportOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <Bug />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Report bug / Suggest feature</TooltipContent>
                  </Tooltip>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Feedback</DialogTitle>
                    </DialogHeader>
                    <BugReportForm defaultTab={bugReportDefaultTab} />
                  </DialogContent>
                </Dialog>
              )}

              {/* Overflow menu for hidden items */}
              {(!showHistory || !showCodePreview || !showBugReport) && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">More</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48">
                    {!showHistory && (
                      <DropdownMenuItem
                        disabled={recentFiles.length === 0}
                        onClick={() => {
                          if (recentFiles[0]) onOpenRecentFile?.(recentFiles[0]);
                        }}
                      >
                        <History className="mr-2 size-4" />
                        Recent files
                      </DropdownMenuItem>
                    )}
                    {!showCodePreview && (
                      <DropdownMenuItem onClick={toggleCodePreview}>
                        <Code className="mr-2 size-4" />
                        {codePreviewVisible ? "Hide code" : "Show code"}
                      </DropdownMenuItem>
                    )}
                    {!showBugReport && (
                      <DropdownMenuItem onClick={() => { setBugReportDefaultTab("bug"); setBugReportOpen(true); }}>
                        <Bug className="mr-2 size-4" />
                        Report bug
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Separator orientation="vertical" className="mx-1 h-5" />
            </>
          )}

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(uiView === "settings" && "text-primary")}
                onClick={onGoSettings}
              >
                <Settings />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Settings</TooltipContent>
          </Tooltip>

          {/* Window controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md hover:bg-accent/50"
                  onClick={onToggleSidebar}
                >
                  <PanelLeft className={cn("size-4", sidebarCollapsed ? "text-muted-foreground/80" : "text-foreground/80")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md hover:bg-accent/50"
                  onClick={minimizeWindow}
                >
                  <Minus className="size-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Minimize</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md hover:bg-accent/50"
                  onClick={toggleMaximize}
                >
                  <Square className="size-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Maximize</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-md hover:bg-destructive hover:text-destructive-foreground"
                  onClick={closeWindow}
                >
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
