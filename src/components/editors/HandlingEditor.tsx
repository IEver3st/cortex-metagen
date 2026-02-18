import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMetaStore } from "@/store/meta-store";
import { SliderField } from "@/components/SliderField";
import { PerformanceStats } from "@/components/PerformanceStats";
import { handlingFields } from "@/lib/dictionary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { SectionPresetPicker } from "@/components/SectionPresetPicker";
import {
  sectionFieldMap,
  type SectionId,
  type SectionPreset,
} from "@/lib/section-presets";
import type { HandlingData } from "@/store/meta-store";

const ALL_SECTIONS: SectionId[] = ["physical", "transmission", "brakes", "traction", "suspension", "damage"];

function getSectionValues(h: HandlingData, sectionId: SectionId): Record<string, number> {
  const fields = sectionFieldMap[sectionId];
  const values: Record<string, number> = {};
  for (const f of fields) {
    const v = h[f];
    if (typeof v === "number") values[f] = v;
  }
  return values;
}

interface SectionHeaderProps {
  title: string;
  sectionId: SectionId;
  handling: HandlingData;
  onApplyPreset: (sectionId: SectionId, preset: SectionPreset) => void;
}

function SectionHeader({ title, sectionId, handling, onApplyPreset }: SectionHeaderProps) {
  const currentValues = getSectionValues(handling, sectionId);

  return (
    <div className="flex items-center justify-between w-full pr-2" onClick={(e) => e.stopPropagation()}>
      <span>{title}</span>
      <SectionPresetPicker
        sectionId={sectionId}
        currentValues={currentValues}
        onApply={(preset) => onApplyPreset(sectionId, preset)}
      />
    </div>
  );
}

