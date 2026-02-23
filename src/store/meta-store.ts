import { create } from "zustand";

export type MetaFileType = "handling" | "vehicles" | "carcols" | "carvariations" | "vehiclelayouts" | "modkits";
export type PerformanceSpeedUnit = "mph" | "kph";

export interface HandlingData {
  handlingName: string;
  fMass: number;
  fInitialDragCoeff: number;
  fPercentSubmerged: number;
  vecCentreOfMassOffsetX: number;
  vecCentreOfMassOffsetY: number;
  vecCentreOfMassOffsetZ: number;
  vecInertiaMultiplierX: number;
  vecInertiaMultiplierY: number;
  vecInertiaMultiplierZ: number;
  fDriveBiasFront: number;
  nInitialDriveGears: number;
  fInitialDriveForce: number;
  fDriveInertia: number;
  fClutchChangeRateScaleUpShift: number;
  fClutchChangeRateScaleDownShift: number;
  fInitialDriveMaxFlatVel: number;
  fBrakeForce: number;
  fBrakeBiasFront: number;
  fHandBrakeForce: number;
  fSteeringLock: number;
  fTractionCurveMax: number;
  fTractionCurveMin: number;
  fTractionCurveLateral: number;
  fTractionSpringDeltaMax: number;
  fTractionLossMult: number;
  fLowSpeedTractionLossMult: number;
  fCamberStiffnesss: number;
  fTractionBiasFront: number;
  fSuspensionForce: number;
  fSuspensionCompDamp: number;
  fSuspensionReboundDamp: number;
  fSuspensionUpperLimit: number;
  fSuspensionLowerLimit: number;
  fAntiRollBarForce: number;
  fAntiRollBarBiasFront: number;
  fSuspensionRaise: number;
  fSuspensionBiasFront: number;
  fRollCentreHeightFront: number;
  fRollCentreHeightRear: number;
  fCollisionDamageMult: number;
  fWeaponDamageMult: number;
  fDeformationDamageMult: number;
  fEngineDamageMult: number;
  fPetrolTankVolume: number;
  fOilVolume: number;
  fSeatOffsetDistX: number;
  fSeatOffsetDistY: number;
  fSeatOffsetDistZ: number;
  nMonetaryValue: number;
  strModelFlags: string;
  strHandlingFlags: string;
  strDamageFlags: string;
  aiHandling: string;
  fBackEndPopUpCarImpulseMult: number;
  fBackEndPopUpBuildingImpulseMult: number;
  fBackEndPopUpMaxDeltaSpeed: number;
}

export interface VehicleVec3 {
  x: number;
  y: number;
  z: number;
}

export interface VehicleTxdRelationship {
  parent: string;
  child: string;
}

export interface VehicleDriver {
  driverName: string;
  npcName: string;
}

export interface VehicleDoorStiffnessMultiplier {
  doorId: number;
  stiffnessMult: number;
}

export interface VehicleUnknownXmlNode {
  tag: string;
  value: unknown;
}

export const FIRST_PERSON_IK_OFFSET_NAMES = [
  "FirstPersonDriveByIKOffset",
  "FirstPersonDriveByUnarmedIKOffset",
  "FirstPersonProjectileDriveByIKOffset",
  "FirstPersonProjectileDriveByPassengerIKOffset",
  "FirstPersonProjectileDriveByRearLeftIKOffset",
  "FirstPersonProjectileDriveByRearRightIKOffset",
  "FirstPersonDriveByLeftPassengerIKOffset",
  "FirstPersonDriveByRightPassengerIKOffset",
  "FirstPersonDriveByRightRearPassengerIKOffset",
  "FirstPersonDriveByLeftPassengerUnarmedIKOffset",
  "FirstPersonDriveByRightPassengerUnarmedIKOffset",
  "FirstPersonMobilePhoneOffset",
  "FirstPersonPassengerMobilePhoneOffset",
] as const;

export type FirstPersonIkOffsetName =
  (typeof FIRST_PERSON_IK_OFFSET_NAMES)[number];

