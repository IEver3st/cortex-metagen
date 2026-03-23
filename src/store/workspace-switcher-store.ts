import { create } from "zustand";

import type { SessionSnapshot } from "@/store/meta-store";

export interface WorkspaceCursorPosition {
  line: number;
  col: number;
}

export interface WorkspaceSwitcherWorkspace {
  id: string;
  name: string;
  folderPath: string | null;
  openFiles: string[];
  activeFile: string | null;
  cursorPositions: Record<string, WorkspaceCursorPosition>;
  createdAt: number;
  lastOpenedAt: number;
  snapshot: SessionSnapshot | null;
  hasUnsavedState: boolean;
  previewVersion: number;
}

export interface PersistedWorkspaceSwitcherState {
  version: 1;
  activeWorkspaceId: string | null;
  workspaces: WorkspaceSwitcherWorkspace[];
}

interface WorkspaceSwitcherStore {
  ready: boolean;
  isOpen: boolean;
  keyboardPreviewActive: boolean;
  activeWorkspaceId: string | null;
  highlightedWorkspaceId: string | null;
  hoveredWorkspaceId: string | null;
  renamingWorkspaceId: string | null;
  deleteConfirmationId: string | null;
  workspaces: WorkspaceSwitcherWorkspace[];
  restoredUnsavedWorkspaceId: string | null;
  initialize: (state: PersistedWorkspaceSwitcherState | null) => void;
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
  setHoveredWorkspace: (id: string | null) => void;
  moveHighlight: (direction: -1 | 1) => void;
  setHighlightedWorkspace: (id: string | null) => void;
  activateWorkspace: (id: string) => void;
  syncActiveWorkspace: (input: {
    folderPath: string | null;
    openFiles: string[];
    activeFile: string | null;
    cursorPositions?: Record<string, WorkspaceCursorPosition>;
    snapshot: SessionSnapshot | null;
    hasUnsavedState: boolean;
  }) => void;
  createWorkspace: () => string;
  renameWorkspace: (id: string, name: string) => void;
  setRenamingWorkspace: (id: string | null) => void;
  requestDeleteWorkspace: (id: string | null) => void;
  deleteWorkspace: (id: string) => void;
  dismissRestoredUnsavedState: () => void;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `workspace-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function dedupe(paths: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const path of paths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    next.push(path);
  }
  return next;
}

function makeWorkspace(name: string): WorkspaceSwitcherWorkspace {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    folderPath: null,
    openFiles: [],
    activeFile: null,
    cursorPositions: {},
    createdAt: now,
    lastOpenedAt: now,
    snapshot: null,
    hasUnsavedState: false,
    previewVersion: 0,
  };
}

function normalizeWorkspace(workspace: Partial<WorkspaceSwitcherWorkspace> | undefined, index: number): WorkspaceSwitcherWorkspace | null {
  if (!workspace || typeof workspace.id !== "string") return null;
  const now = Date.now();
  return {
    id: workspace.id,
    name: typeof workspace.name === "string" && workspace.name.trim().length > 0 ? workspace.name.trim() : `Workspace ${index + 1}`,
    folderPath: typeof workspace.folderPath === "string" ? workspace.folderPath : null,
    openFiles: dedupe(Array.isArray(workspace.openFiles) ? workspace.openFiles : []),
    activeFile: typeof workspace.activeFile === "string" ? workspace.activeFile : null,
    cursorPositions: workspace.cursorPositions ?? {},
    createdAt: typeof workspace.createdAt === "number" ? workspace.createdAt : now,
    lastOpenedAt: typeof workspace.lastOpenedAt === "number" ? workspace.lastOpenedAt : now,
    snapshot: workspace.snapshot ?? null,
    hasUnsavedState: workspace.hasUnsavedState === true,
    previewVersion: typeof workspace.previewVersion === "number" ? workspace.previewVersion : 0,
  };
}

export const useWorkspaceSwitcherStore = create<WorkspaceSwitcherStore>((set, get) => ({
  ready: false,
  isOpen: false,
  keyboardPreviewActive: false,
  activeWorkspaceId: null,
  highlightedWorkspaceId: null,
  hoveredWorkspaceId: null,
  renamingWorkspaceId: null,
  deleteConfirmationId: null,
  workspaces: [],
  restoredUnsavedWorkspaceId: null,

  initialize: (state) => {
    const workspaces = Array.isArray(state?.workspaces)
      ? state.workspaces.map((workspace, index) => normalizeWorkspace(workspace, index)).filter((workspace): workspace is WorkspaceSwitcherWorkspace => workspace !== null)
      : [];
    const normalized = workspaces.length > 0 ? workspaces : [makeWorkspace("Workspace 1")];
    const activeWorkspaceId = normalized.some((workspace) => workspace.id === state?.activeWorkspaceId)
      ? state?.activeWorkspaceId ?? normalized[0]?.id ?? null
      : normalized[0]?.id ?? null;
    set({
      ready: true,
      workspaces: normalized,
      activeWorkspaceId,
      highlightedWorkspaceId: activeWorkspaceId,
      restoredUnsavedWorkspaceId: normalized.find((workspace) => workspace.id === activeWorkspaceId)?.hasUnsavedState ? activeWorkspaceId : null,
    });
  },

  openSwitcher: () => set((state) => ({ isOpen: true, highlightedWorkspaceId: state.activeWorkspaceId, hoveredWorkspaceId: null, keyboardPreviewActive: false })),
  closeSwitcher: () => set({ isOpen: false, hoveredWorkspaceId: null, keyboardPreviewActive: false, renamingWorkspaceId: null, deleteConfirmationId: null }),
  toggleSwitcher: () => set((state) => ({ isOpen: !state.isOpen, highlightedWorkspaceId: state.activeWorkspaceId, hoveredWorkspaceId: null, keyboardPreviewActive: false, renamingWorkspaceId: null, deleteConfirmationId: null })),
  setHoveredWorkspace: (id) => set({ hoveredWorkspaceId: id, keyboardPreviewActive: false }),
  moveHighlight: (direction) => set((state) => {
    if (state.workspaces.length === 0) return state;
    const ids = state.workspaces.map((workspace) => workspace.id);
    const currentId = state.highlightedWorkspaceId ?? state.activeWorkspaceId ?? ids[0] ?? null;
    const index = currentId ? ids.indexOf(currentId) : 0;
    const nextIndex = ((index >= 0 ? index : 0) + direction + ids.length) % ids.length;
    return { highlightedWorkspaceId: ids[nextIndex] ?? null, hoveredWorkspaceId: null, keyboardPreviewActive: true };
  }),
  setHighlightedWorkspace: (id) => set({ highlightedWorkspaceId: id }),
  activateWorkspace: (id) => set((state) => ({
    activeWorkspaceId: id,
    highlightedWorkspaceId: id,
    hoveredWorkspaceId: null,
    keyboardPreviewActive: false,
    isOpen: false,
    renamingWorkspaceId: null,
    deleteConfirmationId: null,
    restoredUnsavedWorkspaceId: state.workspaces.find((workspace) => workspace.id === id)?.hasUnsavedState ? id : state.restoredUnsavedWorkspaceId,
    workspaces: state.workspaces.map((workspace) => workspace.id === id ? { ...workspace, lastOpenedAt: Date.now() } : workspace),
  })),
  syncActiveWorkspace: (input) => set((state) => ({
    workspaces: state.workspaces.map((workspace) => workspace.id === state.activeWorkspaceId ? {
      ...workspace,
      folderPath: input.folderPath,
      openFiles: dedupe([...input.openFiles, input.activeFile]),
      activeFile: input.activeFile,
      cursorPositions: input.cursorPositions ?? workspace.cursorPositions,
      snapshot: input.snapshot,
      hasUnsavedState: input.hasUnsavedState,
      previewVersion: workspace.previewVersion + 1,
    } : workspace),
  })),
  createWorkspace: () => {
    const workspace = makeWorkspace(`Workspace ${get().workspaces.length + 1}`);
    set((state) => ({ workspaces: [...state.workspaces, workspace].slice(0, 9), highlightedWorkspaceId: workspace.id, hoveredWorkspaceId: workspace.id, renamingWorkspaceId: workspace.id }));
    return workspace.id;
  },
  renameWorkspace: (id, name) => set((state) => ({ workspaces: state.workspaces.map((workspace) => workspace.id === id ? { ...workspace, name: name.trim() || workspace.name } : workspace), renamingWorkspaceId: state.renamingWorkspaceId === id ? null : state.renamingWorkspaceId })),
  setRenamingWorkspace: (id) => set({ renamingWorkspaceId: id }),
  requestDeleteWorkspace: (id) => set({ deleteConfirmationId: id }),
  deleteWorkspace: (id) => set((state) => {
    const workspaces = state.workspaces.filter((workspace) => workspace.id !== id);
    const normalized = workspaces.length > 0 ? workspaces : [makeWorkspace("Workspace 1")];
    return {
      workspaces: normalized,
      activeWorkspaceId: state.activeWorkspaceId === id ? normalized[0]?.id ?? null : state.activeWorkspaceId,
      highlightedWorkspaceId: normalized.some((workspace) => workspace.id === state.highlightedWorkspaceId) ? state.highlightedWorkspaceId : normalized[0]?.id ?? null,
      hoveredWorkspaceId: state.hoveredWorkspaceId === id ? null : state.hoveredWorkspaceId,
      deleteConfirmationId: null,
      renamingWorkspaceId: state.renamingWorkspaceId === id ? null : state.renamingWorkspaceId,
    };
  }),
  dismissRestoredUnsavedState: () => set({ restoredUnsavedWorkspaceId: null }),
}));

export function buildPersistedWorkspaceSwitcherState(activeWorkspaceId: string | null, workspaces: WorkspaceSwitcherWorkspace[]): PersistedWorkspaceSwitcherState {
  return { version: 1, activeWorkspaceId, workspaces };
}
