import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useMetaStore, type MetaFileType, type VehicleEntry } from "@/store/meta-store";
import { parseMetaFile, detectMetaType } from "@/lib/xml-parser";
import { validateMetaXml, type ValidationIssue } from "@/lib/xml-validator";
import { serializeActiveTab } from "@/lib/xml-serializer";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { RestoreSessionDialog } from "@/components/layout/RestoreSessionDialog";

const SESSION_KEY = "cortex-metagen.session.v1";
const ALL_META_TYPES: MetaFileType[] = ["handling", "vehicles", "carcols", "carvariations", "vehiclelayouts", "modkits"];

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function detectDuplicateEntryIssues(vehicles: Record<string, VehicleEntry>): ValidationIssue[] {
  const modelGroups = new Map<string, string[]>();
  const handlingGroups = new Map<string, string[]>();

  for (const vehicle of Object.values(vehicles)) {
    const model = normalizeKey(vehicle.vehicles.modelName);
    const handling = normalizeKey(vehicle.vehicles.handlingId);
    if (model) modelGroups.set(model, [...(modelGroups.get(model) ?? []), vehicle.vehicles.modelName]);
    if (handling) handlingGroups.set(handling, [...(handlingGroups.get(handling) ?? []), vehicle.vehicles.handlingId]);
  }

  const issues: ValidationIssue[] = [];
  for (const [key, values] of modelGroups.entries()) {
    if (values.length > 1) {
      issues.push({
        line: 1,
        severity: "warning",
        message: `Duplicate modelName detected: ${key}`,
        context: "Each vehicle entry should use a unique modelName.",
      });
    }
  }
  for (const [key, values] of handlingGroups.entries()) {
    if (values.length > 1) {
      issues.push({
        line: 1,
        severity: "warning",
        message: `Duplicate handlingId detected: ${key}`,
        context: "Each vehicle entry should use a unique handlingId.",
      });
    }
  }

  return issues;
}

