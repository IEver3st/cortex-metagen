import { useState, memo } from "react";
import { motion } from "motion/react";
import { useMetaStore } from "@/store/meta-store";
import type { LinkMod, ModKit, VisibleMod, StatMod, SlotName } from "@/store/meta-store";
import { modkitsFields, kitTypes, visibleModTypes, statModTypes, commonBones } from "@/lib/dictionary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SquareToggle } from "@/components/SquareToggle";
import { Plus, Trash2, Package, Wrench, Gauge, Tag, Info } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ── Renameable mod shop slots ──────────────────────────────
function formatSlotLabel(value: string): string {
  return value
    .replace(/^VMT_/, "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const renameableSlots: { value: string; label: string; description: string }[] = visibleModTypes.map((value) => ({
  value,
  label: formatSlotLabel(value),
  description: `Renames the ${formatSlotLabel(value).toLowerCase()} category`,
}));

// ── Stat mod defaults per type ─────────────────────────────
const statModDefaults: Record<string, { modifier: number; audioApply: number; weight: number }> = {
  VMT_ENGINE:     { modifier: 0, audioApply: 1.000000, weight: 0 },
  VMT_BRAKES:     { modifier: 0, audioApply: 1.000000, weight: 0 },
  VMT_GEARBOX:    { modifier: 0, audioApply: 1.000000, weight: 0 },
  VMT_HORN:       { modifier: 0, audioApply: 1.000000, weight: 0 },
  VMT_SUSPENSION: { modifier: 0, audioApply: 1.000000, weight: 0 },
  VMT_ARMOUR:     { modifier: 0, audioApply: 1.000000, weight: 20 },
  VMT_TURBO:      { modifier: 0, audioApply: 1.000000, weight: 0 },
  VMT_WHEELS:     { modifier: 0, audioApply: 1.000000, weight: 0 },
};

function getStatModDefaults(type: string) {
  return statModDefaults[type] ?? { modifier: 0, audioApply: 1.0, weight: 0 };
}

function isRenameEligibleKitType(kitType: string): boolean {
  return !kitType.toLowerCase().includes("bennys");
}

