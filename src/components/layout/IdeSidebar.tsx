import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  CarFront,
  Command,
  Files,
  FolderOpen,
  FolderTree,
  LayoutPanelTop,
  Palette,
  Search,
  Siren,
  Wrench,
  Package,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  resolveSidebarCustomization,
  type SidebarItemId,
} from "@/lib/sidebar-customization";
import { cn } from "@/lib/utils";
import { useSidebarCustomizationStore } from "@/store/sidebar-customization-store";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { PresetPicker } from "@/components/PresetPicker";

import { EarlyAccessModal, shouldShowEarlyAccess } from "./EarlyAccessModal";
import { WorkspaceExplorer } from "./WorkspaceExplorer";

interface IdeSidebarProps {
  collapsed: boolean;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  uiView: "home" | "workspace" | "settings" | "merge";
  onOpenFeedback?: () => void;
}

const META_ITEM_IDS: MetaFileType[] = [
  "handling",
  "vehicles",
  "carcols",
  "modkits",
  "carvariations",
  "vehiclelayouts",
];

const META_ITEM_PATTERNS: Array<[MetaFileType, RegExp]> = [
  ["handling", /(?:^|[._-])handling(?:[._-]|$)/i],
  ["vehicles", /(?:^|[._-])vehicles(?:[._-]|$)/i],
  ["carcols", /(?:^|[._-])carcols(?:[._-]|$)/i],
  ["carvariations", /(?:^|[._-])carvariations?(?:[._-]|$)/i],
  ["vehiclelayouts", /(?:^|[._-])vehiclelayouts?(?:[._-]|$)/i],
  ["modkits", /(?:^|[._-])modkits?(?:[._-]|$)/i],
];

const SIDEBAR_ACTION_ICONS: Record<
  Exclude<SidebarItemId, "workspace-header" | "preset-picker">,
  ComponentType<{ className?: string }>
> = {
  "workspace-toggle": Files,
  "open-folder": FolderTree,
  "open-file": FolderOpen,
  handling: Wrench,
  vehicles: CarFront,
  carcols: Siren,
  modkits: Package,
  carvariations: Palette,
  vehiclelayouts: LayoutPanelTop,
  "meta-merging": Files,
};

