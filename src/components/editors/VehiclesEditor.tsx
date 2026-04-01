import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Eye, EyeOff, Plus, RotateCcw, Search, Trash2 } from "lucide-react";

import { SliderField } from "@/components/SliderField";
import { SquareToggle } from "@/components/SquareToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardTypes,
  layoutOptions,
  plateTypes,
  vehicleClasses,
  vehicleFlagCategories,
  vehicleFlags,
  vehiclesFields,
  vehicleTypes,
  wheelTypes,
} from "@/lib/dictionary";
import { defaultVehicles } from "@/lib/presets";
import { cn } from "@/lib/utils";
import { useMetaStore } from "@/store/meta-store";
import type {
  VehicleDoorStiffnessMultiplier,
  VehicleDriver,
  VehicleTxdRelationship,
  VehicleVec3,
  VehiclesData,
} from "@/store/meta-store";

const DEFAULT_VEHICLES: VehiclesData = JSON.parse(JSON.stringify(defaultVehicles)) as VehiclesData;

function modified<Key extends keyof VehiclesData>(data: VehiclesData, key: Key) {
  return JSON.stringify(data[key]) !== JSON.stringify(DEFAULT_VEHICLES[key]);
}

function fieldLabel(key: keyof VehiclesData) {
  return vehiclesFields[key]?.name ?? key;
}

function Section({
  title,
  count,
  onReset,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  count: number;
  onReset?: () => void;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="section-frame overflow-hidden border-border/70">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setCollapsed((value) => !value)}
        className="h-auto w-full justify-start gap-2 rounded-none px-3 py-2 text-left"
      >
        <ChevronDown className={cn("size-3 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
        <span className="text-xs font-semibold text-foreground/85">{title}</span>
        {count > 0 ? (
          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[9px]">
            {count}
          </Badge>
        ) : null}
        <div className="flex-1" />
        {onReset && count > 0 && (
          <Button type="button" variant="ghost" size="icon-sm" className="size-6" onClick={(event) => { event.stopPropagation(); onReset(); }}>
            <RotateCcw className="size-3" />
          </Button>
        )}
      </Button>
      {!collapsed && <div className="space-y-3 border-t border-border/60 px-3 py-3">{children}</div>}
    </div>
  );
}

function TextField({ label, value, onChange, mono = true }: { label: string; value: string; onChange: (value: string) => void; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className={cn("h-8 text-xs", mono && "font-mono")} />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-20 text-xs font-mono" />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value) || 0)}
        className="h-8 text-xs font-mono"
      />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <SquareToggle checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Vec3Field({ label, value, onChange }: { label: string; value: VehicleVec3; onChange: (value: VehicleVec3) => void }) {
  return (
    <div className="rounded border border-border/50 p-3">
      <Label className="mb-2 block text-[11px] text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {(["x", "y", "z"] as const).map((axis) => (
          <Input
            key={axis}
            type="number"
            step="0.01"
            value={value[axis]}
            onChange={(event) => onChange({ ...value, [axis]: Number.parseFloat(event.target.value) || 0 })}
            className="h-8 text-xs font-mono"
          />
        ))}
      </div>
    </div>
  );
}

function normalizeDiffuseTint(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:0x)?([0-9a-fA-F]{8}|[0-9a-fA-F]{6})$/);
  if (!match) return "#ffffff";
  const hex = match[1];
  return `#${hex.length === 8 ? hex.slice(2) : hex}`.toLowerCase();
}

function DiffuseTintField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const color = normalizeDiffuseTint(value);

  return (
    <div className="rounded border border-border/50 p-3">
      <Label className="mb-2 block text-[11px] text-muted-foreground">Diffuse Tint</Label>
      <div className="flex items-center gap-3">
        <Input
          type="color"
          value={color}
          onChange={(event) => onChange(`0x00${event.target.value.slice(1).toUpperCase()}`)}
          className="h-8 w-10 rounded-md border border-border bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-8 flex-1 text-xs font-mono uppercase"
        />
      </div>
    </div>
  );
}

function LodDistancesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const labels = ["High", "Med", "Low", "V.Low", "Culled"];
  const values = value.trim().split(/\s+/).filter(Boolean);

  const updateAt = (index: number, nextValue: string) => {
    const next = [...values];
    next[index] = nextValue;
    onChange(next.filter(Boolean).join(" ").trim());
  };

  return (
    <div className="rounded border border-border/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">LOD Distances</Label>
        <span className="text-[10px] text-muted-foreground/70">meters</span>
      </div>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        {labels.map((label, index) => (
          <div key={label} className="space-y-1 rounded-lg border border-border/60 bg-card/60 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
            <Input
              type="number"
              step="0.1"
              value={values[index] ?? ""}
              onChange={(event) => updateAt(index, event.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        ))}
      </div>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-8 text-xs font-mono"
      />
    </div>
  );
}

function JsonField({ label, value, onChange }: { label: string; value: unknown | null; onChange: (value: unknown | null) => void }) {
  const [draft, setDraft] = useState(value == null ? "" : JSON.stringify(value, null, 2));
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim() === "") {
            onChange(null);
            return;
          }
          try {
            onChange(JSON.parse(draft));
          } catch {
            onChange(draft);
          }
        }}
        className="min-h-24 text-xs font-mono"
      />
    </div>
  );
}