function parseLinkedModelsInput(raw: string): string[] {
  const parts = raw
    .split(/[\n,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const unique = new Set<string>();
  for (const part of parts) unique.add(part);
  return [...unique];
}

// ── Tooltip helper ─────────────────────────────────────────
function FieldTooltip({ fieldKey }: { fieldKey: string }) {
  const field = modkitsFields[fieldKey];
  if (!field) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
          <p className="font-medium">{field.name}</p>
          <p className="text-muted-foreground">{field.description}</p>
          {field.example && <p className="text-[10px] text-muted-foreground/70 italic">{field.example}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Visible Mod Editor ─────────────────────────────────────
const VisibleModEditor = memo(function VisibleModEditor({
  mod,
  index,
  onChange,
  onRemove,
  onGenerateLinkedMods,
}: {
  mod: VisibleMod;
  index: number;
  onChange: (data: Partial<VisibleMod>) => void;
  onRemove: () => void;
  onGenerateLinkedMods: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Visual Mod #{index + 1}
          </span>
          {mod.type && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 font-medium">
              {mod.type.replace("VMT_", "")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove Visual Mod"
          description={`Remove Visual Mod #${index + 1}${mod.modelName ? ` (${mod.modelName})` : ""}? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Model Name</Label>
        <FieldTooltip fieldKey="modelName" />
        <Input
          value={mod.modelName}
          onChange={(e) => onChange({ modelName: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="vehicle_wing_1"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Shop Label</Label>
        <FieldTooltip fieldKey="modShopLabel" />
        <Input
          value={mod.modShopLabel}
          onChange={(e) => onChange({ modShopLabel: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="CMOD_SPO_0"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Type</Label>
        <FieldTooltip fieldKey="visibleModType" />
        <Select value={mod.type} onValueChange={(v) => onChange({ type: v })}>
          <SelectTrigger className="h-6 text-xs flex-1">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {visibleModTypes.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Bone</Label>
        <FieldTooltip fieldKey="bone" />
        <Select value={mod.bone} onValueChange={(v) => onChange({ bone: v })}>
          <SelectTrigger className="h-6 text-xs flex-1">
            <SelectValue placeholder="Select bone..." />
          </SelectTrigger>
          <SelectContent>
            {commonBones.map((b) => (
              <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Collision Bone</Label>
        <FieldTooltip fieldKey="collisionBone" />
        <Select value={mod.collisionBone} onValueChange={(v) => onChange({ collisionBone: v })}>
          <SelectTrigger className="h-6 text-xs flex-1">
            <SelectValue placeholder="Select bone..." />
          </SelectTrigger>
          <SelectContent>
            {commonBones.map((b) => (
              <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Turn Off Bones</Label>
        <FieldTooltip fieldKey="turnOffBones" />
        <Input
          value={mod.turnOffBones.join(", ")}
          onChange={(e) => onChange({ turnOffBones: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="bumper_f, misc_a"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Linked Models</Label>
        <FieldTooltip fieldKey="linkModelName" />
        <Input
          value={mod.linkedModels}
          onChange={(e) => onChange({ linkedModels: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="model_a, model_b"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={onGenerateLinkedMods}
          disabled={parseLinkedModelsInput(mod.linkedModels).length === 0}
        >
          Build Link Mods
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground min-w-[100px]">Camera Pos</Label>
          <FieldTooltip fieldKey="cameraPos" />
          <Input
            type="number"
            value={mod.cameraPos}
            onChange={(e) => onChange({ cameraPos: parseInt(e.target.value, 10) || 0 })}
            className="h-6 text-xs font-mono flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground min-w-[100px]">Turn Off Extra</Label>
          <FieldTooltip fieldKey="turnOffExtra" />
          <Input
            type="number"
            value={mod.turnOffExtra}
            onChange={(e) => onChange({ turnOffExtra: parseInt(e.target.value, 10) || 0 })}
            className="h-6 text-xs font-mono flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground min-w-[100px]">Audio Apply</Label>
          <FieldTooltip fieldKey="audioApply" />
          <Input
            type="number"
            step="0.1"
            value={mod.audioApply}
            onChange={(e) => onChange({ audioApply: parseFloat(e.target.value) || 0 })}
            className="h-6 text-xs font-mono flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground min-w-[100px]">Weight</Label>
          <FieldTooltip fieldKey="weight" />
          <Input
            type="number"
            value={mod.weight}
            onChange={(e) => onChange({ weight: parseInt(e.target.value, 10) || 0 })}
            className="h-6 text-xs font-mono flex-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground min-w-[100px]">Weapon Slot</Label>
          <FieldTooltip fieldKey="weaponSlot" />
          <Input
            value={mod.weaponSlot}
            onChange={(e) => onChange({ weaponSlot: e.target.value })}
            className="h-6 text-xs font-mono flex-1"
            placeholder="WMS_FRONT"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground min-w-[100px]">Secondary Slot</Label>
          <FieldTooltip fieldKey="weaponSlotSecondary" />
          <Input
            value={mod.weaponSlotSecondary}
            onChange={(e) => onChange({ weaponSlotSecondary: e.target.value })}
            className="h-6 text-xs font-mono flex-1"
            placeholder="WMS_REAR"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Disable Bonnet Cam</Label>
            <FieldTooltip fieldKey="disableBonnetCamera" />
          </div>
          <SquareToggle checked={mod.disableBonnetCamera} onCheckedChange={(checked) => onChange({ disableBonnetCamera: checked })} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Allow Bonnet Slide</Label>
            <FieldTooltip fieldKey="allowBonnetSlide" />
          </div>
          <SquareToggle checked={mod.allowBonnetSlide} onCheckedChange={(checked) => onChange({ allowBonnetSlide: checked })} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Disable Projectile Driveby</Label>
            <FieldTooltip fieldKey="disableProjectileDriveby" />
          </div>
          <SquareToggle checked={mod.disableProjectileDriveby} onCheckedChange={(checked) => onChange({ disableProjectileDriveby: checked })} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Disable Driveby</Label>
            <FieldTooltip fieldKey="disableDriveby" />
          </div>
          <SquareToggle checked={mod.disableDriveby} onCheckedChange={(checked) => onChange({ disableDriveby: checked })} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Disable Seat Driveby</Label>
            <FieldTooltip fieldKey="disableDrivebySeat" />
          </div>
          <SquareToggle checked={mod.disableDrivebySeat} onCheckedChange={(checked) => onChange({ disableDrivebySeat: checked })} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Disable Secondary Seat</Label>
            <FieldTooltip fieldKey="disableDrivebySeatSecondary" />
          </div>
          <SquareToggle checked={mod.disableDrivebySeatSecondary} onCheckedChange={(checked) => onChange({ disableDrivebySeatSecondary: checked })} />
        </div>
      </div>
    </div>
  );
});

// ── Stat Mod Editor ────────────────────────────────────────
const StatModEditor = memo(function StatModEditor({
  mod,
  index,
  onChange,
  onRemove,
}: {
  mod: StatMod;
  index: number;
  onChange: (data: Partial<StatMod>) => void;
  onRemove: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Stat Mod #{index + 1}
          </span>
          {mod.type && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
              {mod.type.replace("VMT_", "")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove Stat Mod"
          description={`Remove Stat Mod #${index + 1} (${mod.type || "unnamed"})? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Type</Label>
        <FieldTooltip fieldKey="statModType" />
        <Select value={mod.type} onValueChange={(v) => onChange({ type: v, ...getStatModDefaults(v) })}>
          <SelectTrigger className="h-6 text-xs flex-1">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {statModTypes.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Identifier</Label>
        <Input
          value={mod.identifier}
          onChange={(e) => onChange({ identifier: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="(usually empty)"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Modifier</Label>
        <Input
          type="number"
          value={mod.modifier}
          onChange={(e) => onChange({ modifier: parseFloat(e.target.value) || 0 })}
          className="h-6 text-xs font-mono flex-1"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Audio Apply</Label>
        <Input
          type="number"
          value={mod.audioApply}
          onChange={(e) => onChange({ audioApply: parseFloat(e.target.value) || 0 })}
          className="h-6 text-xs font-mono flex-1"
          step="0.1"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Weight</Label>
        <Input
          type="number"
          value={mod.weight}
          onChange={(e) => onChange({ weight: parseInt(e.target.value) || 0 })}
          className="h-6 text-xs font-mono flex-1"
        />
      </div>
    </div>
  );
});

// ── Slot Name Editor ───────────────────────────────────────
const SlotNameEditor = memo(function SlotNameEditor({
  slot,
  index,
  onChange,
  onRemove,
}: {
  slot: SlotName;
  index: number;
  onChange: (data: Partial<SlotName>) => void;
  onRemove: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border rounded-md p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Slot #{index + 1}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove Slot Name"
          description={`Remove slot name override #${index + 1}? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[60px]">Slot</Label>
        <FieldTooltip fieldKey="slotName" />
        <Select value={slot.slot} onValueChange={(v) => onChange({ slot: v })}>
          <SelectTrigger className="h-6 text-xs flex-1">
            <SelectValue placeholder="Select slot..." />
          </SelectTrigger>
          <SelectContent>
            {renameableSlots.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                <span>{s.label}</span>
                <span className="text-muted-foreground/60 ml-1.5">— {s.description}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {slot.slot && (
        <p className="text-[10px] text-muted-foreground/60 pl-[72px]">
          Renames the <strong>{renameableSlots.find((s) => s.value === slot.slot)?.label ?? slot.slot}</strong> tab in Los Santos Customs
        </p>
      )}

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[60px]">Name</Label>
        <Input
          value={slot.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="CUSTOM_LABEL"
        />
      </div>
    </div>
  );
});

const LinkModEditor = memo(function LinkModEditor({
  linkMod,
  index,
  onChange,
  onRemove,
}: {
  linkMod: LinkMod;
  index: number;
  onChange: (data: Partial<LinkMod>) => void;
  onRemove: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border rounded-md p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Linked Prop #{index + 1}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove Linked Prop"
          description={`Remove linked prop #${index + 1}? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Model Name</Label>
        <FieldTooltip fieldKey="linkModelName" />
        <Input
          value={linkMod.modelName}
          onChange={(e) => onChange({ modelName: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="adder_splitter_a"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Bone</Label>
        <FieldTooltip fieldKey="bone" />
        <Select value={linkMod.bone} onValueChange={(value) => onChange({ bone: value })}>
          <SelectTrigger className="h-6 text-xs flex-1">
            <SelectValue placeholder="Select bone..." />
          </SelectTrigger>
          <SelectContent>
            {commonBones.map((bone) => (
              <SelectItem key={bone} value={bone} className="text-xs">{bone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Turn Off Extra</Label>
        <FieldTooltip fieldKey="turnOffExtra" />
        <Input
          type="number"
          value={linkMod.turnOffExtra}
          onChange={(e) => onChange({ turnOffExtra: parseInt(e.target.value, 10) || 0 })}
          className="h-6 text-xs font-mono flex-1"
        />
      </div>
    </div>
  );
});

// ── Single Kit Editor ──────────────────────────────────────
const KitEditor = memo(function KitEditor({
  kit,
  kitIndex,
  onUpdate,
  onRemove,
}: {
  kit: ModKit;
  kitIndex: number;
  onUpdate: (kit: ModKit) => void;
  onRemove: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([
    "header",
    "visibleMods",
    "linkMods",
    "statMods",
    "slotNames",
    "liveries",
  ]);
  const [renamePromptOpen, setRenamePromptOpen] = useState(false);
  const [renamePromptValue, setRenamePromptValue] = useState("");
  const [pendingLinkedSourceIndex, setPendingLinkedSourceIndex] = useState<number | null>(null);
  const [pendingLinkedBone, setPendingLinkedBone] = useState("chassis");

  const updateVisibleMod = (index: number, data: Partial<VisibleMod>) => {
    const mods = kit.visibleMods.map((m, i) => (i === index ? { ...m, ...data } : m));
    onUpdate({ ...kit, visibleMods: mods });
  };

  const removeVisibleMod = (index: number) => {
    onUpdate({ ...kit, visibleMods: kit.visibleMods.filter((_, i) => i !== index) });
  };

  const addVisibleMod = () => {
    const newMod: VisibleMod = {
      modelName: "",
      modShopLabel: "",
      linkedModels: "",
      turnOffBones: [],
      type: "VMT_SPOILER",
      bone: "chassis",
      collisionBone: "chassis",
      cameraPos: 0,
      audioApply: 1,
      weight: 0,
      turnOffExtra: -1,
      disableBonnetCamera: false,
      allowBonnetSlide: false,
      weaponSlot: "",
      weaponSlotSecondary: "",
      disableProjectileDriveby: false,
      disableDriveby: false,
      disableDrivebySeat: false,
      disableDrivebySeatSecondary: false,
      linkedGenerated: false,
      linkedSource: "",
      linkedBoneRef: "",
    };
    onUpdate({ ...kit, visibleMods: [...kit.visibleMods, newMod] });
  };

  const openLinkedPrompt = (index: number) => {
    setPendingLinkedSourceIndex(index);
    setPendingLinkedBone(kit.visibleMods[index]?.bone || "chassis");
  };

  const generateLinkedMods = () => {
    if (pendingLinkedSourceIndex === null) return;
    const source = kit.visibleMods[pendingLinkedSourceIndex];
    if (!source) return;

    const linkedNames = parseLinkedModelsInput(source.linkedModels);
    if (linkedNames.length === 0) {
      setPendingLinkedSourceIndex(null);
      return;
    }

    const existingKeys = new Set(
      kit.linkMods.map((mod) => `${mod.modelName.toLowerCase()}|${mod.bone.toLowerCase()}`)
    );

    const generatedMods: LinkMod[] = linkedNames
      .filter((name) => !existingKeys.has(`${name.toLowerCase()}|${pendingLinkedBone.toLowerCase()}`))
      .map((name) => ({
        modelName: name,
        bone: pendingLinkedBone,
        turnOffExtra: -1,
      }));

    if (generatedMods.length > 0) {
      onUpdate({ ...kit, linkMods: [...kit.linkMods, ...generatedMods] });
    }

    setPendingLinkedSourceIndex(null);
  };

  const updateLinkMod = (index: number, data: Partial<LinkMod>) => {
    const linkMods = kit.linkMods.map((mod, i) => (i === index ? { ...mod, ...data } : mod));
    onUpdate({ ...kit, linkMods });
  };

  const removeLinkMod = (index: number) => {
    onUpdate({ ...kit, linkMods: kit.linkMods.filter((_, i) => i !== index) });
  };

  const addLinkMod = () => {
    onUpdate({
      ...kit,
      linkMods: [
        ...kit.linkMods,
        { modelName: "", bone: "chassis", turnOffExtra: -1 },
      ],
    });
  };

  const updateStatMod = (index: number, data: Partial<StatMod>) => {
    const mods = kit.statMods.map((m, i) => (i === index ? { ...m, ...data } : m));
    onUpdate({ ...kit, statMods: mods });
  };

  const removeStatMod = (index: number) => {
    onUpdate({ ...kit, statMods: kit.statMods.filter((_, i) => i !== index) });
  };

  const addStatMod = (type: string = "VMT_ENGINE") => {
    const defaults = getStatModDefaults(type);
    const newMod: StatMod = {
      identifier: "",
      ...defaults,
      type,
    };
    onUpdate({ ...kit, statMods: [...kit.statMods, newMod] });
  };

  const addAllStandardUpgrades = () => {
    const standardTypes = ["VMT_ENGINE", "VMT_BRAKES", "VMT_GEARBOX", "VMT_SUSPENSION", "VMT_ARMOUR", "VMT_TURBO"];
    const existingTypes = new Set(kit.statMods.map((m) => m.type));
    const newMods: StatMod[] = standardTypes
      .filter((t) => !existingTypes.has(t))
      .map((type) => ({
        identifier: "",
        ...getStatModDefaults(type),
        type,
      }));
    if (newMods.length > 0) {
      onUpdate({ ...kit, statMods: [...kit.statMods, ...newMods] });
    }
  };

  const updateSlotName = (index: number, data: Partial<SlotName>) => {
    const slots = kit.slotNames.map((s, i) => (i === index ? { ...s, ...data } : s));
    onUpdate({ ...kit, slotNames: slots });
  };

  const removeSlotName = (index: number) => {
    onUpdate({ ...kit, slotNames: kit.slotNames.filter((_, i) => i !== index) });
  };

  const addSlotName = () => {
    onUpdate({ ...kit, slotNames: [...kit.slotNames, { slot: "VMT_CHASSIS", name: "" }] });
  };

  const updateLiveryName = (collection: "liveryNames" | "livery2Names", index: number, value: string) => {
    const next = kit[collection].map((item, i) => (i === index ? value : item));
    onUpdate({ ...kit, [collection]: next });
  };

  const addLiveryName = (collection: "liveryNames" | "livery2Names") => {
    onUpdate({ ...kit, [collection]: [...kit[collection], ""] });
  };

  const removeLiveryName = (collection: "liveryNames" | "livery2Names", index: number) => {
    onUpdate({ ...kit, [collection]: kit[collection].filter((_, i) => i !== index) });
  };

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      {/* Kit header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-teal-400" />
          <div>
            <span className="text-sm font-semibold">{kit.kitName || `Kit #${kitIndex + 1}`}</span>
            <span className="text-[10px] text-muted-foreground ml-2">ID: {kit.id}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted ml-2 text-muted-foreground">{kit.kitType}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete ModKit"
          description={`Delete "${kit.kitName || `Kit #${kitIndex + 1}`}" and all its mods? This cannot be undone.`}
          confirmLabel="Delete Kit"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>

      <div className="p-3 space-y-2">
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-1"
        >
          {/* ── Kit Identity ─────────────────────────── */}
          <AccordionItem value="header" className="border rounded-md px-3">
            <AccordionTrigger className="text-xs font-medium py-2">
              Kit Identity
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground min-w-[100px]">Kit Name</Label>
                <FieldTooltip fieldKey="kitName" />
                <Input
                  value={kit.kitName}
                  onChange={(e) => onUpdate({ ...kit, kitName: e.target.value })}
                  className="h-6 text-xs font-mono flex-1"
                  placeholder="1000_vehicle_modkit"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground min-w-[100px]">Kit ID</Label>
                <FieldTooltip fieldKey="kitId" />
                <Input
                  type="number"
                  value={kit.id}
                  onChange={(e) => onUpdate({ ...kit, id: parseInt(e.target.value) || 0 })}
                  className="h-6 text-xs font-mono flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground min-w-[100px]">Kit Type</Label>
                <FieldTooltip fieldKey="kitType" />
                <Select
                  value={kit.kitType}
                  onValueChange={(v) => {
                    onUpdate({ ...kit, kitType: v });
                    if (isRenameEligibleKitType(v)) {
                      setRenamePromptValue(kit.kitName || "");
                      setRenamePromptOpen(true);
                    }
                  }}
                >
                  <SelectTrigger className="h-6 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kitTypes.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2">
                Kit ID must be <strong>unique server-wide</strong>. Use high numbers (2500+) to avoid conflicts with base GTA vehicles.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* ── Visual Modifications ─────────────────── */}
          <AccordionItem value="visibleMods" className="border rounded-md px-3">
            <AccordionTrigger className="text-xs font-medium py-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5" />
                Visual Modifications
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({kit.visibleMods.length})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">
                3D parts you can bolt onto the car — spoilers, bumpers, hoods, skirts, etc.
              </p>
              {kit.visibleMods.map((mod, i) => (
                <VisibleModEditor
                  key={i}
                  mod={mod}
                  index={i}
                  onChange={(data) => updateVisibleMod(i, data)}
                  onRemove={() => removeVisibleMod(i)}
                  onGenerateLinkedMods={() => openLinkedPrompt(i)}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 text-xs gap-2 border-dashed hover:border-teal-500/50 hover:text-teal-400 transition-colors"
                onClick={addVisibleMod}
              >
                <Plus className="h-5 w-5" /> Add Visual Mod
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="linkMods" className="border rounded-md px-3">
            <AccordionTrigger className="text-xs font-medium py-2">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Linked Props
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({kit.linkMods.length})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Auxiliary models referenced by `linkedModels` and emitted inside the `linkMods` section.
              </p>
              {kit.linkMods.map((linkMod, i) => (
                <LinkModEditor
                  key={`${linkMod.modelName}_${i}`}
                  linkMod={linkMod}
                  index={i}
                  onChange={(data) => updateLinkMod(i, data)}
                  onRemove={() => removeLinkMod(i)}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs gap-2 border-dashed hover:border-teal-500/50 hover:text-teal-400 transition-colors"
                onClick={addLinkMod}
              >
                <Plus className="h-4 w-4" /> Add Linked Prop
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ── Performance Upgrades ─────────────────── */}
          <AccordionItem value="statMods" className="border rounded-md px-3">
            <AccordionTrigger className="text-xs font-medium py-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5" />
                Performance Upgrades
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({kit.statMods.length})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Engine, brake, transmission, and other performance upgrades. No 3D models needed.
              </p>
              {kit.statMods.map((mod, i) => (
                <StatModEditor
                  key={i}
                  mod={mod}
                  index={i}
                  onChange={(data) => updateStatMod(i, data)}
                  onRemove={() => removeStatMod(i)}
                />
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10 text-xs gap-2 border-dashed hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  onClick={() => addStatMod()}
                >
                  <Plus className="h-5 w-5" /> Add Upgrade
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 text-xs gap-2 border-dashed hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  onClick={addAllStandardUpgrades}
                >
                  <Plus className="h-4 w-4" /> All Standard
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ── Custom Slot Names ────────────────────── */}
          <AccordionItem value="slotNames" className="border rounded-md px-3">
            <AccordionTrigger className="text-xs font-medium py-2">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Custom Slot Names
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({kit.slotNames.length})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Rename mod shop categories (e.g. change "Chassis" to "Police Equipment").
              </p>
              {kit.slotNames.map((slot, i) => (
                <SlotNameEditor
                  key={i}
                  slot={slot}
                  index={i}
                  onChange={(data) => updateSlotName(i, data)}
                  onRemove={() => removeSlotName(i)}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs gap-2 border-dashed hover:border-purple-500/50 hover:text-purple-400 transition-colors"
                onClick={addSlotName}
              >
                <Plus className="h-4 w-4" /> Add Slot Name
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="liveries" className="border rounded-md px-3">
            <AccordionTrigger className="text-xs font-medium py-2">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Livery Labels
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({kit.liveryNames.length + kit.livery2Names.length})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Primary Livery Names</Label>
                    <FieldTooltip fieldKey="liveryName" />
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => addLiveryName("liveryNames")}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {kit.liveryNames.map((name, i) => (
                  <div key={`livery-${i}`} className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => updateLiveryName("liveryNames", i, e.target.value)}
                      className="h-7 text-xs font-mono"
                      placeholder="LIV_PRIMARY_1"
                    />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeLiveryName("liveryNames", i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Secondary Livery Names</Label>
                    <FieldTooltip fieldKey="livery2Name" />
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => addLiveryName("livery2Names")}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {kit.livery2Names.map((name, i) => (
                  <div key={`livery2-${i}`} className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => updateLiveryName("livery2Names", i, e.target.value)}
                      className="h-7 text-xs font-mono"
                      placeholder="LIV_SECONDARY_1"
                    />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeLiveryName("livery2Names", i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <AlertDialog open={renamePromptOpen} onOpenChange={setRenamePromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Eligible ModKit</AlertDialogTitle>
            <AlertDialogDescription>
              This modkit type supports slot naming. Rename the original (non-Bennys) modkit now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`rename-kit-${kitIndex}`} className="text-xs text-muted-foreground">New Name</Label>
            <Input
              id={`rename-kit-${kitIndex}`}
              value={renamePromptValue}
              onChange={(e) => setRenamePromptValue(e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder="custom_modkit_name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Skip</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const trimmed = renamePromptValue.trim();
                if (!trimmed) return;
                onUpdate({ ...kit, kitName: trimmed });
              }}
            >
              Rename Kit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingLinkedSourceIndex !== null} onOpenChange={(open) => !open && setPendingLinkedSourceIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attach Linked Mods to Bone</AlertDialogTitle>
            <AlertDialogDescription>
              Select which bone these linked models should reference, then generate `linkMods` entries for the kit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Bone</Label>
            <Select value={pendingLinkedBone} onValueChange={setPendingLinkedBone}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select bone..." />
              </SelectTrigger>
              <SelectContent>
                {commonBones.map((bone) => (
                  <SelectItem key={bone} value={bone} className="text-xs">{bone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generateLinkedMods}>Generate Link Mods</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

// ── Main ModkitsEditor ─────────────────────────────────────
export function ModkitsEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateModkits = useMetaStore((s) => s.updateModkits);
  const [createMultiple, setCreateMultiple] = useState(false);
  const [kitQuantity, setKitQuantity] = useState(2);

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select or create a vehicle to edit modkits
      </div>
    );
  }

  const m = vehicle.modkits;

  const addKit = () => {
    const nextIdBase = m.kits.length > 0
      ? Math.max(...m.kits.map((k) => k.id)) + 1
      : 2500;
    const baseName = `${vehicle.name.toLowerCase()}_modkit`;
    const existingNames = new Set(m.kits.map((kit) => kit.kitName.toLowerCase()));
    const quantity = createMultiple ? Math.max(1, kitQuantity) : 1;

    const created: ModKit[] = [];

    for (let idx = 0; idx < quantity; idx += 1) {
      const nextId = nextIdBase + idx;
      const withSuffix = createMultiple ? `${baseName}_${idx + 1}` : `${nextId}_${baseName}`;
      let candidate = withSuffix;
      let suffix = 1;
      while (existingNames.has(candidate.toLowerCase())) {
        candidate = `${withSuffix}_${suffix}`;
        suffix += 1;
      }
      existingNames.add(candidate.toLowerCase());

      created.push({
        kitName: candidate,
        id: nextId,
        kitType: "MKT_STANDARD",
        visibleMods: [],
        linkMods: [],
        statMods: [],
        slotNames: [],
        liveryNames: [],
        livery2Names: [],
      });
    }

    updateModkits(activeId, { kits: [...m.kits, ...created] });
  };

  const updateKit = (index: number, kit: ModKit) => {
    const kits = m.kits.map((k, i) => (i === index ? kit : k));
    updateModkits(activeId, { kits });
  };

  const removeKit = (index: number) => {
    updateModkits(activeId, { kits: m.kits.filter((_, i) => i !== index) });
  };

  return (
    <motion.div
      className="space-y-3 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-semibold">Modification Kits</span>
          <span className="text-xs text-muted-foreground font-mono">
            ({m.kits.length} kit{m.kits.length !== 1 ? "s" : ""})
          </span>
        </div>
      </div>

      <div className="border border-border/50 rounded-md p-3 space-y-2 bg-muted/20">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Create multiple variants</Label>
          <SquareToggle checked={createMultiple} onCheckedChange={setCreateMultiple} />
        </div>
        {createMultiple && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground min-w-[100px]">Quantity</Label>
            <Input
              type="number"
              value={kitQuantity}
              min={1}
              max={50}
              onChange={(e) => setKitQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="h-7 text-xs font-mono w-28"
            />
            <span className="text-[10px] text-muted-foreground">Names use `_1 ... _N` suffixes</span>
          </div>
        )}
      </div>

      {m.kits.length === 0 && (
        <div className="text-center py-8 text-muted-foreground space-y-2">
          <Package className="h-8 w-8 mx-auto opacity-30" />
          <p className="text-sm">No modkits yet</p>
          <p className="text-xs">Add a kit to define spoilers, bumpers, engine upgrades, and more.</p>
        </div>
      )}

      {/* Kit list */}
      {m.kits.map((kit, i) => (
        <KitEditor
          key={`${kit.kitName}_${i}`}
          kit={kit}
          kitIndex={i}
          onUpdate={(k) => updateKit(i, k)}
          onRemove={() => removeKit(i)}
        />
      ))}

      {/* Add Kit button — large and prominent */}
      <Button
        variant="outline"
        className="w-full h-14 text-sm gap-3 border-dashed border-2 hover:border-teal-500/50 hover:text-teal-400 hover:bg-teal-500/5 transition-all"
        onClick={addKit}
      >
        <Plus className="h-6 w-6" />
        Add New ModKit
      </Button>

      {/* Info footer */}
      <div className="text-[10px] text-muted-foreground bg-muted/20 border border-border/40 rounded p-3 space-y-1">
        <p><strong>Linking:</strong> After building a kit here, link it in <strong>carvariations.meta</strong> by adding the kit name to the vehicle's <code>&lt;kits&gt;</code> list.</p>
        <p><strong>Conflict Warning:</strong> If two cars share the same Kit ID, their mods will merge — causing glitchy parts on the wrong car.</p>
      </div>
    </motion.div>
  );
}
