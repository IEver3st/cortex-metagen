import { createWithEqualityFn } from "zustand/traditional";
import { invoke } from "@tauri-apps/api/core";

import type { MetaFileType } from "./meta-store";

// ---------------------------------------------------------------------------
// Data Model
// ---------------------------------------------------------------------------

export interface WorkspaceTabState {
  path: string;
  selection?: string;
}

export interface WorkspaceLayoutState {
  split: "vertical" | "horizontal";
  leftPanel: string;
  rightPanel: string;
}

export interface WorkspaceUIState {
  collapsedSections: string[];
  showOnlyChanged: boolean;
  codePreviewVisible: boolean;
  sidebarCollapsed: boolean;
  explorerVisible: boolean;
  activeTab: MetaFileType;
}

export interface WorkspaceValidation {
  strict: boolean;
}

export interface WorkspaceConfig {
  version: 1;
  name: string;
  roots: string[];
  recentFiles: string[];
  openTabs: WorkspaceTabState[];
  layout: WorkspaceLayoutState;
  ui: WorkspaceUIState;
  presets: Record<string, string>;
  validation: WorkspaceValidation;
  metadata: {
    createdAt: number;
    lastOpenedAt: number;
    pinned: boolean;
    icon?: string;
    notes?: string;
  };
}

/** Lightweight descriptor stored in the recent/pinned list (not the full config). */
export interface WorkspaceDescriptor {
  /** Absolute path to the .cortex-workspace.json file */
  configPath: string;
  /** Display name */
  name: string;
  /** Root folder(s) */
  roots: string[];
  /** Last time this workspace was opened */
  lastOpenedAt: number;
  /** Whether the user pinned this workspace */
  pinned: boolean;
  /** Optional icon identifier */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKSPACE_FILENAME = ".cortex-workspace.json";
const WORKSPACE_DESCRIPTORS_KEY = "cortex-metagen.workspaces.v1";
const MAX_RECENT_WORKSPACES = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDefaultWorkspaceConfig(name: string, rootPath: string): WorkspaceConfig {
  return {
    version: 1,
    name,
    roots: [rootPath],
    recentFiles: [],
    openTabs: [],
    layout: {
      split: "vertical",
      leftPanel: "explorer",
      rightPanel: "code",
    },
    ui: {
      collapsedSections: [],
      showOnlyChanged: false,
      codePreviewVisible: true,
      sidebarCollapsed: false,
      explorerVisible: true,
      activeTab: "handling",
    },
    presets: {},
    validation: { strict: true },
    metadata: {
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      pinned: false,
    },
  };
}

function deriveWorkspaceName(rootPath: string): string {
  const parts = rootPath.replace(/\\/g, "/").replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || "Workspace";
}

function configPathForRoot(rootPath: string): string {
  const root = rootPath.replace(/[\\/]+$/, "");
  return `${root}/${WORKSPACE_FILENAME}`;
}

function normalizeDescriptor(rawDescriptor: unknown): WorkspaceDescriptor | null {
  if (!rawDescriptor || typeof rawDescriptor !== "object") return null;

  const descriptor = rawDescriptor as Partial<WorkspaceDescriptor>;
  if (typeof descriptor.configPath !== "string" || typeof descriptor.name !== "string") {
    return null;
  }

  const roots = Array.isArray(descriptor.roots)
    ? descriptor.roots.filter((root): root is string => typeof root === "string" && root.length > 0)
    : [];

  return {
    configPath: descriptor.configPath,
    name: descriptor.name,
    roots,
    lastOpenedAt: typeof descriptor.lastOpenedAt === "number" && Number.isFinite(descriptor.lastOpenedAt)
      ? descriptor.lastOpenedAt
      : Date.now(),
    pinned: typeof descriptor.pinned === "boolean" ? descriptor.pinned : false,
    icon: typeof descriptor.icon === "string" ? descriptor.icon : undefined,
  };
}

function loadDescriptorsFromStorage(): WorkspaceDescriptor[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_DESCRIPTORS_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map((item) => normalizeDescriptor(item))
      .filter((item): item is WorkspaceDescriptor => item !== null);

    return normalized;
  } catch {
    return [];
  }
}

function saveDescriptorsToStorage(descriptors: WorkspaceDescriptor[]): void {
  try {
    localStorage.setItem(WORKSPACE_DESCRIPTORS_KEY, JSON.stringify(descriptors));
  } catch (error) {
    console.warn("Failed to persist workspace descriptors:", error);
  }
}

