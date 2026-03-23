import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PresetPicker } from "@/components/PresetPicker";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { cn } from "@/lib/utils";
import { WorkspaceExplorer } from "./WorkspaceExplorer";
import {
  FolderOpen,
  FolderTree,
  Wrench,
  CarFront,
  Siren,
  Package,
  Palette,
  LayoutPanelTop,
  Files,
  Search,
  Command,
} from "lucide-react";

interface IdeSidebarProps {
  collapsed: boolean;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  uiView: "home" | "workspace" | "settings" | "merge";
}

const navItems: Array<{ key: MetaFileType; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "handling", label: "Handling", icon: Wrench },
  { key: "vehicles", label: "Vehicles", icon: CarFront },
  { key: "carcols", label: "Sirens", icon: Siren },
  { key: "modkits", label: "ModKits", icon: Package },
  { key: "carvariations", label: "Variations", icon: Palette },
  { key: "vehiclelayouts", label: "Layouts", icon: LayoutPanelTop },
];

const META_TYPE_PATTERNS: Array<[MetaFileType, RegExp]> = [
  ["handling", /(?:^|[._-])handling(?:[._-]|$)/i],
  ["vehicles", /(?:^|[._-])vehicles(?:[._-]|$)/i],
  ["carcols", /(?:^|[._-])carcols(?:[._-]|$)/i],
  ["carvariations", /(?:^|[._-])carvariations?(?:[._-]|$)/i],
  ["vehiclelayouts", /(?:^|[._-])vehiclelayouts?(?:[._-]|$)/i],
  ["modkits", /(?:^|[._-])modkits?(?:[._-]|$)/i],
];

function metaTypeFromFileName(fileName: string): MetaFileType | null {
  const fn = fileName.toLowerCase();
  const matches = META_TYPE_PATTERNS.filter(([, pattern]) => pattern.test(fn));
  if (matches.length !== 1) return null;
  return matches[0][0];
}

const prefetchByTab: Record<MetaFileType, () => Promise<unknown>> = {
  handling: () => import("@/components/editors/HandlingEditor"),
  vehicles: () => import("@/components/editors/VehiclesEditor"),
  carcols: () => import("@/components/editors/CarcolsEditor"),
  modkits: () => import("@/components/editors/ModkitsEditor"),
  carvariations: () => import("@/components/editors/CarvariationsEditor"),
  vehiclelayouts: () => import("@/components/editors/VehicleLayoutsEditor"),
};

const prefetchMergeView = () => import("@/components/layout/MetaMergingView");

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.04,
      duration: 0.24,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -5 },
  show: { opacity: 1, x: 0, transition: { duration: 0.18 } },
};

