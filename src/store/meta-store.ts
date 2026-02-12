import { create } from "zustand";

export type MetaFileType = "handling" | "vehicles" | "carcols" | "carvariations" | "vehiclelayouts" | "modkits";

export interface HandlingData {
  handlingName: string;
  fMass: number;
  fInitialDragCoeff: number;
  vecCentreOfMassOffsetX: number;
  vecCentreOfMassOffsetY: number;
  vecCentreOfMassOffsetZ: number;
  vecInertiaMultiplierX: number;
  vecInertiaMultiplierY: number;
  vecInertiaMultiplierZ: number;
  fInitialDriveForce: number;
  fInitialDriveMaxFlatVel: number;
  nInitialDriveGears: number;
  fDriveBiasFront: number;
  fBrakeForce: number;
  fBrakeBiasFront: number;
  fSteeringLock: number;
  fTractionCurveMax: number;
  fTractionCurveMin: number;
  fTractionLossMult: number;
  fLowSpeedTractionLossMult: number;
  fSuspensionForce: number;
  fSuspensionCompDamp: number;
  fSuspensionReboundDamp: number;
  fAntiRollBarForce: number;
  fSuspensionRaise: number;
  fCollisionDamageMult: number;
  fDeformationDamageMult: number;
  strModelFlags: string;
  strHandlingFlags: string;
}

export interface VehiclesData {
  modelName: string;
  txdName: string;
  handlingId: string;
  gameName: string;
  vehicleMakeName: string;
  type: string;
  vehicleClass: string;
  layout: string;
  driverSourceExtension: string;
  audioNameHash: string;
  lodDistances: string;
  diffuseTint: string;
  dirtLevelMin: number;
  dirtLevelMax: number;
  flags: string[];
}

export interface SirenLight {
  rotation: string;
  flashness: number;
  delta: number;
  color: string;
  scale: number;
  sequencer: string;
}

export interface CarcolsData {
  id: number;
  kitName: string;
  sirenId: number;
  sequencerBpm: number;
  rotationLimit: number;
  lights: SirenLight[];
  environmentalLightColor: string;
  environmentalLightIntensity: number;
}

export interface CarvariationsData {
  modelName: string;
  colors: Array<{
    primary: number;
    secondary: number;
    pearl: number;
    wheels: number;
    interior: number;
    dashboard: number;
  }>;
  sirenSettings: number;
  lightSettings: number;
  kits: string[];
  windows: number;
  plateProbabilities: number[];
}

export interface VisibleMod {
  modelName: string;
  modShopLabel: string;
  linkedModels: string;
  turnOffBones: string[];
  type: string;
  bone: string;
  collisionBone: string;
}

export interface StatMod {
  identifier: string;
  modifier: number;
  audioApply: number;
  weight: number;
  type: string;
}

export interface SlotName {
  slot: string;
  name: string;
}

export interface ModKit {
  kitName: string;
  id: number;
  kitType: string;
  visibleMods: VisibleMod[];
  statMods: StatMod[];
  slotNames: SlotName[];
}

export interface ModkitsData {
  kits: ModKit[];
}

export interface CoverBoundOffset {
  name: string;
  extraSideOffset: number;
  extraForwardOffset: number;
  extraBackwardOffset: number;
  extraZOffset: number;
}

export interface LookAroundOffset {
  offset: number;
  angleToBlendInOffsetX: number;
  angleToBlendInOffsetY: number;
}

export interface LookAroundSideData {
  offsets: LookAroundOffset[];
  extraRelativePitchX: number;
  extraRelativePitchY: number;
  angleToBlendInExtraPitchX: number;
  angleToBlendInExtraPitchY: number;
}

export interface DriveByLookAroundEntry {
  name: string;
  allowLookback: boolean;
  headingLimitsX: number;
  headingLimitsY: number;
  dataLeft: LookAroundSideData;
  dataRight: LookAroundSideData;
}

export interface VehicleLayoutsData {
  coverBoundOffsets: CoverBoundOffset[];
  driveByLookAroundData: DriveByLookAroundEntry[];
}

const defaultVehicleLayouts: VehicleLayoutsData = {
  coverBoundOffsets: [],
  driveByLookAroundData: [],
};

function ensureVehicleLayouts(vl: any): VehicleLayoutsData {
  if (!vl || typeof vl !== "object") return { ...defaultVehicleLayouts };
  return {
    coverBoundOffsets: Array.isArray(vl.coverBoundOffsets) ? vl.coverBoundOffsets : [],
    driveByLookAroundData: Array.isArray(vl.driveByLookAroundData) ? vl.driveByLookAroundData : [],
  };
}

