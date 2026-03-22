import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, CircleDot, CircleDotDashed, Gauge, RotateCcw, Scale3D, ShieldAlert, Waves } from "lucide-react";

import { PerformanceStats } from "@/components/PerformanceStats";
import { SectionPresetPicker } from "@/components/SectionPresetPicker";
import { SliderField } from "@/components/SliderField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handlingFields } from "@/lib/dictionary";
import { DEFAULT_HANDLING, HANDLING_FIELD_RANGES, SECTION_FIELD_GROUPS, SECTION_VISUALS } from "@/lib/handling-field-config";
import { sectionFieldMap, sectionPresetConfigs, type SectionId, type SectionPreset } from "@/lib/section-presets";
import { cn } from "@/lib/utils";
import { useMetaStore, type HandlingData } from "@/store/meta-store";

const ALL_SECTIONS: SectionId[] = [
  "identity",
  "physical",
  "transmission",
  "brakes",
  "traction",
  "suspension",
  "damage",
  "seatOffsets",
  "flagsAi",
  "subHandling",
];

const SECTION_ICONS: Record<SectionId, React.ComponentType<{ className?: string }>> = {
  identity: Gauge,
  physical: Scale3D,
  transmission: Gauge,
  brakes: CircleDot,
  traction: CircleDotDashed,
  suspension: Waves,
  damage: ShieldAlert,
  seatOffsets: Scale3D,
  flagsAi: ShieldAlert,
  subHandling: Gauge,
};

function isFieldModified(handling: HandlingData, field: keyof HandlingData): boolean {
  return DEFAULT_HANDLING[field] !== undefined && handling[field] !== DEFAULT_HANDLING[field];
}

function countSectionChanges(handling: HandlingData, sectionId: SectionId): number {
  return sectionFieldMap[sectionId].filter((field) => isFieldModified(handling, field)).length;
}

function getSectionValues(handling: HandlingData, sectionId: SectionId): Record<string, number> {
  const values: Record<string, number> = {};
  for (const field of sectionFieldMap[sectionId]) {
    const value = handling[field];
    if (typeof value === "number") values[field] = value;
  }
  return values;
}

