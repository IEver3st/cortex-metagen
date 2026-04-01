import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { WorkspaceRestoreBanner } from "@/components/layout/WorkspaceRestoreBanner";
import { UpdateToast } from "@/components/layout/UpdateToast";
import { useMetaStore, type MetaFileType, type SessionSnapshot, type VehicleEntry } from "@/store/meta-store";
import { parseMetaFile, detectMetaType, type ParseDiagnostic } from "@/lib/xml-parser";
import { validateMetaXml, type ValidationIssue } from "@/lib/xml-validator";
import { serializeActiveTab, serializeHandlingMeta, serializeVehiclesMeta, serializeCarcolsMeta, serializeCarvariationsMeta, serializeVehicleLayoutsMeta, serializeModkitsMeta } from "@/lib/xml-serializer";
import { useUpdateChecker } from "@/lib/updater";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { exists } from "@tauri-apps/plugin-fs";
import { RestoreSessionDialog } from "@/components/layout/RestoreSessionDialog";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { logger } from "@/lib/logger";
import { normalizeWorkspacePath, sanitizeWorkspaceDescriptors, sanitizeWorkspacePaths } from "@/lib/recent-workspaces";
import { useWorkspaceStore, type WorkspaceDescriptor } from "@/store/workspace-store";
import {
  buildPersistedWorkspaceSwitcherState,
  useWorkspaceSwitcherStore,
  type PersistedWorkspaceSwitcherState,
} from "@/store/workspace-switcher-store";

const SESSION_KEY = "cortex-metagen.session.v1";
const SESSION_MAX_BYTES = 2_500_000;
const WORKSPACE_DESCRIPTORS_KEY = "cortex-metagen.workspaces.v1";
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

    if (hasVehicles) {
      logger.info("session", "Prior session snapshot found", { vehicles: Object.keys(parsed.vehicles).length });
    }

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

function persistRecentWorkspacesToSession(recentWorkspaces: string[]): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;

    const parsed: unknown = JSON.parse(raw);
    if (!isSessionSnapshot(parsed)) return;

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...parsed,
      recentWorkspaces,
    }));
  } catch (error) {
    logger.warn("session", "Failed to persist sanitized recent workspaces", error);
  }
}

function persistWorkspaceDescriptors(descriptors: WorkspaceDescriptor[]): void {
  try {
    localStorage.setItem(WORKSPACE_DESCRIPTORS_KEY, JSON.stringify(descriptors));
  } catch (error) {
    logger.warn("workspace", "Failed to persist sanitized workspace descriptors", error);
  }
}

function setRecentWorkspaceState(paths: string[]): void {
  useMetaStore.setState({
    recentWorkspaces: sanitizeWorkspacePaths(paths, paths),
  });
}

function pruneWorkspaceDescriptorsState(validWorkspacePaths: Iterable<string>): void {
  const nextDescriptors = sanitizeWorkspaceDescriptors(
    useWorkspaceStore.getState().descriptors,
    validWorkspacePaths,
  );

  useWorkspaceStore.setState({ descriptors: nextDescriptors });
  persistWorkspaceDescriptors(nextDescriptors);
}

function removeWorkspacePathFromState(folderPath: string): void {
  const normalizedFolderPath = normalizeWorkspacePath(folderPath);
  const currentRecentWorkspaces = useMetaStore.getState().recentWorkspaces.filter(
    (path) => normalizeWorkspacePath(path) !== normalizedFolderPath,
  );
  setRecentWorkspaceState(currentRecentWorkspaces);
  persistRecentWorkspacesToSession(currentRecentWorkspaces);

  const descriptorRoots = useWorkspaceStore
    .getState()
    .descriptors
    .flatMap((descriptor) => descriptor.roots)
    .filter((path) => normalizeWorkspacePath(path) !== normalizedFolderPath);
  pruneWorkspaceDescriptorsState(descriptorRoots);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function createBlankWorkspaceSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    vehicles: {},
    activeVehicleId: null,
    uiView: "home",
    explorerVisible: true,
    filePath: null,
    workspacePath: null,
    workspaceMetaFiles: [],
    sourceFileByType: {},
    openVehicleIds: [],
    isDirty: false,
    timestamp: Date.now(),
  };
}

