import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMetaStore } from "@/store/meta-store";
import { SliderField } from "@/components/SliderField";
import { PerformanceStats } from "@/components/PerformanceStats";
import { handlingFields } from "@/lib/dictionary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Scale3D,
  Gauge,
  CircleDot,
  CircleDotDashed,
  Waves,
  ShieldAlert,
} from "lucide-react";
import { SectionPresetPicker } from "@/components/SectionPresetPicker";
import { cn } from "@/lib/utils";
import {
  sectionFieldMap,
  type SectionId,
  type SectionPreset,
} from "@/lib/section-presets";
import {
  HANDLING_FIELD_RANGES,
  DEFAULT_HANDLING,
  SECTION_VISUALS,
} from "@/lib/handling-field-config";
import type { HandlingData, PerformanceSpeedUnit } from "@/store/meta-store";

const ALL_SECTIONS: SectionId[] = ["physical", "transmission", "brakes", "traction", "suspension", "damage"];

const SECTION_ICONS: Record<SectionId, React.ComponentType<{ className?: string }>> = {
  physical: Scale3D,
  transmission: Gauge,
  brakes: CircleDot,
  traction: CircleDotDashed,
  suspension: Waves,
  damage: ShieldAlert,
};

function getSectionValues(h: HandlingData, sectionId: SectionId): Record<string, number> {
  const fields = sectionFieldMap[sectionId];
  const values: Record<string, number> = {};
  for (const f of fields) {
    const v = h[f];
    if (typeof v === "number") values[f] = v;
  }
  return values;
}

function countSectionChanges(h: HandlingData, sectionId: SectionId): number {
  const fields = sectionFieldMap[sectionId];
  let count = 0;
  for (const f of fields) {
    const current = h[f];
    const def = DEFAULT_HANDLING[f];
    if (typeof current === "number" && typeof def === "number" && current !== def) {
      count++;
    }
  }
  return count;
}

interface SectionBlockProps {
  sectionId: SectionId;
  handling: HandlingData;
  onUpdate: (data: Record<string, unknown>) => void;
  onApplyPreset: (sectionId: SectionId, preset: SectionPreset) => void;
  collapsed: boolean;
  onToggle: () => void;
  performanceSpeedUnit: PerformanceSpeedUnit;
}

