import type {
  HandlingData,
  VehiclesData,
  CarcolsData,
  CarvariationsData,
  VehicleLayoutsData,
  ModkitsData,
  VehicleEntry,
  MetaFileType,
} from "@/store/meta-store";

const defaultLookAroundSide = {
  offsets: [],
  extraRelativePitchX: 0,
  extraRelativePitchY: 0,
  angleToBlendInExtraPitchX: 0,
  angleToBlendInExtraPitchY: 0,
};

const defaultHandling: HandlingData = {
  handlingName: "NEWVEHICLE",
  fMass: 1500.0,
  fInitialDragCoeff: 8.0,
  vecCentreOfMassOffsetX: 0.0,
  vecCentreOfMassOffsetY: 0.0,
  vecCentreOfMassOffsetZ: 0.0,
  vecInertiaMultiplierX: 1.0,
  vecInertiaMultiplierY: 1.0,
  vecInertiaMultiplierZ: 1.0,
  fInitialDriveForce: 0.3,
  fInitialDriveMaxFlatVel: 140.0,
  nInitialDriveGears: 6,
  fDriveBiasFront: 0.0,
  fBrakeForce: 0.7,
  fBrakeBiasFront: 0.65,
  fSteeringLock: 35.0,
  fTractionCurveMax: 2.2,
  fTractionCurveMin: 1.9,
  fTractionLossMult: 1.0,
  fLowSpeedTractionLossMult: 0.0,
  fSuspensionForce: 2.2,
  fSuspensionCompDamp: 1.2,
  fSuspensionReboundDamp: 1.8,
  fAntiRollBarForce: 0.8,
  fSuspensionRaise: 0.0,
  fCollisionDamageMult: 1.0,
  fDeformationDamageMult: 0.8,
  strModelFlags: "440010",
  strHandlingFlags: "0",
};

const defaultVehicles: VehiclesData = {
  modelName: "newvehicle",
  txdName: "newvehicle",
  handlingId: "NEWVEHICLE",
  gameName: "NEWVEHICLE",
  vehicleMakeName: "CUSTOM",
  type: "VEHICLE_TYPE_CAR",
  vehicleClass: "VC_SPORT",
  layout: "LAYOUT_STANDARD",
  driverSourceExtension: "feroci",
  audioNameHash: "ADDER",
  lodDistances: "15.0 30.0 60.0 120.0 500.0",
  diffuseTint: "0x00FFFFFF",
  dirtLevelMin: 0.0,
  dirtLevelMax: 0.4,
  flags: [],
};

const defaultCarcols: CarcolsData = {
  id: 0,
  kitName: "0_default_modkit",
  sirenId: 0,
  sequencerBpm: 0,
  rotationLimit: 0,
  lights: [],
  environmentalLightColor: "0x00000000",
  environmentalLightIntensity: 0,
};