export interface VehicleEntry {
  id: string;
  name: string;
  handling: HandlingData;
  vehicles: VehiclesData;
  carcols: CarcolsData;
  carvariations: CarvariationsData;
  vehiclelayouts: VehicleLayoutsData;
  modkits: ModkitsData;
  loadedMeta: Set<MetaFileType>;
}

interface SerializedVehicleEntry extends Omit<VehicleEntry, "loadedMeta"> {
  loadedMeta: MetaFileType[];
}

interface StoreSnapshot {
  vehicles: Record<string, SerializedVehicleEntry>;
  activeVehicleId: string | null;
  activeTab: MetaFileType;
}

export interface SessionSnapshot {
  vehicles: Record<string, SerializedVehicleEntry>;
  activeVehicleId: string | null;
  activeTab: MetaFileType;
  uiView: "home" | "workspace" | "settings";
  explorerVisible: boolean;
  filePath: string | null;
  workspacePath: string | null;
  workspaceMetaFiles: string[];
  sourceFileByType: Partial<Record<MetaFileType, string>>;
  openVehicleIds: string[];
  sidebarCollapsed: boolean;
  isDirty: boolean;
  recentFiles: string[];
  recentWorkspaces: string[];
  timestamp: number;
}

const HISTORY_LIMIT = 100;
const RECENT_FILES_LIMIT = 10;

function serializeVehicles(vehicles: Record<string, VehicleEntry>): Record<string, SerializedVehicleEntry> {
  const result: Record<string, SerializedVehicleEntry> = {};
  for (const [id, entry] of Object.entries(vehicles)) {
    result[id] = {
      ...JSON.parse(JSON.stringify({
        ...entry,
        loadedMeta: undefined,
      })),
      loadedMeta: [...entry.loadedMeta],
    };
  }
  return result;
}

function deserializeVehicles(vehicles: Record<string, SerializedVehicleEntry>): Record<string, VehicleEntry> {
  const result: Record<string, VehicleEntry> = {};
  for (const [id, entry] of Object.entries(vehicles)) {
    result[id] = {
      ...JSON.parse(JSON.stringify({
        ...entry,
        loadedMeta: undefined,
      })),
      vehiclelayouts: ensureVehicleLayouts(entry.vehiclelayouts),
      loadedMeta: new Set(entry.loadedMeta ?? []),
    };
  }
  return result;
}

function makeSnapshot(state: MetaStore): StoreSnapshot {
  return {
    vehicles: serializeVehicles(state.vehicles),
    activeVehicleId: state.activeVehicleId,
    activeTab: state.activeTab,
  };
}

function pushHistory(state: MetaStore): Pick<MetaStore, "past" | "future"> {
  const nextPast = [...state.past, makeSnapshot(state)].slice(-HISTORY_LIMIT);
  return { past: nextPast, future: [] };
}

function normalizeRecentFiles(files: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const file of files) {
    if (!file || seen.has(file)) continue;
    seen.add(file);
    normalized.push(file);
    if (normalized.length >= RECENT_FILES_LIMIT) break;
  }
  return normalized;
}

export interface MetaStore {
  uiView: "home" | "workspace" | "settings";
  sidebarCollapsed: boolean;
  explorerVisible: boolean;
  vehicles: Record<string, VehicleEntry>;
  openVehicleIds: string[];
  activeVehicleId: string | null;
  activeTab: MetaFileType;
  codePreviewVisible: boolean;
  editorEditMode: boolean;
  filePath: string | null;
  workspacePath: string | null;
  workspaceMetaFiles: string[];
  sourceFileByType: Partial<Record<MetaFileType, string>>;
  isDirty: boolean;
  lastAutoSavedAt: number | null;
  recentFiles: string[];
  recentWorkspaces: string[];
  past: StoreSnapshot[];
  future: StoreSnapshot[];

  startNewProject: () => void;
  setUIView: (view: "home" | "workspace" | "settings") => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  toggleExplorerVisible: () => void;
  setExplorerVisible: (visible: boolean) => void;
  setActiveVehicle: (id: string) => void;
    closeVehicleTab: (id: string) => void;
    closeTabsToRight: (id: string) => void;
    closeOtherTabs: (id: string) => void;
    reopenVehicleTab: (id: string) => void;
    renameVehicle: (id: string, newName: string) => void;
  setActiveTab: (tab: MetaFileType) => void;
  toggleCodePreview: () => void;
  setCodePreviewVisible: (visible: boolean) => void;
  toggleEditorEditMode: () => void;