function App() {
  const setUIView = useMetaStore((s) => s.setUIView);
  const loadVehicles = useMetaStore((s) => s.loadVehicles);
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeTab = useMetaStore((s) => s.activeTab);
  const setActiveTab = useMetaStore((s) => s.setActiveTab);
  const setFilePath = useMetaStore((s) => s.setFilePath);
  const setSourceFilePath = useMetaStore((s) => s.setSourceFilePath);
  const sourceFileByType = useMetaStore((s) => s.sourceFileByType);
  const setWorkspace = useMetaStore((s) => s.setWorkspace);
  const workspacePath = useMetaStore((s) => s.workspacePath);
  const workspaceMetaFiles = useMetaStore((s) => s.workspaceMetaFiles);
  const markClean = useMetaStore((s) => s.markClean);
  const addRecentFile = useMetaStore((s) => s.addRecentFile);
  const addRecentWorkspace = useMetaStore((s) => s.addRecentWorkspace);
  const recentFiles = useMetaStore((s) => s.recentFiles);
  const recentWorkspaces = useMetaStore((s) => s.recentWorkspaces);
  const undo = useMetaStore((s) => s.undo);
  const redo = useMetaStore((s) => s.redo);
  const canUndo = useMetaStore((s) => s.canUndo);
  const canRedo = useMetaStore((s) => s.canRedo);
  const getSessionSnapshot = useMetaStore((s) => s.getSessionSnapshot);
  const hydrateSessionSnapshot = useMetaStore((s) => s.hydrateSessionSnapshot);
  const isDirty = useMetaStore((s) => s.isDirty);
  const setLastAutoSavedAt = useMetaStore((s) => s.setLastAutoSavedAt);

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationFileName, setValidationFileName] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingSnapshot, setPendingSnapshot] = useState<any>(null);
  const duplicateIssues = detectDuplicateEntryIssues(vehicles);

  const openMetaPath = useCallback(async (filePath: string) => {
    const content = await invoke<string>("read_meta_file", { path: filePath });

    const validation = validateMetaXml(content);
    const fileName = filePath.split(/[/\\]/).pop() ?? "";
    const detectedType = detectMetaType(content, fileName);
    const parsedVehicles = parseMetaFile(content, {}, fileName);

    setValidationFileName(fileName);
    setValidationIssues(validation.issues);

    loadVehicles(parsedVehicles);
    for (const type of ALL_META_TYPES) {
      setSourceFilePath(type, null);
    }
    if (detectedType) {
      setActiveTab(detectedType);
      setSourceFilePath(detectedType, filePath);
    }
    setFilePath(filePath);
    setWorkspace(null, []);
    addRecentFile(filePath);
    markClean();
  }, [loadVehicles, setActiveTab, setFilePath, setSourceFilePath, setWorkspace, addRecentFile, markClean]);

  const collectMetaFiles = useCallback(async (rootPath: string): Promise<string[]> => {
    return invoke<string[]>("list_workspace_meta_files", { path: rootPath });
  }, []);

  const openWorkspacePath = useCallback(async (folderPath: string) => {
    try {
      const metaPaths = await collectMetaFiles(folderPath);

      if (metaPaths.length === 0) {
        setValidationFileName("Workspace");
        setValidationIssues([
          {
            line: 1,
            severity: "warning",
            message: "No .meta or .xml files were found in this folder.",
            context: "Choose a GTA vehicle resource that contains handling, vehicles, carcols, or carvariations metadata files.",
          },
        ]);
        return;
      }

      let mergedVehicles: Record<string, VehicleEntry> = {};
      const issues: ValidationIssue[] = [];
      const loadedWorkspaceFiles: string[] = [];
      let firstDetectedType: typeof activeTab | null = null;
      const nextSourceFileByType: Partial<Record<MetaFileType, string>> = {};

      for (const path of metaPaths) {
        try {
          const content = await invoke<string>("read_meta_file", { path });
          const fileName = path.split(/[/\\]/).pop() ?? "";
          const detectedType = detectMetaType(content, fileName);
          if (!detectedType) continue;

          const validation = validateMetaXml(content);
          mergedVehicles = parseMetaFile(content, mergedVehicles, fileName);
          loadedWorkspaceFiles.push(path);
          if (!firstDetectedType) firstDetectedType = detectedType;
          if (!nextSourceFileByType[detectedType]) {
            nextSourceFileByType[detectedType] = path;
          }

          for (const issue of validation.issues) {
            issues.push({
              ...issue,
              message: `[${fileName}] ${issue.message}`,
            });
          }
        } catch (error) {
          issues.push({
            line: 1,
            severity: "warning",
            message: `Failed to load ${path.split(/[/\\]/).pop() ?? path}`,
            context: String(error),
          });
        }
      }

      if (Object.keys(mergedVehicles).length === 0) {
        setValidationFileName("Workspace");
        setValidationIssues([
          {
            line: 1,
            severity: "warning",
            message: "No supported vehicle metadata files were parsed.",
            context: "Supported files include handling.meta, vehicles.meta, carcols.meta, carvariations.meta, and vehiclelayouts.meta.",
          },
        ]);
        return;
      }

      loadVehicles(mergedVehicles);
      setWorkspace(folderPath, loadedWorkspaceFiles);
      setFilePath(null);
      for (const type of ALL_META_TYPES) {
        setSourceFilePath(type, null);
      }
      for (const type of Object.keys(nextSourceFileByType)) {
        const metaType = type as MetaFileType;
        const path = nextSourceFileByType[metaType];
        if (path) setSourceFilePath(metaType, path);
      }
      if (firstDetectedType) setActiveTab(firstDetectedType);
      setValidationFileName("Workspace");
      setValidationIssues(issues);
      addRecentWorkspace(folderPath);
      markClean();
    } catch (err) {
      console.error("Failed to open workspace folder:", err);
    }
  }, [collectMetaFiles, loadVehicles, setWorkspace, setFilePath, setSourceFilePath, setActiveTab, addRecentWorkspace, markClean]);

  const handleOpenWorkspace = useCallback(async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: "Open Vehicle Resource Folder",
      });
      if (!selected || typeof selected !== "string") return;

      await openWorkspacePath(selected);
    } catch (err) {
      console.error("Failed to open workspace folder dialog:", err);
    }
  }, [openWorkspacePath]);

  const handleOpenFile = useCallback(async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Meta Files", extensions: ["meta", "xml"] }],
      });
      if (!selected) return;
      const filePath = typeof selected === "string" ? selected : selected;
      await openMetaPath(filePath as string);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [openMetaPath]);

  const handleSaveFile = useCallback(async () => {
    try {
      let targetPath = sourceFileByType[activeTab] ?? null;
      if (!targetPath) {
        targetPath = await saveDialog({
          filters: [{ name: "Meta Files", extensions: ["meta", "xml"] }],
          defaultPath: `${activeTab}.meta`,
        });
      }
      if (!targetPath) return;
      const vehicleList = Object.values(vehicles);
      const content = serializeActiveTab(activeTab, vehicleList);
      await invoke("write_meta_file", { path: targetPath, content });
      setSourceFilePath(activeTab, targetPath);
      setFilePath(targetPath);
      addRecentFile(targetPath);
      markClean();
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [vehicles, activeTab, sourceFileByType, setSourceFilePath, setFilePath, markClean, addRecentFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        handleOpenFile();
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      if ((e.ctrlKey && e.key.toLowerCase() === "y") || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenFile, handleSaveFile, undo, redo, canUndo, canRedo]);

  useEffect(() => {
    setUIView("home");
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const snapshot = JSON.parse(raw);

      if (Array.isArray(snapshot?.recentFiles)) {
        for (const recent of snapshot.recentFiles) {
          if (typeof recent === "string") addRecentFile(recent);
        }
      }
      if (Array.isArray(snapshot?.recentWorkspaces)) {
        for (const recent of snapshot.recentWorkspaces) {
          if (typeof recent === "string") addRecentWorkspace(recent);
        }
      }

      if (!snapshot?.vehicles || Object.keys(snapshot.vehicles).length === 0) return;
      setPendingSnapshot(snapshot);
      setRestoreOpen(true);
    } catch (error) {
      console.warn("Failed to read session snapshot:", error);
    }
  }, [setUIView, addRecentFile, addRecentWorkspace]);

  const restoreVehicleCount = pendingSnapshot?.vehicles ? Object.keys(pendingSnapshot.vehicles).length : 0;
  const restoreTimestamp = pendingSnapshot?.timestamp;

  const handleRestore = () => {
    if (!pendingSnapshot) return;
    hydrateSessionSnapshot(pendingSnapshot);
    setUIView("workspace");
    setRestoreOpen(false);
    setPendingSnapshot(null);
  };

  const handleDiscard = () => {
    setRestoreOpen(false);
    setPendingSnapshot(null);
    setUIView("home");
  };

  const handleClearSessionSnapshot = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
      setPendingSnapshot(null);
      setRestoreOpen(false);
      setLastAutoSavedAt(null);
    } catch (error) {
      console.warn("Failed to clear saved session snapshot:", error);
    }
  }, [setLastAutoSavedAt]);

  useEffect(() => {
    const autosaveId = window.setInterval(() => {
      if (!isDirty) return;
      try {
        const snapshot = getSessionSnapshot();
        localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
        setLastAutoSavedAt(Date.now());
      } catch (error) {
        console.warn("Auto-save failed:", error);
      }
    }, 30_000);

    const handleBeforeUnload = () => {
      try {
        const snapshot = getSessionSnapshot();
        localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
      } catch {}
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.clearInterval(autosaveId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, getSessionSnapshot, setLastAutoSavedAt]);

  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      setIsDragActive(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!event.relatedTarget) {
        setIsDragActive(false);
      }
    };

    const handleDrop = async (event: DragEvent) => {
      event.preventDefault();
      setIsDragActive(false);

      const droppedFile = event.dataTransfer?.files?.[0] as File & { path?: string };
      const filePath = droppedFile?.path;
      if (!filePath || !/\.(meta|xml)$/i.test(filePath)) return;

      try {
        await openMetaPath(filePath);
      } catch (error) {
        console.error("Failed to import dropped file:", error);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [openMetaPath]);

  return (
    <>
      <AppShell
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenWorkspace}
        onSaveFile={handleSaveFile}
        onOpenRecentFile={openMetaPath}
        onOpenRecentWorkspace={openWorkspacePath}
        recentFiles={recentFiles}
        recentWorkspaces={recentWorkspaces}
        validationIssues={[...validationIssues, ...duplicateIssues]}
        validationFileName={validationFileName}
        onDismissValidation={() => setValidationIssues([])}
        isDragActive={isDragActive}
        workspacePath={workspacePath}
        workspaceMetaFileCount={workspaceMetaFiles.length}
        onClearSession={handleClearSessionSnapshot}
      />

      <RestoreSessionDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        vehicleCount={restoreVehicleCount}
        timestamp={restoreTimestamp}
        onRestore={handleRestore}
        onDiscard={handleDiscard}
      />
    </>
  );
}

export default App;