const defaultCarvariations: CarvariationsData = {
  modelName: "newvehicle",
  colors: [
    { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
  ],
  sirenSettings: 0,
  lightSettings: 0,
  kits: ["0_default_modkit"],
  windows: 0,
  plateProbabilities: [100, 0, 0],
};

const defaultVehicleLayouts: VehicleLayoutsData = {
  coverBoundOffsets: [],
  driveByLookAroundData: [],
};

const defaultModkits: ModkitsData = {
  kits: [],
};

export type PresetType =
  | "sedan" | "compact" | "coupe"
  | "sports" | "super" | "muscle"
  | "suv" | "offroad" | "pickup"
  | "van" | "truck" | "semi"
  | "motorcycle_sport" | "motorcycle_cruiser" | "motorcycle_dirt"
  | "emergency_police" | "emergency_fire" | "emergency_ems"
  | "utility" | "industrial" | "service"
  | "classic" | "tuner" | "drift"
  | "hypercar" | "rally" | "lowrider";

export interface PresetConfig {
  label: string;
  category: string;
  description: string;
  handling: Partial<HandlingData>;
  vehicles: Partial<VehiclesData>;
  carcols: Partial<CarcolsData>;
  carvariations: Partial<CarvariationsData>;
}

export const presetConfigs: Record<PresetType, PresetConfig> = {
  // ── Sedans & Compacts ──────────────────────────────────────
  sedan: {
    label: "Sedan",
    category: "Civilian",
    description: "Balanced 4-door, moderate power, comfortable ride. ~130 mph, RWD, 6-speed.",
    handling: {
      fMass: 1500.0, fInitialDragCoeff: 8.0, fInitialDriveForce: 0.28,
      fInitialDriveMaxFlatVel: 140.0, nInitialDriveGears: 6, fDriveBiasFront: 0.0,
      fBrakeForce: 0.65, fBrakeBiasFront: 0.65, fSteeringLock: 35.0,
      fTractionCurveMax: 2.1, fTractionCurveMin: 1.8, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.0, fSuspensionCompDamp: 1.2, fSuspensionReboundDamp: 1.8,
      fAntiRollBarForce: 0.7, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 1.0, fDeformationDamageMult: 0.8,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SEDAN", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "FUGITIVE" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 111, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 27, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  compact: {
    label: "Compact",
    category: "Civilian",
    description: "Lightweight hatchback, FWD, nimble steering, low top speed. ~105 mph, 5-speed.",
    handling: {
      fMass: 1000.0, fInitialDragCoeff: 7.5, fInitialDriveForce: 0.22,
      fInitialDriveMaxFlatVel: 115.0, nInitialDriveGears: 5, fDriveBiasFront: 1.0,
      fBrakeForce: 0.55, fBrakeBiasFront: 0.7, fSteeringLock: 40.0,
      fTractionCurveMax: 1.9, fTractionCurveMin: 1.7, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 1.8, fSuspensionCompDamp: 1.0, fSuspensionReboundDamp: 1.5,
      fAntiRollBarForce: 0.6, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 1.2, fDeformationDamageMult: 1.0,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_COMPACT", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "BLISTA" },
    carcols: {},
    carvariations: { colors: [
      { primary: 12, secondary: 12, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 64, secondary: 64, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 88, secondary: 88, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  coupe: {
    label: "Coupe",
    category: "Civilian",
    description: "Sporty 2-door, stiffer suspension, better cornering than sedan. ~145 mph, RWD, 6-speed.",
    handling: {
      fMass: 1400.0, fInitialDragCoeff: 7.5, fInitialDriveForce: 0.32,
      fInitialDriveMaxFlatVel: 155.0, nInitialDriveGears: 6, fDriveBiasFront: 0.0,
      fBrakeForce: 0.75, fBrakeBiasFront: 0.62, fSteeringLock: 36.0,
      fTractionCurveMax: 2.3, fTractionCurveMin: 2.0, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.3, fSuspensionCompDamp: 1.3, fSuspensionReboundDamp: 1.9,
      fAntiRollBarForce: 0.85, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 0.8, fDeformationDamageMult: 0.7,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_COUPE", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "ZION" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 28, secondary: 28, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },

  // ── Performance ────────────────────────────────────────────
  sports: {
    label: "Sports Car",
    category: "Performance",
    description: "High-performance RWD, sharp handling, strong brakes. ~165 mph, 7-speed.",
    handling: {
      fMass: 1400.0, fInitialDragCoeff: 6.8, fInitialDriveForce: 0.36,
      fInitialDriveMaxFlatVel: 175.0, nInitialDriveGears: 7, fDriveBiasFront: 0.0,
      fBrakeForce: 0.9, fBrakeBiasFront: 0.6, fSteeringLock: 38.0,
      fTractionCurveMax: 2.5, fTractionCurveMin: 2.2, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.5,
      fSuspensionForce: 2.6, fSuspensionCompDamp: 1.4, fSuspensionReboundDamp: 2.0,
      fAntiRollBarForce: 1.0, fSuspensionRaise: -0.02,
      fCollisionDamageMult: 0.7, fDeformationDamageMult: 0.7,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SPORT", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "ELEGY2" },
    carcols: {},
    carvariations: { colors: [
      { primary: 27, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 44, secondary: 44, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  super: {
    label: "Supercar",
    category: "Performance",
    description: "Exotic mid-engine, extreme power, carbon-light. ~200 mph, 7-speed, low traction loss.",
    handling: {
      fMass: 1300.0, fInitialDragCoeff: 6.2, fInitialDriveForce: 0.40,
      fInitialDriveMaxFlatVel: 210.0, nInitialDriveGears: 7, fDriveBiasFront: 0.1,
      fBrakeForce: 1.1, fBrakeBiasFront: 0.55, fSteeringLock: 40.0,
      fTractionCurveMax: 2.7, fTractionCurveMin: 2.4, fTractionLossMult: 0.8,
      fLowSpeedTractionLossMult: 1.0,
      fSuspensionForce: 2.8, fSuspensionCompDamp: 1.5, fSuspensionReboundDamp: 2.2,
      fAntiRollBarForce: 1.1, fSuspensionRaise: -0.04,
      fCollisionDamageMult: 0.6, fDeformationDamageMult: 0.6,
      vecCentreOfMassOffsetY: -0.05,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SUPER", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "ADDER" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 111, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 145, secondary: 145, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  hypercar: {
    label: "Hypercar",
    category: "Performance",
    description: "Bleeding-edge aero, active suspension, 1000+ hp equivalent. ~220 mph, 8-speed.",
    handling: {
      fMass: 1200.0, fInitialDragCoeff: 5.5, fInitialDriveForce: 0.46,
      fInitialDriveMaxFlatVel: 240.0, nInitialDriveGears: 8, fDriveBiasFront: 0.2,
      fBrakeForce: 1.3, fBrakeBiasFront: 0.52, fSteeringLock: 42.0,
      fTractionCurveMax: 2.9, fTractionCurveMin: 2.6, fTractionLossMult: 0.7,
      fLowSpeedTractionLossMult: 1.2,
      fSuspensionForce: 3.0, fSuspensionCompDamp: 1.6, fSuspensionReboundDamp: 2.4,
      fAntiRollBarForce: 1.2, fSuspensionRaise: -0.05,
      fCollisionDamageMult: 0.5, fDeformationDamageMult: 0.5,
      vecCentreOfMassOffsetY: -0.08,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SUPER", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "OSIRIS" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 120, secondary: 120, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  muscle: {
    label: "Muscle Car",
    category: "Performance",
    description: "Heavy V8, RWD, high torque, loose rear end, classic American power. ~155 mph, 5-speed.",
    handling: {
      fMass: 1700.0, fInitialDragCoeff: 8.5, fInitialDriveForce: 0.35,
      fInitialDriveMaxFlatVel: 165.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.7, fBrakeBiasFront: 0.6, fSteeringLock: 33.0,
      fTractionCurveMax: 2.0, fTractionCurveMin: 1.7, fTractionLossMult: 1.2,
      fLowSpeedTractionLossMult: 1.5,
      fSuspensionForce: 2.0, fSuspensionCompDamp: 1.1, fSuspensionReboundDamp: 1.7,
      fAntiRollBarForce: 0.6, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 0.8, fDeformationDamageMult: 0.7,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_MUSCLE", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "DOMINATOR" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 27, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 38, secondary: 38, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 64, secondary: 64, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  tuner: {
    label: "Tuner / Import",
    category: "Performance",
    description: "Lightweight JDM-style, turbo 4-cyl, AWD, responsive. ~170 mph, 6-speed.",
    handling: {
      fMass: 1250.0, fInitialDragCoeff: 7.0, fInitialDriveForce: 0.34,
      fInitialDriveMaxFlatVel: 180.0, nInitialDriveGears: 6, fDriveBiasFront: 0.3,
      fBrakeForce: 0.85, fBrakeBiasFront: 0.58, fSteeringLock: 38.0,
      fTractionCurveMax: 2.4, fTractionCurveMin: 2.1, fTractionLossMult: 0.9,
      fLowSpeedTractionLossMult: 0.3,
      fSuspensionForce: 2.5, fSuspensionCompDamp: 1.3, fSuspensionReboundDamp: 1.9,
      fAntiRollBarForce: 0.95, fSuspensionRaise: -0.02,
      fCollisionDamageMult: 0.9, fDeformationDamageMult: 0.8,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SPORT", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "SULTAN" },
    carcols: {},
    carvariations: { colors: [
      { primary: 111, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 64, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  drift: {
    label: "Drift Car",
    category: "Performance",
    description: "RWD, very loose rear, high steering lock, low traction. Built to slide. ~150 mph, 6-speed.",
    handling: {
      fMass: 1350.0, fInitialDragCoeff: 7.5, fInitialDriveForce: 0.33,
      fInitialDriveMaxFlatVel: 160.0, nInitialDriveGears: 6, fDriveBiasFront: 0.0,
      fBrakeForce: 0.8, fBrakeBiasFront: 0.55, fSteeringLock: 50.0,
      fTractionCurveMax: 1.8, fTractionCurveMin: 1.5, fTractionLossMult: 1.5,
      fLowSpeedTractionLossMult: 2.0,
      fSuspensionForce: 2.2, fSuspensionCompDamp: 1.2, fSuspensionReboundDamp: 1.6,
      fAntiRollBarForce: 0.4, fSuspensionRaise: -0.02,
      fCollisionDamageMult: 0.8, fDeformationDamageMult: 0.7,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SPORT", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "FUTO" },
    carcols: {},
    carvariations: { colors: [
      { primary: 111, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 0, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  rally: {
    label: "Rally Car",
    category: "Performance",
    description: "AWD, raised suspension, strong traction on dirt, roll cage. ~145 mph, 6-speed.",
    handling: {
      fMass: 1350.0, fInitialDragCoeff: 8.0, fInitialDriveForce: 0.34,
      fInitialDriveMaxFlatVel: 155.0, nInitialDriveGears: 6, fDriveBiasFront: 0.5,
      fBrakeForce: 0.8, fBrakeBiasFront: 0.58, fSteeringLock: 42.0,
      fTractionCurveMax: 2.5, fTractionCurveMin: 2.2, fTractionLossMult: 0.6,
      fLowSpeedTractionLossMult: 0.2,
      fSuspensionForce: 2.8, fSuspensionCompDamp: 1.0, fSuspensionReboundDamp: 1.5,
      fAntiRollBarForce: 0.5, fSuspensionRaise: 0.06,
      fCollisionDamageMult: 0.6, fDeformationDamageMult: 0.5,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SPORT", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "SULTAN" },
    carcols: {},
    carvariations: { colors: [
      { primary: 111, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 28, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  classic: {
    label: "Classic / Vintage",
    category: "Performance",
    description: "60s-70s era, soft suspension, drum brakes, narrow tires. ~120 mph, 4-speed.",
    handling: {
      fMass: 1600.0, fInitialDragCoeff: 9.0, fInitialDriveForce: 0.25,
      fInitialDriveMaxFlatVel: 130.0, nInitialDriveGears: 4, fDriveBiasFront: 0.0,
      fBrakeForce: 0.5, fBrakeBiasFront: 0.7, fSteeringLock: 30.0,
      fTractionCurveMax: 1.8, fTractionCurveMin: 1.5, fTractionLossMult: 1.3,
      fLowSpeedTractionLossMult: 0.5,
      fSuspensionForce: 1.6, fSuspensionCompDamp: 0.9, fSuspensionReboundDamp: 1.4,
      fAntiRollBarForce: 0.4, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 1.2, fDeformationDamageMult: 1.0,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SPORT_CLASSIC", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "STINGER" },
    carcols: {},
    carvariations: { colors: [
      { primary: 27, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 64, secondary: 64, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  lowrider: {
    label: "Lowrider",
    category: "Performance",
    description: "Low stance, hydraulic-ready, FWD, cruiser style. ~100 mph, 4-speed.",
    handling: {
      fMass: 1700.0, fInitialDragCoeff: 9.5, fInitialDriveForce: 0.22,
      fInitialDriveMaxFlatVel: 110.0, nInitialDriveGears: 4, fDriveBiasFront: 1.0,
      fBrakeForce: 0.5, fBrakeBiasFront: 0.65, fSteeringLock: 35.0,
      fTractionCurveMax: 1.9, fTractionCurveMin: 1.6, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 1.5, fSuspensionCompDamp: 0.8, fSuspensionReboundDamp: 1.2,
      fAntiRollBarForce: 0.3, fSuspensionRaise: -0.08,
      fCollisionDamageMult: 1.0, fDeformationDamageMult: 0.9,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_MUSCLE", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "BUCCANEER" },
    carcols: {},
    carvariations: { colors: [
      { primary: 64, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 88, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },

  // ── SUVs & Off-Road ────────────────────────────────────────
  suv: {
    label: "SUV",
    category: "Off-Road & Utility",
    description: "Mid-size crossover, AWD, raised ride height, family-friendly. ~130 mph, 6-speed.",
    handling: {
      fMass: 2200.0, fInitialDragCoeff: 10.0, fInitialDriveForce: 0.32,
      fInitialDriveMaxFlatVel: 130.0, nInitialDriveGears: 6, fDriveBiasFront: 0.5,
      fBrakeForce: 0.7, fBrakeBiasFront: 0.6, fSteeringLock: 37.0,
      fTractionCurveMax: 2.3, fTractionCurveMin: 2.0, fTractionLossMult: 0.7,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.5, fSuspensionCompDamp: 1.4, fSuspensionReboundDamp: 2.0,
      fAntiRollBarForce: 0.6, fSuspensionRaise: 0.08,
      fCollisionDamageMult: 0.8, fDeformationDamageMult: 0.7,
      vecCentreOfMassOffsetZ: 0.1,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SUV", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "GRANGER" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 111, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  offroad: {
    label: "Off-Road 4x4",
    category: "Off-Road & Utility",
    description: "Lifted, locking diffs, heavy-duty skid plates, mud tires. ~110 mph, AWD, 5-speed.",
    handling: {
      fMass: 2500.0, fInitialDragCoeff: 11.0, fInitialDriveForce: 0.35,
      fInitialDriveMaxFlatVel: 120.0, nInitialDriveGears: 5, fDriveBiasFront: 0.5,
      fBrakeForce: 0.65, fBrakeBiasFront: 0.55, fSteeringLock: 35.0,
      fTractionCurveMax: 2.6, fTractionCurveMin: 2.3, fTractionLossMult: 0.5,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 3.2, fSuspensionCompDamp: 1.0, fSuspensionReboundDamp: 1.8,
      fAntiRollBarForce: 0.4, fSuspensionRaise: 0.15,
      fCollisionDamageMult: 0.5, fDeformationDamageMult: 0.4,
      vecCentreOfMassOffsetZ: 0.15,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_OFFROAD", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "REBEL" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  pickup: {
    label: "Pickup Truck",
    category: "Off-Road & Utility",
    description: "Full-size bed, body-on-frame, RWD, towing-capable. ~125 mph, 6-speed.",
    handling: {
      fMass: 2400.0, fInitialDragCoeff: 10.5, fInitialDriveForce: 0.30,
      fInitialDriveMaxFlatVel: 135.0, nInitialDriveGears: 6, fDriveBiasFront: 0.0,
      fBrakeForce: 0.6, fBrakeBiasFront: 0.58, fSteeringLock: 34.0,
      fTractionCurveMax: 2.2, fTractionCurveMin: 1.9, fTractionLossMult: 0.8,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.6, fSuspensionCompDamp: 1.5, fSuspensionReboundDamp: 2.1,
      fAntiRollBarForce: 0.5, fSuspensionRaise: 0.06,
      fCollisionDamageMult: 0.6, fDeformationDamageMult: 0.5,
      vecCentreOfMassOffsetZ: 0.12,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_OFFROAD", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "BISON" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 111, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 27, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },

  // ── Trucks & Commercial ────────────────────────────────────
  van: {
    label: "Van / MPV",
    category: "Commercial",
    description: "Cargo/passenger van, high roof, FWD, soft ride. ~100 mph, 5-speed.",
    handling: {
      fMass: 2800.0, fInitialDragCoeff: 12.0, fInitialDriveForce: 0.25,
      fInitialDriveMaxFlatVel: 110.0, nInitialDriveGears: 5, fDriveBiasFront: 1.0,
      fBrakeForce: 0.5, fBrakeBiasFront: 0.6, fSteeringLock: 38.0,
      fTractionCurveMax: 1.8, fTractionCurveMin: 1.5, fTractionLossMult: 0.9,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.0, fSuspensionCompDamp: 1.2, fSuspensionReboundDamp: 1.8,
      fAntiRollBarForce: 0.5, fSuspensionRaise: 0.04,
      fCollisionDamageMult: 0.7, fDeformationDamageMult: 0.6,
      vecCentreOfMassOffsetZ: 0.2,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_VAN", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "SPEEDO", flags: ["FLAG_BIG"] },
    carcols: {},
    carvariations: { colors: [
      { primary: 111, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  truck: {
    label: "Heavy Truck",
    category: "Commercial",
    description: "Box truck / flatbed, diesel, very heavy, slow acceleration. ~90 mph, 5-speed.",
    handling: {
      fMass: 5000.0, fInitialDragCoeff: 14.0, fInitialDriveForce: 0.30,
      fInitialDriveMaxFlatVel: 100.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.5, fBrakeBiasFront: 0.5, fSteeringLock: 30.0,
      fTractionCurveMax: 2.2, fTractionCurveMin: 1.9, fTractionLossMult: 0.6,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 3.5, fSuspensionCompDamp: 2.0, fSuspensionReboundDamp: 2.5,
      fAntiRollBarForce: 0.4, fSuspensionRaise: 0.1,
      fCollisionDamageMult: 0.3, fDeformationDamageMult: 0.2,
      vecCentreOfMassOffsetZ: 0.3,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_COMMERCIAL", layout: "LAYOUT_STANDARD", driverSourceExtension: "truck", audioNameHash: "MULE", flags: ["FLAG_BIG"] },
    carcols: {},
    carvariations: { colors: [
      { primary: 111, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  semi: {
    label: "Semi / 18-Wheeler",
    category: "Commercial",
    description: "Cab-over tractor unit, extreme mass, designed for trailer hauling. ~80 mph, 6-speed.",
    handling: {
      fMass: 9000.0, fInitialDragCoeff: 16.0, fInitialDriveForce: 0.28,
      fInitialDriveMaxFlatVel: 90.0, nInitialDriveGears: 6, fDriveBiasFront: 0.0,
      fBrakeForce: 0.4, fBrakeBiasFront: 0.45, fSteeringLock: 28.0,
      fTractionCurveMax: 2.0, fTractionCurveMin: 1.7, fTractionLossMult: 0.5,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 4.0, fSuspensionCompDamp: 2.5, fSuspensionReboundDamp: 3.0,
      fAntiRollBarForce: 0.3, fSuspensionRaise: 0.1,
      fCollisionDamageMult: 0.2, fDeformationDamageMult: 0.1,
      vecCentreOfMassOffsetZ: 0.4,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_COMMERCIAL", layout: "LAYOUT_STANDARD", driverSourceExtension: "truck", audioNameHash: "PHANTOM", flags: ["FLAG_BIG"] },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },

  // ── Motorcycles ────────────────────────────────────────────
  motorcycle_sport: {
    label: "Sport Bike",
    category: "Motorcycles",
    description: "Inline-4, clip-ons, aggressive lean, very fast. ~185 mph, 6-speed.",
    handling: {
      fMass: 220.0, fInitialDragCoeff: 4.5, fInitialDriveForce: 0.30,
      fInitialDriveMaxFlatVel: 200.0, nInitialDriveGears: 6, fDriveBiasFront: 0.0,
      fBrakeForce: 0.8, fBrakeBiasFront: 0.65, fSteeringLock: 38.0,
      fTractionCurveMax: 2.2, fTractionCurveMin: 1.9, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.0, fSuspensionCompDamp: 1.2, fSuspensionReboundDamp: 1.8,
      fAntiRollBarForce: 0.0, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 2.0, fDeformationDamageMult: 2.0,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_MOTORCYCLE", type: "VEHICLE_TYPE_BIKE", layout: "LAYOUT_BIKE", driverSourceExtension: "akuma", audioNameHash: "AKUMA" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 27, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  motorcycle_cruiser: {
    label: "Cruiser Bike",
    category: "Motorcycles",
    description: "V-twin, low seat, relaxed geometry, heavy for a bike. ~130 mph, 5-speed.",
    handling: {
      fMass: 350.0, fInitialDragCoeff: 6.0, fInitialDriveForce: 0.24,
      fInitialDriveMaxFlatVel: 140.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.6, fBrakeBiasFront: 0.6, fSteeringLock: 35.0,
      fTractionCurveMax: 2.0, fTractionCurveMin: 1.7, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 1.8, fSuspensionCompDamp: 1.0, fSuspensionReboundDamp: 1.5,
      fAntiRollBarForce: 0.0, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 2.0, fDeformationDamageMult: 2.0,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_MOTORCYCLE", type: "VEHICLE_TYPE_BIKE", layout: "LAYOUT_BIKE", driverSourceExtension: "daemon", audioNameHash: "DAEMON" },
    carcols: {},
    carvariations: { colors: [
      { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  motorcycle_dirt: {
    label: "Dirt Bike",
    category: "Motorcycles",
    description: "Lightweight enduro, long-travel suspension, knobby tires. ~100 mph, 5-speed.",
    handling: {
      fMass: 150.0, fInitialDragCoeff: 5.0, fInitialDriveForce: 0.22,
      fInitialDriveMaxFlatVel: 110.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.7, fBrakeBiasFront: 0.6, fSteeringLock: 42.0,
      fTractionCurveMax: 2.4, fTractionCurveMin: 2.1, fTractionLossMult: 0.5,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.5, fSuspensionCompDamp: 0.8, fSuspensionReboundDamp: 1.2,
      fAntiRollBarForce: 0.0, fSuspensionRaise: 0.05,
      fCollisionDamageMult: 2.0, fDeformationDamageMult: 2.0,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_MOTORCYCLE", type: "VEHICLE_TYPE_BIKE", layout: "LAYOUT_BIKE", driverSourceExtension: "sanchez", audioNameHash: "SANCHEZ" },
    carcols: {},
    carvariations: { colors: [
      { primary: 27, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },

  // ── Emergency ──────────────────────────────────────────────
  emergency_police: {
    label: "Police Cruiser",
    category: "Emergency",
    description: "Pursuit-rated, uprated brakes, siren-equipped, law enforcement flags. ~160 mph, 6-speed.",
    handling: {
      fMass: 1800.0, fInitialDragCoeff: 7.5, fInitialDriveForce: 0.35,
      fInitialDriveMaxFlatVel: 170.0, nInitialDriveGears: 6, fDriveBiasFront: 0.0,
      fBrakeForce: 0.85, fBrakeBiasFront: 0.65, fSteeringLock: 38.0,
      fTractionCurveMax: 2.5, fTractionCurveMin: 2.2, fTractionLossMult: 0.9,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.8, fSuspensionCompDamp: 1.5, fSuspensionReboundDamp: 2.0,
      fAntiRollBarForce: 0.9, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 0.6, fDeformationDamageMult: 0.5,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_EMERGENCY", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "POLICE", flags: ["FLAG_LAW_ENFORCEMENT", "FLAG_EXTRAS_REQUIRE"] },
    carcols: {
      sirenId: 1, sequencerBpm: 600,
      lights: [
        { rotation: "0 0 0", flashness: 1.0, delta: 0, color: "0xFFFF0000", scale: 0.4, sequencer: "10101010101010101010101010101010" },
        { rotation: "0 0 0", flashness: 1.0, delta: 0, color: "0xFF0000FF", scale: 0.4, sequencer: "01010101010101010101010101010101" },
      ],
      environmentalLightColor: "0xFFFF0000", environmentalLightIntensity: 50,
    },
    carvariations: { colors: [
      { primary: 0, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      { primary: 111, secondary: 111, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ], sirenSettings: 1 },
  },
  emergency_fire: {
    label: "Fire Truck",
    category: "Emergency",
    description: "Heavy-duty, diesel, very heavy, siren-equipped, high durability. ~80 mph, 5-speed.",
    handling: {
      fMass: 8000.0, fInitialDragCoeff: 14.0, fInitialDriveForce: 0.28,
      fInitialDriveMaxFlatVel: 90.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.45, fBrakeBiasFront: 0.5, fSteeringLock: 30.0,
      fTractionCurveMax: 2.2, fTractionCurveMin: 1.9, fTractionLossMult: 0.5,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 3.8, fSuspensionCompDamp: 2.2, fSuspensionReboundDamp: 2.8,
      fAntiRollBarForce: 0.4, fSuspensionRaise: 0.08,
      fCollisionDamageMult: 0.2, fDeformationDamageMult: 0.1,
      vecCentreOfMassOffsetZ: 0.3,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_EMERGENCY", layout: "LAYOUT_STANDARD", driverSourceExtension: "truck", audioNameHash: "FIRETRUK", flags: ["FLAG_EMERGENCY_SERVICE", "FLAG_BIG"] },
    carcols: {
      sirenId: 2, sequencerBpm: 500,
      lights: [
        { rotation: "0 0 0", flashness: 1.0, delta: 0, color: "0xFFFF0000", scale: 0.5, sequencer: "11001100110011001100110011001100" },
        { rotation: "0 0 0", flashness: 1.0, delta: 0, color: "0xFFFF0000", scale: 0.5, sequencer: "00110011001100110011001100110011" },
      ],
      environmentalLightColor: "0xFFFF0000", environmentalLightIntensity: 60,
    },
    carvariations: { colors: [
      { primary: 27, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ], sirenSettings: 2 },
  },
  emergency_ems: {
    label: "Ambulance / EMS",
    category: "Emergency",
    description: "Box-body ambulance, moderate weight, siren-equipped. ~110 mph, 5-speed.",
    handling: {
      fMass: 3500.0, fInitialDragCoeff: 11.0, fInitialDriveForce: 0.28,
      fInitialDriveMaxFlatVel: 120.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.55, fBrakeBiasFront: 0.55, fSteeringLock: 35.0,
      fTractionCurveMax: 2.0, fTractionCurveMin: 1.7, fTractionLossMult: 0.8,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.5, fSuspensionCompDamp: 1.5, fSuspensionReboundDamp: 2.0,
      fAntiRollBarForce: 0.5, fSuspensionRaise: 0.04,
      fCollisionDamageMult: 0.4, fDeformationDamageMult: 0.3,
      vecCentreOfMassOffsetZ: 0.2,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_EMERGENCY", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "AMBULANCE", flags: ["FLAG_EMERGENCY_SERVICE", "FLAG_BIG"] },
    carcols: {
      sirenId: 3, sequencerBpm: 550,
      lights: [
        { rotation: "0 0 0", flashness: 1.0, delta: 0, color: "0xFFFF0000", scale: 0.4, sequencer: "11110000111100001111000011110000" },
        { rotation: "0 0 0", flashness: 1.0, delta: 0, color: "0xFFFFFFFF", scale: 0.4, sequencer: "00001111000011110000111100001111" },
      ],
      environmentalLightColor: "0xFFFF0000", environmentalLightIntensity: 40,
    },
    carvariations: { colors: [
      { primary: 111, secondary: 27, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ], sirenSettings: 3 },
  },

  // ── Service & Utility ──────────────────────────────────────
  utility: {
    label: "Utility Vehicle",
    category: "Service",
    description: "Work truck / utility body, moderate power, durable. ~100 mph, 5-speed.",
    handling: {
      fMass: 2800.0, fInitialDragCoeff: 11.0, fInitialDriveForce: 0.26,
      fInitialDriveMaxFlatVel: 110.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.55, fBrakeBiasFront: 0.55, fSteeringLock: 35.0,
      fTractionCurveMax: 2.1, fTractionCurveMin: 1.8, fTractionLossMult: 0.8,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 2.4, fSuspensionCompDamp: 1.4, fSuspensionReboundDamp: 2.0,
      fAntiRollBarForce: 0.5, fSuspensionRaise: 0.04,
      fCollisionDamageMult: 0.5, fDeformationDamageMult: 0.4,
      vecCentreOfMassOffsetZ: 0.15,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_UTILITY", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "UTILLITRUCK" },
    carcols: {},
    carvariations: { colors: [
      { primary: 88, secondary: 88, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  industrial: {
    label: "Industrial",
    category: "Service",
    description: "Construction / heavy equipment, extremely heavy, very slow. ~60 mph, 4-speed.",
    handling: {
      fMass: 12000.0, fInitialDragCoeff: 18.0, fInitialDriveForce: 0.25,
      fInitialDriveMaxFlatVel: 65.0, nInitialDriveGears: 4, fDriveBiasFront: 0.5,
      fBrakeForce: 0.35, fBrakeBiasFront: 0.5, fSteeringLock: 25.0,
      fTractionCurveMax: 2.5, fTractionCurveMin: 2.2, fTractionLossMult: 0.3,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 4.5, fSuspensionCompDamp: 3.0, fSuspensionReboundDamp: 3.5,
      fAntiRollBarForce: 0.3, fSuspensionRaise: 0.1,
      fCollisionDamageMult: 0.1, fDeformationDamageMult: 0.05,
      vecCentreOfMassOffsetZ: 0.5,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_INDUSTRIAL", layout: "LAYOUT_STANDARD", driverSourceExtension: "truck", audioNameHash: "DUMP", flags: ["FLAG_BIG"] },
    carcols: {},
    carvariations: { colors: [
      { primary: 88, secondary: 88, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
  service: {
    label: "Service / Taxi",
    category: "Service",
    description: "Taxi / livery sedan, comfortable, reliable, moderate everything. ~120 mph, 5-speed.",
    handling: {
      fMass: 1600.0, fInitialDragCoeff: 8.5, fInitialDriveForce: 0.26,
      fInitialDriveMaxFlatVel: 130.0, nInitialDriveGears: 5, fDriveBiasFront: 0.0,
      fBrakeForce: 0.6, fBrakeBiasFront: 0.65, fSteeringLock: 35.0,
      fTractionCurveMax: 2.0, fTractionCurveMin: 1.7, fTractionLossMult: 1.0,
      fLowSpeedTractionLossMult: 0.0,
      fSuspensionForce: 1.8, fSuspensionCompDamp: 1.0, fSuspensionReboundDamp: 1.5,
      fAntiRollBarForce: 0.6, fSuspensionRaise: 0.0,
      fCollisionDamageMult: 1.0, fDeformationDamageMult: 0.9,
      strModelFlags: "440010", strHandlingFlags: "0",
    },
    vehicles: { vehicleClass: "VC_SERVICE", layout: "LAYOUT_STANDARD", driverSourceExtension: "feroci", audioNameHash: "TAXI" },
    carcols: {},
    carvariations: { colors: [
      { primary: 88, secondary: 88, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
    ] },
  },
};

let _vehicleIdCounter = 0;

export function createDefaultVehicle(name: string, loadedMeta?: Set<MetaFileType>): VehicleEntry {
  const id = `vehicle_${Date.now()}_${_vehicleIdCounter++}`;
  return {
    id,
    name,
    handling: { ...defaultHandling, handlingName: name.toUpperCase() },
    vehicles: {
      ...defaultVehicles,
      modelName: name.toLowerCase(),
      txdName: name.toLowerCase(),
      handlingId: name.toUpperCase(),
      gameName: name.toUpperCase(),
    },
    carcols: { ...defaultCarcols },
    carvariations: { ...defaultCarvariations, modelName: name.toLowerCase() },
    vehiclelayouts: { ...defaultVehicleLayouts },
    modkits: { ...defaultModkits, kits: [] },
    loadedMeta: loadedMeta ?? new Set<MetaFileType>(),
  };
}

export function createVehicleFromPreset(
  name: string,
  preset: PresetType
): VehicleEntry {
  const allTypes = new Set<MetaFileType>(["handling", "vehicles", "carcols", "carvariations"]);
  const base = createDefaultVehicle(name, allTypes);
  const config = presetConfigs[preset];
  return {
    ...base,
    handling: { ...base.handling, ...config.handling, handlingName: name.toUpperCase() },
    vehicles: {
      ...base.vehicles,
      ...config.vehicles,
      modelName: name.toLowerCase(),
      txdName: name.toLowerCase(),
      handlingId: name.toUpperCase(),
      gameName: name.toUpperCase(),
    },
    carcols: { ...base.carcols, ...config.carcols },
    carvariations: {
      ...base.carvariations,
      ...config.carvariations,
      modelName: name.toLowerCase(),
    },
    vehiclelayouts: { ...base.vehiclelayouts },
    modkits: { ...base.modkits },
  };
}
