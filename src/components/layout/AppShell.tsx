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
import { ValidationPanel } from "@/components/ValidationPanel";
import type { ValidationIssue } from "@/lib/xml-validator";

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
  onSaveFile?: () => void;
  validationIssues?: ValidationIssue[];
  validationFileName?: string;
  onDismissValidation?: () => void;
}

export function AppShell({ onOpenFile, onSaveFile, validationIssues, validationFileName, onDismissValidation }: AppShellProps) {
  const codePreviewVisible = useMetaStore((s) => s.codePreviewVisible);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <Toolbar onOpenFile={onOpenFile} onSaveFile={onSaveFile} />

      {validationIssues && validationIssues.length > 0 && onDismissValidation && (
        <ValidationPanel
          issues={validationIssues}
          fileName={validationFileName}
          onDismiss={onDismissValidation}
        />
      )}

      <div className="flex-1 overflow-hidden" style={{ height: "100%" }}>
        <Group orientation="horizontal" id="metagen-panels" style={{ height: "100%" }}>
          <Panel defaultSize={60} minSize={30}>
            <EditorPanel />
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
      </div>

      <StatusBar />
    </div>
  );
}
