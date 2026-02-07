import { useMemo, memo } from "react";
import { motion } from "motion/react";
import type { HandlingData } from "@/store/meta-store";

interface Stat {
  label: string;
  value: string;
  bar: number; // 0-100
  color: string;
}

const MPH_TO_KNOTS = 0.868976;

function isAirVehicle(vehicleType: string): boolean {
  return vehicleType === "VEHICLE_TYPE_HELI" || vehicleType === "VEHICLE_TYPE_PLANE";
}

function computeGroundStats(h: HandlingData): Stat[] {
  // Top Speed: fInitialDriveMaxFlatVel * 0.9 ≈ mph (tested in-game)
  const topSpeedMph = h.fInitialDriveMaxFlatVel * 0.9;
  const topSpeedKph = topSpeedMph * 1.60934;
  const topSpeedBar = Math.min((topSpeedMph / 200) * 100, 100);

  // Acceleration estimate: driveForce / mass * gears factor
  const accelRaw = (h.fInitialDriveForce * 10000) / h.fMass;
  const accelBar = Math.min((accelRaw / 3) * 100, 100);

  // Braking: brakeForce scaled
  const brakeBar = Math.min((h.fBrakeForce / 1.5) * 100, 100);

  // Traction: average of curve max and min
  const tractionAvg = (h.fTractionCurveMax + h.fTractionCurveMin) / 2;
  const tractionBar = Math.min((tractionAvg / 3.5) * 100, 100);

  // Handling/cornering: steeringLock + antiRollBar + traction bias
  const cornerRaw = (h.fSteeringLock / 45) * 0.5 + (h.fAntiRollBarForce / 1.5) * 0.3 + (tractionAvg / 3) * 0.2;
  const cornerBar = Math.min(cornerRaw * 100, 100);

  // Suspension quality: force + comp + rebound averaged
  const suspRaw = (h.fSuspensionForce / 4) * 0.4 + (h.fSuspensionCompDamp / 3) * 0.3 + (h.fSuspensionReboundDamp / 3) * 0.3;
  const suspBar = Math.min(suspRaw * 100, 100);

  // Durability: inverse of damage mults
  const durRaw = (1 / Math.max(h.fCollisionDamageMult, 0.1)) * 0.5 + (1 / Math.max(h.fDeformationDamageMult, 0.1)) * 0.5;
  const durBar = Math.min((durRaw / 2) * 100, 100);

  // Drivetrain type
  const driveType =
    h.fDriveBiasFront >= 0.9 ? "FWD" :
    h.fDriveBiasFront <= 0.1 ? "RWD" :
    h.fDriveBiasFront >= 0.4 && h.fDriveBiasFront <= 0.6 ? "AWD" :
    h.fDriveBiasFront > 0.5 ? "Front-biased AWD" : "Rear-biased AWD";

  return [
    { label: "Top Speed", value: `${topSpeedMph.toFixed(0)} mph / ${topSpeedKph.toFixed(0)} kph`, bar: topSpeedBar, color: "#2CD672" },
    { label: "Acceleration", value: `${accelRaw.toFixed(2)}g (${h.nInitialDriveGears} gears)`, bar: accelBar, color: "#2CD672" },
    { label: "Braking", value: `${h.fBrakeForce.toFixed(2)} (bias ${(h.fBrakeBiasFront * 100).toFixed(0)}% front)`, bar: brakeBar, color: "#F59E0B" },
    { label: "Traction", value: `${tractionAvg.toFixed(2)} (${h.fTractionLossMult.toFixed(1)}x loss)`, bar: tractionBar, color: "#3B82F6" },
    { label: "Cornering", value: `${h.fSteeringLock.toFixed(0)}° lock`, bar: cornerBar, color: "#8B5CF6" },
    { label: "Suspension", value: `${h.fSuspensionForce.toFixed(1)} force / ${h.fSuspensionRaise >= 0 ? "+" : ""}${h.fSuspensionRaise.toFixed(2)} raise`, bar: suspBar, color: "#06B6D4" },
    { label: "Durability", value: `${h.fCollisionDamageMult.toFixed(2)}x collision`, bar: durBar, color: "#EF4444" },
    { label: "Drivetrain", value: `${driveType} (${(h.fDriveBiasFront * 100).toFixed(0)}% front)`, bar: h.fDriveBiasFront * 100, color: "#A855F7" },
  ];
}

