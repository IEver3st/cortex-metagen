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

const sidebarVariants = {
  collapsed: { width: 56 },
  expanded: { width: 240 },
};

const contentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
};

const labelVariants = {
  hidden: { opacity: 0, width: 0, marginLeft: 0 },
  show: {
    opacity: 1,
    width: "auto",
    marginLeft: 10,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    width: 0,
    marginLeft: 0,
    transition: { duration: 0.15 },
  },
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
        animate={collapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ type: "spring", stiffness: 350, damping: 32 }}
        className="h-full border-r border-[#131a2b] bg-[#050d21] flex flex-col relative overflow-hidden"
      >
        <div className={cn("px-2 py-2.5 flex flex-col gap-2", collapsed && "items-center")}>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="workspace-label"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium"
              >
                Workspace
              </motion.span>
            )}
          </AnimatePresence>

          <SidebarAction
            collapsed={collapsed}
            label="Explorer"
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
        </div>

        <Separator className="bg-[#131a2b] shrink-0" />

        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="show"
          className="px-2 py-2 space-y-0.5"
        >
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

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="shrink-0"
            >
              <Separator className="bg-[#131a2b]" />
              <div className="p-2 space-y-2">
                {hasSelection && <PresetPicker />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Separator className="bg-[#131a2b] shrink-0" />

        {effectiveExplorerVisible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 p-2"
          >
            {!collapsed && (
              <div className="pb-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium">Explorer</span>
              </div>
            )}
            <div className="h-full min-h-0">
              <WorkspaceExplorer />
            </div>
          </motion.div>
        ) : (
          <motion.nav
            variants={contentVariants}
            initial="hidden"
            animate="show"
            className="p-2 space-y-0.5 overflow-y-auto flex-1"
          >
            {navItems.map((item) => (
              <motion.div key={item.key} variants={itemVariants}>
                <SidebarAction
                  collapsed={collapsed}
                  label={item.label}
                  icon={item.icon}
                  active={uiView === "workspace" && activeTab === item.key}
                  disabled={!hasSelection}
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
  active?: boolean;
  disabled?: boolean;
}

function SidebarAction({ collapsed, label, icon: Icon, onClick, active, disabled }: SidebarActionProps) {
  const button = (
    <motion.div
      layout
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full h-8 border border-transparent text-slate-400",
          "hover:bg-[#0d1a2d] hover:text-slate-200",
          collapsed ? "px-0 justify-center" : "justify-start px-2",
          active && "bg-[#0f2238] border-[#1e3a5f] text-[#a8d4ff] shadow-[inset_0_0_0_1px_rgba(56,139,253,0.15)]",
          disabled && "opacity-40 pointer-events-none",
        )}
        onClick={onClick}
        disabled={disabled}
      >
        <motion.div
          layout
          className="flex items-center justify-center shrink-0"
        >
          <Icon className="h-4 w-4" />
        </motion.div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="sidebar-label"
              variants={labelVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="text-[11px] font-medium tracking-wide whitespace-nowrap overflow-hidden"
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
      <TooltipContent
        side="right"
        sideOffset={8}
        className="border-[#1e3a5f] bg-[#0a1628] text-slate-200 text-[11px] font-medium shadow-lg"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
