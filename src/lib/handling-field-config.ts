import type { HandlingData } from "@/store/meta-store";
import type { SectionId } from "@/lib/section-presets";

export interface HandlingFieldRange {
  min: number;
  max: number;
  step: number;
}

export const DEFAULT_HANDLING: Partial<HandlingData> = {
  fMass: 1500.0,
  fInitialDragCoeff: 8.0,
  fPercentSubmerged: 85,
  vecCentreOfMassOffsetX: 0.0,
  vecCentreOfMassOffsetY: 0.0,
  vecCentreOfMassOffsetZ: 0.0,
  vecInertiaMultiplierX: 1.0,
  vecInertiaMultiplierY: 1.0,
  vecInertiaMultiplierZ: 1.0,
  fInitialDriveForce: 0.3,
  fDriveInertia: 1,
  fClutchChangeRateScaleUpShift: 1.5,
  fClutchChangeRateScaleDownShift: 1.5,
  fInitialDriveMaxFlatVel: 140.0,
  nInitialDriveGears: 6,
  fDriveBiasFront: 0.0,
  fBrakeForce: 0.7,
  fBrakeBiasFront: 0.65,
  fHandBrakeForce: 0.5,
  fSteeringLock: 35.0,
  fTractionCurveMax: 2.2,
  fTractionCurveMin: 1.9,
  fTractionCurveLateral: 22.5,
  fTractionSpringDeltaMax: 0.15,
  fTractionLossMult: 1.0,
  fLowSpeedTractionLossMult: 0.0,
  fCamberStiffnesss: 0,
  fTractionBiasFront: 0.48,
  fSuspensionForce: 2.2,
  fSuspensionCompDamp: 1.2,
  fSuspensionReboundDamp: 1.8,
  fSuspensionUpperLimit: 0.12,
  fSuspensionLowerLimit: -0.12,
  fAntiRollBarForce: 0.8,
  fAntiRollBarBiasFront: 0.5,
  fSuspensionRaise: 0.0,
  fSuspensionBiasFront: 0.5,
  fRollCentreHeightFront: 0.3,
  fRollCentreHeightRear: 0.3,
  fCollisionDamageMult: 1.0,
  fWeaponDamageMult: 1.0,
  fDeformationDamageMult: 0.8,
  fEngineDamageMult: 1.0,
  fPetrolTankVolume: 65,
  fOilVolume: 5,
  fSeatOffsetDistX: 0,
  fSeatOffsetDistY: 0,
  fSeatOffsetDistZ: 0,
  nMonetaryValue: 50000,
  strModelFlags: "440010",
  strHandlingFlags: "0",
  strDamageFlags: "0",
  aiHandling: "SPORTS_CAR",
  fBackEndPopUpCarImpulseMult: 0.1,
  fBackEndPopUpBuildingImpulseMult: 0.03,
  fBackEndPopUpMaxDeltaSpeed: 0.6,
};

