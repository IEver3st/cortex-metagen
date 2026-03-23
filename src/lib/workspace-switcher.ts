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

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function getUniqueName(existingNames: string[], preferredName?: string): string {
  const taken = new Set(existingNames.map((entry) => normalizeName(entry).toLowerCase()).filter(Boolean));
  const preferred = normalizeName(preferredName ?? "");
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

function basename(path: string | null | undefined): string | null {
  if (!path) return null;
  const cleaned = path.replace(/\\/g, "/").replace(/\/+$/, "");
  return cleaned.split("/").pop() ?? null;
}

function uniqueFiles(files: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const file of files) {
    if (!file || seen.has(file)) continue;
    seen.add(file);
    next.push(file);
  }

  return next;
}

function isCursorMap(value: unknown): value is Record<string, { line: number; col: number }> {
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

function isSnapshotMap(value: unknown): value is Record<string, SessionSnapshot> {
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).every(([key, snapshot]) => typeof key === "string" && snapshot !== null && typeof snapshot === "object");
}

function isPersistedWorkspaceState(value: unknown): value is PersistedWorkspaceState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PersistedWorkspaceState>;
  return candidate.version === 1
    && (candidate.lastActiveWorkspaceId === null || typeof candidate.lastActiveWorkspaceId === "string")
    && Array.isArray(candidate.workspaces)
    && candidate.workspaces.every((workspace) => isWorkspace(workspace))
    && isSnapshotMap(candidate.snapshots)
    && Array.isArray(candidate.dirtyWorkspaceIds)
    && candidate.dirtyWorkspaceIds.every((id) => typeof id === "string")
    && Array.isArray(candidate.recentFiles)
    && candidate.recentFiles.every((file) => typeof file === "string")
    && Array.isArray(candidate.recentWorkspaces)
    && candidate.recentWorkspaces.every((entry) => typeof entry === "string");
}

export function createEmptyWorkspace(existingNames: string[], preferredName?: string): Workspace {
  const now = Date.now();
  return {
    id: createWorkspaceId(),
    name: getUniqueName(existingNames, preferredName),
    folderPath: null,
    openFiles: [],
    activeFile: null,
    cursorPositions: {},
    createdAt: now,
    lastOpenedAt: now,
  };
}

export function deriveWorkspaceFromSnapshot(
  snapshot: SessionSnapshot,
  previousWorkspace?: Workspace,
  nameOverride?: string,
): Workspace {
  const baseWorkspace = previousWorkspace ?? createEmptyWorkspace([]);
  const nextName = normalizeName(nameOverride ?? "")
    || basename(snapshot.workspacePath)
    || basename(snapshot.filePath)
    || baseWorkspace.name;
  const openFiles = snapshot.workspacePath
    ? snapshot.workspaceMetaFiles
    : uniqueFiles([snapshot.filePath, ...Object.values(snapshot.sourceFileByType)]);
  const activeFile = snapshot.filePath
    ?? snapshot.sourceFileByType[snapshot.activeTab]
    ?? openFiles[0]
    ?? baseWorkspace.activeFile;

  return {
    ...baseWorkspace,
    name: nextName,
    folderPath: snapshot.workspacePath ?? null,
    openFiles,
    activeFile: activeFile ?? null,
    lastOpenedAt: Date.now(),
  };
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

export async function readWorkspaceSwitcherState(): Promise<PersistedWorkspaceState | null> {
  const raw = await invoke<string | null>("read_workspace_switcher_state");
  if (!raw) return null;

  const parsed: unknown = JSON.parse(raw);
  if (!isPersistedWorkspaceState(parsed)) {
    throw new Error("Workspace switcher state file is invalid.");
  }
  return parsed;
}

export async function writeWorkspaceSwitcherState(state: PersistedWorkspaceState): Promise<void> {
  await invoke("write_workspace_switcher_state", {
    content: JSON.stringify(state, null, 2),
  });
}
