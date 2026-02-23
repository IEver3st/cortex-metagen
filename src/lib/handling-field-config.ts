import type { HandlingData } from "@/store/meta-store";
import type { SectionId } from "@/lib/section-presets";

export interface HandlingFieldRange {
  min: number;
  max: number;
  step: number;
}

/** Default handling values used as the "baseline" for change detection. */
export const DEFAULT_HANDLING: Partial<HandlingData> = {
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
};

/** Min/max/step ranges for each handling field shown in the editor slider. */
export const HANDLING_FIELD_RANGES: Record<string, HandlingFieldRange> = {
  fMass:                      { min: 500,   max: 15000, step: 50 },
  fInitialDragCoeff:          { min: 0,     max: 30,    step: 0.1 },
  vecCentreOfMassOffsetX:     { min: -2,    max: 2,     step: 0.01 },
  vecCentreOfMassOffsetY:     { min: -2,    max: 2,     step: 0.01 },
  vecCentreOfMassOffsetZ:     { min: -2,    max: 2,     step: 0.01 },
  vecInertiaMultiplierX:      { min: 0,     max: 5,     step: 0.1 },
  vecInertiaMultiplierY:      { min: 0,     max: 5,     step: 0.1 },
  vecInertiaMultiplierZ:      { min: 0,     max: 5,     step: 0.1 },
  fInitialDriveForce:         { min: 0,     max: 2,     step: 0.01 },
  fInitialDriveMaxFlatVel:    { min: 50,    max: 500,   step: 1 },
  nInitialDriveGears:         { min: 1,     max: 10,    step: 1 },
  fDriveBiasFront:            { min: 0,     max: 1,     step: 0.05 },
  fBrakeForce:                { min: 0,     max: 3,     step: 0.01 },
  fBrakeBiasFront:            { min: 0,     max: 1,     step: 0.01 },
  fSteeringLock:              { min: 10,    max: 75,    step: 0.5 },
  fTractionCurveMax:          { min: 0,     max: 5,     step: 0.01 },
  fTractionCurveMin:          { min: 0,     max: 5,     step: 0.01 },
  fTractionLossMult:          { min: 0,     max: 5,     step: 0.01 },
  fLowSpeedTractionLossMult:  { min: 0,     max: 5,     step: 0.01 },
  fSuspensionForce:           { min: 0,     max: 5,     step: 0.01 },
  fSuspensionCompDamp:        { min: 0,     max: 5,     step: 0.01 },
  fSuspensionReboundDamp:     { min: 0,     max: 5,     step: 0.01 },
  fAntiRollBarForce:          { min: 0,     max: 5,     step: 0.01 },
  fSuspensionRaise:           { min: -0.5,  max: 0.5,   step: 0.01 },
  fCollisionDamageMult:       { min: 0,     max: 10,    step: 0.1 },
  fDeformationDamageMult:     { min: 0,     max: 10,    step: 0.1 },
};

export interface SectionVisualConfig {
  title: string;
  icon: string;
}

/** Visual config per section — label and icon name. */
export const SECTION_VISUALS: Record<SectionId, SectionVisualConfig> = {
  physical: {
    title: "Physical",
    icon: "Scale3D",
  },
  transmission: {
    title: "Transmission",
    icon: "Gauge",
  },
  brakes: {
    title: "Brakes",
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
};
