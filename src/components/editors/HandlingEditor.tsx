import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, CircleDot, CircleDotDashed, Gauge, RotateCcw, Scale3D, ShieldAlert, Waves } from "lucide-react";

import { PerformanceStats } from "@/components/PerformanceStats";
import { SectionPresetPicker } from "@/components/SectionPresetPicker";
import { SliderField } from "@/components/SliderField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <div className="rounded-lg border border-border/70 bg-card/70 shadow-xs">
      <div className="border-b border-border/60 px-2 py-1.5">
        <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
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
    <div className="rounded-xl border border-border/70 bg-card/80 shadow-xs">
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
        <ChevronDown className={cn("size-3 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
        <Icon className="size-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{SECTION_VISUALS[sectionId].title}</span>
        {changeCount > 0 && (
          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[9px]">
            {changeCount}
          </Badge>
        )}
        <div className="flex-1" />
        {hasPresets && (
          <div onClick={(event) => event.stopPropagation()}>
            <SectionPresetPicker sectionId={sectionId as SectionId} onApply={applyPreset} currentValues={getSectionValues(handling, sectionId)} />
          </div>
        )}
        {changeCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={(event) => {
              event.stopPropagation();
              resetSection();
            }}
            className="gap-1 rounded-md px-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
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
            <div className="space-y-2 border-t border-border/60 px-3 py-2">
              {sectionId === "identity" ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                  <Label className="w-[140px] shrink-0 text-[12px] text-muted-foreground">Handling Name</Label>
                  <Input
                    value={handling.handlingName}
                    onChange={(event) => onUpdate({ handlingName: event.target.value.toUpperCase() })}
                    className="h-7 flex-1 border-border/60 bg-background text-xs font-mono uppercase"
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
                    <div key={field} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                      <Label className="w-[140px] shrink-0 text-[12px] text-muted-foreground">{label}</Label>
                      <Input
                        value={handling[field]}
                        onChange={(event) => onUpdate({ [field]: field === "aiHandling" ? event.target.value.toUpperCase() : event.target.value })}
                        className={cn("h-7 flex-1 border-border/60 bg-background text-xs font-mono", field === "aiHandling" && "uppercase")}
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
      <div className="sticky top-0 z-10 space-y-2 border-b border-border/70 bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Handling</Badge>
          <Input
            value={handling.handlingName}
            onChange={(event) => update({ handlingName: event.target.value.toUpperCase() })}
            className="h-8 max-w-[220px] bg-card/70 text-xs uppercase"
          />
          <div className="flex-1" />
          {totalChanges > 0 && (
            <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px] uppercase tracking-[0.08em]">
              {totalChanges} unsaved change{totalChanges === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {ALL_SECTIONS.map((sectionId) => {
              const Icon = SECTION_ICONS[sectionId];
              const changes = countSectionChanges(handling, sectionId);
              return (
                <Button
                  key={sectionId}
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => scrollToSection(sectionId)}
                  className="h-auto gap-1 rounded-md border border-border/60 bg-card/60 px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                >
                  <Icon className="size-3" />
                  <span>{SECTION_VISUALS[sectionId].title}</span>
                  {changes > 0 ? (
                    <Badge variant="outline" className="rounded-md px-1 py-0 text-[8px]">
                      {changes}
                    </Badge>
                  ) : null}
                </Button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setShowPerf((value) => !value)}
            className="gap-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
          >
            {showPerf ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            Performance
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
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
      </ScrollArea>
    </motion.div>
  );
}