  addVehicle: (entry: VehicleEntry) => void;
  removeVehicle: (id: string) => void;
  cloneVehicle: (id: string, newName: string) => void;
  updateHandling: (id: string, data: Partial<HandlingData>) => void;
  updateVehicles: (id: string, data: Partial<VehiclesData>) => void;
  updateCarcols: (id: string, data: Partial<CarcolsData>) => void;
  updateCarvariations: (id: string, data: Partial<CarvariationsData>) => void;
  updateVehicleLayouts: (id: string, data: Partial<VehicleLayoutsData>) => void;
  updateModkits: (id: string, data: Partial<ModkitsData>) => void;

  loadVehicles: (entries: Record<string, VehicleEntry>) => void;
  replaceVehiclesFromEditor: (entries: Record<string, VehicleEntry>) => void;
  setFilePath: (path: string | null) => void;
  setSourceFilePath: (type: MetaFileType, path: string | null) => void;
  setWorkspace: (path: string | null, metaFiles?: string[]) => void;
  addRecentFile: (path: string) => void;
  addRecentWorkspace: (path: string) => void;
  clearRecentFiles: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getSessionSnapshot: () => SessionSnapshot;
  hydrateSessionSnapshot: (snapshot: SessionSnapshot) => void;
  setLastAutoSavedAt: (timestamp: number | null) => void;
  markClean: () => void;
}

