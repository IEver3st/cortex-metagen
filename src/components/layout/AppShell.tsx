import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ValidationIssue } from "@/lib/xml-validator";
import { useMetaStore } from "@/store/meta-store";

import { IdeSidebar } from "./IdeSidebar";
import { ProblemsPanel } from "./ProblemsPanel";
import { SettingsView } from "./SettingsView";
import { StatusBar } from "./StatusBar";
import { Toolbar } from "./Toolbar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceHome } from "./WorkspaceHome";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { WorkspaceSwitcherWorkspace } from "@/store/workspace-switcher-store";

const CodePreview = lazy(() => import("./CodePreview").then((module) => ({ default: module.CodePreview })));
const HandlingEditor = lazy(() => import("@/components/editors/HandlingEditor").then((module) => ({ default: module.HandlingEditor })));
const VehiclesEditor = lazy(() => import("@/components/editors/VehiclesEditor").then((module) => ({ default: module.VehiclesEditor })));
const CarcolsEditor = lazy(() => import("@/components/editors/CarcolsEditor").then((module) => ({ default: module.CarcolsEditor })));
const CarvariationsEditor = lazy(() => import("@/components/editors/CarvariationsEditor").then((module) => ({ default: module.CarvariationsEditor })));
const VehicleLayoutsEditor = lazy(() => import("@/components/editors/VehicleLayoutsEditor").then((module) => ({ default: module.VehicleLayoutsEditor })));
const ModkitsEditor = lazy(() => import("@/components/editors/ModkitsEditor").then((module) => ({ default: module.ModkitsEditor })));
const MetaMergingView = lazy(() => import("@/components/layout/MetaMergingView").then((module) => ({ default: module.MetaMergingView })));

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
          className="absolute left-1/2 top-0 h-1/2 w-[2px] origin-bottom rounded-full bg-primary"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
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
    <Card className="m-4 border-border/70 bg-card/70 py-4 shadow-sm">
      <CardHeader className="px-4 pb-2">
        <CardTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <PinwheelSpinner />
          Loading editor…
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        <div className="h-9 animate-pulse rounded-lg border border-border/70 bg-muted/40" />
        <div className="h-28 animate-pulse rounded-lg border border-border/70 bg-muted/40" />
        <div className="h-28 animate-pulse rounded-lg border border-border/70 bg-muted/40" />
      </CardContent>
    </Card>
  );
}

function EmptyEditorState({ label }: { label: string }) {
  const activeVehicleId = useMetaStore((state) => state.activeVehicleId);
  const vehicles = useMetaStore((state) => state.vehicles);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-lg border-border/80 bg-card/80 shadow-sm">
        <CardHeader>
          <p className="panel-label">Missing data</p>
          <CardTitle className="text-base font-medium">
            {label}.meta is not loaded for {activeVehicle?.name ?? "this vehicle"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Import the matching meta file or switch to a tab that already has source data.
        </CardContent>
      </Card>
    </div>
  );
}

