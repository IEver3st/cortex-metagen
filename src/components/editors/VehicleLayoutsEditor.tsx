import { useState, memo } from "react";
import { useMetaStore } from "@/store/meta-store";
import { SliderField } from "@/components/SliderField";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronsDownUp, ChevronsUpDown, Shield, Eye } from "lucide-react";
import type {
  VehicleLayoutsData,
  CoverBoundOffset,
  DriveByLookAroundEntry,
  LookAroundOffset,
  LookAroundSideData,
} from "@/store/meta-store";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const ALL_LAYOUT_SECTIONS = ["covers", "lookaround"];

const CoverEditor = memo(function CoverEditor({
  cover,
  index,
  onChange,
  onRemove,
}: {
  cover: CoverBoundOffset;
  index: number;
  onChange: (data: Partial<CoverBoundOffset>) => void;
  onRemove: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Cover #{index + 1}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove Cover Offset"
          description={`Remove "${cover.name}"? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground min-w-[60px]">Name</Label>
        <Input
          value={cover.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground min-w-[50px]">Side</Label>
          <Input type="number" step="0.01" value={cover.extraSideOffset}
            onChange={(e) => onChange({ extraSideOffset: parseFloat(e.target.value) || 0 })}
            className="h-6 text-xs font-mono" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground min-w-[50px]">Fwd</Label>
          <Input type="number" step="0.01" value={cover.extraForwardOffset}
            onChange={(e) => onChange({ extraForwardOffset: parseFloat(e.target.value) || 0 })}
            className="h-6 text-xs font-mono" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground min-w-[50px]">Back</Label>
          <Input type="number" step="0.01" value={cover.extraBackwardOffset}
            onChange={(e) => onChange({ extraBackwardOffset: parseFloat(e.target.value) || 0 })}
            className="h-6 text-xs font-mono" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground min-w-[50px]">Z</Label>
          <Input type="number" step="0.01" value={cover.extraZOffset}
            onChange={(e) => onChange({ extraZOffset: parseFloat(e.target.value) || 0 })}
            className="h-6 text-xs font-mono" />
        </div>
      </div>
    </div>
  );
});

const LookAroundSideEditor = memo(function LookAroundSideEditor({
  label,
  side,
  onChange,
}: {
  label: string;
  side: LookAroundSideData;
  onChange: (data: LookAroundSideData) => void;
}) {
  const updateOffset = (idx: number, data: Partial<LookAroundOffset>) => {
    const offsets = side.offsets.map((o, i) => (i === idx ? { ...o, ...data } : o));
    onChange({ ...side, offsets });
  };

  const addOffset = () => {
    onChange({ ...side, offsets: [...side.offsets, { offset: 0, angleToBlendInOffsetX: 0, angleToBlendInOffsetY: 0 }] });
  };

  const removeOffset = (idx: number) => {
    onChange({ ...side, offsets: side.offsets.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {side.offsets.map((o, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input type="number" step="0.01" value={o.offset}
            onChange={(e) => updateOffset(i, { offset: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono flex-1" placeholder="Offset" />
          <Input type="number" step="1" value={o.angleToBlendInOffsetX}
            onChange={(e) => updateOffset(i, { angleToBlendInOffsetX: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono flex-1" placeholder="Angle X" />
          <Input type="number" step="1" value={o.angleToBlendInOffsetY}
            onChange={(e) => updateOffset(i, { angleToBlendInOffsetY: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono flex-1" placeholder="Angle Y" />
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive shrink-0" onClick={() => removeOffset(i)}>
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5" onClick={addOffset}>
        <Plus className="h-2.5 w-2.5" /> Offset
      </Button>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex items-center gap-1">
          <Label className="text-[9px] text-muted-foreground min-w-[55px]">Pitch X</Label>
          <Input type="number" step="0.5" value={side.extraRelativePitchX}
            onChange={(e) => onChange({ ...side, extraRelativePitchX: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono" />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-[9px] text-muted-foreground min-w-[55px]">Pitch Y</Label>
          <Input type="number" step="0.5" value={side.extraRelativePitchY}
            onChange={(e) => onChange({ ...side, extraRelativePitchY: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono" />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-[9px] text-muted-foreground min-w-[55px]">Blend X</Label>
          <Input type="number" step="1" value={side.angleToBlendInExtraPitchX}
            onChange={(e) => onChange({ ...side, angleToBlendInExtraPitchX: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono" />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-[9px] text-muted-foreground min-w-[55px]">Blend Y</Label>
          <Input type="number" step="1" value={side.angleToBlendInExtraPitchY}
            onChange={(e) => onChange({ ...side, angleToBlendInExtraPitchY: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono" />
        </div>
      </div>
    </div>
  );
});

const LookAroundEditor = memo(function LookAroundEditor({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: DriveByLookAroundEntry;
  index: number;
  onChange: (data: Partial<DriveByLookAroundEntry>) => void;
  onRemove: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Look-Around #{index + 1}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove Look-Around Entry"
          description={`Remove "${entry.name}"? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground min-w-[60px]">Name</Label>
        <Input value={entry.name} onChange={(e) => onChange({ name: e.target.value })}
          className="h-6 text-xs font-mono flex-1" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={entry.allowLookback} onCheckedChange={(v) => onChange({ allowLookback: v })} className="scale-75" />
          <Label className="text-[11px] text-muted-foreground">Allow Lookback</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Heading</Label>
          <Input type="number" step="1" value={entry.headingLimitsX}
            onChange={(e) => onChange({ headingLimitsX: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono w-16" placeholder="Min" />
          <Input type="number" step="1" value={entry.headingLimitsY}
            onChange={(e) => onChange({ headingLimitsY: parseFloat(e.target.value) || 0 })}
            className="h-5 text-[10px] font-mono w-16" placeholder="Max" />
        </div>
      </div>

      <LookAroundSideEditor label="Data Left" side={entry.dataLeft}
        onChange={(dataLeft) => onChange({ dataLeft })} />
      <LookAroundSideEditor label="Data Right" side={entry.dataRight}
        onChange={(dataRight) => onChange({ dataRight })} />
    </div>
  );
});

export function VehicleLayoutsEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateVehicleLayouts = useMetaStore((s) => s.updateVehicleLayouts);
  const [openSections, setOpenSections] = useState<string[]>(ALL_LAYOUT_SECTIONS);

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select or create a vehicle to edit vehiclelayouts.meta
      </div>
    );
  }

  const raw = vehicle.vehiclelayouts;
  const vl: VehicleLayoutsData = {
    coverBoundOffsets: Array.isArray(raw?.coverBoundOffsets) ? raw.coverBoundOffsets : [],
    driveByLookAroundData: Array.isArray(raw?.driveByLookAroundData) ? raw.driveByLookAroundData : [],
  };
  const update = (data: Partial<VehicleLayoutsData>) => updateVehicleLayouts(activeId, data);

  const addCover = () => {
    const newCover: CoverBoundOffset = {
      name: "NEW_COVER_OFFSET_INFO",
      extraSideOffset: 0, extraForwardOffset: 0, extraBackwardOffset: 0, extraZOffset: 0,
    };
    update({ coverBoundOffsets: [...vl.coverBoundOffsets, newCover] });
  };

  const updateCover = (index: number, data: Partial<CoverBoundOffset>) => {
    const coverBoundOffsets = vl.coverBoundOffsets.map((c, i) => (i === index ? { ...c, ...data } : c));
    update({ coverBoundOffsets });
  };

  const removeCover = (index: number) => {
    update({ coverBoundOffsets: vl.coverBoundOffsets.filter((_, i) => i !== index) });
  };

  const addLookAround = () => {
    const emptySide: LookAroundSideData = {
      offsets: [], extraRelativePitchX: 0, extraRelativePitchY: 0,
      angleToBlendInExtraPitchX: 0, angleToBlendInExtraPitchY: 0,
    };
    const newEntry: DriveByLookAroundEntry = {
      name: "STD_NEW_FRONT_LEFT",
      allowLookback: true,
      headingLimitsX: -190, headingLimitsY: 160,
      dataLeft: { ...emptySide }, dataRight: { ...emptySide },
    };
    update({ driveByLookAroundData: [...vl.driveByLookAroundData, newEntry] });
  };

  const updateLookAround = (index: number, data: Partial<DriveByLookAroundEntry>) => {
    const driveByLookAroundData = vl.driveByLookAroundData.map((e, i) =>
      i === index ? { ...e, ...data } : e
    );
    update({ driveByLookAroundData });
  };

  const removeLookAround = (index: number) => {
    update({ driveByLookAroundData: vl.driveByLookAroundData.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-1 p-4">
      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          onClick={() => setOpenSections(openSections.length > 0 ? [] : ALL_LAYOUT_SECTIONS)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {openSections.length > 0 ? <ChevronsDownUp className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3" />}
          {openSections.length > 0 ? "Collapse All" : "Expand All"}
        </button>
      </div>

      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-1">
        <AccordionItem value="covers" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              Cover Bound Offsets ({vl.coverBoundOffsets.length})
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <p className="text-[10px] text-muted-foreground">
              Defines how far NPCs extend from the vehicle when using it as cover.
            </p>
            {vl.coverBoundOffsets.map((cover, i) => (
              <CoverEditor key={i} cover={cover} index={i}
                onChange={(data) => updateCover(i, data)}
                onRemove={() => removeCover(i)} />
            ))}
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={addCover}>
              <Plus className="h-3 w-3" /> Add Cover Offset
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="lookaround" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" />
              First Person Drive-By Look-Around ({vl.driveByLookAroundData.length})
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <p className="text-[10px] text-muted-foreground">
              Controls how the camera moves when looking around in first person while driving. Each entry defines left/right look offsets and pitch blending.
            </p>
            {vl.driveByLookAroundData.map((entry, i) => (
              <LookAroundEditor key={i} entry={entry} index={i}
                onChange={(data) => updateLookAround(i, data)}
                onRemove={() => removeLookAround(i)} />
            ))}
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={addLookAround}>
              <Plus className="h-3 w-3" /> Add Look-Around Entry
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