export function IdeSidebar({
  collapsed,
  onOpenFile,
  onOpenFolder,
  uiView,
}: IdeSidebarProps) {
  const activeTab = useMetaStore((s) => s.activeTab);
  const setActiveTab = useMetaStore((s) => s.setActiveTab);
  const setUIView = useMetaStore((s) => s.setUIView);
  const hasSelection = useMetaStore((s) => s.activeVehicleId !== null);
  const explorerVisible = useMetaStore((s) => s.explorerVisible);
  const setExplorerVisible = useMetaStore((s) => s.setExplorerVisible);
  const setSidebarCollapsed = useMetaStore((s) => s.setSidebarCollapsed);
  const workspacePath = useMetaStore((s) => s.workspacePath);
  const workspaceMetaFiles = useMetaStore((s) => s.workspaceMetaFiles);

  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const toggleCommandPalette = useWorkspaceStore((s) => s.toggleCommandPalette);

  const [explorerSearch, setExplorerSearch] = useState("");

  const effectiveExplorerVisible = explorerVisible && !collapsed;

  // Derive workspace display name
  const workspaceName = activeWorkspace?.name
    ?? workspacePath?.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop()
    ?? null;

  // Count meta files by type for nav badges
  const metaTypeCounts = useMemo(() => {
    const counts: Partial<Record<MetaFileType, number>> = {};
    for (const filePath of workspaceMetaFiles) {
      const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "";
      const metaType = metaTypeFromFileName(fileName);
      if (metaType) {
        counts[metaType] = (counts[metaType] ?? 0) + 1;
      }
    }
    return counts;
  }, [workspaceMetaFiles]);

  const totalMetaFiles = workspaceMetaFiles.length;

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 56 : 288 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        {/* Workspace name header — visible when expanded and workspace is open */}
        <AnimatePresence>
          {!collapsed && workspaceName && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 pt-2.5 pb-1.5 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderTree className="size-3.5 shrink-0 text-primary/80" />
                  <span className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground">
                    {workspaceName}
                  </span>
                </div>
                {totalMetaFiles > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {totalMetaFiles} file{totalMetaFiles !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={sectionVariants} initial="hidden" animate="show" className="px-2 pt-2 pb-2 space-y-1">
          <motion.div variants={itemVariants}>
            <SidebarAction
              collapsed={collapsed}
              label="Workspace"
              icon={Files}
              active={effectiveExplorerVisible}
              onClick={() => {
                if (collapsed) {
                  setSidebarCollapsed(false);
                  setExplorerVisible(true);
                  return;
                }
                setExplorerVisible(!effectiveExplorerVisible);
              }}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SidebarAction
              collapsed={collapsed}
              label="Open Folder"
              icon={FolderTree}
              onClick={onOpenFolder}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SidebarAction
              collapsed={collapsed}
              label="Open File"
              icon={FolderOpen}
              onClick={onOpenFile}
            />
          </motion.div>

          {/* Command Palette shortcut — collapsed shows icon only */}
          <motion.div variants={itemVariants}>
            <SidebarAction
              collapsed={collapsed}
              label="Commands"
              icon={Command}
              onClick={() => toggleCommandPalette()}
            />
          </motion.div>
        </motion.div>

        {!collapsed && (
          <>
            <Separator />
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-2 space-y-2"
            >
              {hasSelection && <PresetPicker />}
            </motion.div>
          </>
        )}

        <Separator />

        {effectiveExplorerVisible ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Explorer search filter */}
            <div className="px-2 pt-2 pb-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                  placeholder="Filter files..."
                  className="h-8 border-sidebar-border bg-background pl-7 pr-2 text-[11px]"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 p-2 pt-0">
              <div className="h-full min-h-0">
                <WorkspaceExplorer filterQuery={explorerSearch} />
              </div>
            </div>
          </div>
        ) : (
          <motion.nav variants={sectionVariants} initial="hidden" animate="show" className="space-y-1 p-2">
            {navItems.map((item) => {
              const count = metaTypeCounts[item.key];
              return (
                <motion.div key={item.key} variants={itemVariants}>
                  <SidebarAction
                    collapsed={collapsed}
                    label={item.label}
                    icon={item.icon}
                    active={uiView === "workspace" && activeTab === item.key}
                    disabled={!hasSelection}
                    badge={count}
                    onMouseEnter={() => {
                      void prefetchByTab[item.key]();
                    }}
                    onClick={() => {
                      setActiveTab(item.key);
                      setUIView("workspace");
                    }}
                  />
                </motion.div>
              );
            })}
            <motion.div variants={itemVariants}>
              <SidebarAction
                collapsed={collapsed}
                label="Meta Merging"
                icon={Files}
                active={uiView === "merge"}
                onMouseEnter={() => {
                  void prefetchMergeView();
                }}
                onClick={() => setUIView("merge")}
              />
            </motion.div>
          </motion.nav>
        )}
      </motion.aside>
    </TooltipProvider>
  );
}

interface SidebarActionProps {
  collapsed: boolean;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  onMouseEnter?: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: number;
}

function SidebarAction({ collapsed, label, icon: Icon, onClick, onMouseEnter, active, disabled, badge }: SidebarActionProps) {
  const button = (
    <motion.div whileHover={{ x: 1.5 }} transition={{ duration: 0.16 }}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-9 w-full border border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed ? "px-0" : "justify-start px-2",
          active && "border-sidebar-ring/40 bg-sidebar-primary/15 text-sidebar-primary shadow-xs",
        )}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        disabled={disabled}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="sidebar-label"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.14 }}
              className="ml-2 text-xs whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {/* Meta type count badge */}
        <AnimatePresence initial={false}>
          {!collapsed && badge !== undefined && badge > 0 && (
            <motion.span
              key="sidebar-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.14 }}
              className="ml-auto"
            >
              <Badge variant={active ? "default" : "outline"} className="rounded-md px-1.5 py-0 text-[9px] tabular-nums">
                {badge}
              </Badge>
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ml-1.5 text-muted-foreground">({badge})</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