function computeAirStats(h: HandlingData, vehicleType: string): Stat[] {
  const isHeli = vehicleType === "VEHICLE_TYPE_HELI";

  // Top Speed in mph and knots (0.9 factor tested in-game)
  const topSpeedMph = h.fInitialDriveMaxFlatVel * 0.9;
  const topSpeedKnots = topSpeedMph * MPH_TO_KNOTS;
  const topSpeedBar = Math.min((topSpeedMph / 250) * 100, 100);

  // Thrust / engine power: driveForce scaled for aircraft
  const thrustRaw = (h.fInitialDriveForce * 10000) / h.fMass;
  const thrustBar = Math.min((thrustRaw / 3) * 100, 100);

  // Climb rate estimate: driveForce vs mass and drag
  const climbRaw = (h.fInitialDriveForce * 5000) / (h.fMass * Math.max(h.fInitialDragCoeff, 1));
  const climbMph = climbRaw * 15;
  const climbKnots = climbMph * MPH_TO_KNOTS;
  const climbBar = Math.min((climbRaw / 2) * 100, 100);

  // Agility / yaw rate: steeringLock + inertia multipliers
  const agilityRaw = (h.fSteeringLock / 45) * 0.4
    + (1 / Math.max(h.vecInertiaMultiplierX, 0.1)) * 0.2
    + (1 / Math.max(h.vecInertiaMultiplierY, 0.1)) * 0.2
    + (1 / Math.max(h.vecInertiaMultiplierZ, 0.1)) * 0.2;
  const agilityBar = Math.min(agilityRaw * 100, 100);

  // Stability: inertia multipliers averaged (higher = more stable)
  const stabilityRaw = (h.vecInertiaMultiplierX + h.vecInertiaMultiplierY + h.vecInertiaMultiplierZ) / 3;
  const stabilityBar = Math.min((stabilityRaw / 3) * 100, 100);

  // Drag profile
  const dragBar = Math.min((h.fInitialDragCoeff / 20) * 100, 100);

  // Braking / deceleration
  const brakeBar = Math.min((h.fBrakeForce / 1.5) * 100, 100);

  // Durability
  const durRaw = (1 / Math.max(h.fCollisionDamageMult, 0.1)) * 0.5 + (1 / Math.max(h.fDeformationDamageMult, 0.1)) * 0.5;
  const durBar = Math.min((durRaw / 2) * 100, 100);

  // Weight class
  const weightBar = Math.min((h.fMass / 10000) * 100, 100);

  return [
    { label: "Top Speed", value: `${topSpeedMph.toFixed(0)} mph / ${topSpeedKnots.toFixed(0)} kts`, bar: topSpeedBar, color: "#2CD672" },
    { label: isHeli ? "Rotor Thrust" : "Engine Thrust", value: `${thrustRaw.toFixed(2)}g (${h.nInitialDriveGears} stage)`, bar: thrustBar, color: "#2CD672" },
    { label: "Climb Rate", value: `~${climbMph.toFixed(0)} mph / ${climbKnots.toFixed(0)} kts vertical`, bar: climbBar, color: "#38BDF8" },
    { label: isHeli ? "Yaw Agility" : "Roll Agility", value: `${h.fSteeringLock.toFixed(0)}° authority`, bar: agilityBar, color: "#8B5CF6" },
    { label: "Stability", value: `${stabilityRaw.toFixed(2)} inertia avg`, bar: stabilityBar, color: "#06B6D4" },
    { label: "Drag Profile", value: `${h.fInitialDragCoeff.toFixed(1)} coeff`, bar: dragBar, color: "#F59E0B" },
    { label: isHeli ? "Rotor Brake" : "Air Brake", value: `${h.fBrakeForce.toFixed(2)} force`, bar: brakeBar, color: "#F59E0B" },
    { label: "Durability", value: `${h.fCollisionDamageMult.toFixed(2)}x collision`, bar: durBar, color: "#EF4444" },
    { label: "Weight Class", value: `${h.fMass.toFixed(0)} kg`, bar: weightBar, color: "#A855F7" },
  ];
}

interface PerformanceStatsProps {
  handling: HandlingData;
  vehicleType?: string;
}

export const PerformanceStats = memo(function PerformanceStats({ handling, vehicleType = "VEHICLE_TYPE_CAR" }: PerformanceStatsProps) {
  const isAir = isAirVehicle(vehicleType);
  const stats = useMemo(
    () => isAir ? computeAirStats(handling, vehicleType) : computeGroundStats(handling),
    [handling, vehicleType, isAir],
  );

  const typeLabel = vehicleType === "VEHICLE_TYPE_HELI" ? "Helicopter"
    : vehicleType === "VEHICLE_TYPE_PLANE" ? "Plane / Jet"
    : null;

  return (
    <motion.div
      className="space-y-2 p-3 rounded-md border bg-card/50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#2CD672" }}>
          Estimated Performance
        </h3>
        {typeLabel && (
          <motion.span
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/25"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            {typeLabel}
          </motion.span>
        )}
      </div>
      <motion.div
        className="text-[10px] text-muted-foreground mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.25 }}
      >
        Mass: {handling.fMass.toFixed(0)} kg · Drag: {handling.fInitialDragCoeff.toFixed(1)}
        {isAir && ` · Inertia: ${((handling.vecInertiaMultiplierX + handling.vecInertiaMultiplierY + handling.vecInertiaMultiplierZ) / 3).toFixed(2)} avg`}
      </motion.div>
      <div className="space-y-1.5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="space-y-0.5"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">{stat.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{stat.value}</span>
            </div>
            <div className="h-2 w-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full"
                initial={{ width: "2%" }}
                animate={{ width: `${Math.max(stat.bar, 2)}%` }}
                transition={{ duration: 0.5, delay: i * 0.04 + 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ backgroundColor: stat.color, opacity: 0.85 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});