export interface VehiclesData {
  modelName: string;
  txdName: string;
  handlingId: string;
  gameName: string;
  vehicleMakeName: string;
  expressionDictName: string;
  expressionName: string;
  animConvRoofDictName: string;
  animConvRoofName: string;
  animConvRoofWindowsAffected: string;
  ptfxAssetName: string;
  audioNameHash: string;
  layout: string;
  driverSourceExtension: string;
  coverBoundOffsets: string;
  povTuningInfo: unknown | null;
  explosionInfo: unknown | null;
  scenarioLayout: string;
  cameraName: string;
  aimCameraName: string;
  bonnetCameraName: string;
  povCameraName: string;
  firstPersonIkOffsets: Partial<Record<FirstPersonIkOffsetName, VehicleVec3>>;
  povCameraOffset: VehicleVec3;
  povCameraVerticalAdjustmentForRollCage: number;
  povPassengerCameraOffset: VehicleVec3;
  povRearPassengerCameraOffset: VehicleVec3;
  firstPersonDrivebyData: unknown | null;
  vfxInfoName: string;
  shouldUseCinematicViewMode: boolean;
  shouldCameraTransitionOnClimbUpDown: boolean;
  shouldCameraIgnoreExiting: boolean;
  allowPretendOccupants: boolean;
  allowJoyriding: boolean;
  allowSundayDriving: boolean;
  allowBodyColorMapping: boolean;
  wheelScale: number;
  wheelScaleRear: number;
  dirtLevelMin: number;
  dirtLevelMax: number;
  envEffScaleMin: number;
  envEffScaleMax: number;
  envEffScaleMin2: number;
  envEffScaleMax2: number;
  damageMapScale: number;
  damageOffsetScale: number;
  diffuseTint: string;
  steerWheelMult: number;
  HDTextureDist: number;
  lodDistances: string;
  minSeatHeight: number;
  identicalModelSpawnDistance: number;
  maxNumOfSameColor: number;
  defaultBodyHealth: number;
  pretendOccupantsScale: number;
  visibleSpawnDistScale: number;
  trackerPathWidth: number;
  weaponForceMult: number;
  frequency: number;
  swankness: string;
  maxNum: number;
  flags: string[];
  type: string;
  plateType: string;
  dashboardType: string;
  vehicleClass: string;
  wheelType: string;
  trailers: string;
  additionalTrailers: string;
  drivers: VehicleDriver[];
  extraIncludes: string;
  doorsWithCollisionWhenClosed: string;
  driveableDoors: string;
  doorStiffnessMultipliers: VehicleDoorStiffnessMultiplier[];
  bumpersNeedToCollideWithMap: boolean;
  needsRopeTexture: boolean;
  requiredExtras: string;
  residentTxd: string;
  residentAnims: string;
  txdRelationships: VehicleTxdRelationship[];
  unknownNodes: VehicleUnknownXmlNode[];
  unknownFileLevelNodes: VehicleUnknownXmlNode[];
}

