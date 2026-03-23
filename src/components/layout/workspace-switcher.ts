import { invoke } from "@tauri-apps/api/core";

import type { SessionSnapshot } from "@/store/meta-store";

export interface Workspace {
  id: string;
  name: string;
  folderPath: string | null;
  openFiles: string[];
  activeFile: string | null;
  cursorPositions: Record<string, { line: number; col: number }>;
  createdAt: number;
  lastOpenedAt: number;
}

export interface WorkspaceRecord {
  workspace: Workspace;
  snapshot: SessionSnapshot | null;
  hasUnsavedChanges: boolean;
}

export type PersistedWorkspaceRecord = WorkspaceRecord;

export interface PersistedWorkspaceState {
  version: 1;
  lastActiveWorkspaceId: string | null;
  workspaces: Workspace[];
  snapshots: Record<string, SessionSnapshot>;
  dirtyWorkspaceIds: string[];
  recentFiles: string[];
  recentWorkspaces: string[];
}

function createWorkspaceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function uniqueWorkspaceName(
  existingNames: string[],
  preferredName?: string,
): string {
  const taken = new Set(
    existingNames.map((name) => sanitizeName(name).toLowerCase()).filter(Boolean),
  );
  const preferred = sanitizeName(preferredName ?? "");
  if (preferred && !taken.has(preferred.toLowerCase())) {
    return preferred;
  }

  let index = 1;
  while (true) {
    const candidate = `workspace ${index}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
}

export function createEmptyWorkspace(
  existingNames: string[],
  preferredName?: string,
): Workspace {
  const now = Date.now();
  return {
    id: createWorkspaceId(),
    name: uniqueWorkspaceName(existingNames, preferredName),
    folderPath: null,
    openFiles: [],
    activeFile: null,
    cursorPositions: {},
    createdAt: now,
    lastOpenedAt: now,
  };
}

function basename(path: string | null | undefined): string | null {
  if (!path) return null;
  const cleaned = path.replace(/\\/g, "/").replace(/\/+$/, "");
  return cleaned.split("/").pop() ?? null;
}

export function deriveWorkspaceFromSnapshot(
  snapshot: SessionSnapshot,
  previousWorkspace: Workspace = createEmptyWorkspace([]),
  nameOverride?: string,
): Workspace {
  const folderName = basename(snapshot.workspacePath);
  const fileName = basename(snapshot.filePath);
  const nextName = sanitizeName(nameOverride ?? "")
    || folderName
    || fileName
    || previousWorkspace.name;

  const activeFile = snapshot.filePath
    ?? snapshot.sourceFileByType[snapshot.activeTab]
    ?? previousWorkspace.activeFile;

  const openFiles = snapshot.workspacePath
    ? snapshot.workspaceMetaFiles
    : Object.values(snapshot.sourceFileByType).filter(
      (path): path is string => typeof path === "string" && path.length > 0,
    );

  return {
    ...previousWorkspace,
    name: nextName,
    folderPath: snapshot.workspacePath ?? null,
    openFiles: openFiles.length > 0 ? openFiles : previousWorkspace.openFiles,
    activeFile: activeFile ?? null,
    lastOpenedAt: Date.now(),
  };
}

export function metaTabLabel(activeTab: SessionSnapshot["activeTab"]): string {
  switch (activeTab) {
    case "handling":
      return "handling";
    case "vehicles":
      return "vehicles";
    case "carcols":
      return "carcols";
    case "carvariations":
      return "carvariations";
    case "vehiclelayouts":
      return "vehiclelayouts";
    case "modkits":
      return "modkits";
    default:
      return "workspace";
  }
}

function isCursorMap(
  value: unknown,
): value is Record<string, { line: number; col: number }> {
  if (!value || typeof value !== "object") return false;

  return Object.values(value).every((position) => {
    if (!position || typeof position !== "object") return false;
    const candidate = position as { line?: unknown; col?: unknown };
    return typeof candidate.line === "number" && typeof candidate.col === "number";
  });
}

function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Workspace>;
  return typeof candidate.id === "string"
    && typeof candidate.name === "string"
    && (candidate.folderPath === null || typeof candidate.folderPath === "string")
    && Array.isArray(candidate.openFiles)
    && candidate.openFiles.every((file) => typeof file === "string")
    && (candidate.activeFile === null || typeof candidate.activeFile === "string")
    && isCursorMap(candidate.cursorPositions)
    && typeof candidate.createdAt === "number"
    && typeof candidate.lastOpenedAt === "number";
}

function isSnapshotMap(
  value: unknown,
): value is Record<string, SessionSnapshot> {
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).every(([key, snapshot]) => {
    return typeof key === "string"
      && snapshot !== null
      && typeof snapshot === "object";
  });
}

function isPersistedWorkspaceState(
  value: unknown,
): value is PersistedWorkspaceState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PersistedWorkspaceState>;
  return candidate.version === 1
    && (candidate.lastActiveWorkspaceId === null
      || typeof candidate.lastActiveWorkspaceId === "string")
    && Array.isArray(candidate.workspaces)
    && candidate.workspaces.every((workspace) => isWorkspace(workspace))
    && isSnapshotMap(candidate.snapshots)
    && Array.isArray(candidate.dirtyWorkspaceIds)
    && candidate.dirtyWorkspaceIds.every((id) => typeof id === "string")
    && Array.isArray(candidate.recentFiles)
    && candidate.recentFiles.every((file) => typeof file === "string")
    && Array.isArray(candidate.recentWorkspaces)
    && candidate.recentWorkspaces.every((workspace) => typeof workspace === "string");
}

export function parsePersistedWorkspaceState(
  raw: string | null | undefined,
): PersistedWorkspaceState | null {
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!isPersistedWorkspaceState(parsed)) {
    throw new Error("Workspace switcher state file is invalid.");
  }
  return parsed;
}

export function createPersistedWorkspaceState(
  records: WorkspaceRecord[],
  activeWorkspaceId: string | null,
  recentFiles: string[],
  recentWorkspaces: string[],
): PersistedWorkspaceState {
  const snapshots: Record<string, SessionSnapshot> = {};
  const dirtyWorkspaceIds: string[] = [];

  for (const record of records) {
    if (record.snapshot) {
      snapshots[record.workspace.id] = record.snapshot;
    }
    if (record.hasUnsavedChanges) {
      dirtyWorkspaceIds.push(record.workspace.id);
    }
  }

  return {
    version: 1,
    lastActiveWorkspaceId: activeWorkspaceId,
    workspaces: records.map((record) => record.workspace),
    snapshots,
    dirtyWorkspaceIds,
    recentFiles,
    recentWorkspaces,
  };
}

export async function readWorkspaceSwitcherState():
Promise<PersistedWorkspaceState | null> {
  const raw = await invoke<string>("read_workspace_switcher_state");
  return parsePersistedWorkspaceState(raw);
}

export async function writeWorkspaceSwitcherState(
  state: PersistedWorkspaceState,
): Promise<void> {
  await invoke("write_workspace_switcher_state", {
    content: JSON.stringify(state, null, 2),
  });
}