function EditorPanel() {
  const activeTab = useMetaStore((state) => state.activeTab);
  const activeVehicleId = useMetaStore((state) => state.activeVehicleId);
  const vehicles = useMetaStore((state) => state.vehicles);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;
  const hasData = activeVehicle?.loadedMeta?.has(activeTab);

  if (activeVehicle && !hasData && activeTab !== "modkits") {
    return <EmptyEditorState label={activeTab} />;
  }

  return (
    <ScrollArea className="h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="min-h-full"
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
  onExportAll?: () => Promise<void>;
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
  problemsPanelVisible?: boolean;
  onToggleProblemsPanel?: () => void;
  workspaceSwitcherOpen?: boolean;
  workspaceSwitcherWorkspaceCount?: number;
  switcherWorkspaces?: WorkspaceSwitcherWorkspace[];
  activeWorkspaceId?: string | null;
  highlightedWorkspaceId?: string | null;
  hoveredWorkspaceId?: string | null;
  keyboardPreviewActive?: boolean;
  renamingWorkspaceId?: string | null;
  deleteConfirmationId?: string | null;
  onHoverWorkspace?: (workspaceId: string | null) => void;
  onHighlightWorkspace?: (workspaceId: string | null) => void;
  onActivateWorkspace?: (workspaceId: string) => void;
  onCreateWorkspace?: () => void;
  onRenameWorkspace?: (workspaceId: string, name: string) => void;
  onSetRenamingWorkspace?: (workspaceId: string | null) => void;
  onRequestDeleteWorkspace?: (workspaceId: string | null) => void;
  onDeleteWorkspace?: (workspaceId: string) => void;
}

export function AppShell({
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onExportAll,
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
  problemsPanelVisible = true,
  onToggleProblemsPanel,
  workspaceSwitcherOpen = false,
  workspaceSwitcherWorkspaceCount = 0,
  switcherWorkspaces = [],
  activeWorkspaceId = null,
  highlightedWorkspaceId = null,
  hoveredWorkspaceId = null,
  keyboardPreviewActive = false,
  renamingWorkspaceId = null,
  deleteConfirmationId = null,
  onHoverWorkspace,
  onHighlightWorkspace,
  onActivateWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onSetRenamingWorkspace,
  onRequestDeleteWorkspace,
  onDeleteWorkspace,
}: AppShellProps) {
  const codePreviewVisible = useMetaStore((state) => state.codePreviewVisible);
  const vehicles = useMetaStore((state) => state.vehicles);
  const hasVehicles = Object.keys(vehicles).length > 0;
  const uiView = useMetaStore((state) => state.uiView);
  const setUIView = useMetaStore((state) => state.setUIView);
  const sidebarCollapsed = useMetaStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useMetaStore((state) => state.toggleSidebarCollapsed);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background-app text-foreground">
      <Toolbar
        onOpenFile={onOpenFile}
        onOpenFolder={onOpenFolder}
        onSaveFile={onSaveFile}
        onExportAll={onExportAll}
        onOpenRecentFile={onOpenRecentFile}
        onOpenRecentWorkspace={onOpenRecentWorkspace}
        recentFiles={recentFiles}
        onGoHome={() => setUIView("home")}
        onGoSettings={() => setUIView("settings")}
        onToggleSidebar={toggleSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        uiView={uiView}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden border-t border-border/70 bg-background-app">
        <div
          className="flex min-h-0 flex-1 overflow-hidden"
          style={{
            opacity: workspaceSwitcherOpen ? 0.4 : 1,
            transform: workspaceSwitcherOpen ? "scale(0.97)" : "scale(1)",
            transformOrigin: "center top",
            transition: workspaceSwitcherOpen
              ? "transform 180ms ease-out, opacity 180ms ease-out"
              : "transform 180ms ease-in, opacity 180ms ease-in",
          }}
        >
          <IdeSidebar
            collapsed={sidebarCollapsed}
            onOpenFile={onOpenFile}
            onOpenFolder={onOpenFolder}
            uiView={uiView}
          />

          <div className="min-w-0 flex-1 overflow-hidden">
            {uiView === "settings" ? (
              <SettingsView onClearSession={onClearSession} />
            ) : uiView === "merge" ? (
              <Suspense fallback={<EditorFallback />}>
                <MetaMergingView />
              </Suspense>
            ) : uiView === "workspace" && hasVehicles ? (
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
                    <WorkspaceHeader />
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <EditorPanel />
                    </div>
                  </div>
                </ResizablePanel>

                {codePreviewVisible ? (
                  <>
                    <ResizableHandle className="w-1.5" />
                    <ResizablePanel defaultSize={40} minSize={20}>
                      <Suspense fallback={<EditorFallback />}>
                        <CodePreview />
                      </Suspense>
                    </ResizablePanel>
                  </>
                ) : null}
              </ResizablePanelGroup>
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

        <WorkspaceSwitcher
          open={workspaceSwitcherOpen}
          workspaces={switcherWorkspaces}
          activeWorkspaceId={activeWorkspaceId}
          highlightedWorkspaceId={highlightedWorkspaceId}
          hoveredWorkspaceId={hoveredWorkspaceId}
          keyboardPreviewActive={keyboardPreviewActive}
          renamingWorkspaceId={renamingWorkspaceId}
          deleteConfirmationId={deleteConfirmationId}
          onHoverWorkspace={onHoverWorkspace ?? (() => undefined)}
          onHighlightWorkspace={onHighlightWorkspace ?? (() => undefined)}
          onActivateWorkspace={onActivateWorkspace ?? (() => undefined)}
          onCreateWorkspace={onCreateWorkspace ?? (() => undefined)}
          onRenameWorkspace={onRenameWorkspace ?? (() => undefined)}
          onSetRenamingWorkspace={onSetRenamingWorkspace ?? (() => undefined)}
          onRequestDeleteWorkspace={onRequestDeleteWorkspace ?? (() => undefined)}
          onDeleteWorkspace={onDeleteWorkspace ?? (() => undefined)}
        />
      </div>

      <AnimatePresence>
        {validationIssues && validationIssues.length > 0 ? (
          <ProblemsPanel
            issues={validationIssues}
            fileName={validationFileName}
            onDismiss={onDismissValidation}
            visible={problemsPanelVisible}
            onToggleVisible={onToggleProblemsPanel}
          />
        ) : null}
      </AnimatePresence>

      <StatusBar
        workspacePath={workspacePath}
        workspaceMetaFileCount={workspaceMetaFileCount}
        validationIssues={validationIssues}
        validationFileName={validationFileName}
        onDismissValidation={onDismissValidation}
        problemsPanelVisible={problemsPanelVisible}
        onToggleProblemsPanel={onToggleProblemsPanel}
        workspaceSwitcherOpen={workspaceSwitcherOpen}
        workspaceCount={workspaceSwitcherWorkspaceCount}
      />

      {isDragActive ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-primary/8">
          <Card className="border-primary/35 bg-card/95 px-6 py-5 shadow-sm">
            <CardContent className="p-0 text-sm font-medium text-primary">
              Drop a `.meta` or `.xml` file to import.
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

