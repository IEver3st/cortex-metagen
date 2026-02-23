import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useMetaStore, type MetaFileType, type SessionSnapshot, type VehicleEntry } from "@/store/meta-store";
import { parseMetaFile, detectMetaType, type ParseDiagnostic } from "@/lib/xml-parser";
import { validateMetaXml, type ValidationIssue } from "@/lib/xml-validator";
import { serializeActiveTab } from "@/lib/xml-serializer";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { RestoreSessionDialog } from "@/components/layout/RestoreSessionDialog";

const SESSION_KEY = "cortex-metagen.session.v1";
const SESSION_MAX_BYTES = 2_500_000;
const ALL_META_TYPES: MetaFileType[] = ["handling", "vehicles", "carcols", "carvariations", "vehiclelayouts", "modkits"];

interface InitialSessionState {
  pendingSnapshot: SessionSnapshot | null;
  recentFiles: string[];
  recentWorkspaces: string[];
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function isAbsolutePath(path: string): boolean {
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(path);
}

function joinWorkspacePath(workspaceRoot: string, relativePath: string): string {
  const root = workspaceRoot.replace(/[\\/]+$/, "");
  const rel = relativePath.replace(/^[\\/]+/, "").replaceAll("\\", "/");
  return `${root}/${rel}`;
}

function toWorkspaceRelativePath(workspaceRoot: string | null, path: string): string {
  if (!workspaceRoot || !isAbsolutePath(path)) return path;
  const normalizedRoot = workspaceRoot.replaceAll("\\", "/").replace(/\/+$/, "");
  const normalizedPath = path.replaceAll("\\", "/");
  if (!normalizedPath.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)) {
    return path;
  }
  return normalizedPath.slice(normalizedRoot.length + 1);
}

function resolveWorkspaceFilePath(workspaceRoot: string | null, storedPath: string | null): string | null {
  if (!storedPath) return null;
  if (isAbsolutePath(storedPath)) return storedPath;
  if (!workspaceRoot) return storedPath;
  return joinWorkspacePath(workspaceRoot, storedPath);
}

function detectDuplicateEntryIssues(vehicles: Record<string, VehicleEntry>): ValidationIssue[] {
  const modelGroups = new Map<string, VehicleEntry[]>();
  const handlingGroups = new Map<string, VehicleEntry[]>();

  for (const vehicle of Object.values(vehicles)) {
    const model = normalizeKey(vehicle.vehicles.modelName);
    const handling = normalizeKey(vehicle.vehicles.handlingId);
    if (model) modelGroups.set(model, [...(modelGroups.get(model) ?? []), vehicle]);
    if (handling) handlingGroups.set(handling, [...(handlingGroups.get(handling) ?? []), vehicle]);
  }

  const describeSources = (entries: VehicleEntry[]): string => {
    const sources = new Set<string>();
    for (const entry of entries) {
      for (const source of Object.values(entry.provenance?.byType ?? {})) {
        if (source) sources.add(source);
      }
    }
    if (sources.size === 0) return "Source file provenance unavailable.";
    return `Sources: ${[...sources].slice(0, 4).join(", ")}${sources.size > 4 ? "..." : ""}`;
  };

  const issues: ValidationIssue[] = [];
  for (const [key, entries] of modelGroups.entries()) {
    if (entries.length > 1) {
      issues.push({
        line: 1,
        severity: "warning",
        message: `Duplicate modelName detected: ${key}`,
        context: `${describeSources(entries)} Each vehicle entry should use a unique modelName.`,
      });
    }
  }
  for (const [key, entries] of handlingGroups.entries()) {
    if (entries.length > 1) {
      issues.push({
        line: 1,
        severity: "warning",
        message: `Duplicate handlingId detected: ${key}`,
        context: `${describeSources(entries)} Each vehicle entry should use a unique handlingId.`,
      });
    }
  }

  return issues;
}

function isSessionSnapshot(value: unknown): value is SessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SessionSnapshot>;
  if (!candidate.vehicles || typeof candidate.vehicles !== "object") return false;
  if (!Array.isArray(candidate.recentFiles)) return false;
  if (!Array.isArray(candidate.recentWorkspaces)) return false;
  return true;
}