export const HANDLING_FIELD_RANGES: Record<string, HandlingFieldRange> = {
  fMass: { min: 500, max: 15000, step: 50 },
  fInitialDragCoeff: { min: 0, max: 30, step: 0.1 },
  fPercentSubmerged: { min: 0, max: 100, step: 1 },
  vecCentreOfMassOffsetX: { min: -2, max: 2, step: 0.01 },
  vecCentreOfMassOffsetY: { min: -2, max: 2, step: 0.01 },
  vecCentreOfMassOffsetZ: { min: -2, max: 2, step: 0.01 },
  vecInertiaMultiplierX: { min: 0, max: 5, step: 0.1 },
  vecInertiaMultiplierY: { min: 0, max: 5, step: 0.1 },
  vecInertiaMultiplierZ: { min: 0, max: 5, step: 0.1 },
  fInitialDriveForce: { min: 0, max: 2, step: 0.01 },
  fDriveInertia: { min: 0, max: 5, step: 0.01 },
  fClutchChangeRateScaleUpShift: { min: 0, max: 10, step: 0.05 },
  fClutchChangeRateScaleDownShift: { min: 0, max: 10, step: 0.05 },
  fInitialDriveMaxFlatVel: { min: 50, max: 500, step: 1 },
  nInitialDriveGears: { min: 1, max: 10, step: 1 },
  fDriveBiasFront: { min: 0, max: 1, step: 0.05 },
  fBrakeForce: { min: 0, max: 3, step: 0.01 },
  fBrakeBiasFront: { min: 0, max: 1, step: 0.01 },
  fHandBrakeForce: { min: 0, max: 5, step: 0.01 },
  fSteeringLock: { min: 10, max: 75, step: 0.5 },
  fTractionCurveMax: { min: 0, max: 5, step: 0.01 },
  fTractionCurveMin: { min: 0, max: 5, step: 0.01 },
  fTractionCurveLateral: { min: 0, max: 40, step: 0.1 },
  fTractionSpringDeltaMax: { min: 0, max: 5, step: 0.01 },
  fTractionLossMult: { min: 0, max: 5, step: 0.01 },
  fLowSpeedTractionLossMult: { min: 0, max: 5, step: 0.01 },
  fCamberStiffnesss: { min: -5, max: 5, step: 0.01 },
  fTractionBiasFront: { min: 0, max: 1, step: 0.01 },
  fSuspensionForce: { min: 0, max: 5, step: 0.01 },
  fSuspensionCompDamp: { min: 0, max: 5, step: 0.01 },
  fSuspensionReboundDamp: { min: 0, max: 5, step: 0.01 },
  fSuspensionUpperLimit: { min: -1, max: 1, step: 0.01 },
  fSuspensionLowerLimit: { min: -1, max: 1, step: 0.01 },
  fAntiRollBarForce: { min: 0, max: 5, step: 0.01 },
  fAntiRollBarBiasFront: { min: 0, max: 1, step: 0.01 },
  fSuspensionRaise: { min: -0.5, max: 0.5, step: 0.01 },
  fSuspensionBiasFront: { min: 0, max: 1, step: 0.01 },
  fRollCentreHeightFront: { min: -1, max: 1, step: 0.01 },
  fRollCentreHeightRear: { min: -1, max: 1, step: 0.01 },
  fCollisionDamageMult: { min: 0, max: 10, step: 0.1 },
  fWeaponDamageMult: { min: 0, max: 10, step: 0.1 },
  fDeformationDamageMult: { min: 0, max: 10, step: 0.1 },
  fEngineDamageMult: { min: 0, max: 10, step: 0.1 },
  fPetrolTankVolume: { min: 0, max: 150, step: 1 },
  fOilVolume: { min: 0, max: 20, step: 0.5 },
  fSeatOffsetDistX: { min: -2, max: 2, step: 0.01 },
  fSeatOffsetDistY: { min: -2, max: 2, step: 0.01 },
  fSeatOffsetDistZ: { min: -2, max: 2, step: 0.01 },
  nMonetaryValue: { min: 0, max: 5000000, step: 1000 },
  fBackEndPopUpCarImpulseMult: { min: 0, max: 5, step: 0.01 },
  fBackEndPopUpBuildingImpulseMult: { min: 0, max: 5, step: 0.01 },
  fBackEndPopUpMaxDeltaSpeed: { min: 0, max: 5, step: 0.01 },
};

export interface SectionVisualConfig {
  title: string;
  icon: string;
}

export const SECTION_VISUALS: Record<SectionId, SectionVisualConfig> = {
  identity: {
    title: "Identity",
    icon: "Gauge",
  },
  physical: {
    title: "Physics",
    icon: "Scale3D",
  },
  transmission: {
    title: "Drive",
    icon: "Gauge",
  },
  brakes: {
    title: "Braking",
    icon: "CircleDot",
  },
  traction: {
    title: "Traction",
    icon: "CircleDotDashed",
  },
  suspension: {
    title: "Suspension",
    icon: "Waves",
  },
  damage: {
    title: "Damage",
    icon: "ShieldAlert",
  },
  seatOffsets: {
    title: "Seat Offset",
    icon: "Scale3D",
  },
  flagsAi: {
    title: "Flags & AI",
    icon: "ShieldAlert",
  },
  subHandling: {
    title: "Sub Handling",
    icon: "Gauge",
  },
};

export interface FieldGroup {
  label: string;
  fields: (keyof HandlingData)[];
}

export const SECTION_FIELD_GROUPS: Partial<Record<SectionId, FieldGroup[]>> = {
  physical: [
    {
      label: "Center of Mass",
      fields: ["vecCentreOfMassOffsetX", "vecCentreOfMassOffsetY", "vecCentreOfMassOffsetZ"],
    },
    {
      label: "Inertia Multipliers",
      fields: ["vecInertiaMultiplierX", "vecInertiaMultiplierY", "vecInertiaMultiplierZ"],
    },
  ],
  transmission: [
    {
      label: "Clutch Shifts",
      fields: ["fClutchChangeRateScaleUpShift", "fClutchChangeRateScaleDownShift"],
    },
  ],
  traction: [
    {
      label: "Curve Shape",
      fields: ["fTractionCurveMax", "fTractionCurveMin", "fTractionCurveLateral"],
    },
  ],
  suspension: [
    {
      label: "Damping",
      fields: ["fSuspensionCompDamp", "fSuspensionReboundDamp"],
    },
    {
      label: "Travel Limits",
      fields: ["fSuspensionUpperLimit", "fSuspensionLowerLimit"],
    },
    {
      label: "Roll Centers",
      fields: ["fRollCentreHeightFront", "fRollCentreHeightRear"],
    },
  ],
  seatOffsets: [
    {
      label: "Seat Position",
      fields: ["fSeatOffsetDistX", "fSeatOffsetDistY", "fSeatOffsetDistZ"],
    },
  ],
};
