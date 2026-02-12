import { memo, useMemo, useState } from "react";
import { useMetaStore } from "@/store/meta-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Code, Save, Minus, Square, X, History, Undo2, Redo2, Settings, PanelLeft, Search } from "lucide-react";
import { HiOutlineCode } from "react-icons/hi";

interface ToolbarProps {
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSaveFile?: () => void;
  onOpenRecentFile?: (path: string) => void;
  recentFiles?: string[];
  onGoHome?: () => void;
  onGoSettings?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  uiView?: "home" | "workspace" | "settings";
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

export const Toolbar = memo(function Toolbar({
  onSaveFile,
  onOpenRecentFile,
  recentFiles = [],
  onGoHome,
  onGoSettings,
  onToggleSidebar,
  sidebarCollapsed = false,
  uiView = "home",
}: ToolbarProps) {
  const vehicles = useMetaStore((s) => s.vehicles);
  const codePreviewVisible = useMetaStore((s) => s.codePreviewVisible);
  const toggleCodePreview = useMetaStore((s) => s.toggleCodePreview);
  const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);
  const hasSelection = vehicleList.length > 0;
  const isDirty = useMetaStore((s) => s.isDirty);
  const undo = useMetaStore((s) => s.undo);
  const redo = useMetaStore((s) => s.redo);
  const canUndo = useMetaStore((s) => s.canUndo);
  const canRedo = useMetaStore((s) => s.canRedo);
  const reopenVehicleTab = useMetaStore((s) => s.reopenVehicleTab);
  const [searchTerm, setSearchTerm] = useState("");

  const searchMatches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return vehicleList.filter((entry) => (
      entry.name.toLowerCase().includes(query)
      || entry.vehicles.modelName.toLowerCase().includes(query)
      || entry.vehicles.handlingId.toLowerCase().includes(query)
    ));
  }, [searchTerm, vehicleList]);

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
              className={`flex items-center gap-1 shrink-0 py-2 px-1 transition-colors ${uiView === "home" ? "bg-muted/40" : "hover:bg-muted/30"}`}
              onClick={onGoHome}
            >
              <HiOutlineCode className="h-4 w-4" style={{ color: "#8eaad0" }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Home</TooltipContent>
        </Tooltip>

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
