import type { ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PresetPicker } from "@/components/PresetPicker";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
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

  const effectiveExplorerVisible = explorerVisible && !collapsed;

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 56 : 288 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="h-full border-r border-[#131a2b] bg-[#050d21] flex flex-col"
      >
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
        </motion.div>

        {!collapsed && (
          <>
            <Separator className="bg-[#131a2b]" />
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

        <Separator className="bg-[#131a2b]" />

        {effectiveExplorerVisible ? (
          <div className="flex-1 min-h-0 p-2">
            <div className="h-full min-h-0">
              <WorkspaceExplorer />
            </div>
          </div>
        ) : (
          <motion.nav variants={sectionVariants} initial="hidden" animate="show" className="p-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <motion.div key={item.key} variants={itemVariants}>
                <SidebarAction
                  collapsed={collapsed}
                  label={item.label}
                  icon={item.icon}
                  active={uiView === "workspace" && activeTab === item.key}
                  disabled={!hasSelection}
                  onMouseEnter={() => {
                    void prefetchByTab[item.key]();
                  }}
                  onClick={() => {
                    setActiveTab(item.key);
                    setUIView("workspace");
                  }}
                />
              </motion.div>
            ))}
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
}

function SidebarAction({ collapsed, label, icon: Icon, onClick, onMouseEnter, active, disabled }: SidebarActionProps) {
  const button = (
    <motion.div whileHover={{ x: 1.5 }} transition={{ duration: 0.16 }}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full h-9 border border-transparent text-slate-300 hover:bg-[#14233b] hover:text-slate-100",
          collapsed ? "px-0" : "justify-start px-2",
          active && "bg-[#1b2c47] border-[#2a3f60] text-[#dbe8ff] shadow-[inset_0_0_0_1px_rgba(93,129,184,0.2)]",
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
      </Button>
    </motion.div>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" className="border-[#2a3f60] bg-[#111c31] text-slate-100">{label}</TooltipContent>
    </Tooltip>
  );
}
