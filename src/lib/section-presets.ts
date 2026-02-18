import type { HandlingData } from "@/store/meta-store";

export type SectionId = "physical" | "transmission" | "brakes" | "traction" | "suspension" | "damage";

export interface SectionPreset {
  id: string;
  label: string;
  description: string;
  values: Partial<HandlingData>;
}

export interface SectionConfig {
  title: string;
  icon: string;
  presets: SectionPreset[];
}

type SectionPresetConfig = Record<SectionId, SectionConfig>;

export const sectionPresetConfigs: SectionPresetConfig = {
  physical: {
    title: "Physical Attributes",
    icon: "Scale3D",
    presets: [
      {
        id: "lightweight",
        label: "Lightweight",
        description: "Low mass, responsive inertia. Sports cars, tuners.",
        values: {
          fMass: 1200.0,
          fInitialDragCoeff: 6.5,
          vecCentreOfMassOffsetX: 0.0,
          vecCentreOfMassOffsetY: 0.0,
          vecCentreOfMassOffsetZ: -0.1,
          vecInertiaMultiplierX: 1.0,
          vecInertiaMultiplierY: 1.0,
          vecInertiaMultiplierZ: 0.9,
        },
      },
      {
        id: "standard",
        label: "Standard",
        description: "Balanced weight distribution. Typical sedan.",
        values: {
          fMass: 1500.0,
          fInitialDragCoeff: 8.0,
          vecCentreOfMassOffsetX: 0.0,
          vecCentreOfMassOffsetY: 0.0,
          vecCentreOfMassOffsetZ: 0.0,
          vecInertiaMultiplierX: 1.0,
          vecInertiaMultiplierY: 1.0,
          vecInertiaMultiplierZ: 1.0,
        },
      },
      {
        id: "heavy",
        label: "Heavy",
        description: "High mass, stable inertia. SUVs, trucks.",
        values: {
          fMass: 2500.0,
          fInitialDragCoeff: 10.0,
          vecCentreOfMassOffsetX: 0.0,
          vecCentreOfMassOffsetY: 0.0,
          vecCentreOfMassOffsetZ: 0.15,
          vecInertiaMultiplierX: 1.2,
          vecInertiaMultiplierY: 1.2,
          vecInertiaMultiplierZ: 1.3,
        },
      },
      {
        id: "heavy-duty",
        label: "Heavy Duty",
        description: "Extreme mass for commercial vehicles.",
        values: {
          fMass: 5000.0,
          fInitialDragCoeff: 14.0,
          vecCentreOfMassOffsetX: 0.0,
          vecCentreOfMassOffsetY: 0.0,
          vecCentreOfMassOffsetZ: 0.3,
          vecInertiaMultiplierX: 1.5,
          vecInertiaMultiplierY: 1.5,
          vecInertiaMultiplierZ: 1.8,
        },
      },
      {
        id: "super-heavy",
        label: "Super Heavy",
        description: "Maximum mass. Semi-trucks, industrial.",
        values: {
          fMass: 9000.0,
          fInitialDragCoeff: 16.0,
          vecCentreOfMassOffsetX: 0.0,
          vecCentreOfMassOffsetY: 0.0,
          vecCentreOfMassOffsetZ: 0.4,
          vecInertiaMultiplierX: 2.0,
          vecInertiaMultiplierY: 2.0,
          vecInertiaMultiplierZ: 2.5,
        },
      },
      {
        id: "motorcycle",
        label: "Motorcycle",
        description: "Ultra-lightweight. Two-wheeled vehicles.",
        values: {
          fMass: 220.0,
          fInitialDragCoeff: 4.5,
          vecCentreOfMassOffsetX: 0.0,
          vecCentreOfMassOffsetY: 0.0,
          vecCentreOfMassOffsetZ: 0.0,
          vecInertiaMultiplierX: 1.0,
          vecInertiaMultiplierY: 1.0,
          vecInertiaMultiplierZ: 1.0,
        },
      },
    ],
  },

  transmission: {
    title: "Transmission & Engine",
    icon: "Gauge",
    presets: [
      {
        id: "economy",
        label: "Economy",
        description: "Low power, 4-5 gears. City driving.",
        values: {
          fInitialDriveForce: 0.22,
          fInitialDriveMaxFlatVel: 110.0,
          nInitialDriveGears: 5,
          fDriveBiasFront: 1.0,
        },
      },
      {
        id: "standard",
        label: "Standard",
        description: "Balanced power, 6 gears. Typical daily driver.",
        values: {
          fInitialDriveForce: 0.28,
          fInitialDriveMaxFlatVel: 140.0,
          nInitialDriveGears: 6,
          fDriveBiasFront: 0.0,
        },
      },
      {
        id: "sport",
        label: "Sport",
        description: "Increased power, 6-7 gears. Performance oriented.",
        values: {
          fInitialDriveForce: 0.36,
          fInitialDriveMaxFlatVel: 175.0,
          nInitialDriveGears: 7,
          fDriveBiasFront: 0.0,
        },
      },
      {
        id: "super",
        label: "Supercar",
        description: "High power, 7 gears, AWD bias. Exotic performance.",
        values: {
          fInitialDriveForce: 0.40,
          fInitialDriveMaxFlatVel: 210.0,
          nInitialDriveGears: 7,
          fDriveBiasFront: 0.1,
        },
      },
      {
        id: "hypercar",
        label: "Hypercar",
        description: "Extreme power, 8 gears, AWD. Top-tier performance.",
        values: {
          fInitialDriveForce: 0.46,
          fInitialDriveMaxFlatVel: 240.0,
          nInitialDriveGears: 8,
          fDriveBiasFront: 0.2,
        },
      },
      {
        id: "rwd-drift",
        label: "RWD Drift",
        description: "Rear-wheel drive, moderate power. Tuned for sliding.",
        values: {
          fInitialDriveForce: 0.33,
          fInitialDriveMaxFlatVel: 160.0,
          nInitialDriveGears: 6,
          fDriveBiasFront: 0.0,
        },
      },
      {
        id: "awd-offroad",
        label: "AWD Off-Road",
        description: "All-wheel drive, good torque. Trucks and SUVs.",
        values: {
          fInitialDriveForce: 0.34,
          fInitialDriveMaxFlatVel: 150.0,
          nInitialDriveGears: 6,
          fDriveBiasFront: 0.5,
        },
      },
      {
        id: "heavy-towing",
        label: "Heavy Towing",
        description: "High torque, 5-6 gears. Commercial vehicles.",
        values: {
          fInitialDriveForce: 0.28,
          fInitialDriveMaxFlatVel: 100.0,
          nInitialDriveGears: 6,
          fDriveBiasFront: 0.0,
        },
      },
    ],
  },

  brakes: {
    title: "Brakes & Steering",
    icon: "CircleDot",
    presets: [
      {
        id: "weak",
        label: "Weak / Classic",
        description: "Drum brakes, narrow steering. Vintage feel.",
        values: {
          fBrakeForce: 0.5,
          fBrakeBiasFront: 0.7,
          fSteeringLock: 30.0,
        },
      },
      {
        id: "standard",
        label: "Standard",
        description: "Typical brakes, standard steering. Daily driver.",
        values: {
          fBrakeForce: 0.65,
          fBrakeBiasFront: 0.65,
          fSteeringLock: 35.0,
        },
      },
      {
        id: "sport",
        label: "Sport",
        description: "Upgraded brakes, sharper steering. Performance.",
        values: {
          fBrakeForce: 0.85,
          fBrakeBiasFront: 0.6,
          fSteeringLock: 38.0,
        },
      },
      {
        id: "race",
        label: "Race",
        description: "High-performance brakes, quick steering. Track ready.",
        values: {
          fBrakeForce: 1.1,
          fBrakeBiasFront: 0.55,
          fSteeringLock: 40.0,
        },
      },
      {
        id: "drift",
        label: "Drift",
        description: "Moderate brakes, wide steering lock. Slide control.",
        values: {
          fBrakeForce: 0.8,
          fBrakeBiasFront: 0.55,
          fSteeringLock: 50.0,
        },
      },
      {
        id: "offroad",
        label: "Off-Road",
        description: "Balanced brakes, wide steering. Trail capable.",
        values: {
          fBrakeForce: 0.65,
          fBrakeBiasFront: 0.55,
          fSteeringLock: 42.0,
        },
      },
      {
        id: "heavy",
        label: "Heavy Vehicle",
        description: "Strong brakes for heavy mass. Trucks, vans.",
        values: {
          fBrakeForce: 0.45,
          fBrakeBiasFront: 0.5,
          fSteeringLock: 30.0,
        },
      },
    ],
  },

  traction: {
    title: "Traction & Tires",
    icon: "CircleDotDashed",
    presets: [
      {
        id: "low-grip",
        label: "Low Grip",
        description: "Minimal traction, slides easily. Classic cars.",
        values: {
          fTractionCurveMax: 1.8,
          fTractionCurveMin: 1.5,
          fTractionLossMult: 1.3,
          fLowSpeedTractionLossMult: 0.5,
        },
      },
      {
        id: "standard",
        label: "Standard",
        description: "Average grip, predictable handling. Stock tires.",
        values: {
          fTractionCurveMax: 2.1,
          fTractionCurveMin: 1.8,
          fTractionLossMult: 1.0,
          fLowSpeedTractionLossMult: 0.0,
        },
      },
      {
        id: "sport",
        label: "Sport",
        description: "Enhanced grip, good recovery. Performance tires.",
        values: {
          fTractionCurveMax: 2.5,
          fTractionCurveMin: 2.2,
          fTractionLossMult: 1.0,
          fLowSpeedTractionLossMult: 0.5,
        },
      },
      {
        id: "race",
        label: "Race",
        description: "Maximum grip, excellent recovery. Slicks/semi-slicks.",
        values: {
          fTractionCurveMax: 2.9,
          fTractionCurveMin: 2.6,
          fTractionLossMult: 0.7,
          fLowSpeedTractionLossMult: 1.2,
        },
      },
      {
        id: "drift",
        label: "Drift",
        description: "Low max grip, sustained slides. Hard compound.",
        values: {
          fTractionCurveMax: 1.8,
          fTractionCurveMin: 1.5,
          fTractionLossMult: 1.5,
          fLowSpeedTractionLossMult: 2.0,
        },
      },
      {
        id: "offroad",
        label: "Off-Road",
        description: "Good dirt grip, reduced asphalt grip. All-terrain.",
        values: {
          fTractionCurveMax: 2.6,
          fTractionCurveMin: 2.3,
          fTractionLossMult: 0.5,
          fLowSpeedTractionLossMult: 0.0,
        },
      },
      {
        id: "muscle",
        label: "Muscle",
        description: "Moderate grip, easy to break loose. Drag bias.",
        values: {
          fTractionCurveMax: 2.0,
          fTractionCurveMin: 1.7,
          fTractionLossMult: 1.2,
          fLowSpeedTractionLossMult: 1.5,
        },
      },
    ],
  },

  suspension: {
    title: "Suspension",
    icon: "Waves",
    presets: [
      {
        id: "soft",
        label: "Soft / Comfort",
        description: "Plush ride, heavy body roll. Luxury, lowriders.",
        values: {
          fSuspensionForce: 1.5,
          fSuspensionCompDamp: 0.8,
          fSuspensionReboundDamp: 1.2,
          fAntiRollBarForce: 0.3,
          fSuspensionRaise: -0.05,
        },
      },
      {
        id: "standard",
        label: "Standard",
        description: "Balanced comfort and handling. Stock setup.",
        values: {
          fSuspensionForce: 2.0,
          fSuspensionCompDamp: 1.2,
          fSuspensionReboundDamp: 1.8,
          fAntiRollBarForce: 0.7,
          fSuspensionRaise: 0.0,
        },
      },
      {
        id: "sport",
        label: "Sport",
        description: "Firmer springs, reduced roll. Performance setup.",
        values: {
          fSuspensionForce: 2.6,
          fSuspensionCompDamp: 1.4,
          fSuspensionReboundDamp: 2.0,
          fAntiRollBarForce: 1.0,
          fSuspensionRaise: -0.02,
        },
      },
      {
        id: "race",
        label: "Race",
        description: "Very stiff, minimal body roll. Track spec.",
        values: {
          fSuspensionForce: 3.0,
          fSuspensionCompDamp: 1.6,
          fSuspensionReboundDamp: 2.4,
          fAntiRollBarForce: 1.2,
          fSuspensionRaise: -0.05,
        },
      },
      {
        id: "offroad",
        label: "Off-Road",
        description: "Long travel, raised ride height. Trail ready.",
        values: {
          fSuspensionForce: 3.2,
          fSuspensionCompDamp: 1.0,
          fSuspensionReboundDamp: 1.8,
          fAntiRollBarForce: 0.4,
          fSuspensionRaise: 0.15,
        },
      },
      {
        id: "rally",
        label: "Rally",
        description: "Balanced travel, slight lift. Dirt/snow capable.",
        values: {
          fSuspensionForce: 2.8,
          fSuspensionCompDamp: 1.0,
          fSuspensionReboundDamp: 1.5,
          fAntiRollBarForce: 0.5,
          fSuspensionRaise: 0.06,
        },
      },
      {
        id: "lowrider",
        label: "Lowrider",
        description: "Soft, extremely low stance. Hydraulic-ready.",
        values: {
          fSuspensionForce: 1.5,
          fSuspensionCompDamp: 0.8,
          fSuspensionReboundDamp: 1.2,
          fAntiRollBarForce: 0.3,
          fSuspensionRaise: -0.08,
        },
      },
      {
        id: "heavy-duty",
        label: "Heavy Duty",
        description: "Firm springs for heavy loads. Trucks, vans.",
        values: {
          fSuspensionForce: 3.5,
          fSuspensionCompDamp: 2.0,
          fSuspensionReboundDamp: 2.5,
          fAntiRollBarForce: 0.4,
          fSuspensionRaise: 0.1,
        },
      },
    ],
  },

  damage: {
    title: "Damage & Miscellaneous",
    icon: "ShieldAlert",
    presets: [
      {
        id: "fragile",
        label: "Fragile",
        description: "High damage, easy deformation. Race cars.",
        values: {
          fCollisionDamageMult: 2.0,
          fDeformationDamageMult: 2.0,
        },
      },
      {
        id: "standard",
        label: "Standard",
        description: "Normal damage sensitivity. Typical vehicle.",
        values: {
          fCollisionDamageMult: 1.0,
          fDeformationDamageMult: 0.8,
        },
      },
      {
        id: "reinforced",
        label: "Reinforced",
        description: "Reduced damage. Emergency, taxis.",
        values: {
          fCollisionDamageMult: 0.5,
          fDeformationDamageMult: 0.5,
        },
      },
      {
        id: "heavy-duty",
        label: "Heavy Duty",
        description: "Very resistant to damage. Trucks, industrial.",
        values: {
          fCollisionDamageMult: 0.2,
          fDeformationDamageMult: 0.1,
        },
      },
      {
        id: "armored",
        label: "Armored",
        description: "Nearly invincible. Military, special vehicles.",
        values: {
          fCollisionDamageMult: 0.1,
          fDeformationDamageMult: 0.05,
        },
      },
      {
        id: "invincible",
        label: "Invincible",
        description: "No collision damage at all. God mode.",
        values: {
          fCollisionDamageMult: 0.0,
          fDeformationDamageMult: 0.0,
        },
      },
    ],
  },
};