const PREFETCH_BY_TAB: Record<MetaFileType, () => Promise<unknown>> = {
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

function metaTypeFromFileName(fileName: string): MetaFileType | null {
  const normalizedFileName = fileName.toLowerCase();
  const matches = META_ITEM_PATTERNS.filter(([, pattern]) => pattern.test(normalizedFileName));
  if (matches.length !== 1) {
    return null;
  }
  return matches[0][0];
}

function isMetaSidebarItemId(itemId: SidebarItemId): itemId is MetaFileType {
  return META_ITEM_IDS.includes(itemId as MetaFileType);
}

function SidebarSectionCard({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-sidebar-border/70 bg-background/30 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-3.5 text-primary/80" />
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

export function IdeSidebar({
  collapsed,
  onOpenFile,
  onOpenFolder,
  uiView,
  onOpenFeedback,
}: IdeSidebarProps) {
  const activeTab = useMetaStore((state) => state.activeTab);
  const setActiveTab = useMetaStore((state) => state.setActiveTab);
  const setUIView = useMetaStore((state) => state.setUIView);
  const hasSelection = useMetaStore((state) => state.activeVehicleId !== null);
  const explorerVisible = useMetaStore((state) => state.explorerVisible);
  const setExplorerVisible = useMetaStore((state) => state.setExplorerVisible);
  const setSidebarCollapsed = useMetaStore((state) => state.setSidebarCollapsed);
  const workspacePath = useMetaStore((state) => state.workspacePath);
  const workspaceMetaFiles = useMetaStore((state) => state.workspaceMetaFiles);
  const workspaceSidebarProfile = useMetaStore((state) => state.workspaceSidebarProfile);
  const globalSidebarProfile = useSidebarCustomizationStore((state) => state.globalProfile);
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

  const [explorerSearch, setExplorerSearch] = useState("");
  const [earlyAccessMode, setEarlyAccessMode] = useState<MetaFileType | null>(null);

  const sidebarCustomization = useMemo(
    () => resolveSidebarCustomization(globalSidebarProfile, workspaceSidebarProfile),
    [globalSidebarProfile, workspaceSidebarProfile],
  );

  const effectiveExplorerVisible =
    explorerVisible
    && !collapsed
    && sidebarCustomization.visibleItemIds.includes("workspace-toggle");

  const workspaceName = activeWorkspace?.name
    ?? workspacePath?.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop()
    ?? null;

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

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 56 : 288 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          <motion.div variants={sectionVariants} initial="hidden" animate="show" className="space-y-2">
            {sidebarCustomization.visibleItemIds.map((itemId) => {
              if (itemId === "workspace-header") {
                if (collapsed || !workspaceName) {
                  return null;
                }

                return (
                  <motion.div key={itemId} variants={itemVariants} initial="show">
                    <SidebarSectionCard icon={FolderTree} label={sidebarCustomization.labels[itemId]}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-sidebar-foreground">
                            {workspaceName}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Active resource workspace
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {workspaceMetaFiles.length} file{workspaceMetaFiles.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </SidebarSectionCard>
                  </motion.div>
                );
              }

              if (itemId === "preset-picker") {
                if (collapsed || !hasSelection) {
                  return null;
                }

                return (
                  <motion.div key={itemId} variants={itemVariants} initial="show">
                    <SidebarSectionCard icon={Command} label={sidebarCustomization.labels[itemId]}>
                      <PresetPicker />
                    </SidebarSectionCard>
                  </motion.div>
                );
              }

              const Icon = SIDEBAR_ACTION_ICONS[itemId];

              if (itemId === "workspace-toggle") {
                return (
                  <motion.div key={itemId} variants={itemVariants} initial="show" className="space-y-2">
                    <SidebarAction
                      collapsed={collapsed}
                      label={sidebarCustomization.labels[itemId]}
                      icon={Icon}
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

                    <AnimatePresence initial={false}>
                      {effectiveExplorerVisible && (
                        <motion.div
                          key="workspace-explorer"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-background/35"
                        >
                          <div className="p-2">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60" />
                              <Input
                                value={explorerSearch}
                                onChange={(event) => setExplorerSearch(event.target.value)}
                                placeholder={`Filter ${sidebarCustomization.labels[itemId].toLowerCase()}...`}
                                className="h-8 border-sidebar-border bg-background pl-7 pr-2 text-[11px]"
                              />
                            </div>
                          </div>
                          <div className="h-64 min-h-0 px-2 pb-2">
                            <WorkspaceExplorer filterQuery={explorerSearch} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              }

              if (itemId === "open-folder") {
                return (
                  <motion.div key={itemId} variants={itemVariants} initial="show">
                    <SidebarAction
                      collapsed={collapsed}
                      label={sidebarCustomization.labels[itemId]}
                      icon={Icon}
                      onClick={onOpenFolder}
                    />
                  </motion.div>
                );
              }

              if (itemId === "open-file") {
                return (
                  <motion.div key={itemId} variants={itemVariants} initial="show">
                    <SidebarAction
                      collapsed={collapsed}
                      label={sidebarCustomization.labels[itemId]}
                      icon={Icon}
                      onClick={onOpenFile}
                    />
                  </motion.div>
                );
              }

              if (itemId === "meta-merging") {
                return (
                  <motion.div key={itemId} variants={itemVariants} initial="show">
                    <SidebarAction
                      collapsed={collapsed}
                      label={sidebarCustomization.labels[itemId]}
                      icon={Icon}
                      active={uiView === "merge"}
                      onMouseEnter={() => {
                        void prefetchMergeView();
                      }}
                      onClick={() => setUIView("merge")}
                    />
                  </motion.div>
                );
              }

              if (!isMetaSidebarItemId(itemId)) {
                return null;
              }

              const count = metaTypeCounts[itemId];

              return (
                <motion.div key={itemId} variants={itemVariants} initial="show">
                  <SidebarAction
                    collapsed={collapsed}
                    label={sidebarCustomization.labels[itemId]}
                    icon={Icon}
                    active={uiView === "workspace" && activeTab === itemId}
                    disabled={!hasSelection}
                    badge={count}
                    onMouseEnter={() => {
                      void PREFETCH_BY_TAB[itemId]();
                    }}
                    onClick={() => {
                      setActiveTab(itemId);
                      setUIView("workspace");
                      if (shouldShowEarlyAccess(itemId)) {
                        setEarlyAccessMode(itemId);
                      }
                    }}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.aside>

      <EarlyAccessModal
        mode={earlyAccessMode}
        onDismiss={() => setEarlyAccessMode(null)}
        onOpenFeedback={() => {
          setEarlyAccessMode(null);
          onOpenFeedback?.();
        }}
      />
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

function SidebarAction({
  collapsed,
  label,
  icon: Icon,
  onClick,
  onMouseEnter,
  active,
  disabled,
  badge,
}: SidebarActionProps) {
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
              className="ml-2 overflow-hidden whitespace-nowrap text-xs"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
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
              <Badge
                variant={active ? "default" : "outline"}
                className="rounded-md px-1.5 py-0 text-[9px] tabular-nums"
              >
                {badge}
              </Badge>
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );

  if (!collapsed) {
    return button;
  }

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