function SectionBlock({ sectionId, handling, onUpdate, onApplyPreset, collapsed, onToggle, performanceSpeedUnit }: SectionBlockProps) {
  const visual = SECTION_VISUALS[sectionId];
  const Icon = SECTION_ICONS[sectionId];
  const fields = sectionFieldMap[sectionId];
  const changeCount = countSectionChanges(handling, sectionId);
  const currentValues = getSectionValues(handling, sectionId);

  const resetSection = useCallback(() => {
    const resetData: Record<string, unknown> = {};
    for (const f of fields) {
      const def = DEFAULT_HANDLING[f];
      if (def !== undefined) resetData[f] = def;
    }
    onUpdate(resetData);
  }, [fields, onUpdate]);

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-700/40 overflow-hidden transition-colors",
        "border-l-[3px] border-l-slate-600/50"
      )}
    >
      {/* Section header — fully neutral */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02] bg-white/[0.01]"
      >
        <Icon className="size-4 shrink-0 text-slate-400" />
        <span className="text-sm font-semibold text-slate-200 flex-1 tracking-tight">
          {visual.title}
        </span>

        {/* Change count badge — orange state indicator */}
        {changeCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums bg-orange-500/15 text-orange-400">
            {changeCount} {changeCount === 1 ? "change" : "changes"}
          </span>
        )}

        {/* Section preset picker */}
        <div onClick={(e) => e.stopPropagation()}>
          <SectionPresetPicker
            sectionId={sectionId}
            currentValues={currentValues}
            onApply={(preset) => onApplyPreset(sectionId, preset)}
          />
        </div>

        {/* Reset section — orange affordance, only when changes exist */}
        {changeCount > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); resetSection(); }}
            className="size-6 flex items-center justify-center rounded text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
            title="Reset section to defaults"
          >
            <RotateCcw className="size-3" />
          </button>
        )}

        {/* Expand/collapse chevron */}
        <ChevronDown
          className={cn(
            "size-3.5 text-slate-500 transition-transform duration-200",
            !collapsed && "rotate-180"
          )}
        />
      </button>

      {/* Section content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-2 pb-2 pt-1 space-y-0.5 border-t border-slate-700/30">
              {sectionId === "damage" ? (
                <>
                  {/* Slider fields */}
                  <SliderField
                    field={handlingFields.fCollisionDamageMult}
                    value={handling.fCollisionDamageMult}
                    onChange={(v) => onUpdate({ fCollisionDamageMult: v })}
                    defaultValue={DEFAULT_HANDLING.fCollisionDamageMult}
                    {...HANDLING_FIELD_RANGES.fCollisionDamageMult}
                  />
                  <SliderField
                    field={handlingFields.fDeformationDamageMult}
                    value={handling.fDeformationDamageMult}
                    onChange={(v) => onUpdate({ fDeformationDamageMult: v })}
                    defaultValue={DEFAULT_HANDLING.fDeformationDamageMult}
                    {...HANDLING_FIELD_RANGES.fDeformationDamageMult}
                  />
                  {/* Flag inputs */}
                  <div className="flex items-center gap-3 py-1.5 px-1">
                    <Label className="text-sm text-slate-400 min-w-[180px]">Model Flags</Label>
                    <Input
                      value={handling.strModelFlags}
                      onChange={(e) => onUpdate({ strModelFlags: e.target.value })}
                      className="h-6 text-xs font-mono bg-transparent border-slate-700/50"
                    />
                  </div>
                  <div className="flex items-center gap-3 py-1.5 px-1">
                    <Label className="text-sm text-slate-400 min-w-[180px]">Handling Flags</Label>
                    <Input
                      value={handling.strHandlingFlags}
                      onChange={(e) => onUpdate({ strHandlingFlags: e.target.value })}
                      className="h-6 text-xs font-mono bg-transparent border-slate-700/50"
                    />
                  </div>
                </>
              ) : (
                fields.map((fieldKey) => {
                  const fieldInfo = handlingFields[fieldKey];
                  const range = HANDLING_FIELD_RANGES[fieldKey];
                  if (!fieldInfo || !range) return null;
                  const val = handling[fieldKey];
                  if (typeof val !== "number") return null;

                  const topSpeedUnit = fieldKey === "fInitialDriveMaxFlatVel"
                    ? (performanceSpeedUnit === "mph" ? "mph" : "kph")
                    : undefined;

                  return (
                    <SliderField
                      key={fieldKey}
                      field={fieldInfo}
                      value={val}
                      onChange={(v) => {
                        const updateVal = fieldKey === "nInitialDriveGears" ? Math.round(v) : v;
                        onUpdate({ [fieldKey]: updateVal });
                      }}
                      defaultValue={DEFAULT_HANDLING[fieldKey] as number | undefined}
                      displayUnit={topSpeedUnit}
                      {...range}
                    />
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HandlingEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateHandling = useMetaStore((s) => s.updateHandling);
  const performanceSpeedUnit = useMetaStore((s) => s.performanceSpeedUnit);
  const [showPerf, setShowPerf] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionId>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const update = useCallback((data: Record<string, unknown>) => {
    if (activeId) updateHandling(activeId, data);
  }, [updateHandling, activeId]);

  const applySectionPreset = useCallback(
    (_sectionId: SectionId, preset: SectionPreset) => {
      if (activeId) {
        updateHandling(activeId, preset.values);
      }
    },
    [updateHandling, activeId]
  );

  const toggleSection = useCallback((sectionId: SectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const scrollToSection = useCallback((sectionId: SectionId) => {
    // Expand if collapsed
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
    // Scroll into view
    setTimeout(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  // Total change count across all sections
  const totalChanges = useMemo(() => {
    if (!vehicle) return 0;
    return ALL_SECTIONS.reduce((acc, s) => acc + countSectionChanges(vehicle.handling, s), 0);
  }, [vehicle]);

  const resetAll = useCallback(() => {
    if (activeId) {
      const resetData: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(DEFAULT_HANDLING)) {
        resetData[key] = val;
      }
      updateHandling(activeId, resetData);
    }
  }, [activeId, updateHandling]);

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Select or create a vehicle to edit handling
      </div>
    );
  }

  const h = vehicle.handling;

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Sticky top bar: handling name + section nav + change summary */}
      <div className="sticky top-0 z-10 bg-[#040d1a]/95 backdrop-blur-sm border-b border-slate-700/30 px-4 py-2.5 space-y-2.5">
        {/* Handling name + change summary */}
        <div className="flex items-center gap-3">
          <Label className="text-xs text-slate-500 shrink-0">
            Handling Name
          </Label>
          <Input
            value={h.handlingName}
            onChange={(e) => update({ handlingName: e.target.value.toUpperCase() })}
            className="h-6 text-xs font-mono uppercase max-w-[200px] bg-transparent border-slate-700/50"
          />

          {/* Change summary — orange state indicator */}
          <div className="flex-1" />
          {totalChanges > 0 && (
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-orange-400/90 font-medium tabular-nums">
                {totalChanges} {totalChanges === 1 ? "change" : "changes"}
              </span>
              <button
                type="button"
                onClick={resetAll}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-400 transition-colors"
              >
                <RotateCcw className="size-3" />
                Reset all
              </button>
            </div>
          )}
        </div>

        {/* Section nav tabs — fully neutral */}
        <div className="flex items-center gap-1">
          {ALL_SECTIONS.map((sectionId) => {
            const visual = SECTION_VISUALS[sectionId];
            const Icon = SECTION_ICONS[sectionId];
            const changes = countSectionChanges(h, sectionId);
            const isCollapsed = collapsedSections.has(sectionId);

            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => scrollToSection(sectionId)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all",
                  isCollapsed
                    ? "text-slate-500 hover:bg-white/[0.03] hover:text-slate-400"
                    : "text-slate-300 bg-white/[0.04] hover:bg-white/[0.06]"
                )}
              >
                <Icon className="size-3" />
                <span className="hidden xl:inline">{visual.title}</span>
                {changes > 0 && (
                  <span className="size-4 flex items-center justify-center rounded-full text-[9px] font-bold tabular-nums bg-orange-500/20 text-orange-400">
                    {changes}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Performance stats toggle */}
        <div className="flex items-center justify-between mb-1">
          <button
            type="button"
            onClick={() => setShowPerf(!showPerf)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showPerf ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            Performance Estimates
          </button>
        </div>
        <AnimatePresence>
          {showPerf && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
            >
              <PerformanceStats handling={h} vehicleType={vehicle.vehicles.type} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section blocks */}
        {ALL_SECTIONS.map((sectionId) => (
          <div key={sectionId} ref={(el) => { sectionRefs.current[sectionId] = el; }}>
            <SectionBlock
              sectionId={sectionId}
              handling={h}
              onUpdate={update}
              onApplyPreset={applySectionPreset}
              collapsed={collapsedSections.has(sectionId)}
              onToggle={() => toggleSection(sectionId)}
              performanceSpeedUnit={performanceSpeedUnit}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
