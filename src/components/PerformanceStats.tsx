import { memo, useMemo } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { useMetaStore, type HandlingData, type PerformanceSpeedUnit } from "@/store/meta-store";

interface Stat {
  label: string;
  value: string;
  bar: number;
  color: string;
}

const MPH_TO_KPH = 1.60934;

function formatSpeed(mph: number, unit: PerformanceSpeedUnit): string {
  if (unit === "kph") {
    return `${(mph * MPH_TO_KPH).toFixed(0)} kph`;
  }
  return `${mph.toFixed(0)} mph`;
}

function isAirVehicle(vehicleType: string): boolean {
  return vehicleType === "VEHICLE_TYPE_HELI" || vehicleType === "VEHICLE_TYPE_PLANE";
}

function computeGroundStats(handling: HandlingData, speedUnit: PerformanceSpeedUnit): Stat[] {
  const topSpeedMph = handling.fInitialDriveMaxFlatVel * 0.9;
  const topSpeedBar = Math.min((topSpeedMph / 200) * 100, 100);
  const accelRaw = (handling.fInitialDriveForce * 10000) / handling.fMass;
  const accelBar = Math.min((accelRaw / 3) * 100, 100);
  const brakeBar = Math.min((handling.fBrakeForce / 1.5) * 100, 100);
  const tractionAvg = (handling.fTractionCurveMax + handling.fTractionCurveMin) / 2;
  const tractionBar = Math.min((tractionAvg / 3.5) * 100, 100);
  const cornerRaw = (handling.fSteeringLock / 45) * 0.5 + (handling.fAntiRollBarForce / 1.5) * 0.3 + (tractionAvg / 3) * 0.2;
  const cornerBar = Math.min(cornerRaw * 100, 100);
  const suspRaw = (handling.fSuspensionForce / 4) * 0.4 + (handling.fSuspensionCompDamp / 3) * 0.3 + (handling.fSuspensionReboundDamp / 3) * 0.3;
  const suspBar = Math.min(suspRaw * 100, 100);
  const durRaw = (1 / Math.max(handling.fCollisionDamageMult, 0.1)) * 0.5 + (1 / Math.max(handling.fDeformationDamageMult, 0.1)) * 0.5;
  const durBar = Math.min((durRaw / 2) * 100, 100);

  const driveType =
    handling.fDriveBiasFront >= 0.9 ? "FWD" :
    handling.fDriveBiasFront <= 0.1 ? "RWD" :
    handling.fDriveBiasFront >= 0.4 && handling.fDriveBiasFront <= 0.6 ? "AWD" :
    handling.fDriveBiasFront > 0.5 ? "Front-biased AWD" : "Rear-biased AWD";

  return [
    { label: "Top Speed (Est.)", value: formatSpeed(topSpeedMph, speedUnit), bar: topSpeedBar, color: "var(--chart-2)" },
    { label: "Acceleration", value: `${accelRaw.toFixed(2)}g (${handling.nInitialDriveGears} gears)`, bar: accelBar, color: "var(--chart-2)" },
    { label: "Braking", value: `${handling.fBrakeForce.toFixed(2)} (bias ${(handling.fBrakeBiasFront * 100).toFixed(0)}% front)`, bar: brakeBar, color: "var(--chart-5)" },
    { label: "Traction", value: `${tractionAvg.toFixed(2)} (${handling.fTractionLossMult.toFixed(1)}x loss)`, bar: tractionBar, color: "var(--chart-1)" },
    { label: "Cornering", value: `${handling.fSteeringLock.toFixed(0)}° lock`, bar: cornerBar, color: "var(--chart-4)" },
    { label: "Suspension", value: `${handling.fSuspensionForce.toFixed(1)} force / ${handling.fSuspensionRaise >= 0 ? "+" : ""}${handling.fSuspensionRaise.toFixed(2)} raise`, bar: suspBar, color: "var(--chart-3)" },
    { label: "Durability", value: `${handling.fCollisionDamageMult.toFixed(2)}x collision`, bar: durBar, color: "var(--destructive)" },
    { label: "Drivetrain", value: `${driveType} (${(handling.fDriveBiasFront * 100).toFixed(0)}% front)`, bar: handling.fDriveBiasFront * 100, color: "var(--chart-4)" },
  ];
}