function FieldCluster({
  label,
  fields,
  handling,
  onUpdate,
}: {
  label: string;
  fields: (keyof HandlingData)[];
  handling: HandlingData;
  onUpdate: (data: Partial<HandlingData>) => void;
}) {
  return (
    <div className="rounded border border-slate-700/20 bg-white/[0.01]">
      <div className="border-b border-slate-700/20 px-2 py-1">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500/80">{label}</span>
      </div>
      <div className="py-0.5">
        {fields.map((field) => {
          const info = handlingFields[field];
          const range = HANDLING_FIELD_RANGES[field];
          const value = handling[field];
          if (!info || !range || typeof value !== "number") return null;
          return (
            <SliderField
              key={field}
              field={info}
              value={value}
              onChange={(nextValue) => onUpdate({
                [field]: field === "nInitialDriveGears" || field === "nMonetaryValue"
                  ? Math.round(nextValue)
                  : nextValue,
              })}
              {...range}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionBlock({
  sectionId,
  handling,
  onUpdate,
}: {
  sectionId: SectionId;
  handling: HandlingData;
  onUpdate: (data: Partial<HandlingData>) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const changeCount = countSectionChanges(handling, sectionId);
  const Icon = SECTION_ICONS[sectionId];
  const fieldGroups = sectionId === "identity" ? [] : (SECTION_FIELD_GROUPS[sectionId] ?? []);
  const groupedFields = new Set(fieldGroups.flatMap((group: { fields: (keyof HandlingData)[] }) => group.fields));
  const standaloneFields = sectionFieldMap[sectionId].filter((field) => !groupedFields.has(field));
  const hasPresets = sectionPresetConfigs[sectionId].presets.length > 0;

  const resetSection = useCallback(() => {
    const nextData: Partial<HandlingData> = {};
    for (const field of sectionFieldMap[sectionId]) {
      const fallback = DEFAULT_HANDLING[field];
      if (fallback !== undefined) nextData[field] = fallback as never;
    }
    onUpdate(nextData);
  }, [onUpdate, sectionId]);

  const applyPreset = useCallback((preset: SectionPreset) => {
    onUpdate(preset.values);
  }, [onUpdate]);

  return (
    <div className="rounded-lg border border-slate-700/25 bg-[#07101f]/70">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setCollapsed((value) => !value);
          }
        }}
        className="flex items-center gap-2 px-3 py-2"
      >
        <ChevronDown className={cn("size-3 text-slate-500 transition-transform", collapsed && "-rotate-90")} />
        <Icon className="size-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-200">{SECTION_VISUALS[sectionId].title}</span>
        {changeCount > 0 && (
          <span className="rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-300">{changeCount}</span>
        )}
        <div className="flex-1" />
        {hasPresets && (
          <div onClick={(event) => event.stopPropagation()}>
            <SectionPresetPicker sectionId={sectionId as SectionId} onApply={applyPreset} currentValues={getSectionValues(handling, sectionId)} />
          </div>
        )}
        {changeCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              resetSection();
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-orange-300"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="space-y-2 border-t border-slate-700/20 px-3 py-2">
              {sectionId === "identity" ? (
                <div className="flex items-center gap-2 rounded border border-slate-700/20 bg-white/[0.01] px-3 py-2">
                  <Label className="w-[140px] shrink-0 text-[12px] text-slate-400">Handling Name</Label>
                  <Input
                    value={handling.handlingName}
                    onChange={(event) => onUpdate({ handlingName: event.target.value.toUpperCase() })}
                    className="h-7 flex-1 border-slate-700/40 bg-transparent text-xs font-mono uppercase"
                  />
                </div>
              ) : sectionId === "flagsAi" ? (
                <>
                  <SliderField
                    field={{ name: "Monetary Value", description: "In-game value used for repair and damage calculations." }}
                    value={handling.nMonetaryValue}
                    onChange={(value) => onUpdate({ nMonetaryValue: Math.round(value) })}
                    {...HANDLING_FIELD_RANGES.nMonetaryValue}
                  />
                  {([
                    ["strModelFlags", "Model Flags"],
                    ["strHandlingFlags", "Handling Flags"],
                    ["strDamageFlags", "Damage Flags"],
                    ["aiHandling", "AI Handling"],
                  ] as const).map(([field, label]) => (
                    <div key={field} className="flex items-center gap-2 rounded border border-slate-700/20 bg-white/[0.01] px-3 py-2">
                      <Label className="w-[140px] shrink-0 text-[12px] text-slate-400">{label}</Label>
                      <Input
                        value={handling[field]}
                        onChange={(event) => onUpdate({ [field]: field === "aiHandling" ? event.target.value.toUpperCase() : event.target.value })}
                        className={cn("h-7 flex-1 border-slate-700/40 bg-transparent text-xs font-mono", field === "aiHandling" && "uppercase")}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {fieldGroups.map((group: { label: string; fields: (keyof HandlingData)[] }) => (
                    <FieldCluster key={group.label} label={group.label} fields={group.fields} handling={handling} onUpdate={onUpdate} />
                  ))}
                  {standaloneFields.map((field) => {
                    const info = handlingFields[field];
                    const range = HANDLING_FIELD_RANGES[field];
                    const value = handling[field];
                    if (!info || !range || typeof value !== "number") return null;
                    return (
                      <SliderField
                        key={field}
                        field={info}
                        value={value}
                        onChange={(nextValue) => onUpdate({
                          [field]: field === "nInitialDriveGears" || field === "nMonetaryValue"
                            ? Math.round(nextValue)
                            : nextValue,
                        })}
                        {...range}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HandlingEditor() {
  const activeId = useMetaStore((state) => state.activeVehicleId);
  const vehicle = useMetaStore((state) => state.activeVehicleId ? state.vehicles[state.activeVehicleId] : null);
  const updateHandling = useMetaStore((state) => state.updateHandling);
  const [showPerf, setShowPerf] = useState(false);
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});

  const update = useCallback((data: Partial<HandlingData>) => {
    if (!activeId) return;
    updateHandling(activeId, data);
  }, [activeId, updateHandling]);

  const totalChanges = useMemo(() => {
    if (!vehicle) return 0;
    return ALL_SECTIONS.reduce((count, sectionId) => count + countSectionChanges(vehicle.handling, sectionId), 0);
  }, [vehicle]);

  const scrollToSection = useCallback((sectionId: SectionId) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!vehicle || !activeId) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select or create a vehicle to edit handling.meta</div>;
  }

  const handling = vehicle.handling;

  return (
    <motion.div className="flex h-full flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="sticky top-0 z-10 space-y-2 border-b border-slate-700/25 bg-[#040d1a]/95 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Label className="shrink-0 text-[10px] uppercase tracking-wider text-slate-600">Handling</Label>
          <Input
            value={handling.handlingName}
            onChange={(event) => update({ handlingName: event.target.value.toUpperCase() })}
            className="h-6 max-w-[220px] border-slate-700/40 bg-transparent text-xs font-mono uppercase"
          />
          <div className="flex-1" />
          {totalChanges > 0 && <span className="text-[10px] font-medium text-orange-300">{totalChanges} unsaved change{totalChanges === 1 ? "" : "s"}</span>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {ALL_SECTIONS.map((sectionId) => {
              const Icon = SECTION_ICONS[sectionId];
              const changes = countSectionChanges(handling, sectionId);
              return (
                <button
                  key={sectionId}
                  type="button"
                  onClick={() => scrollToSection(sectionId)}
                  className="flex items-center gap-1 rounded bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                >
                  <Icon className="size-3" />
                  <span>{SECTION_VISUALS[sectionId].title}</span>
                  {changes > 0 && <span className="rounded-full bg-orange-500/15 px-1 py-0.5 text-[8px] font-bold text-orange-300">{changes}</span>}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowPerf((value) => !value)}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-300"
          >
            {showPerf ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            Performance
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <AnimatePresence initial={false}>
          {showPerf && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
            >
              <PerformanceStats handling={handling} vehicleType={vehicle.vehicles.type} />
            </motion.div>
          )}
        </AnimatePresence>

        {ALL_SECTIONS.map((sectionId) => (
          <div key={sectionId} ref={(element) => { sectionRefs.current[sectionId] = element; }}>
            <SectionBlock sectionId={sectionId} handling={handling} onUpdate={update} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