export function applySectionPreset(
  currentHandling: HandlingData,
  sectionId: SectionId,
  preset: SectionPreset
): Partial<HandlingData> {
  return { ...currentHandling, ...preset.values };
}

export const sectionFieldMap: Record<SectionId, (keyof HandlingData)[]> = {
  physical: [
    "fMass",
    "fInitialDragCoeff",
    "vecCentreOfMassOffsetX",
    "vecCentreOfMassOffsetY",
    "vecCentreOfMassOffsetZ",
    "vecInertiaMultiplierX",
    "vecInertiaMultiplierY",
    "vecInertiaMultiplierZ",
  ],
  transmission: [
    "fInitialDriveForce",
    "fInitialDriveMaxFlatVel",
    "nInitialDriveGears",
    "fDriveBiasFront",
  ],
  brakes: ["fBrakeForce", "fBrakeBiasFront", "fSteeringLock"],
  traction: [
    "fTractionCurveMax",
    "fTractionCurveMin",
    "fTractionLossMult",
    "fLowSpeedTractionLossMult",
  ],
  suspension: [
    "fSuspensionForce",
    "fSuspensionCompDamp",
    "fSuspensionReboundDamp",
    "fAntiRollBarForce",
    "fSuspensionRaise",
  ],
  damage: ["fCollisionDamageMult", "fDeformationDamageMult"],
};