export function HandlingEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateHandling = useMetaStore((s) => s.updateHandling);
  const [showPerf, setShowPerf] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>(ALL_SECTIONS);
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

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select or create a vehicle to edit handling
      </div>
    );
  }

  const h = vehicle.handling;

  return (
    <motion.div
      className="space-y-1 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Label className="text-xs text-muted-foreground shrink-0">
          Handling Name
        </Label>
        <Input
          value={h.handlingName}
          onChange={(e) => update({ handlingName: e.target.value.toUpperCase() })}
          className="h-7 text-xs font-mono uppercase max-w-[200px]"
        />
      </div>

      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setShowPerf(!showPerf)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider hover:text-foreground transition-colors"
          style={{ color: "#2CD672" }}
        >
          {showPerf ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Performance Estimates
        </button>
        <button
          type="button"
          onClick={() => setOpenSections(openSections.length > 0 ? [] : ALL_SECTIONS)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title={openSections.length > 0 ? "Collapse all sections" : "Expand all sections"}
        >
          {openSections.length > 0 ? <ChevronsDownUp className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3" />}
          {openSections.length > 0 ? "Collapse All" : "Expand All"}
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

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="space-y-1"
      >
        <AccordionItem value="physical" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <SectionHeader
              title="Physical Attributes"
              sectionId="physical"
              handling={h}
              onApplyPreset={applySectionPreset}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-1">
            <SliderField field={handlingFields.fMass} value={h.fMass} onChange={(v) => update({ fMass: v })} min={500} max={15000} step={50} />
            <SliderField field={handlingFields.fInitialDragCoeff} value={h.fInitialDragCoeff} onChange={(v) => update({ fInitialDragCoeff: v })} min={0} max={30} step={0.1} />
            <SliderField field={handlingFields.vecCentreOfMassOffsetX} value={h.vecCentreOfMassOffsetX} onChange={(v) => update({ vecCentreOfMassOffsetX: v })} min={-2} max={2} step={0.01} />
            <SliderField field={handlingFields.vecCentreOfMassOffsetY} value={h.vecCentreOfMassOffsetY} onChange={(v) => update({ vecCentreOfMassOffsetY: v })} min={-2} max={2} step={0.01} />
            <SliderField field={handlingFields.vecCentreOfMassOffsetZ} value={h.vecCentreOfMassOffsetZ} onChange={(v) => update({ vecCentreOfMassOffsetZ: v })} min={-2} max={2} step={0.01} />
            <SliderField field={handlingFields.vecInertiaMultiplierX} value={h.vecInertiaMultiplierX} onChange={(v) => update({ vecInertiaMultiplierX: v })} min={0} max={5} step={0.1} />
            <SliderField field={handlingFields.vecInertiaMultiplierY} value={h.vecInertiaMultiplierY} onChange={(v) => update({ vecInertiaMultiplierY: v })} min={0} max={5} step={0.1} />
            <SliderField field={handlingFields.vecInertiaMultiplierZ} value={h.vecInertiaMultiplierZ} onChange={(v) => update({ vecInertiaMultiplierZ: v })} min={0} max={5} step={0.1} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="transmission" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <SectionHeader
              title="Transmission & Engine"
              sectionId="transmission"
              handling={h}
              onApplyPreset={applySectionPreset}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-1">
            <SliderField field={handlingFields.fInitialDriveForce} value={h.fInitialDriveForce} onChange={(v) => update({ fInitialDriveForce: v })} min={0} max={2} step={0.01} />
            <SliderField field={handlingFields.fInitialDriveMaxFlatVel} value={h.fInitialDriveMaxFlatVel} onChange={(v) => update({ fInitialDriveMaxFlatVel: v })} min={50} max={500} step={1} />
            <SliderField field={handlingFields.nInitialDriveGears} value={h.nInitialDriveGears} onChange={(v) => update({ nInitialDriveGears: Math.round(v) })} min={1} max={10} step={1} />
            <SliderField field={handlingFields.fDriveBiasFront} value={h.fDriveBiasFront} onChange={(v) => update({ fDriveBiasFront: v })} min={0} max={1} step={0.05} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="brakes" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <SectionHeader
              title="Brakes & Steering"
              sectionId="brakes"
              handling={h}
              onApplyPreset={applySectionPreset}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-1">
            <SliderField field={handlingFields.fBrakeForce} value={h.fBrakeForce} onChange={(v) => update({ fBrakeForce: v })} min={0} max={3} step={0.01} />
            <SliderField field={handlingFields.fBrakeBiasFront} value={h.fBrakeBiasFront} onChange={(v) => update({ fBrakeBiasFront: v })} min={0} max={1} step={0.01} />
            <SliderField field={handlingFields.fSteeringLock} value={h.fSteeringLock} onChange={(v) => update({ fSteeringLock: v })} min={10} max={75} step={0.5} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="traction" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <SectionHeader
              title="Traction & Tires"
              sectionId="traction"
              handling={h}
              onApplyPreset={applySectionPreset}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-1">
            <SliderField field={handlingFields.fTractionCurveMax} value={h.fTractionCurveMax} onChange={(v) => update({ fTractionCurveMax: v })} min={0} max={5} step={0.01} />
            <SliderField field={handlingFields.fTractionCurveMin} value={h.fTractionCurveMin} onChange={(v) => update({ fTractionCurveMin: v })} min={0} max={5} step={0.01} />
            <SliderField field={handlingFields.fTractionLossMult} value={h.fTractionLossMult} onChange={(v) => update({ fTractionLossMult: v })} min={0} max={5} step={0.01} />
            <SliderField field={handlingFields.fLowSpeedTractionLossMult} value={h.fLowSpeedTractionLossMult} onChange={(v) => update({ fLowSpeedTractionLossMult: v })} min={0} max={5} step={0.01} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="suspension" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <SectionHeader
              title="Suspension"
              sectionId="suspension"
              handling={h}
              onApplyPreset={applySectionPreset}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-1">
            <SliderField field={handlingFields.fSuspensionForce} value={h.fSuspensionForce} onChange={(v) => update({ fSuspensionForce: v })} min={0} max={5} step={0.01} />
            <SliderField field={handlingFields.fSuspensionCompDamp} value={h.fSuspensionCompDamp} onChange={(v) => update({ fSuspensionCompDamp: v })} min={0} max={5} step={0.01} />
            <SliderField field={handlingFields.fSuspensionReboundDamp} value={h.fSuspensionReboundDamp} onChange={(v) => update({ fSuspensionReboundDamp: v })} min={0} max={5} step={0.01} />
            <SliderField field={handlingFields.fAntiRollBarForce} value={h.fAntiRollBarForce} onChange={(v) => update({ fAntiRollBarForce: v })} min={0} max={5} step={0.01} />
            <SliderField field={handlingFields.fSuspensionRaise} value={h.fSuspensionRaise} onChange={(v) => update({ fSuspensionRaise: v })} min={-0.5} max={0.5} step={0.01} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="damage" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <SectionHeader
              title="Damage & Miscellaneous"
              sectionId="damage"
              handling={h}
              onApplyPreset={applySectionPreset}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-1">
            <SliderField field={handlingFields.fCollisionDamageMult} value={h.fCollisionDamageMult} onChange={(v) => update({ fCollisionDamageMult: v })} min={0} max={10} step={0.1} />
            <SliderField field={handlingFields.fDeformationDamageMult} value={h.fDeformationDamageMult} onChange={(v) => update({ fDeformationDamageMult: v })} min={0} max={10} step={0.1} />
            <div className="flex items-center gap-3 py-1.5">
              <Label className="text-sm text-muted-foreground min-w-[180px]">Model Flags</Label>
              <Input value={h.strModelFlags} onChange={(e) => update({ strModelFlags: e.target.value })} className="h-7 text-xs font-mono" />
            </div>
            <div className="flex items-center gap-3 py-1.5">
              <Label className="text-sm text-muted-foreground min-w-[180px]">Handling Flags</Label>
              <Input value={h.strHandlingFlags} onChange={(e) => update({ strHandlingFlags: e.target.value })} className="h-7 text-xs font-mono" />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
