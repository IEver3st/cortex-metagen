import { lazy, Suspense, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Panel,
  Group,
  Separator as ResizeHandle,
} from "react-resizable-panels";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMetaStore } from "@/store/meta-store";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import type { ValidationIssue } from "@/lib/xml-validator";
import { IdeSidebar } from "./IdeSidebar";
import { SettingsView } from "./SettingsView";
import { WorkspaceHome } from "./WorkspaceHome";
import { WorkspaceHeader } from "./WorkspaceHeader";

const CodePreview = lazy(() => import("./CodePreview").then((m) => ({ default: m.CodePreview })));
const HandlingEditor = lazy(() => import("@/components/editors/HandlingEditor").then((m) => ({ default: m.HandlingEditor })));
const VehiclesEditor = lazy(() => import("@/components/editors/VehiclesEditor").then((m) => ({ default: m.VehiclesEditor })));
const CarcolsEditor = lazy(() => import("@/components/editors/CarcolsEditor").then((m) => ({ default: m.CarcolsEditor })));
const CarvariationsEditor = lazy(() => import("@/components/editors/CarvariationsEditor").then((m) => ({ default: m.CarvariationsEditor })));
const VehicleLayoutsEditor = lazy(() => import("@/components/editors/VehicleLayoutsEditor").then((m) => ({ default: m.VehicleLayoutsEditor })));
const ModkitsEditor = lazy(() => import("@/components/editors/ModkitsEditor").then((m) => ({ default: m.ModkitsEditor })));

function PinwheelSpinner() {
  const blades = [0, 60, 120, 180, 240, 300];
  return (
    <motion.div
      className="relative h-6 w-6"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
    >
      {blades.map((angle) => (
        <motion.div
          key={angle}
          className="absolute left-1/2 top-0 h-1/2 w-[3px] origin-bottom rounded-full"
          style={{
            transform: `translateX(-50%) rotate(${angle}deg)`,
            backgroundColor: "hsl(var(--primary))",
          }}
          initial={{ opacity: 0.25 }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: (angle / 360) * 1.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

function EditorFallback() {
  return (
    <motion.div
      className="flex items-center justify-center h-full text-muted-foreground text-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <PinwheelSpinner />
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          Loading editor…
        </motion.span>
      </div>
    </motion.div>
  );
}

function EditorPanel() {
  const activeTab = useMetaStore((s) => s.activeTab);
  const activeVehicleId = useMetaStore((s) => s.activeVehicleId);
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;

  const hasData = activeVehicle?.loadedMeta?.has(activeTab);

  // Modkits tab is always accessible — users can create kits from scratch
  if (activeVehicle && !hasData && activeTab !== "modkits") {
    return (
      <motion.div
        className="flex items-center justify-center h-full text-muted-foreground text-sm"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="text-center space-y-1">
          <p>No <span className="font-semibold">{activeTab}.meta</span> data loaded for <span className="font-semibold">{activeVehicle.name}</span></p>
          <p className="text-xs">Import a {activeTab}.meta file or switch to a tab with loaded data</p>
        </div>
      </motion.div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Suspense fallback={<EditorFallback />}>
            {activeTab === "handling" && <HandlingEditor />}
            {activeTab === "vehicles" && <VehiclesEditor />}
            {activeTab === "carcols" && <CarcolsEditor />}
            {activeTab === "modkits" && <ModkitsEditor />}
            {activeTab === "carvariations" && <CarvariationsEditor />}
            {activeTab === "vehiclelayouts" && <VehicleLayoutsEditor />}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </ScrollArea>
  );
}

interface AppShellProps {
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSaveFile?: () => void;
  onOpenRecentFile?: (path: string) => void;
  onOpenRecentWorkspace?: (path: string) => void;
  recentFiles?: string[];
  recentWorkspaces?: string[];
  validationIssues?: ValidationIssue[];
  validationFileName?: string;
  onDismissValidation?: () => void;
  isDragActive?: boolean;
  workspacePath?: string | null;
  workspaceMetaFileCount?: number;
  onClearSession?: () => void;
}

export function AppShell({
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onOpenRecentFile,
  onOpenRecentWorkspace,
  recentFiles,
  recentWorkspaces,
  validationIssues,
  validationFileName,
  onDismissValidation,
  isDragActive,
  workspacePath,
  workspaceMetaFileCount,
  onClearSession,
}: AppShellProps) {
  const codePreviewVisible = useMetaStore((s) => s.codePreviewVisible);
  const vehicles = useMetaStore((s) => s.vehicles);
  const hasVehicles = Object.keys(vehicles).length > 0;
  const uiView = useMetaStore((s) => s.uiView);
  const setUIView = useMetaStore((s) => s.setUIView);
  const sidebarCollapsed = useMetaStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useMetaStore((s) => s.toggleSidebarCollapsed);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#040d1a] text-slate-100">
      <Toolbar
        onOpenFile={onOpenFile}
        onOpenFolder={onOpenFolder}
        onSaveFile={onSaveFile}
        onOpenRecentFile={onOpenRecentFile}
        recentFiles={recentFiles}
        onGoHome={() => setUIView("home")}
        onGoSettings={() => setUIView("settings")}
        onToggleSidebar={toggleSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        uiView={uiView}
      />

      <div className="flex-1 overflow-hidden flex" style={{ height: "100%" }}>
        <IdeSidebar
          collapsed={sidebarCollapsed}
          onOpenFile={onOpenFile}
          onOpenFolder={onOpenFolder}
          uiView={uiView}
        />

        <div className="flex-1 overflow-hidden">
          {uiView === "settings" ? (
            <SettingsView
              onClearSession={onClearSession}
            />
          ) : uiView === "workspace" && hasVehicles ? (
            <Group orientation="horizontal" id="metagen-panels" style={{ height: "100%" }}>
              <Panel defaultSize={60} minSize={30}>
                <div className="h-full flex flex-col overflow-hidden">
                  <WorkspaceHeader />
                  <div className="flex-1 overflow-hidden">
                    <EditorPanel />
                  </div>
                </div>
              </Panel>

              {codePreviewVisible && (
                <>
                  <ResizeHandle className="w-1.5 bg-border hover:bg-primary/30 transition-colors cursor-col-resize" />
                  <Panel defaultSize={40} minSize={20}>
                    <Suspense fallback={<EditorFallback />}>
                      <CodePreview />
                    </Suspense>
                  </Panel>
                </>
              )}
            </Group>
          ) : (
            <WorkspaceHome
              onOpenFolder={onOpenFolder}
              onOpenFile={onOpenFile}
              onOpenRecentFile={onOpenRecentFile}
              onOpenRecentWorkspace={onOpenRecentWorkspace || onOpenFolder}
              recentFiles={recentFiles ?? []}
              recentWorkspaces={recentWorkspaces ?? []}
              workspacePath={workspacePath}
            />
          )}
        </div>
      </div>

      <StatusBar
        workspacePath={workspacePath}
        workspaceMetaFileCount={workspaceMetaFileCount}
        validationIssues={validationIssues}
        validationFileName={validationFileName}
        onDismissValidation={onDismissValidation}
      />

      {isDragActive && (
        <div className="absolute inset-0 z-50 pointer-events-none bg-primary/10 border-2 border-dashed border-primary/60 flex items-center justify-center">
          <div className="px-5 py-3 rounded-md border border-primary/40 bg-card/95 text-sm font-medium text-primary">
            Drop a .meta or .xml file to import
          </div>
        </div>
      )}
    </div>
  );
}
