import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FIRST_PERSON_IK_OFFSET_NAMES, type VehicleVec3, type VehiclesData } from "@/store/meta-store";
import { useMetaStore } from "@/store/meta-store";

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border/70 bg-card/90 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="flex h-9 w-full items-center justify-start gap-2 rounded-b-none px-3 text-left text-xs font-medium text-foreground hover:bg-accent/60"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        <span className="uppercase tracking-[0.08em] text-muted-foreground">{title}</span>
      </Button>
      {open ? <div className="space-y-3 border-t border-border/60 p-3">{children}</div> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 bg-background/70 text-xs shadow-xs"
      />
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
      <Label className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-9 bg-background/70 text-xs shadow-xs"
      />
    </div>
  );
}

function Vec3Editor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: VehicleVec3;
  onChange: (value: VehicleVec3) => void;
}) {
  const setAxis = (axis: keyof VehicleVec3, next: number) => {
    onChange({ ...value, [axis]: next });
  };

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        <NumberField label="X" value={value.x} onChange={(next) => setAxis("x", next)} />
        <NumberField label="Y" value={value.y} onChange={(next) => setAxis("y", next)} />
        <NumberField label="Z" value={value.z} onChange={(next) => setAxis("z", next)} />
      </div>
    </div>
  );
}

function ExplosionEditor({
  value,
  onChange,
}: {
  value: unknown | null;
  onChange: (value: unknown | null) => void;
}) {
  const [draft, setDraft] = useState(() => (value ? JSON.stringify(value, null, 2) : ""));
  const [error, setError] = useState<string | null>(null);

  const applyDraft = () => {
    if (!draft.trim()) {
      onChange(null);
      setError(null);
      return;
    }

    try {
      onChange(JSON.parse(draft));
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Explosion info (raw JSON)</Label>
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={8}
        className="min-h-40 rounded-xl bg-background/70 font-mono text-[11px] shadow-xs"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-destructive">{error}</span>
        <Button type="button" size="sm" className="h-7 text-[11px]" onClick={applyDraft}>
          Apply JSON
        </Button>
      </div>
    </div>
  );
}

function VehiclesMetaEnhancementsContent({
  vehicleId,
  data,
}: {
  vehicleId: string;
  data: VehiclesData;
}) {
  const updateVehicles = useMetaStore((s) => s.updateVehicles);
  const setActiveTab = useMetaStore((s) => s.setActiveTab);

  const update = (next: Partial<VehiclesData>) => updateVehicles(vehicleId, next);

  const addDoorStiffness = () => {
    update({
      doorStiffnessMultipliers: [
        ...data.doorStiffnessMultipliers,
        { doorId: data.doorStiffnessMultipliers.length, stiffnessMult: 1 },
      ],
    });
  };

  const updateDoorStiffness = (index: number, next: { doorId: number; stiffnessMult: number }) => {
    update({
      doorStiffnessMultipliers: data.doorStiffnessMultipliers.map((item, itemIndex) =>
        itemIndex === index ? next : item
      ),
    });
  };

  const removeDoorStiffness = (index: number) => {
    update({
      doorStiffnessMultipliers: data.doorStiffnessMultipliers.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  return (
    <div className="space-y-3">
      <Section title="Physical Attributes">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="VFX Info" value={data.vfxInfoName} onChange={(value) => update({ vfxInfoName: value })} />
          <TextField label="Trailers" value={data.trailers} onChange={(value) => update({ trailers: value })} />
          <TextField label="Additional Trailers" value={data.additionalTrailers} onChange={(value) => update({ additionalTrailers: value })} />
          <TextField label="Driveable Doors" value={data.driveableDoors} onChange={(value) => update({ driveableDoors: value })} />
          <TextField
            label="Closed-Door Collision"
            value={data.doorsWithCollisionWhenClosed}
            onChange={(value) => update({ doorsWithCollisionWhenClosed: value })}
          />
          <TextField label="Required Extras" value={data.requiredExtras} onChange={(value) => update({ requiredExtras: value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={data.bumpersNeedToCollideWithMap ? "secondary" : "outline"}
            className={cn("h-auto justify-start px-3 py-2 text-left text-xs", data.bumpersNeedToCollideWithMap && "border-primary/30 text-primary")}
            onClick={() => update({ bumpersNeedToCollideWithMap: !data.bumpersNeedToCollideWithMap })}
          >
            Bumpers Need Map Collision
          </Button>
          <Button
            type="button"
            variant={data.needsRopeTexture ? "secondary" : "outline"}
            className={cn("h-auto justify-start px-3 py-2 text-left text-xs", data.needsRopeTexture && "border-primary/30 text-primary")}
            onClick={() => update({ needsRopeTexture: !data.needsRopeTexture })}
          >
            Needs Rope Texture
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Door stiffness multipliers</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={addDoorStiffness}>
              <Plus className="mr-1 size-3.5" /> Add
            </Button>
          </div>
          {data.doorStiffnessMultipliers.map((item, index) => (
            <div key={`${item.doorId}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <NumberField
                label="Door ID"
                value={item.doorId}
                step={1}
                onChange={(value) => updateDoorStiffness(index, { ...item, doorId: Math.round(value) })}
              />
              <NumberField
                label="Stiffness"
                value={item.stiffnessMult}
                onChange={(value) => updateDoorStiffness(index, { ...item, stiffnessMult: value })}
              />
              <Button type="button" variant="ghost" size="icon-sm" className="mt-5 h-8 w-8" onClick={() => removeDoorStiffness(index)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Cover & Explosion" defaultOpen={false}>
        <div className="space-y-2">
          <TextField
            label="Cover Bound Offset Reference"
            value={data.coverBoundOffsets}
            onChange={(value) => update({ coverBoundOffsets: value })}
            placeholder="Link to a VehicleLayouts cover offset group"
          />
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setActiveTab("vehiclelayouts")}>
            Open VehicleLayouts Editor
          </Button>
        </div>
        <ExplosionEditor value={data.explosionInfo} onChange={(value) => update({ explosionInfo: value })} />
      </Section>

      <Section title="First-Person Offsets" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-3">
          <Vec3Editor
            label="POV Camera Offset"
            value={data.povCameraOffset}
            onChange={(value) => update({ povCameraOffset: value })}
          />
          <Vec3Editor
            label="Passenger Camera Offset"
            value={data.povPassengerCameraOffset}
            onChange={(value) => update({ povPassengerCameraOffset: value })}
          />
          <Vec3Editor
            label="Rear Passenger Camera Offset"
            value={data.povRearPassengerCameraOffset}
            onChange={(value) => update({ povRearPassengerCameraOffset: value })}
          />
          <NumberField
            label="Roll Cage Vertical Adjustment"
            value={data.povCameraVerticalAdjustmentForRollCage}
            onChange={(value) => update({ povCameraVerticalAdjustmentForRollCage: value })}
          />
        </div>

        <details className="rounded-xl border border-border/70 bg-background/60 p-3 shadow-xs">
          <summary className="cursor-pointer text-xs font-medium text-foreground">IK offset entries</summary>
          <div className="mt-3 space-y-3">
            {FIRST_PERSON_IK_OFFSET_NAMES.map((offsetName) => (
              <Vec3Editor
                key={offsetName}
                label={offsetName}
                value={data.firstPersonIkOffsets[offsetName] ?? { x: 0, y: 0, z: 0 }}
                onChange={(value) =>
                  update({
                    firstPersonIkOffsets: {
                      ...data.firstPersonIkOffsets,
                      [offsetName]: value,
                    },
                  })
                }
              />
            ))}
          </div>
        </details>
      </Section>
    </div>
  );
}

export const VehiclesMetaEnhancementsPanel = memo(function VehiclesMetaEnhancementsPanel() {
  const uiView = useMetaStore((s) => s.uiView);
  const activeTab = useMetaStore((s) => s.activeTab);
  const activeVehicleId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) => (s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null));

  const shouldShow = uiView === "workspace" && activeTab === "vehicles" && activeVehicleId && vehicle;

  const title = useMemo(() => vehicle?.vehicles.modelName || vehicle?.name || "Vehicle", [vehicle]);

  if (!shouldShow || !activeVehicleId || !vehicle) {
    return null;
  }

  return (
    <aside className="fixed right-2 top-24 bottom-12 z-30 hidden w-[24rem] rounded-xl border border-border/70 bg-background-app/95 shadow md:block">
      <ScrollArea className="h-full">
        <div className="p-3">
          <div className="mb-3">
            <div className="font-display text-[10px] uppercase tracking-[0.14em] text-primary/80">
              Vehicles.meta enhancements
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{title}</div>
          </div>

          <VehiclesMetaEnhancementsContent
            key={activeVehicleId}
            vehicleId={activeVehicleId}
            data={vehicle.vehicles}
          />
        </div>
      </ScrollArea>
    </aside>
  );
});