export interface SirenLight {
  rotation: string;
  flashness: number;
  delta: number;
  color: string;
  scale: number;
  coronaEnabled?: boolean;
  coronaScale?: number;
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
  linkedGenerated?: boolean;
  linkedSource?: string;
  linkedBoneRef?: string;
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

const ZERO_VEC3: VehicleVec3 = { x: 0, y: 0, z: 0 };

function createDefaultIkOffsets(): Record<FirstPersonIkOffsetName, VehicleVec3> {
  return Object.fromEntries(
    FIRST_PERSON_IK_OFFSET_NAMES.map((name) => [name, { ...ZERO_VEC3 }])
  ) as Record<FirstPersonIkOffsetName, VehicleVec3>;
}

const defaultVehiclesData: VehiclesData = {
  modelName: "newvehicle",
  txdName: "newvehicle",
  handlingId: "NEWVEHICLE",
  gameName: "NEWVEHICLE",
  vehicleMakeName: "CUSTOM",
  expressionDictName: "",
  expressionName: "",
  animConvRoofDictName: "",
  animConvRoofName: "",
  animConvRoofWindowsAffected: "",
  ptfxAssetName: "",
  audioNameHash: "ADDER",
  layout: "LAYOUT_STANDARD",
  driverSourceExtension: "feroci",
  coverBoundOffsets: "",
  povTuningInfo: null,
  explosionInfo: null,
  scenarioLayout: "",
  cameraName: "DEFAULT_SCRIPTED_CAMERA",
  aimCameraName: "DEFAULT_AIM_CAMERA",
  bonnetCameraName: "BONNET_CAMERA",
  povCameraName: "POV_CAMERA",
  firstPersonIkOffsets: createDefaultIkOffsets(),
  povCameraOffset: { ...ZERO_VEC3 },
  povCameraVerticalAdjustmentForRollCage: 0,
  povPassengerCameraOffset: { ...ZERO_VEC3 },
  povRearPassengerCameraOffset: { ...ZERO_VEC3 },
  firstPersonDrivebyData: null,
  vfxInfoName: "VFXVEHICLEINFO_DEFAULT",
  shouldUseCinematicViewMode: true,
  shouldCameraTransitionOnClimbUpDown: false,
  shouldCameraIgnoreExiting: false,
  allowPretendOccupants: false,
  allowJoyriding: true,
  allowSundayDriving: true,
  allowBodyColorMapping: false,
  wheelScale: 1,
  wheelScaleRear: 1,
  dirtLevelMin: 0,
  dirtLevelMax: 0.4,
  envEffScaleMin: 0,
  envEffScaleMax: 1,
  envEffScaleMin2: 0,
  envEffScaleMax2: 1,
  damageMapScale: 1,
  damageOffsetScale: 1,
  diffuseTint: "0x00FFFFFF",
  steerWheelMult: 1,
  HDTextureDist: 60,
  lodDistances: "15.0 30.0 60.0 120.0 500.0",
  minSeatHeight: 0.2,
  identicalModelSpawnDistance: 20,
  maxNumOfSameColor: 5,
  defaultBodyHealth: 700,
  pretendOccupantsScale: 1,
  visibleSpawnDistScale: 1,
  trackerPathWidth: 2,
  weaponForceMult: 1,
  frequency: 20,
  swankness: "SWANKNESS_3",
  maxNum: 20,
  flags: [],
  type: "VEHICLE_TYPE_CAR",
  plateType: "VPT_FRONT_AND_BACK_PLATES",
  dashboardType: "VDT_DEFAULT",
  vehicleClass: "VC_SPORT",
  wheelType: "VWT_SPORT",
  trailers: "",
  additionalTrailers: "",
  drivers: [],
  extraIncludes: "",
  doorsWithCollisionWhenClosed: "",
  driveableDoors: "",
  doorStiffnessMultipliers: [],
  bumpersNeedToCollideWithMap: false,
  needsRopeTexture: false,
  requiredExtras: "",
  residentTxd: "vehshare",
  residentAnims: "",
  txdRelationships: [],
  unknownNodes: [],
  unknownFileLevelNodes: [],
};

function ensureVec3(value: unknown, fallback: VehicleVec3): VehicleVec3 {
  if (!value || typeof value !== "object") return { ...fallback };
  const vec = value as Partial<VehicleVec3>;
  return {
    x: typeof vec.x === "number" ? vec.x : fallback.x,
    y: typeof vec.y === "number" ? vec.y : fallback.y,
    z: typeof vec.z === "number" ? vec.z : fallback.z,
  };
}

function ensureVehiclesData(vehicles: unknown): VehiclesData {
  const raw = vehicles && typeof vehicles === "object" ? (vehicles as Partial<VehiclesData>) : {};
  const modelName = typeof raw.modelName === "string" && raw.modelName.trim()
    ? raw.modelName.trim()
    : defaultVehiclesData.modelName;
  const txdName = typeof raw.txdName === "string" && raw.txdName.trim()
    ? raw.txdName.trim()
    : modelName;

  const firstPersonIkOffsets: VehiclesData["firstPersonIkOffsets"] = {};
  for (const offsetName of FIRST_PERSON_IK_OFFSET_NAMES) {
    const currentOffset = raw.firstPersonIkOffsets?.[offsetName] ?? defaultVehiclesData.firstPersonIkOffsets[offsetName];
    firstPersonIkOffsets[offsetName] = ensureVec3(currentOffset, ZERO_VEC3);
  }

  return {
    ...defaultVehiclesData,
    ...raw,
    modelName,
    txdName,
    handlingId: typeof raw.handlingId === "string" && raw.handlingId.trim()
      ? raw.handlingId.trim()
      : modelName.toUpperCase(),
    gameName: typeof raw.gameName === "string" && raw.gameName.trim()
      ? raw.gameName.trim()
      : modelName.toUpperCase(),
    firstPersonIkOffsets,
    povCameraOffset: ensureVec3(raw.povCameraOffset, defaultVehiclesData.povCameraOffset),
    povPassengerCameraOffset: ensureVec3(raw.povPassengerCameraOffset, defaultVehiclesData.povPassengerCameraOffset),
    povRearPassengerCameraOffset: ensureVec3(raw.povRearPassengerCameraOffset, defaultVehiclesData.povRearPassengerCameraOffset),
    flags: Array.isArray(raw.flags) ? raw.flags.filter((flag): flag is string => typeof flag === "string") : [],
    drivers: Array.isArray(raw.drivers)
      ? raw.drivers
        .filter((driver): driver is VehicleDriver => Boolean(driver) && typeof driver === "object")
        .map((driver) => ({
          driverName: typeof driver.driverName === "string" ? driver.driverName : "",
          npcName: typeof driver.npcName === "string" ? driver.npcName : "",
        }))
      : [],
    doorStiffnessMultipliers: Array.isArray(raw.doorStiffnessMultipliers)
      ? raw.doorStiffnessMultipliers
        .filter((item): item is VehicleDoorStiffnessMultiplier => Boolean(item) && typeof item === "object")
        .map((item) => ({
          doorId: typeof item.doorId === "number" ? item.doorId : 0,
          stiffnessMult: typeof item.stiffnessMult === "number" ? item.stiffnessMult : 1,
        }))
      : [],
    txdRelationships: Array.isArray(raw.txdRelationships)
      ? raw.txdRelationships
        .filter((item): item is VehicleTxdRelationship => Boolean(item) && typeof item === "object")
        .map((item) => ({
          parent: typeof item.parent === "string" && item.parent.trim() ? item.parent.trim() : defaultVehiclesData.residentTxd,
          child: typeof item.child === "string" ? item.child.trim() : "",
        }))
        .filter((item) => item.child.length > 0)
      : [{ parent: defaultVehiclesData.residentTxd, child: txdName }],
    unknownNodes: Array.isArray(raw.unknownNodes)
      ? raw.unknownNodes
        .filter((node): node is VehicleUnknownXmlNode => Boolean(node) && typeof node === "object" && typeof (node as VehicleUnknownXmlNode).tag === "string")
        .map((node) => ({ tag: node.tag, value: node.value }))
      : [],
    unknownFileLevelNodes: Array.isArray(raw.unknownFileLevelNodes)
      ? raw.unknownFileLevelNodes
        .filter((node): node is VehicleUnknownXmlNode => Boolean(node) && typeof node === "object" && typeof (node as VehicleUnknownXmlNode).tag === "string")
        .map((node) => ({ tag: node.tag, value: node.value }))
      : [],
  };
}

export interface VehicleProvenance {
  byType: Partial<Record<MetaFileType, string>>;
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
  provenance?: VehicleProvenance;
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
  uiView: "home" | "workspace" | "settings" | "merge";
  explorerVisible: boolean;
  filePath: string | null;
  workspacePath: string | null;
  workspaceMetaFiles: string[];
  sourceFileByType: Partial<Record<MetaFileType, string>>;
  openVehicleIds: string[];
  sidebarCollapsed: boolean;
  performanceSpeedUnit: PerformanceSpeedUnit;
  isDirty: boolean;
  recentFiles: string[];
  recentWorkspaces: string[];
  timestamp: number;
}

const HISTORY_LIMIT = 80;
const HISTORY_MAX_BYTES = 8_000_000;
const RECENT_FILES_LIMIT = 10;

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function serializeVehicles(vehicles: Record<string, VehicleEntry>): Record<string, SerializedVehicleEntry> {
  const result: Record<string, SerializedVehicleEntry> = {};
  for (const [id, entry] of Object.entries(vehicles)) {
    const clone = deepClone({
      ...entry,
      loadedMeta: undefined,
    });

    result[id] = {
      ...clone,
      loadedMeta: [...entry.loadedMeta],
    };
  }
  return result;
}

function deserializeVehicles(vehicles: Record<string, SerializedVehicleEntry>): Record<string, VehicleEntry> {
  const result: Record<string, VehicleEntry> = {};
  for (const [id, entry] of Object.entries(vehicles)) {
    const clone = deepClone({
      ...entry,
      loadedMeta: undefined,
    });

    result[id] = {
      ...clone,
      vehicles: ensureVehiclesData(entry.vehicles),
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

function estimateSnapshotSize(snapshot: StoreSnapshot): number {
  try {
    return JSON.stringify(snapshot).length;
  } catch {
    return 0;
  }
}

function trimHistoryToBudget(history: StoreSnapshot[]): StoreSnapshot[] {
  const trimmed = [...history].slice(-HISTORY_LIMIT);
  let totalBytes = trimmed.reduce((sum, snapshot) => sum + estimateSnapshotSize(snapshot), 0);

  while (trimmed.length > 1 && totalBytes > HISTORY_MAX_BYTES) {
    const removed = trimmed.shift();
    totalBytes -= removed ? estimateSnapshotSize(removed) : 0;
  }

  return trimmed;
}

function pushHistory(state: MetaStore): Pick<MetaStore, "past" | "future"> {
  const nextPast = trimHistoryToBudget([...state.past, makeSnapshot(state)]);
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
  uiView: "home" | "workspace" | "settings" | "merge";
  sidebarCollapsed: boolean;
  explorerVisible: boolean;
  vehicles: Record<string, VehicleEntry>;
  openVehicleIds: string[];
  activeVehicleId: string | null;
  activeTab: MetaFileType;
  codePreviewVisible: boolean;
  editorEditMode: boolean;
  performanceSpeedUnit: PerformanceSpeedUnit;
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
  setUIView: (view: "home" | "workspace" | "settings" | "merge") => void;
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
  setPerformanceSpeedUnit: (unit: PerformanceSpeedUnit) => void;

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
  performanceSpeedUnit: "mph",
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
      performanceSpeedUnit: s.performanceSpeedUnit,
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
  setPerformanceSpeedUnit: (unit) => set({ performanceSpeedUnit: unit }),

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
    cloned.vehicles.gameName = newName.toUpperCase();
    cloned.vehicles.txdRelationships = [{ parent: cloned.vehicles.residentTxd, child: cloned.vehicles.txdName }];
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
      normalized[k] = { ...v, vehicles: ensureVehiclesData(v.vehicles), vehiclelayouts: ensureVehicleLayouts(v.vehiclelayouts) };
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
        normalized[k] = { ...v, vehicles: ensureVehiclesData(v.vehicles), vehiclelayouts: ensureVehicleLayouts(v.vehiclelayouts) };
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
      workspaceMetaFiles: state.workspaceMetaFiles.slice(0, 2000),
      sourceFileByType: state.sourceFileByType,
      openVehicleIds: state.openVehicleIds,
      sidebarCollapsed: state.sidebarCollapsed,
      performanceSpeedUnit: state.performanceSpeedUnit,
      isDirty: state.isDirty,
      recentFiles: normalizeRecentFiles(state.recentFiles),
      recentWorkspaces: normalizeRecentFiles(state.recentWorkspaces),
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
      performanceSpeedUnit: snapshot.performanceSpeedUnit === "kph" ? "kph" : "mph",
      isDirty: snapshot.isDirty,
      recentFiles: normalizeRecentFiles(snapshot.recentFiles ?? []),
      recentWorkspaces: normalizeRecentFiles(snapshot.recentWorkspaces ?? []),
      past: [],
      future: [],
    })),
  setLastAutoSavedAt: (timestamp) => set({ lastAutoSavedAt: timestamp }),
  markClean: () => set({ isDirty: false }),
}));