function upsertDescriptor(
  descriptors: WorkspaceDescriptor[],
  descriptor: WorkspaceDescriptor
): WorkspaceDescriptor[] {
  const filtered = descriptors.filter((d) => d.configPath !== descriptor.configPath);
  const next = [descriptor, ...filtered].slice(0, MAX_RECENT_WORKSPACES);
  return next;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

export interface WorkspaceStore {
  /** Currently active workspace config (null when no workspace is open). */
  activeWorkspace: WorkspaceConfig | null;
  /** Path to the active workspace config file. */
  activeConfigPath: string | null;
  /** All known workspace descriptors (recent + pinned). */
  descriptors: WorkspaceDescriptor[];
  /** Whether the workspace is currently being loaded. */
  isLoading: boolean;
  /** Error message from the last workspace operation. */
  error: string | null;
  /** Whether the command palette is open. */
  commandPaletteOpen: boolean;
  /** Whether the workspace config has unsaved changes. */
  configDirty: boolean;

  // -- Actions --
  /** Create a new workspace from a folder path, save the config, and open it. */
  createWorkspace: (rootPath: string) => Promise<void>;
  /** Open an existing workspace from a config file path. */
  openWorkspace: (configPath: string) => Promise<void>;
  /** Open a workspace from a root folder (auto-detect or create config). */
  openWorkspaceFromFolder: (rootPath: string) => Promise<void>;
  /** Save the active workspace config to disk. */
  saveWorkspaceConfig: () => Promise<void>;
  /** Close the currently active workspace. */
  closeWorkspace: () => void;
  /** Remove a workspace from the descriptors list. */
  removeDescriptor: (configPath: string) => void;
  /** Toggle the pinned state of a workspace descriptor. */
  togglePinned: (configPath: string) => void;
  /** Update a field on the active workspace config (marks dirty). */
  updateConfig: (partial: Partial<WorkspaceConfig>) => void;
  /** Update UI state on the active workspace. */
  updateUIState: (partial: Partial<WorkspaceUIState>) => void;
  /** Add a file to the workspace's recent files list. */
  addRecentFile: (path: string) => void;
  /** Toggle the command palette. */
  toggleCommandPalette: () => void;
  /** Set command palette open state. */
  setCommandPaletteOpen: (open: boolean) => void;
  /** Rename the active workspace. */
  renameWorkspace: (name: string) => void;
  /** Check if a folder has an existing workspace config. */
  hasWorkspaceConfig: (rootPath: string) => Promise<boolean>;
  /** Get pinned workspaces. */
  getPinnedWorkspaces: () => WorkspaceDescriptor[];
  /** Get recent (non-pinned) workspaces. */
  getRecentWorkspaces: () => WorkspaceDescriptor[];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorkspaceStore = createWithEqualityFn<WorkspaceStore>()((set, get) => ({
  activeWorkspace: null,
  activeConfigPath: null,
  descriptors: loadDescriptorsFromStorage(),
  isLoading: false,
  error: null,
  commandPaletteOpen: false,
  configDirty: false,

  createWorkspace: async (rootPath: string) => {
    set({ isLoading: true, error: null });
    try {
      const name = deriveWorkspaceName(rootPath);
      const config = createDefaultWorkspaceConfig(name, rootPath);
      const cfgPath = configPathForRoot(rootPath);

      // Write config to disk
      const content = JSON.stringify(config, null, 2);
      await invoke("write_meta_file", { path: cfgPath, content });

      const descriptor: WorkspaceDescriptor = {
        configPath: cfgPath,
        name,
        roots: [rootPath],
        lastOpenedAt: Date.now(),
        pinned: false,
      };

      set((s) => {
        const nextDescriptors = upsertDescriptor(s.descriptors, descriptor);
        saveDescriptorsToStorage(nextDescriptors);
        return {
          activeWorkspace: config,
          activeConfigPath: cfgPath,
          descriptors: nextDescriptors,
          isLoading: false,
          configDirty: false,
        };
      });
    } catch (err) {
      set({ isLoading: false, error: String(err) });
    }
  },

  openWorkspace: async (configPath: string) => {
    set({ isLoading: true, error: null });
    try {
      const raw = await invoke<string>("read_meta_file", { path: configPath });
      const config = JSON.parse(raw) as WorkspaceConfig;

      // Validate version
      if (config.version !== 1) {
        set({ isLoading: false, error: `Unsupported workspace version: ${config.version}` });
        return;
      }

      // Update lastOpenedAt
      config.metadata.lastOpenedAt = Date.now();

      const descriptor: WorkspaceDescriptor = {
        configPath,
        name: config.name,
        roots: config.roots,
        lastOpenedAt: Date.now(),
        pinned: config.metadata.pinned,
        icon: config.metadata.icon,
      };

      set((s) => {
        const nextDescriptors = upsertDescriptor(s.descriptors, descriptor);
        saveDescriptorsToStorage(nextDescriptors);
        return {
          activeWorkspace: config,
          activeConfigPath: configPath,
          descriptors: nextDescriptors,
          isLoading: false,
          configDirty: true, // lastOpenedAt was updated
        };
      });
    } catch (err) {
      set({ isLoading: false, error: `Failed to open workspace: ${err}` });
    }
  },

  openWorkspaceFromFolder: async (rootPath: string) => {
    const cfgPath = configPathForRoot(rootPath);
    const store = get();

    // Check if config already exists
    try {
      const exists = await store.hasWorkspaceConfig(rootPath);
      if (exists) {
        await store.openWorkspace(cfgPath);
      } else {
        await store.createWorkspace(rootPath);
      }
    } catch {
      // If existence check fails, just try to create
      await store.createWorkspace(rootPath);
    }
  },

  saveWorkspaceConfig: async () => {
    const { activeWorkspace, activeConfigPath } = get();
    if (!activeWorkspace || !activeConfigPath) return;

    try {
      const content = JSON.stringify(activeWorkspace, null, 2);
      await invoke("write_meta_file", { path: activeConfigPath, content });
      set({ configDirty: false });
    } catch (err) {
      set({ error: `Failed to save workspace config: ${err}` });
    }
  },

  closeWorkspace: () => {
    set({
      activeWorkspace: null,
      activeConfigPath: null,
      configDirty: false,
      error: null,
    });
  },

  removeDescriptor: (configPath: string) => {
    set((s) => {
      const nextDescriptors = s.descriptors.filter((d) => d.configPath !== configPath);
      saveDescriptorsToStorage(nextDescriptors);
      return { descriptors: nextDescriptors };
    });
  },

  togglePinned: (configPath: string) => {
    set((s) => {
      const nextDescriptors = s.descriptors.map((d) =>
        d.configPath === configPath ? { ...d, pinned: !d.pinned } : d
      );
      saveDescriptorsToStorage(nextDescriptors);

      // Also update active workspace if it's the one being toggled
      let nextWorkspace = s.activeWorkspace;
      if (s.activeConfigPath === configPath && nextWorkspace) {
        nextWorkspace = {
          ...nextWorkspace,
          metadata: { ...nextWorkspace.metadata, pinned: !nextWorkspace.metadata.pinned },
        };
      }

      return { descriptors: nextDescriptors, activeWorkspace: nextWorkspace, configDirty: true };
    });
  },

  updateConfig: (partial: Partial<WorkspaceConfig>) => {
    set((s) => {
      if (!s.activeWorkspace) return s;
      return {
        activeWorkspace: { ...s.activeWorkspace, ...partial },
        configDirty: true,
      };
    });
  },

  updateUIState: (partial: Partial<WorkspaceUIState>) => {
    set((s) => {
      if (!s.activeWorkspace) return s;
      return {
        activeWorkspace: {
          ...s.activeWorkspace,
          ui: { ...s.activeWorkspace.ui, ...partial },
        },
        configDirty: true,
      };
    });
  },

  addRecentFile: (path: string) => {
    set((s) => {
      if (!s.activeWorkspace) return s;
      const existing = s.activeWorkspace.recentFiles.filter((f) => f !== path);
      const nextFiles = [path, ...existing].slice(0, 10);
      return {
        activeWorkspace: { ...s.activeWorkspace, recentFiles: nextFiles },
        configDirty: true,
      };
    });
  },

  toggleCommandPalette: () => {
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen }));
  },

  setCommandPaletteOpen: (open: boolean) => {
    set({ commandPaletteOpen: open });
  },

  renameWorkspace: (name: string) => {
    set((s) => {
      if (!s.activeWorkspace) return s;

      const nextDescriptors = s.descriptors.map((d) =>
        d.configPath === s.activeConfigPath ? { ...d, name } : d
      );
      saveDescriptorsToStorage(nextDescriptors);

      return {
        activeWorkspace: { ...s.activeWorkspace, name },
        descriptors: nextDescriptors,
        configDirty: true,
      };
    });
  },

  hasWorkspaceConfig: async (rootPath: string): Promise<boolean> => {
    const cfgPath = configPathForRoot(rootPath);
    try {
      await invoke<string>("read_meta_file", { path: cfgPath });
      return true;
    } catch {
      return false;
    }
  },

  getPinnedWorkspaces: () => {
    return get().descriptors.filter((d) => d.pinned);
  },

  getRecentWorkspaces: () => {
    return get()
      .descriptors.filter((d) => !d.pinned)
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  },
}));
