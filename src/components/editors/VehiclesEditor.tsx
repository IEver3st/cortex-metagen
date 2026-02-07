import { useState, useCallback } from "react";
import { useMetaStore } from "@/store/meta-store";
import { SliderField } from "@/components/SliderField";
import { SquareToggle } from "@/components/SquareToggle";
import {
  vehiclesFields,
  vehicleFlags,
  vehicleFlagCategories,
  vehicleTypes,
  vehicleClasses,
  layoutOptions,
} from "@/lib/dictionary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import type { FieldInfo } from "@/lib/dictionary";

const ALL_VEHICLES_SECTIONS = ["identity", "visuals", "interaction", "audio", "type", "flags"];

function FieldLabel({ field }: { field: FieldInfo }) {
  return (
    <div className="flex items-center gap-1.5 min-w-[180px] shrink-0">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-help">
              {field.name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{field.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground/50 hover:text-primary transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-72 text-xs space-y-2">
          <p className="font-medium text-foreground">{field.name}</p>
          <p className="text-muted-foreground">{field.description}</p>
          {field.example && (
            <p className="text-muted-foreground italic">
              Example: {field.example}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function VehiclesEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateVehicles = useMetaStore((s) => s.updateVehicles);
  const [openSections, setOpenSections] = useState<string[]>(ALL_VEHICLES_SECTIONS);

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select or create a vehicle to edit vehicles.meta
      </div>
    );
  }

  const d = vehicle.vehicles;
  const update = useCallback((data: Record<string, any>) => updateVehicles(activeId, data), [updateVehicles, activeId]);

  const toggleFlag = useCallback((flag: string) => {
    const flags = d.flags.includes(flag)
      ? d.flags.filter((f) => f !== flag)
      : [...d.flags, flag];
    update({ flags });
  }, [d.flags, update]);

  return (
    <div className="space-y-1 p-4">
      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          onClick={() => setOpenSections(openSections.length > 0 ? [] : ALL_VEHICLES_SECTIONS)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {openSections.length > 0 ? <ChevronsDownUp className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3" />}
          {openSections.length > 0 ? "Collapse All" : "Expand All"}
        </button>
      </div>

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="space-y-1"
      >
        <AccordionItem value="identity" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Identification & Links
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.modelName} />
              <Input value={d.modelName} onChange={(e) => update({ modelName: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.txdName} />
              <Input value={d.txdName} onChange={(e) => update({ txdName: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.handlingId} />
              <Input value={d.handlingId} onChange={(e) => update({ handlingId: e.target.value.toUpperCase() })} className="h-7 text-xs font-mono uppercase flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.gameName} />
              <Input value={d.gameName} onChange={(e) => update({ gameName: e.target.value.toUpperCase() })} className="h-7 text-xs font-mono uppercase flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.vehicleMakeName} />
              <Input value={d.vehicleMakeName} onChange={(e) => update({ vehicleMakeName: e.target.value.toUpperCase() })} className="h-7 text-xs font-mono uppercase flex-1" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="visuals" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Visuals & Rendering
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground min-w-[180px]">LOD Distances</Label>
              <Input value={d.lodDistances} onChange={(e) => update({ lodDistances: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground min-w-[180px]">Diffuse Tint</Label>
              <Input value={d.diffuseTint} onChange={(e) => update({ diffuseTint: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
            <SliderField field={vehiclesFields.dirtLevelMin} value={d.dirtLevelMin} onChange={(v) => update({ dirtLevelMin: v })} min={0} max={1} step={0.01} />
            <SliderField field={vehiclesFields.dirtLevelMax} value={d.dirtLevelMax} onChange={(v) => update({ dirtLevelMax: v })} min={0} max={1} step={0.01} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="interaction" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Character Interaction
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.layout} />
              <Select value={d.layout} onValueChange={(v) => update({ layout: v })}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {layoutOptions.map((l) => (
                    <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.driverSourceExtension} />
              <Input value={d.driverSourceExtension} onChange={(e) => update({ driverSourceExtension: e.target.value })} className="h-7 text-xs font-mono flex-1" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="audio" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Audio & Effects
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.audioNameHash} />
              <Input value={d.audioNameHash} onChange={(e) => update({ audioNameHash: e.target.value.toUpperCase() })} className="h-7 text-xs font-mono uppercase flex-1" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="type" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Type & Class
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.type} />
              <Select value={d.type} onValueChange={(v) => update({ type: v })}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <FieldLabel field={vehiclesFields.vehicleClass} />
              <Select value={d.vehicleClass} onValueChange={(v) => update({ vehicleClass: v })}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleClasses.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="flags" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Flags ({d.flags.length} active)
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-3">
            {vehicleFlagCategories.map((cat) => {
              const catFlags = vehicleFlags.filter((f) => f.category === cat);
              return (
                <div key={cat}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {cat}
                  </div>
                  <div className="space-y-1">
                    {catFlags.map((flag) => (
                      <div
                        key={flag.value}
                        className={`flex items-start gap-2 p-1.5 rounded transition-colors cursor-pointer hover:bg-muted/50 ${
                          d.flags.includes(flag.value) ? "bg-primary/5" : ""
                        }`}
                        onClick={() => toggleFlag(flag.value)}
                      >
                        <SquareToggle
                          checked={d.flags.includes(flag.value)}
                          onCheckedChange={() => toggleFlag(flag.value)}
                          label=""
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-medium">{flag.label}</span>
                          <p className="text-[10px] text-muted-foreground leading-tight">{flag.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
