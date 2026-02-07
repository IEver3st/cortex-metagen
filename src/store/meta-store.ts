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

export interface MetaStore {
  vehicles: Record<string, VehicleEntry>;
  activeVehicleId: string | null;
  activeTab: MetaFileType;
  codePreviewVisible: boolean;
  editorEditMode: boolean;
  filePath: string | null;
  isDirty: boolean;

  setActiveVehicle: (id: string) => void;
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
  setFilePath: (path: string | null) => void;
  markClean: () => void;
}

export const useMetaStore = create<MetaStore>((set, get) => ({
  vehicles: {},
  activeVehicleId: null,
  activeTab: "handling",
  codePreviewVisible: true,
  editorEditMode: false,
  filePath: null,
  isDirty: false,

  setActiveVehicle: (id) => set({ activeVehicleId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleCodePreview: () =>
    set((s) => ({ codePreviewVisible: !s.codePreviewVisible })),
  setCodePreviewVisible: (visible) => set({ codePreviewVisible: visible }),
  toggleEditorEditMode: () =>
    set((s) => ({ editorEditMode: !s.editorEditMode })),

  addVehicle: (entry) =>
    set((s) => ({
      vehicles: { ...s.vehicles, [entry.id]: entry },
      activeVehicleId: entry.id,
      isDirty: true,
    })),

  removeVehicle: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.vehicles;
      const keys = Object.keys(rest);
      return {
        vehicles: rest,
        activeVehicleId: keys.length > 0 ? keys[0] : null,
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
      vehicles: { ...s.vehicles, [newId]: cloned },
      activeVehicleId: newId,
      isDirty: true,
    }));
  },

  updateHandling: (id, data) =>
    set((s) => {
      const v = s.vehicles[id];
      if (!v) return s;
      return {
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
      activeVehicleId: Object.keys(normalized)[0] ?? null,
      isDirty: false,
    });
  },

  setFilePath: (path) => set({ filePath: path }),
  markClean: () => set({ isDirty: false }),
}));