function App() {
  const setUIView = useMetaStore((s) => s.setUIView);
  const loadVehicles = useMetaStore((s) => s.loadVehicles);
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeTab = useMetaStore((s) => s.activeTab);
  const setActiveTab = useMetaStore((s) => s.setActiveTab);
  const filePath = useMetaStore((s) => s.filePath);
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
  const startNewProject = useMetaStore((s) => s.startNewProject);

  const toggleCommandPalette = useWorkspaceStore((s) => s.toggleCommandPalette);
  const openWorkspaceFromFolder = useWorkspaceStore((s) => s.openWorkspaceFromFolder);
  const workspaceSwitcherOpen = useWorkspaceSwitcherStore((s) => s.isOpen);
  const keyboardPreviewActive = useWorkspaceSwitcherStore((s) => s.keyboardPreviewActive);
  const switcherReady = useWorkspaceSwitcherStore((s) => s.ready);
  const switcherActiveWorkspaceId = useWorkspaceSwitcherStore((s) => s.activeWorkspaceId);
  const highlightedWorkspaceId = useWorkspaceSwitcherStore((s) => s.highlightedWorkspaceId);
  const hoveredWorkspaceId = useWorkspaceSwitcherStore((s) => s.hoveredWorkspaceId);
  const renamingWorkspaceId = useWorkspaceSwitcherStore((s) => s.renamingWorkspaceId);
  const deleteConfirmationId = useWorkspaceSwitcherStore((s) => s.deleteConfirmationId);
  const switcherWorkspaces = useWorkspaceSwitcherStore((s) => s.workspaces);
  const restoredUnsavedWorkspaceId = useWorkspaceSwitcherStore((s) => s.restoredUnsavedWorkspaceId);
  const initializeWorkspaceSwitcher = useWorkspaceSwitcherStore((s) => s.initialize);
  const openWorkspaceSwitcher = useWorkspaceSwitcherStore((s) => s.openSwitcher);
  const closeWorkspaceSwitcher = useWorkspaceSwitcherStore((s) => s.closeSwitcher);
  const setHoveredWorkspace = useWorkspaceSwitcherStore((s) => s.setHoveredWorkspace);
  const moveWorkspaceHighlight = useWorkspaceSwitcherStore((s) => s.moveHighlight);
  const setHighlightedWorkspace = useWorkspaceSwitcherStore((s) => s.setHighlightedWorkspace);
  const activateSwitcherWorkspace = useWorkspaceSwitcherStore((s) => s.activateWorkspace);
  const syncActiveWorkspace = useWorkspaceSwitcherStore((s) => s.syncActiveWorkspace);
  const createSwitcherWorkspace = useWorkspaceSwitcherStore((s) => s.createWorkspace);
  const renameSwitcherWorkspace = useWorkspaceSwitcherStore((s) => s.renameWorkspace);
  const setRenamingWorkspace = useWorkspaceSwitcherStore((s) => s.setRenamingWorkspace);
  const requestDeleteWorkspace = useWorkspaceSwitcherStore((s) => s.requestDeleteWorkspace);
  const deleteSwitcherWorkspace = useWorkspaceSwitcherStore((s) => s.deleteWorkspace);
  const dismissRestoredUnsavedState = useWorkspaceSwitcherStore((s) => s.dismissRestoredUnsavedState);

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationFileName, setValidationFileName] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [problemsPanelVisible, setProblemsPanelVisible] = useState(true);
  const [initialSession] = useState<InitialSessionState>(readInitialSessionState);
  const [pendingSnapshot, setPendingSnapshot] = useState<SessionSnapshot | null>(initialSession.pendingSnapshot);
  const [restoreOpen, setRestoreOpen] = useState(Boolean(initialSession.pendingSnapshot));
  const workspaceBootstrapRef = useRef(false);
  const update = useUpdateChecker();
  const duplicateIssues = detectDuplicateEntryIssues(vehicles);
  const restoredUnsavedWorkspace = useMemo(
    () => switcherWorkspaces.find((workspace) => workspace.id === restoredUnsavedWorkspaceId) ?? null,
    [restoredUnsavedWorkspaceId, switcherWorkspaces],
  );

  const syncActiveWorkspaceFromStore = useCallback((overrideSnapshot?: SessionSnapshot) => {
    const snapshot = overrideSnapshot ?? getSessionSnapshot();
    const openFiles = workspacePath
      ? workspaceMetaFiles
      : [snapshot.filePath, ...Object.values(snapshot.sourceFileByType)].filter(
          (path): path is string => typeof path === "string" && path.length > 0,
        );

    syncActiveWorkspace({
      folderPath: workspacePath,
      openFiles,
      activeFile: snapshot.filePath,
      snapshot,
      hasUnsavedState: snapshot.isDirty,
    });
  }, [getSessionSnapshot, syncActiveWorkspace, workspaceMetaFiles, workspacePath]);

  const activateWorkspace = useCallback((workspaceId: string) => {
    syncActiveWorkspaceFromStore();
    const targetWorkspace = useWorkspaceSwitcherStore.getState().workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
    if (!targetWorkspace) return;

    activateSwitcherWorkspace(workspaceId);
    if (targetWorkspace.snapshot) {
      hydrateSessionSnapshot(targetWorkspace.snapshot);
      setUIView(targetWorkspace.snapshot.uiView);
      setLastAutoSavedAt(targetWorkspace.snapshot.timestamp ?? Date.now());
      return;
    }

    startNewProject();
    setUIView("home");
    setWorkspace(targetWorkspace.folderPath, targetWorkspace.openFiles);
    setFilePath(targetWorkspace.activeFile);
    setLastAutoSavedAt(null);
  }, [
    activateSwitcherWorkspace,
    hydrateSessionSnapshot,
    setFilePath,
    setLastAutoSavedAt,
    setUIView,
    setWorkspace,
    startNewProject,
    syncActiveWorkspaceFromStore,
  ]);

  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    const fallbackWorkspaceId = switcherWorkspaces.find((workspace) => workspace.id !== workspaceId)?.id ?? null;
    const deletingActiveWorkspace = switcherActiveWorkspaceId === workspaceId;
    deleteSwitcherWorkspace(workspaceId);

    if (deletingActiveWorkspace && fallbackWorkspaceId) {
      window.setTimeout(() => {
        activateWorkspace(fallbackWorkspaceId);
      }, 0);
    }
  }, [activateWorkspace, deleteSwitcherWorkspace, switcherActiveWorkspaceId, switcherWorkspaces]);

  const openMetaPath = useCallback(async (filePath: string) => {
    logger.info("app", `Opening file: ${filePath}`);
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
        context: diagnostic.context ?? "",
      } satisfies ValidationIssue)),
    ]);

    if (!detectedType) {
      logger.warn("app", "Opened file but could not detect meta type", {
        filePath,
        fileName,
      });
    }

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
    logger.info("app", "File opened successfully", {
      filePath,
      detectedType: detectedType ?? "unknown",
      vehicles: Object.keys(parsedVehicles).length,
      validationIssues: validation.issues.length,
      parseDiagnostics: parseDiagnostics.length,
    });
  }, [loadVehicles, setActiveTab, setFilePath, setSourceFilePath, setWorkspace, addRecentFile, markClean]);

  const collectMetaFiles = useCallback(async (rootPath: string): Promise<string[]> => {
    return invoke<string[]>("list_workspace_meta_files", { path: rootPath });
  }, []);

  const filterExistingDirectories = useCallback(async (paths: string[]): Promise<string[]> => {
    const uniquePaths = Array.from(new Set(paths.map((path) => normalizeWorkspacePath(path))));
    const results = await Promise.all(
      uniquePaths.map(async (path) => {
        try {
          return await exists(path) ? path : null;
        } catch {
          return null;
        }
      }),
    );

    return results.filter((path): path is string => path !== null);
  }, []);

  const openWorkspacePath = useCallback(async (folderPath: string) => {
    try {
      logger.info("workspace", "Opening workspace folder", { folderPath });
      const metaPaths = await collectMetaFiles(folderPath);

      if (metaPaths.length === 0) {
        logger.warn("workspace", "Workspace contained no supported meta files", {
          folderPath,
        });
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
              context: diagnostic.context ?? "",
            });
          }
        } catch (error) {
          logger.warn("workspace", `Failed to load workspace file: ${relativePath}`, error);
          issues.push({
            line: 1,
            severity: "warning",
            message: `Failed to load ${relativePath}`,
            context: String(error),
          });
        }
      }

      if (Object.keys(mergedVehicles).length === 0) {
        logger.warn("workspace", "Workspace scan found files but parsed no supported data", {
          folderPath,
          scannedFiles: metaPaths.length,
        });
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
      logger.info("workspace", "Workspace opened successfully", {
        folderPath,
        scannedFiles: metaPaths.length,
        loadedFiles: loadedWorkspaceFiles.length,
        vehicles: Object.keys(mergedVehicles).length,
        issues: issues.length,
      });

      // Also register with workspace store for persistence
      void openWorkspaceFromFolder(folderPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Workspace path does not exist") || message.includes("Workspace path is not a directory")) {
        removeWorkspacePathFromState(folderPath);
      }
      logger.error("workspace", "Failed to open workspace folder", err);
    }
  }, [collectMetaFiles, loadVehicles, setWorkspace, setFilePath, setSourceFilePath, setActiveTab, addRecentWorkspace, markClean, openWorkspaceFromFolder]);

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
      logger.error("workspace", "Failed to open workspace folder dialog", err);
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
      logger.error("app", "Failed to open file", err);
    }
  }, [openMetaPath]);

  const handleOpenRecentFile = useCallback(async (path: string) => {
    const resolved = resolveWorkspaceFilePath(workspacePath, path) ?? path;
    logger.info("app", "Opening recent file", { path, resolved });
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
      logger.info("app", "Saved meta file", {
        targetPath,
        activeTab,
        vehicles: vehicleList.length,
      });
    } catch (err) {
      logger.error("app", "Failed to save file", err);
    }
  }, [vehicles, activeTab, sourceFileByType, workspacePath, setSourceFilePath, setFilePath, markClean, addRecentFile]);

  const handleExportAll = useCallback(async () => {
    try {
      const vehicleList = Object.values(vehicles);
      if (vehicleList.length === 0) return;

      const targetPath = await saveDialog({
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
        defaultPath: "data.zip",
      });
      if (!targetPath) return;

      const entries: { filename: string; content: string }[] = [
        { filename: "handling.meta", content: serializeHandlingMeta(vehicleList) },
        { filename: "vehicles.meta", content: serializeVehiclesMeta(vehicleList) },
        { filename: "carcols.meta", content: serializeCarcolsMeta(vehicleList) },
        { filename: "carvariations.meta", content: serializeCarvariationsMeta(vehicleList) },
        { filename: "vehiclelayouts.meta", content: serializeVehicleLayoutsMeta(vehicleList) },
        { filename: "modkits.meta", content: serializeModkitsMeta(vehicleList) },
      ];

      await invoke("write_zip_archive", { path: targetPath, entries });
      logger.info("app", "Exported archive", {
        targetPath,
        entries: entries.length,
        vehicles: vehicleList.length,
      });
    } catch (err) {
      logger.error("app", "Failed to export archive", err);
    }
  }, [vehicles]);

  useEffect(() => {
    if (workspaceBootstrapRef.current) return;
    workspaceBootstrapRef.current = true;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const raw = await invoke<string>("read_workspace_switcher_state");
        if (cancelled) return;

        const parsed = raw ? JSON.parse(raw) as PersistedWorkspaceSwitcherState : null;
        initializeWorkspaceSwitcher(parsed);
      } catch (error) {
        logger.warn("workspace-switcher", "Failed to read workspace switcher state", error);
        initializeWorkspaceSwitcher(null);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [initializeWorkspaceSwitcher]);

  useEffect(() => {
    if (!switcherReady || switcherWorkspaces.length > 0) return;

    const snapshot = pendingSnapshot ?? createBlankWorkspaceSnapshot(getSessionSnapshot());
    const createdWorkspaceId = createSwitcherWorkspace();
    activateSwitcherWorkspace(createdWorkspaceId);
    syncActiveWorkspaceFromStore(snapshot);
  }, [
    activateSwitcherWorkspace,
    createSwitcherWorkspace,
    getSessionSnapshot,
    pendingSnapshot,
    switcherReady,
    switcherWorkspaces.length,
    syncActiveWorkspaceFromStore,
  ]);

  useEffect(() => {
    if (!switcherReady || !switcherActiveWorkspaceId) return;

    syncActiveWorkspaceFromStore();
  }, [
    activeTab,
    filePath,
    getSessionSnapshot,
    isDirty,
    setFilePath,
    sourceFileByType,
    switcherActiveWorkspaceId,
    switcherReady,
    syncActiveWorkspaceFromStore,
    vehicles,
    workspaceMetaFiles,
    workspacePath,
  ]);

  useEffect(() => {
    if (!switcherReady) return;

    const timeoutId = window.setTimeout(() => {
      void invoke("write_workspace_switcher_state", {
        content: JSON.stringify(
          buildPersistedWorkspaceSwitcherState(switcherActiveWorkspaceId, switcherWorkspaces),
          null,
          2,
        ),
      }).catch((error) => {
        logger.warn("workspace-switcher", "Failed to persist workspace switcher state", error);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [switcherActiveWorkspaceId, switcherReady, switcherWorkspaces]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) && !(e.ctrlKey && e.key === "`")) {
        return;
      }

      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        if (workspaceSwitcherOpen) {
          closeWorkspaceSwitcher();
        } else {
          syncActiveWorkspaceFromStore();
          openWorkspaceSwitcher();
        }
        return;
      }

      if (workspaceSwitcherOpen) {
        if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
          e.preventDefault();
          const targetWorkspace = switcherWorkspaces[Number(e.key) - 1];
          if (targetWorkspace) {
            activateWorkspace(targetWorkspace.id);
          }
          return;
        }

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          moveWorkspaceHighlight(1);
          return;
        }

        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          moveWorkspaceHighlight(-1);
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          if (highlightedWorkspaceId) {
            activateWorkspace(highlightedWorkspaceId);
          }
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          closeWorkspaceSwitcher();
          return;
        }
      }

      // Command palette: Ctrl+Shift+P
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
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
  }, [
    activateWorkspace,
    canRedo,
    canUndo,
    closeWorkspaceSwitcher,
    handleOpenFile,
    handleSaveFile,
    highlightedWorkspaceId,
    moveWorkspaceHighlight,
    openWorkspaceSwitcher,
    redo,
    switcherWorkspaces,
    syncActiveWorkspaceFromStore,
    toggleCommandPalette,
    undo,
    workspaceSwitcherOpen,
  ]);

  useEffect(() => {
    logger.info("app", "Cortex Metagen started");
    setUIView("home");
    for (const recent of initialSession.recentFiles) {
      addRecentFile(recent);
    }

    let cancelled = false;

    const hydrateRecentWorkspaceState = async () => {
      try {
        const descriptorRoots = useWorkspaceStore.getState().descriptors.flatMap((descriptor) => descriptor.roots);
        const candidateWorkspacePaths = Array.from(new Set([
          ...initialSession.recentWorkspaces,
          ...descriptorRoots,
        ]));

        const validWorkspacePaths = await filterExistingDirectories(candidateWorkspacePaths);
        if (cancelled) return;

        const sanitizedRecentWorkspaces = sanitizeWorkspacePaths(initialSession.recentWorkspaces, validWorkspacePaths);
        setRecentWorkspaceState(sanitizedRecentWorkspaces);
        pruneWorkspaceDescriptorsState(validWorkspacePaths);
        persistRecentWorkspacesToSession(sanitizedRecentWorkspaces);
      } catch (error) {
        logger.warn("workspace", "Failed to validate recent workspace paths during startup", error);
        if (!cancelled) {
          setRecentWorkspaceState(initialSession.recentWorkspaces);
        }
      }
    };

    void hydrateRecentWorkspaceState();
    return () => {
      cancelled = true;
    };
  }, [setUIView, addRecentFile, filterExistingDirectories, initialSession]);

  const restoreVehicleCount = pendingSnapshot?.vehicles ? Object.keys(pendingSnapshot.vehicles).length : 0;
  const restoreTimestamp = pendingSnapshot?.timestamp;

  const handleRestore = () => {
    if (!pendingSnapshot) return;
    logger.info("session", "Restoring saved session snapshot", {
      vehicles: Object.keys(pendingSnapshot.vehicles).length,
      timestamp: pendingSnapshot.timestamp,
    });
    hydrateSessionSnapshot(pendingSnapshot);
    setUIView("workspace");
    setRestoreOpen(false);
    setPendingSnapshot(null);
  };

  const handleDiscard = () => {
    logger.info("session", "Discarded saved session snapshot");
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
      logger.info("session", "Cleared saved session snapshot");
    } catch (error) {
      logger.warn("session", "Failed to clear saved session snapshot", error);
    }
  }, [setLastAutoSavedAt]);

  useEffect(() => {
    let pendingPersistHandle: number | null = null;

    const persistSnapshot = (updateTimestamp: boolean) => {
      try {
        const snapshot = getSessionSnapshot();
        const serialized = JSON.stringify(snapshot);

        if (serialized.length > SESSION_MAX_BYTES) {
          logger.warn("session", "Skipping session auto-save because snapshot is too large", {
            bytes: serialized.length,
            limit: SESSION_MAX_BYTES,
          });
          return;
        }

        localStorage.setItem(SESSION_KEY, serialized);
        if (updateTimestamp) {
          setLastAutoSavedAt(Date.now());
        }
      } catch (error) {
        logger.warn("session", "Session persistence failed", error);
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
        logger.info("app", "Imported dropped file", { filePath });
      } catch (error) {
        logger.error("app", "Failed to import dropped file", error);
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

  const allIssues = [...validationIssues, ...duplicateIssues];

  return (
    <>
      <AppShell
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenWorkspace}
        onSaveFile={handleSaveFile}
        onExportAll={handleExportAll}
        onOpenRecentFile={handleOpenRecentFile}
        onOpenRecentWorkspace={openWorkspacePath}
        recentFiles={recentFiles}
        recentWorkspaces={recentWorkspaces}
        validationIssues={allIssues}
        validationFileName={validationFileName}
        onDismissValidation={() => setValidationIssues([])}
        isDragActive={isDragActive}
        workspacePath={workspacePath}
        workspaceMetaFileCount={workspaceMetaFiles.length}
        onClearSession={handleClearSessionSnapshot}
        problemsPanelVisible={problemsPanelVisible}
        onToggleProblemsPanel={() => setProblemsPanelVisible((v) => !v)}
        workspaceSwitcherOpen={workspaceSwitcherOpen}
        workspaceSwitcherWorkspaceCount={switcherWorkspaces.length}
        switcherWorkspaces={switcherWorkspaces}
        activeWorkspaceId={switcherActiveWorkspaceId}
        highlightedWorkspaceId={highlightedWorkspaceId}
        hoveredWorkspaceId={hoveredWorkspaceId}
        keyboardPreviewActive={keyboardPreviewActive}
        renamingWorkspaceId={renamingWorkspaceId}
        deleteConfirmationId={deleteConfirmationId}
        onHoverWorkspace={setHoveredWorkspace}
        onHighlightWorkspace={setHighlightedWorkspace}
        onActivateWorkspace={activateWorkspace}
        onCreateWorkspace={() => {
          const createdId = createSwitcherWorkspace();
          setRenamingWorkspace(createdId);
        }}
        onRenameWorkspace={renameSwitcherWorkspace}
        onSetRenamingWorkspace={setRenamingWorkspace}
        onRequestDeleteWorkspace={requestDeleteWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
      />

      <CommandPalette
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenWorkspace}
        onSaveFile={handleSaveFile}
        onExportAll={handleExportAll}
        onOpenRecentWorkspace={openWorkspacePath}
      />

      <RestoreSessionDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        vehicleCount={restoreVehicleCount}
        timestamp={restoreTimestamp}
        onRestore={handleRestore}
        onDiscard={handleDiscard}
      />

      <WorkspaceRestoreBanner
        open={restoredUnsavedWorkspace !== null}
        workspaceName={restoredUnsavedWorkspace?.name ?? "workspace"}
        onDismiss={dismissRestoredUnsavedState}
      />

      <UpdateToast update={update} />
    </>
  );
}

export default App;