function DoorStiffnessField({
  value,
  onChange,
}: {
  value: VehicleDoorStiffnessMultiplier[];
  onChange: (value: VehicleDoorStiffnessMultiplier[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">Door Stiffness Multipliers</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onChange([...value, { doorId: value.length, stiffnessMult: 1 }])}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>
      {value.map((entry, index) => (
        <div key={`${entry.doorId}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input type="number" value={entry.doorId} onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? { ...current, doorId: Number.parseInt(event.target.value, 10) || 0 } : current))} className="h-8 text-xs font-mono" />
          <Input type="number" step="0.01" value={entry.stiffnessMult} onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? { ...current, stiffnessMult: Number.parseFloat(event.target.value) || 0 } : current))} className="h-8 text-xs font-mono" />
          <Button type="button" variant="ghost" size="icon-sm" className="size-8" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function DriversField({ value, onChange }: { value: VehicleDriver[]; onChange: (value: VehicleDriver[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">Drivers</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onChange([...value, { driverName: "", npcName: "" }])}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>
      {value.length === 0 ? <p className="text-[11px] text-muted-foreground">No driver overrides configured.</p> : null}
      {value.map((entry, index) => (
        <div key={`${entry.driverName}-${entry.npcName}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            value={entry.driverName}
            onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? { ...current, driverName: event.target.value } : current))}
            className="h-8 text-xs font-mono"
            placeholder="driverName"
          />
          <Input
            value={entry.npcName}
            onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? { ...current, npcName: event.target.value } : current))}
            className="h-8 text-xs font-mono"
            placeholder="npcName"
          />
          <Button type="button" variant="ghost" size="icon-sm" className="size-8" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function TxdRelationshipsField({
  value,
  onChange,
}: {
  value: VehicleTxdRelationship[];
  onChange: (value: VehicleTxdRelationship[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">TXD Relationships</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onChange([...value, { parent: "vehshare", child: "" }])}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>
      {value.length === 0 ? <p className="text-[11px] text-muted-foreground">No additional texture dictionary relationships configured.</p> : null}
      {value.map((entry, index) => (
        <div key={`${entry.parent}-${entry.child}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            value={entry.parent}
            onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? { ...current, parent: event.target.value } : current))}
            className="h-8 text-xs font-mono"
            placeholder="parent"
          />
          <Input
            value={entry.child}
            onChange={(event) => onChange(value.map((current, currentIndex) => currentIndex === index ? { ...current, child: event.target.value } : current))}
            className="h-8 text-xs font-mono"
            placeholder="child"
          />
          <Button type="button" variant="ghost" size="icon-sm" className="size-8" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function VehiclesEditor() {
  const activeVehicleId = useMetaStore((state) => state.activeVehicleId);
  const vehicle = useMetaStore((state) => state.activeVehicleId ? state.vehicles[state.activeVehicleId] : null);
  const updateVehicles = useMetaStore((state) => state.updateVehicles);
  const [flagSearch, setFlagSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const data = vehicle?.vehicles;
  const update = useCallback((patch: Partial<VehiclesData>) => {
    if (activeVehicleId) updateVehicles(activeVehicleId, patch);
  }, [activeVehicleId, updateVehicles]);

  const reset = useCallback((keys: Array<keyof VehiclesData>) => {
    update(keys.reduce<Partial<VehiclesData>>((accumulator, key) => ({ ...accumulator, [key]: DEFAULT_VEHICLES[key] }), {}));
  }, [update]);

  const toggleFlag = useCallback((flag: string) => {
    if (!data) return;
    update({ flags: data.flags.includes(flag) ? data.flags.filter((entry) => entry !== flag) : [...data.flags, flag] });
  }, [data, update]);

  const filteredFlags = useMemo(() => vehicleFlags.filter((flag) => {
    const matchesSearch = flagSearch.trim() === "" || flag.label.toLowerCase().includes(flagSearch.toLowerCase()) || flag.description.toLowerCase().includes(flagSearch.toLowerCase());
    const matchesActive = !activeOnly || data?.flags.includes(flag.value);
    return matchesSearch && matchesActive;
  }), [activeOnly, data?.flags, flagSearch]);

  if (!vehicle || !data || !activeVehicleId) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select or create a vehicle to edit vehicles.meta</div>;
  }

  return (
    <motion.div className="flex h-full flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background-app px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={data.modelName} onChange={(event) => update({ modelName: event.target.value.toLowerCase() })} className="h-8 max-w-[180px] text-xs font-mono" />
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">{data.handlingId}</Badge>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">{data.type}</Badge>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">{data.vehicleClass}</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Section title="Identity" count={["modelName", "txdName", "handlingId", "gameName", "vehicleMakeName"].filter((key) => modified(data, key as keyof VehiclesData)).length} onReset={() => reset(["modelName", "txdName", "handlingId", "gameName", "vehicleMakeName"])}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <TextField label={fieldLabel("modelName")} value={data.modelName} onChange={(value) => update({ modelName: value.toLowerCase() })} />
            <TextField label={fieldLabel("txdName")} value={data.txdName} onChange={(value) => update({ txdName: value.toLowerCase() })} />
            <TextField label={fieldLabel("handlingId")} value={data.handlingId} onChange={(value) => update({ handlingId: value.toUpperCase() })} />
            <TextField label={fieldLabel("gameName")} value={data.gameName} onChange={(value) => update({ gameName: value.toUpperCase() })} />
            <TextField label={fieldLabel("vehicleMakeName")} value={data.vehicleMakeName} onChange={(value) => update({ vehicleMakeName: value.toUpperCase() })} />
          </div>
        </Section>

        <Section title="Animations & Expressions" count={["expressionDictName", "expressionName", "animConvRoofDictName", "animConvRoofName", "animConvRoofWindowsAffected", "scenarioLayout"].filter((key) => modified(data, key as keyof VehiclesData)).length} onReset={() => reset(["expressionDictName", "expressionName", "animConvRoofDictName", "animConvRoofName", "animConvRoofWindowsAffected", "scenarioLayout"])} defaultCollapsed>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <TextField label={fieldLabel("expressionDictName")} value={data.expressionDictName} onChange={(value) => update({ expressionDictName: value })} />
            <TextField label={fieldLabel("expressionName")} value={data.expressionName} onChange={(value) => update({ expressionName: value })} />
            <TextField label={fieldLabel("animConvRoofDictName")} value={data.animConvRoofDictName} onChange={(value) => update({ animConvRoofDictName: value })} />
            <TextField label={fieldLabel("animConvRoofName")} value={data.animConvRoofName} onChange={(value) => update({ animConvRoofName: value })} />
            <TextField label={fieldLabel("animConvRoofWindowsAffected")} value={data.animConvRoofWindowsAffected} onChange={(value) => update({ animConvRoofWindowsAffected: value })} />
            <TextField label={fieldLabel("scenarioLayout")} value={data.scenarioLayout} onChange={(value) => update({ scenarioLayout: value })} />
          </div>
        </Section>

        <Section title="Type, Audio & Interaction" count={["type", "vehicleClass", "audioNameHash", "layout", "driverSourceExtension"].filter((key) => modified(data, key as keyof VehiclesData)).length} onReset={() => reset(["type", "vehicleClass", "audioNameHash", "layout", "driverSourceExtension"])}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Select value={data.type} onValueChange={(value) => update({ type: value })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{vehicleTypes.map((option) => <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>)}</SelectContent></Select>
            <Select value={data.vehicleClass} onValueChange={(value) => update({ vehicleClass: value })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{vehicleClasses.map((option) => <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>)}</SelectContent></Select>
            <TextField label={fieldLabel("audioNameHash")} value={data.audioNameHash} onChange={(value) => update({ audioNameHash: value.toUpperCase() })} />
            <Select value={data.layout} onValueChange={(value) => update({ layout: value })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Layout" /></SelectTrigger><SelectContent>{layoutOptions.map((option) => <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>)}</SelectContent></Select>
            <TextField label={fieldLabel("driverSourceExtension")} value={data.driverSourceExtension} onChange={(value) => update({ driverSourceExtension: value })} />
          </div>
        </Section>

        <Section title="Visuals" count={["lodDistances", "diffuseTint", "dirtLevelMin", "dirtLevelMax"].filter((key) => modified(data, key as keyof VehiclesData)).length} onReset={() => reset(["lodDistances", "diffuseTint", "dirtLevelMin", "dirtLevelMax"])}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <LodDistancesField value={data.lodDistances} onChange={(value) => update({ lodDistances: value })} />
            <DiffuseTintField value={data.diffuseTint} onChange={(value) => update({ diffuseTint: value })} />
          </div>
          <div className="space-y-0">
            <SliderField field={vehiclesFields.dirtLevelMin} value={data.dirtLevelMin} onChange={(value) => update({ dirtLevelMin: value })} min={0} max={1} step={0.01} />
            <SliderField field={vehiclesFields.dirtLevelMax} value={data.dirtLevelMax} onChange={(value) => update({ dirtLevelMax: value })} min={0} max={1} step={0.01} />
          </div>
        </Section>

        <Section title="Advanced" count={["cameraName", "aimCameraName", "bonnetCameraName", "povCameraName", "plateType", "dashboardType", "wheelType", "wheelScale", "wheelScaleRear", "envEffScaleMin", "envEffScaleMax", "envEffScaleMin2", "envEffScaleMax2", "HDTextureDist", "defaultBodyHealth", "trailers", "additionalTrailers", "drivers", "doorsWithCollisionWhenClosed", "driveableDoors", "coverBoundOffsets", "extraIncludes", "requiredExtras", "povTuningInfo", "explosionInfo", "firstPersonDrivebyData", "povCameraOffset", "povPassengerCameraOffset", "povRearPassengerCameraOffset", "firstPersonIkOffsets", "povCameraVerticalAdjustmentForRollCage", "doorStiffnessMultipliers", "ptfxAssetName", "vfxInfoName", "damageMapScale", "damageOffsetScale", "steerWheelMult", "minSeatHeight", "identicalModelSpawnDistance", "pretendOccupantsScale", "visibleSpawnDistScale", "trackerPathWidth", "weaponForceMult", "frequency", "maxNumOfSameColor", "maxNum", "swankness", "residentTxd", "residentAnims", "txdRelationships", "allowBodyColorMapping", "shouldUseCinematicViewMode", "shouldCameraTransitionOnClimbUpDown", "shouldCameraIgnoreExiting", "allowPretendOccupants", "allowJoyriding", "allowSundayDriving", "bumpersNeedToCollideWithMap", "needsRopeTexture"].filter((key) => modified(data, key as keyof VehiclesData)).length} onReset={() => reset(["cameraName", "aimCameraName", "bonnetCameraName", "povCameraName", "plateType", "dashboardType", "wheelType", "wheelScale", "wheelScaleRear", "envEffScaleMin", "envEffScaleMax", "envEffScaleMin2", "envEffScaleMax2", "HDTextureDist", "defaultBodyHealth", "trailers", "additionalTrailers", "drivers", "doorsWithCollisionWhenClosed", "driveableDoors", "coverBoundOffsets", "extraIncludes", "requiredExtras", "povTuningInfo", "explosionInfo", "firstPersonDrivebyData", "povCameraOffset", "povPassengerCameraOffset", "povRearPassengerCameraOffset", "firstPersonIkOffsets", "povCameraVerticalAdjustmentForRollCage", "doorStiffnessMultipliers", "ptfxAssetName", "vfxInfoName", "damageMapScale", "damageOffsetScale", "steerWheelMult", "minSeatHeight", "identicalModelSpawnDistance", "pretendOccupantsScale", "visibleSpawnDistScale", "trackerPathWidth", "weaponForceMult", "frequency", "maxNumOfSameColor", "maxNum", "swankness", "residentTxd", "residentAnims", "txdRelationships", "allowBodyColorMapping", "shouldUseCinematicViewMode", "shouldCameraTransitionOnClimbUpDown", "shouldCameraIgnoreExiting", "allowPretendOccupants", "allowJoyriding", "allowSundayDriving", "bumpersNeedToCollideWithMap", "needsRopeTexture"])} defaultCollapsed>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="space-y-2 rounded border border-border/50 p-3">
              <TextField label={fieldLabel("cameraName")} value={data.cameraName} onChange={(value) => update({ cameraName: value })} />
              <TextField label="Aim Camera" value={data.aimCameraName} onChange={(value) => update({ aimCameraName: value })} />
              <TextField label="Bonnet Camera" value={data.bonnetCameraName} onChange={(value) => update({ bonnetCameraName: value })} />
              <TextField label="POV Camera" value={data.povCameraName} onChange={(value) => update({ povCameraName: value })} />
              <Select value={data.plateType} onValueChange={(value) => update({ plateType: value })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Plate type" /></SelectTrigger><SelectContent>{plateTypes.map((option) => <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>)}</SelectContent></Select>
              <Select value={data.dashboardType} onValueChange={(value) => update({ dashboardType: value })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Dashboard type" /></SelectTrigger><SelectContent>{dashboardTypes.map((option) => <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>)}</SelectContent></Select>
              <Select value={data.wheelType} onValueChange={(value) => update({ wheelType: value })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Wheel type" /></SelectTrigger><SelectContent>{wheelTypes.map((option) => <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>)}</SelectContent></Select>
            </div>

            <div className="space-y-0 rounded border border-border/50 p-3">
              <SliderField field={vehiclesFields.wheelScale} value={data.wheelScale} onChange={(value) => update({ wheelScale: value })} min={0.5} max={2} step={0.01} />
              <SliderField field={vehiclesFields.wheelScaleRear} value={data.wheelScaleRear} onChange={(value) => update({ wheelScaleRear: value })} min={0.5} max={2} step={0.01} />
              <SliderField field={vehiclesFields.envEffScaleMin} value={data.envEffScaleMin} onChange={(value) => update({ envEffScaleMin: value })} min={0} max={2} step={0.01} />
              <SliderField field={vehiclesFields.envEffScaleMax} value={data.envEffScaleMax} onChange={(value) => update({ envEffScaleMax: value })} min={0} max={2} step={0.01} />
              <NumberField label="Env Effect Scale Min 2" value={data.envEffScaleMin2} onChange={(value) => update({ envEffScaleMin2: value })} />
              <NumberField label="Env Effect Scale Max 2" value={data.envEffScaleMax2} onChange={(value) => update({ envEffScaleMax2: value })} />
              <SliderField field={vehiclesFields.HDTextureDist} value={data.HDTextureDist} onChange={(value) => update({ HDTextureDist: value })} min={0} max={500} step={1} />
              <SliderField field={vehiclesFields.defaultBodyHealth} value={data.defaultBodyHealth} onChange={(value) => update({ defaultBodyHealth: value })} min={100} max={2000} step={10} />
            </div>

            <div className="space-y-2 rounded border border-border/50 p-3">
              <TextAreaField label="Cover Bound Offsets" value={data.coverBoundOffsets} onChange={(value) => update({ coverBoundOffsets: value })} />
              <TextAreaField label="Extra Includes" value={data.extraIncludes} onChange={(value) => update({ extraIncludes: value })} />
              <TextAreaField label="Required Extras" value={data.requiredExtras} onChange={(value) => update({ requiredExtras: value })} />
              <JsonField label="POV Tuning Info" value={data.povTuningInfo} onChange={(value) => update({ povTuningInfo: value })} />
              <JsonField label="Explosion Info" value={data.explosionInfo} onChange={(value) => update({ explosionInfo: value })} />
              <JsonField label="First Person Drive-By Data" value={data.firstPersonDrivebyData} onChange={(value) => update({ firstPersonDrivebyData: value })} />
            </div>

            <div className="space-y-2 rounded border border-border/50 p-3">
              <Vec3Field label="POV Camera Offset" value={data.povCameraOffset} onChange={(value) => update({ povCameraOffset: value })} />
              <NumberField label="POV Roll Cage Vertical Adjustment" value={data.povCameraVerticalAdjustmentForRollCage} onChange={(value) => update({ povCameraVerticalAdjustmentForRollCage: value })} />
              <Vec3Field label="POV Passenger Offset" value={data.povPassengerCameraOffset} onChange={(value) => update({ povPassengerCameraOffset: value })} />
              <Vec3Field label="POV Rear Passenger Offset" value={data.povRearPassengerCameraOffset} onChange={(value) => update({ povRearPassengerCameraOffset: value })} />
              {Object.entries(data.firstPersonIkOffsets).map(([name, value]) => (
                <Vec3Field key={name} label={name} value={value ?? { x: 0, y: 0, z: 0 }} onChange={(nextValue) => update({ firstPersonIkOffsets: { ...data.firstPersonIkOffsets, [name]: nextValue } })} />
              ))}
            </div>

            <div className="space-y-2 rounded border border-border/50 p-3">
              <TextAreaField label="Trailers" value={data.trailers} onChange={(value) => update({ trailers: value })} />
              <TextAreaField label="Additional Trailers" value={data.additionalTrailers} onChange={(value) => update({ additionalTrailers: value })} />
              <TextAreaField label="Doors With Collision" value={data.doorsWithCollisionWhenClosed} onChange={(value) => update({ doorsWithCollisionWhenClosed: value })} />
              <TextAreaField label="Driveable Doors" value={data.driveableDoors} onChange={(value) => update({ driveableDoors: value })} />
              <DoorStiffnessField value={data.doorStiffnessMultipliers} onChange={(value) => update({ doorStiffnessMultipliers: value })} />
            </div>

            <div className="space-y-2 rounded border border-border/50 p-3">
              <TextField label="PTFX Asset Name" value={data.ptfxAssetName} onChange={(value) => update({ ptfxAssetName: value.toUpperCase() })} />
              <TextField label="VFX Info Name" value={data.vfxInfoName} onChange={(value) => update({ vfxInfoName: value.toUpperCase() })} />
              <TextField label="Swankness" value={data.swankness} onChange={(value) => update({ swankness: value.toUpperCase() })} />
              <NumberField label="Damage Map Scale" value={data.damageMapScale} onChange={(value) => update({ damageMapScale: value })} />
              <NumberField label="Damage Offset Scale" value={data.damageOffsetScale} onChange={(value) => update({ damageOffsetScale: value })} />
              <NumberField label="Steer Wheel Multiplier" value={data.steerWheelMult} onChange={(value) => update({ steerWheelMult: value })} />
              <NumberField label="Min Seat Height" value={data.minSeatHeight} onChange={(value) => update({ minSeatHeight: value })} />
              <NumberField label="Identical Model Spawn Distance" value={data.identicalModelSpawnDistance} onChange={(value) => update({ identicalModelSpawnDistance: value })} />
              <NumberField label="Pretend Occupants Scale" value={data.pretendOccupantsScale} onChange={(value) => update({ pretendOccupantsScale: value })} />
              <NumberField label="Visible Spawn Distance Scale" value={data.visibleSpawnDistScale} onChange={(value) => update({ visibleSpawnDistScale: value })} />
              <NumberField label="Tracker Path Width" value={data.trackerPathWidth} onChange={(value) => update({ trackerPathWidth: value })} />
              <NumberField label="Weapon Force Multiplier" value={data.weaponForceMult} onChange={(value) => update({ weaponForceMult: value })} />
              <NumberField label="Frequency" value={data.frequency} onChange={(value) => update({ frequency: value })} step={1} />
              <NumberField label="Max Same Color" value={data.maxNumOfSameColor} onChange={(value) => update({ maxNumOfSameColor: Math.round(value) })} step={1} />
              <NumberField label="Max Count" value={data.maxNum} onChange={(value) => update({ maxNum: Math.round(value) })} step={1} />
            </div>

            <div className="space-y-2 rounded border border-border/50 p-3">
              <ToggleField label="Use Cinematic View Mode" checked={data.shouldUseCinematicViewMode} onChange={(value) => update({ shouldUseCinematicViewMode: value })} />
              <ToggleField label="Transition Camera On Climb" checked={data.shouldCameraTransitionOnClimbUpDown} onChange={(value) => update({ shouldCameraTransitionOnClimbUpDown: value })} />
              <ToggleField label="Ignore Exiting Camera" checked={data.shouldCameraIgnoreExiting} onChange={(value) => update({ shouldCameraIgnoreExiting: value })} />
              <ToggleField label="Allow Pretend Occupants" checked={data.allowPretendOccupants} onChange={(value) => update({ allowPretendOccupants: value })} />
              <ToggleField label="Allow Joyriding" checked={data.allowJoyriding} onChange={(value) => update({ allowJoyriding: value })} />
              <ToggleField label="Allow Sunday Driving" checked={data.allowSundayDriving} onChange={(value) => update({ allowSundayDriving: value })} />
              <ToggleField label="Allow Body Color Mapping" checked={data.allowBodyColorMapping} onChange={(value) => update({ allowBodyColorMapping: value })} />
              <ToggleField label="Bumpers Need Map Collision" checked={data.bumpersNeedToCollideWithMap} onChange={(value) => update({ bumpersNeedToCollideWithMap: value })} />
              <ToggleField label="Needs Rope Texture" checked={data.needsRopeTexture} onChange={(value) => update({ needsRopeTexture: value })} />
            </div>

            <div className="space-y-2 rounded border border-border/50 p-3">
              <TextField label="Resident TXD" value={data.residentTxd} onChange={(value) => update({ residentTxd: value.toLowerCase() })} />
              <TextField label="Resident Anims" value={data.residentAnims} onChange={(value) => update({ residentAnims: value })} />
              <TxdRelationshipsField value={data.txdRelationships} onChange={(value) => update({ txdRelationships: value })} />
            </div>

            <div className="space-y-2 rounded border border-border/50 p-3">
              <DriversField value={data.drivers} onChange={(value) => update({ drivers: value })} />
            </div>
          </div>
        </Section>

        <Section title="Flags" count={data.flags.length} onReset={() => update({ flags: [] })} defaultCollapsed>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <Input value={flagSearch} onChange={(event) => setFlagSearch(event.target.value)} className="h-8 pl-7 text-xs" placeholder="Search flags" />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setActiveOnly((value) => !value)}>
              {activeOnly ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              {activeOnly ? "Active" : "All"}
            </Button>
          </div>
          {vehicleFlagCategories.map((category) => {
            const items = filteredFlags.filter((flag) => flag.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{category}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map((flag) => (
                    <div key={flag.value} className="rounded border border-border/50 px-3 py-2">
                      <SquareToggle checked={data.flags.includes(flag.value)} onCheckedChange={() => toggleFlag(flag.value)} label={flag.label} />
                      <p className="mt-1 text-[11px] text-muted-foreground">{flag.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>
      </ScrollArea>
    </motion.div>
  );
}