function computeAirStats(handling: HandlingData, vehicleType: string, speedUnit: PerformanceSpeedUnit): Stat[] {
  const isHeli = vehicleType === "VEHICLE_TYPE_HELI";
  const topSpeedMph = handling.fInitialDriveMaxFlatVel * 0.9;
  const topSpeedBar = Math.min((topSpeedMph / 250) * 100, 100);
  const thrustRaw = (handling.fInitialDriveForce * 10000) / handling.fMass;
  const thrustBar = Math.min((thrustRaw / 3) * 100, 100);
  const climbRaw = (handling.fInitialDriveForce * 5000) / (handling.fMass * Math.max(handling.fInitialDragCoeff, 1));
  const climbMph = climbRaw * 15;
  const climbBar = Math.min((climbRaw / 2) * 100, 100);
  const agilityRaw = (handling.fSteeringLock / 45) * 0.4
    + (1 / Math.max(handling.vecInertiaMultiplierX, 0.1)) * 0.2
    + (1 / Math.max(handling.vecInertiaMultiplierY, 0.1)) * 0.2
    + (1 / Math.max(handling.vecInertiaMultiplierZ, 0.1)) * 0.2;
  const agilityBar = Math.min(agilityRaw * 100, 100);
  const stabilityRaw = (handling.vecInertiaMultiplierX + handling.vecInertiaMultiplierY + handling.vecInertiaMultiplierZ) / 3;
  const stabilityBar = Math.min((stabilityRaw / 3) * 100, 100);
  const dragBar = Math.min((handling.fInitialDragCoeff / 20) * 100, 100);
  const brakeBar = Math.min((handling.fBrakeForce / 1.5) * 100, 100);
  const durRaw = (1 / Math.max(handling.fCollisionDamageMult, 0.1)) * 0.5 + (1 / Math.max(handling.fDeformationDamageMult, 0.1)) * 0.5;
  const durBar = Math.min((durRaw / 2) * 100, 100);
  const weightBar = Math.min((handling.fMass / 10000) * 100, 100);

  return [
    { label: "Top Speed (Est.)", value: formatSpeed(topSpeedMph, speedUnit), bar: topSpeedBar, color: "var(--chart-2)" },
    { label: isHeli ? "Rotor Thrust" : "Engine Thrust", value: `${thrustRaw.toFixed(2)}g (${handling.nInitialDriveGears} stage)`, bar: thrustBar, color: "var(--chart-2)" },
    { label: "Climb Rate", value: `~${formatSpeed(climbMph, speedUnit)} vertical`, bar: climbBar, color: "var(--chart-1)" },
    { label: isHeli ? "Yaw Agility" : "Roll Agility", value: `${handling.fSteeringLock.toFixed(0)}° authority`, bar: agilityBar, color: "var(--chart-4)" },
    { label: "Stability", value: `${stabilityRaw.toFixed(2)} inertia avg`, bar: stabilityBar, color: "var(--chart-3)" },
    { label: "Drag Profile", value: `${handling.fInitialDragCoeff.toFixed(1)} coeff`, bar: dragBar, color: "var(--chart-5)" },
    { label: isHeli ? "Rotor Brake" : "Air Brake", value: `${handling.fBrakeForce.toFixed(2)} force`, bar: brakeBar, color: "var(--chart-5)" },
    { label: "Durability", value: `${handling.fCollisionDamageMult.toFixed(2)}x collision`, bar: durBar, color: "var(--destructive)" },
    { label: "Weight Class", value: `${handling.fMass.toFixed(0)} kg`, bar: weightBar, color: "var(--chart-4)" },
  ];
}

const PERF_LEGEND: { color: string; label: string }[] = [
  { color: "var(--chart-2)", label: "Speed/Power" },
  { color: "var(--chart-5)", label: "Braking" },
  { color: "var(--chart-1)", label: "Traction" },
  { color: "var(--chart-4)", label: "Handling" },
  { color: "var(--chart-3)", label: "Suspension" },
  { color: "var(--destructive)", label: "Durability" },
];

interface PerformanceStatsProps {
  handling: HandlingData;
  vehicleType?: string;
}

export const PerformanceStats = memo(function PerformanceStats({ handling, vehicleType = "VEHICLE_TYPE_CAR" }: PerformanceStatsProps) {
  const performanceSpeedUnit = useMetaStore((s) => s.performanceSpeedUnit);
  const isAir = isAirVehicle(vehicleType);
  const stats = useMemo(
    () => isAir ? computeAirStats(handling, vehicleType, performanceSpeedUnit) : computeGroundStats(handling, performanceSpeedUnit),
    [handling, vehicleType, isAir, performanceSpeedUnit],
  );

  const typeLabel = vehicleType === "VEHICLE_TYPE_HELI" ? "Helicopter"
    : vehicleType === "VEHICLE_TYPE_PLANE" ? "Plane / Jet"
    : null;

  return (
    <motion.div
      className="space-y-2 rounded-xl border border-border/70 bg-card/90 p-3 shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Estimated performance
          </h3>
          {typeLabel && <Badge variant="outline">{typeLabel}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {PERF_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="size-1.5 rounded-full" style={{ backgroundColor: item.color, opacity: 0.8 }} />
              <span className="text-[8px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <motion.div
        className="mb-1 text-[10px] text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.25 }}
      >
        Mass: {handling.fMass.toFixed(0)} kg &middot; Drag: {handling.fInitialDragCoeff.toFixed(1)}
        {isAir && ` · Inertia: ${((handling.vecInertiaMultiplierX + handling.vecInertiaMultiplierY + handling.vecInertiaMultiplierZ) / 3).toFixed(2)} avg`}
      </motion.div>
      <div className="space-y-1">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="space-y-0.5"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-foreground/85">{stat.label}</span>
              <span className="font-mono text-[9px] text-muted-foreground">{stat.value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-sm bg-muted/60">
              <motion.div
                className="h-full rounded-sm"
                initial={{ width: "2%" }}
                animate={{ width: `${Math.max(stat.bar, 2)}%` }}
                transition={{ duration: 0.5, delay: index * 0.03 + 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ backgroundColor: stat.color, opacity: 0.8 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});