function readInitialSessionState(): InitialSessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return {
        pendingSnapshot: null,
        recentFiles: [],
        recentWorkspaces: [],
      };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isSessionSnapshot(parsed)) {
      return {
        pendingSnapshot: null,
        recentFiles: [],
        recentWorkspaces: [],
      };
    }

    const recentFiles = parsed.recentFiles.filter((recent): recent is string => typeof recent === "string");
    const recentWorkspaces = parsed.recentWorkspaces.filter((recent): recent is string => typeof recent === "string");
    const hasVehicles = Object.keys(parsed.vehicles).length > 0;

    return {
      pendingSnapshot: hasVehicles ? parsed : null,
      recentFiles,
      recentWorkspaces,
    };
  } catch (error) {
    console.warn("Failed to read session snapshot:", error);
    return {
      pendingSnapshot: null,
      recentFiles: [],
      recentWorkspaces: [],
    };
  }
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
  const [initialSession] = useState<InitialSessionState>(readInitialSessionState);
  const [pendingSnapshot, setPendingSnapshot] = useState<SessionSnapshot | null>(initialSession.pendingSnapshot);
  const [restoreOpen, setRestoreOpen] = useState(Boolean(initialSession.pendingSnapshot));
  const duplicateIssues = detectDuplicateEntryIssues(vehicles);

  const openMetaPath = useCallback(async (filePath: string) => {
    const content = await invoke<string>("read_meta_file", { path: filePath });

    const validation = validateMetaXml(content);
    const fileName = filePath.split(/[/\\]/).pop() ?? "";
    const detectedType = detectMetaType(content, fileName);
    const parseDiagnostics: ParseDiagnostic[] = [];
    const parsedVehicles = parseMetaFile(content, {}, fileName, {
      sourcePath: filePath,
      diagnostics: parseDiagnostics,
    });

    setValidationFileName(fileName);
    setValidationIssues([
      ...validation.issues,
      ...parseDiagnostics.map((diagnostic) => ({
        line: 1,
        severity: diagnostic.severity,
        message: diagnostic.message,
        context: diagnostic.context,
      } satisfies ValidationIssue)),
    ]);

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

      for (const relativePath of metaPaths) {
        try {
          const absolutePath = joinWorkspacePath(folderPath, relativePath);
          const content = await invoke<string>("read_meta_file", { path: absolutePath });
          const fileName = relativePath.split(/[/\\]/).pop() ?? "";
          const detectedType = detectMetaType(content, fileName);
          if (!detectedType) continue;

          const validation = validateMetaXml(content);
          const parseDiagnostics: ParseDiagnostic[] = [];
          mergedVehicles = parseMetaFile(content, mergedVehicles, fileName, {
            sourcePath: relativePath,
            diagnostics: parseDiagnostics,
          });
          loadedWorkspaceFiles.push(relativePath);
          if (!firstDetectedType) firstDetectedType = detectedType;
          if (!nextSourceFileByType[detectedType]) {
            nextSourceFileByType[detectedType] = relativePath;
          }

          for (const issue of validation.issues) {
            issues.push({
              ...issue,
              message: `[${relativePath}] ${issue.message}`,
            });
          }

          for (const diagnostic of parseDiagnostics) {
            issues.push({
              line: 1,
              severity: diagnostic.severity,
              message: `[${relativePath}] ${diagnostic.message}`,
              context: diagnostic.context,
            });
          }
        } catch (error) {
          issues.push({
            line: 1,
            severity: "warning",
            message: `Failed to load ${relativePath}`,
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
      if (!selected || typeof selected !== "string") return;
      await openMetaPath(selected);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [openMetaPath]);

  const handleOpenRecentFile = useCallback(async (path: string) => {
    const resolved = resolveWorkspaceFilePath(workspacePath, path) ?? path;
    await openMetaPath(resolved);
  }, [openMetaPath, workspacePath]);

  const handleSaveFile = useCallback(async () => {
    try {
      let targetPath = resolveWorkspaceFilePath(workspacePath, sourceFileByType[activeTab] ?? null);
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

      const storedPath = toWorkspaceRelativePath(workspacePath, targetPath);
      setSourceFilePath(activeTab, storedPath);
      setFilePath(storedPath);
      addRecentFile(targetPath);
      markClean();
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [vehicles, activeTab, sourceFileByType, workspacePath, setSourceFilePath, setFilePath, markClean, addRecentFile]);

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
    for (const recent of initialSession.recentFiles) {
      addRecentFile(recent);
    }
    for (const recent of initialSession.recentWorkspaces) {
      addRecentWorkspace(recent);
    }
  }, [setUIView, addRecentFile, addRecentWorkspace, initialSession]);

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
    let pendingPersistHandle: number | null = null;

    const persistSnapshot = (updateTimestamp: boolean) => {
      try {
        const snapshot = getSessionSnapshot();
        const serialized = JSON.stringify(snapshot);

        if (serialized.length > SESSION_MAX_BYTES) {
          console.warn("Skipping session auto-save because snapshot is too large.");
          return;
        }

        localStorage.setItem(SESSION_KEY, serialized);
        if (updateTimestamp) {
          setLastAutoSavedAt(Date.now());
        }
      } catch (error) {
        console.warn("Session persistence failed:", error);
      }
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const cancelPendingPersist = () => {
      if (pendingPersistHandle === null) return;
      if (idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(pendingPersistHandle);
      } else {
        clearTimeout(pendingPersistHandle);
      }
      pendingPersistHandle = null;
    };

    const schedulePersist = () => {
      cancelPendingPersist();
      if (idleWindow.requestIdleCallback) {
        pendingPersistHandle = idleWindow.requestIdleCallback(() => {
          pendingPersistHandle = null;
          persistSnapshot(true);
        }, { timeout: 1200 });
        return;
      }

      pendingPersistHandle = setTimeout(() => {
        pendingPersistHandle = null;
        persistSnapshot(true);
      }, 150);
    };

    const autosaveId = window.setInterval(() => {
      if (!isDirty) return;
      schedulePersist();
    }, 30_000);

    const handleBeforeUnload = () => {
      if (!isDirty) return;
      cancelPendingPersist();
      persistSnapshot(false);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.clearInterval(autosaveId);
      cancelPendingPersist();
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
        onOpenRecentFile={handleOpenRecentFile}
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