export const useMetaStore = create<MetaStore>((set, get) => ({
  uiView: "home",
  sidebarCollapsed: true,
  explorerVisible: true,
  vehicles: {},
  openVehicleIds: [],
  activeVehicleId: null,
  activeTab: "handling",
  codePreviewVisible: true,
  editorEditMode: false,
  filePath: null,
  workspacePath: null,
  workspaceMetaFiles: [],
  sourceFileByType: {},
  isDirty: false,
  lastAutoSavedAt: null,
  recentFiles: [],
  recentWorkspaces: [],
  past: [],
  future: [],

  startNewProject: () =>
    set((s) => ({
      vehicles: {},
      openVehicleIds: [],
      activeVehicleId: null,
      activeTab: "handling",
      codePreviewVisible: true,
      editorEditMode: false,
      filePath: null,
      workspacePath: null,
      workspaceMetaFiles: [],
      sourceFileByType: {},
      uiView: "home",
      isDirty: false,
      lastAutoSavedAt: null,
      past: [],
      future: [],
      // Keep recents + sidebar state as-is
      recentFiles: s.recentFiles,
      recentWorkspaces: s.recentWorkspaces,
      sidebarCollapsed: s.sidebarCollapsed,
      explorerVisible: s.explorerVisible,
    })),

  setUIView: (view) => set({ uiView: view }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleExplorerVisible: () => set((s) => ({ explorerVisible: !s.explorerVisible })),
  setExplorerVisible: (visible) => set({ explorerVisible: visible }),
  setActiveVehicle: (id) =>
    set((s) => {
      const openVehicleIds = s.openVehicleIds.includes(id)
        ? s.openVehicleIds
        : [...s.openVehicleIds, id];
      return { activeVehicleId: id, openVehicleIds, uiView: "workspace" };
    }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleCodePreview: () =>
    set((s) => ({ codePreviewVisible: !s.codePreviewVisible })),
  setCodePreviewVisible: (visible) => set({ codePreviewVisible: visible }),
  toggleEditorEditMode: () =>
    set((s) => ({ editorEditMode: !s.editorEditMode })),

  addVehicle: (entry) =>
    set((s) => ({
      ...pushHistory(s),
      vehicles: { ...s.vehicles, [entry.id]: entry },
      openVehicleIds: [...s.openVehicleIds, entry.id],
      activeVehicleId: entry.id,
      uiView: "workspace",
      isDirty: true,
    })),

  removeVehicle: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.vehicles;
      const keys = Object.keys(rest);
      return {
        ...pushHistory(s),
        vehicles: rest,
        openVehicleIds: s.openVehicleIds.filter((v) => v !== id),
        activeVehicleId: keys.length > 0 ? keys[0] : null,
        isDirty: true,
      };
    }),

  renameVehicle: (id, newName) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      return {
        ...pushHistory(s),
        vehicles: {
          ...s.vehicles,
          [id]: { ...v, name: newName },
        },
        isDirty: true,
      };
    }),

  cloneVehicle: (id, newName) => {
    const state = get();
    const source = state.vehicles[id];
    if (!source) return;
    const newId = `vehicle_${Date.now()}_clone`;
    const cloned: VehicleEntry = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: newName,
      loadedMeta: new Set(source.loadedMeta),
    };
    cloned.handling.handlingName = newName.toUpperCase();
    cloned.vehicles.modelName = newName.toLowerCase();
    cloned.vehicles.txdName = newName.toLowerCase();
    cloned.vehicles.handlingId = newName.toUpperCase();
    cloned.carvariations.modelName = newName.toLowerCase();
    set((s) => ({
      ...pushHistory(s),
      vehicles: { ...s.vehicles, [newId]: cloned },
      openVehicleIds: [...s.openVehicleIds, newId],
      activeVehicleId: newId,
      uiView: "workspace",
      isDirty: true,
    }));
  },

  reopenVehicleTab: (id) =>
    set((s) => {
      if (s.openVehicleIds.includes(id)) return { activeVehicleId: id };
      return { openVehicleIds: [...s.openVehicleIds, id], activeVehicleId: id };
    }),

  closeVehicleTab: (id) =>
    set((s) => {
      const nextOpen = s.openVehicleIds.filter((v) => v !== id);
      const nextActive =
        s.activeVehicleId === id
          ? nextOpen[nextOpen.length - 1] ?? nextOpen[0] ?? null
          : s.activeVehicleId;
      return { openVehicleIds: nextOpen, activeVehicleId: nextActive };
    }),

  closeTabsToRight: (id) =>
    set((s) => {
      const idx = s.openVehicleIds.indexOf(id);
      if (idx === -1) return s;
      const nextOpen = s.openVehicleIds.slice(0, idx + 1);
      const nextActive = nextOpen.includes(s.activeVehicleId ?? "") ? s.activeVehicleId : id;
      return { openVehicleIds: nextOpen, activeVehicleId: nextActive };
    }),

  closeOtherTabs: (id) =>
    set((s) => {
      if (!s.openVehicleIds.includes(id)) return s;
      return { openVehicleIds: [id], activeVehicleId: id };
    }),

  updateHandling: (id, data) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      return {
        ...pushHistory(s),
        vehicles: {
          ...s.vehicles,
          [id]: { ...v, handling: { ...v.handling, ...data } },
        },
        isDirty: true,
      };
    }),

  updateVehicles: (id, data) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      return {
        ...pushHistory(s),
        vehicles: {
          ...s.vehicles,
          [id]: { ...v, vehicles: { ...v.vehicles, ...data } },
        },
        isDirty: true,
      };
    }),

  updateCarcols: (id, data) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      return {
        ...pushHistory(s),
        vehicles: {
          ...s.vehicles,
          [id]: { ...v, carcols: { ...v.carcols, ...data } },
        },
        isDirty: true,
      };
    }),

  updateCarvariations: (id, data) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      return {
        ...pushHistory(s),
        vehicles: {
          ...s.vehicles,
          [id]: { ...v, carvariations: { ...v.carvariations, ...data } },
        },
        isDirty: true,
      };
    }),

  updateVehicleLayouts: (id, data) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      const current = ensureVehicleLayouts(v.vehiclelayouts);
      return {
        ...pushHistory(s),
        vehicles: {
          ...s.vehicles,
          [id]: { ...v, vehiclelayouts: { ...current, ...data } },
        },
        isDirty: true,
      };
    }),

  updateModkits: (id, data) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      return {
        ...pushHistory(s),
        vehicles: {
          ...s.vehicles,
          [id]: { ...v, modkits: { ...v.modkits, ...data } },
        },
        isDirty: true,
      };
    }),

  loadVehicles: (entries) => {
    // Normalize all vehicles to ensure vehiclelayouts has valid defaults
    const normalized: Record<string, VehicleEntry> = {};
    for (const [k, v] of Object.entries(entries)) {
      normalized[k] = { ...v, vehiclelayouts: ensureVehicleLayouts(v.vehiclelayouts) };
    }
    set({
      vehicles: normalized,
      openVehicleIds: Object.keys(normalized),
      activeVehicleId: Object.keys(normalized)[0] ?? null,
      uiView: "workspace",
      isDirty: false,
      past: [],
      future: [],
    });
  },

  replaceVehiclesFromEditor: (entries) =>
    set((s) => {
      const normalized: Record<string, VehicleEntry> = {};
      for (const [k, v] of Object.entries(entries)) {
        normalized[k] = { ...v, vehiclelayouts: ensureVehicleLayouts(v.vehiclelayouts) };
      }
      const nextActive =
        s.activeVehicleId && normalized[s.activeVehicleId]
          ? s.activeVehicleId
          : Object.keys(normalized)[0] ?? null;

      return {
        ...pushHistory(s),
        vehicles: normalized,
        openVehicleIds: Object.keys(normalized),
        activeVehicleId: nextActive,
        uiView: "workspace",
        isDirty: true,
      };
    }),

  setFilePath: (path) => set({ filePath: path }),
  setSourceFilePath: (type, path) =>
    set((s) => {
      const next = { ...s.sourceFileByType };
      if (!path) {
        delete next[type];
      } else {
        next[type] = path;
      }
      return { sourceFileByType: next };
    }),
  setWorkspace: (path, metaFiles = []) =>
    set({
      workspacePath: path,
      workspaceMetaFiles: metaFiles,
    }),
  addRecentFile: (path) =>
    set((s) => ({
      recentFiles: normalizeRecentFiles([path, ...s.recentFiles]),
    })),
  addRecentWorkspace: (path: string) =>
    set((s) => ({
      recentWorkspaces: normalizeRecentFiles([path, ...s.recentWorkspaces]),
    })),
  clearRecentFiles: () => set({ recentFiles: [], recentWorkspaces: [] }),
  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      const current = makeSnapshot(s);
      const restoredVehicles = deserializeVehicles(previous.vehicles);
      return {
        vehicles: restoredVehicles,
        activeVehicleId: previous.activeVehicleId,
        activeTab: previous.activeTab,
        past: s.past.slice(0, -1),
        future: [current, ...s.future].slice(0, HISTORY_LIMIT),
        isDirty: true,
      };
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const [next, ...restFuture] = s.future;
      const current = makeSnapshot(s);
      const restoredVehicles = deserializeVehicles(next.vehicles);
      return {
        vehicles: restoredVehicles,
        activeVehicleId: next.activeVehicleId,
        activeTab: next.activeTab,
        past: [...s.past, current].slice(-HISTORY_LIMIT),
        future: restFuture,
        isDirty: true,
      };
    }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  getSessionSnapshot: () => {
    const state = get();
    return {
      vehicles: serializeVehicles(state.vehicles),
      activeVehicleId: state.activeVehicleId,
      activeTab: state.activeTab,
      uiView: state.uiView,
      explorerVisible: state.explorerVisible,
      filePath: state.filePath,
      workspacePath: state.workspacePath,
      workspaceMetaFiles: state.workspaceMetaFiles,
      sourceFileByType: state.sourceFileByType,
      openVehicleIds: state.openVehicleIds,
      sidebarCollapsed: state.sidebarCollapsed,
      isDirty: state.isDirty,
      recentFiles: state.recentFiles,
      recentWorkspaces: state.recentWorkspaces,
      timestamp: Date.now(),
    };
  },
  hydrateSessionSnapshot: (snapshot) =>
    set(() => ({
      vehicles: deserializeVehicles(snapshot.vehicles),
      activeVehicleId: snapshot.activeVehicleId,
      activeTab: snapshot.activeTab,
      uiView: snapshot.uiView ?? "workspace",
      explorerVisible: snapshot.explorerVisible ?? true,
      filePath: snapshot.filePath,
      workspacePath: snapshot.workspacePath ?? null,
      workspaceMetaFiles: snapshot.workspaceMetaFiles ?? [],
      sourceFileByType: snapshot.sourceFileByType ?? {},
      openVehicleIds: snapshot.openVehicleIds ?? Object.keys(snapshot.vehicles ?? {}),
      sidebarCollapsed: snapshot.sidebarCollapsed ?? true,
      isDirty: snapshot.isDirty,
      recentFiles: normalizeRecentFiles(snapshot.recentFiles ?? []),
      recentWorkspaces: normalizeRecentFiles(snapshot.recentWorkspaces ?? []),
      past: [],
      future: [],
    })),
  setLastAutoSavedAt: (timestamp) => set({ lastAutoSavedAt: timestamp }),
  markClean: () => set({ isDirty: false }),
}));
