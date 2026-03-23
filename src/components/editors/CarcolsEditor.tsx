import { useState, memo, useCallback } from "react";
import { motion } from "motion/react";
import { useMetaStore } from "@/store/meta-store";
import { SliderField } from "@/components/SliderField";
import { carcolsFields } from "@/lib/dictionary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SquareToggle } from "@/components/SquareToggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, ChevronsDownUp, ChevronsUpDown, Lightbulb, Zap } from "lucide-react";
import type { CarcolsData, SirenLight } from "@/store/meta-store";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ── Sequencer pattern presets ────────────────────────────────
const SEQUENCER_PATTERNS: { label: string; binary: string; description: string }[] = [
  { label: "Solid On", binary: "11111111111111111111111111111111", description: "Always on" },
  { label: "Fast Strobe", binary: "10101010101010101010101010101010", description: "Rapid flash" },
  { label: "Slow Strobe", binary: "11110000111100001111000011110000", description: "Slow pulse" },
  { label: "Wig-Wag A", binary: "11111111111111110000000000000000", description: "Left side" },
  { label: "Wig-Wag B", binary: "00000000000000001111111111111111", description: "Right side" },
  { label: "Double Flash", binary: "11001100000000001100110000000000", description: "Two quick bursts" },
  { label: "Triple Flash", binary: "10101000000000001010100000000000", description: "Three quick bursts" },
  { label: "Steady Burn", binary: "11111111111111111111111111111111", description: "Constant light" },
  { label: "Alternating A", binary: "11111111000000001111111100000000", description: "Phase A" },
  { label: "Alternating B", binary: "00000000111111110000000011111111", description: "Phase B" },
  { label: "Random Scatter", binary: "10110100101101001011010010110100", description: "Irregular pattern" },
  { label: "Off", binary: "00000000000000000000000000000000", description: "Disabled" },
];

// ── 32-siren light presets ───────────────────────────────────
const SIREN_LIGHT_PRESETS: { label: string; description: string; lights: SirenLight[] }[] = [
  {
    label: "LED Red/Blue Pair",
    description: "Classic police red/blue alternating LEDs",
    lights: [
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFF0000", scale: 0.15, sequencer: "11111111111111110000000000000000" },
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFF0000FF", scale: 0.15, sequencer: "00000000000000001111111111111111" },
    ],
  },
  {
    label: "LED Red/White Pair",
    description: "Fire/EMS red and white alternating",
    lights: [
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFF0000", scale: 0.15, sequencer: "11110000111100001111000011110000" },
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFFFFFF", scale: 0.15, sequencer: "00001111000011110000111100001111" },
    ],
  },
  {
    label: "Amber Strobe",
    description: "Utility/construction amber flash",
    lights: [
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFF8800", scale: 0.2, sequencer: "10101010101010101010101010101010" },
    ],
  },
  {
    label: "Halogen Rotator",
    description: "Classic spinning halogen light",
    lights: [
      { rotation: "0 0 1", flashness: 1, delta: 0, color: "0xFFFF0000", scale: 0.4, sequencer: "11111111111111111111111111111111" },
    ],
  },
  {
    label: "4-Corner Strobe",
    description: "Hide-away corner strobes (4 lights)",
    lights: [
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFFFFFF", scale: 0.1, sequencer: "11001100000000001100110000000000" },
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFFFFFF", scale: 0.1, sequencer: "00000000110011000000000011001100" },
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFFFFFF", scale: 0.1, sequencer: "11001100000000001100110000000000" },
      { rotation: "0 0 0", flashness: 1000, delta: 0, color: "0xFFFFFFFF", scale: 0.1, sequencer: "00000000110011000000000011001100" },
    ],
  },
  {
    label: "Full 32-Siren Lightbar",
    description: "Complete police lightbar with 16 red/blue LEDs",
    lights: Array.from({ length: 16 }, (_, i) => ({
      rotation: "0 0 0",
      flashness: 1000,
      delta: 0,
      color: i % 2 === 0 ? "0xFFFF0000" : "0xFF0000FF",
      scale: 0.1,
      sequencer: i % 2 === 0
        ? "11111111111111110000000000000000"
        : "00000000000000001111111111111111",
    })),
  },
];

const SequencerPicker = memo(function SequencerPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground min-w-[100px]">Sequencer</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 text-xs font-mono flex-1"
        placeholder="10101010..."
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-1.5" title="Pattern presets">
            <Zap className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 space-y-0.5" align="end">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 px-1">Sequencer Patterns</p>
          {SEQUENCER_PATTERNS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { onChange(p.binary); setOpen(false); }}
              className="h-auto w-full justify-start rounded-md p-1.5 text-left text-[11px]"
            >
              <span className="font-medium">{p.label}</span>
              <span className="text-muted-foreground ml-1">— {p.description}</span>
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
});

const LightEditor = memo(function LightEditor({
  light,
  index,
  onChange,
  onRemove,
}: {
  light: SirenLight;
  index: number;
  onChange: (data: Partial<SirenLight>) => void;
  onRemove: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRotator = light.rotation.trim() === "0 0 1";
  const isLED = light.flashness >= 500;

  return (
    <motion.div
      className="border rounded-md p-3 space-y-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Light #{index + 1}
          </span>
          {isRotator && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">ROTATOR</span>
          )}
          {isLED && !isRotator && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">LED</span>
          )}
          {!isLED && !isRotator && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">HALOGEN</span>
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
          title="Remove Light"
          description={`Remove Light #${index + 1}? This cannot be undone.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={() => { onRemove(); setConfirmDelete(false); }}
        />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Rotation</Label>
        <div className="flex items-center gap-1 flex-1">
          <Input
            value={light.rotation}
            onChange={(e) => onChange({ rotation: e.target.value })}
            className="h-6 text-xs font-mono flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onChange({ rotation: light.rotation === "0 0 1" ? "0 0 0" : "0 0 1" })}
            className="shrink-0 px-1.5 text-[9px]"
            title="Toggle LED (0 0 0) / Rotator (0 0 1)"
          >
            {light.rotation.trim() === "0 0 1" ? "→ LED" : "→ Rotator"}
          </Button>
        </div>
      </div>
      <SliderField
        field={carcolsFields.flashness}
        value={light.flashness}
        onChange={(v) => onChange({ flashness: v })}
        min={0}
        max={1000}
        step={1}
      />
      <SliderField
        field={carcolsFields.delta}
        value={light.delta}
        onChange={(v) => onChange({ delta: v })}
        min={-10}
        max={10}
        step={0.1}
      />
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Color</Label>
        <Input
          value={light.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-6 text-xs font-mono flex-1"
          placeholder="0xFFFF0000"
        />
        <div
          className="w-5 h-5 rounded border border-border shrink-0"
          style={{ backgroundColor: parseArgbColor(light.color) }}
          title={light.color}
        />
      </div>
      <SliderField
        field={carcolsFields.scale}
        value={light.coronaScale ?? light.scale}
        onChange={(v) => onChange({ scale: v, coronaScale: v })}
        min={0}
        max={2}
        step={0.01}
      />
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground min-w-[100px]">Corona</Label>
        <div className="flex items-center gap-2">
          <SquareToggle
            checked={light.coronaEnabled !== false}
            onCheckedChange={(checked: boolean) => onChange({ coronaEnabled: checked })}
          />
          <span className="text-[11px] text-muted-foreground">
            {light.coronaEnabled === false ? "Disabled" : "Enabled"}
          </span>
        </div>
      </div>
      <SequencerPicker value={light.sequencer} onChange={(v) => onChange({ sequencer: v })} />
    </motion.div>
  );
});

function parseArgbColor(hex: string): string {
  const clean = hex.replace("0x", "").replace("#", "");
  if (clean.length === 8) {
    return `#${clean.slice(2)}`;
  }
  if (clean.length === 6) return `#${clean}`;
  return "#ff0000";
}

const ALL_CARCOLS_SECTIONS = ["sirens", "lights", "envlight"];

export function CarcolsEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateCarcols = useMetaStore((s) => s.updateCarcols);
  const [openSections, setOpenSections] = useState<string[]>(ALL_CARCOLS_SECTIONS);
  const [presetOpen, setPresetOpen] = useState(false);
  const carcols = vehicle?.carcols;
  const update = useCallback((data: Partial<CarcolsData>) => {
    if (!activeId) return;
    updateCarcols(activeId, data);
  }, [updateCarcols, activeId]);

  const addLight = useCallback(() => {
    if (!carcols || carcols.lights.length >= 32) return;
    const newLight: SirenLight = {
      rotation: "0 0 0",
      flashness: 1000,
      delta: 0,
      color: "0xFFFF0000",
      scale: 0.15,
      coronaScale: 0.15,
      coronaEnabled: true,
      sequencer: "10101010101010101010101010101010",
    };
    update({ lights: [...carcols.lights, newLight] });
  }, [carcols, update]);

  const addPresetLights = useCallback((lights: SirenLight[]) => {
    if (!carcols) return;
    const remaining = 32 - carcols.lights.length;
    const toAdd = lights.slice(0, remaining);
    update({ lights: [...carcols.lights, ...toAdd] });
    setPresetOpen(false);
  }, [carcols, update]);

  const updateLight = useCallback((index: number, data: Partial<SirenLight>) => {
    if (!carcols) return;
    const lights = carcols.lights.map((l, i) =>
      i === index ? { ...l, ...data } : l
    );
    update({ lights });
  }, [carcols, update]);

  const removeLight = useCallback((index: number) => {
    if (!carcols) return;
    update({ lights: carcols.lights.filter((_, i) => i !== index) });
  }, [carcols, update]);

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select or create a vehicle to edit sirens
      </div>
    );
  }

  const c = vehicle.carcols;

  const lightCountColor = c.lights.length > 20
    ? c.lights.length > 32 ? "text-red-400" : "text-amber-400"
    : "text-muted-foreground";

  return (
    <motion.div
      className="space-y-1 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-1 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setOpenSections(openSections.length > 0 ? [] : ALL_CARCOLS_SECTIONS)}
          className="gap-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
        >
          {openSections.length > 0 ? <ChevronsDownUp className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3" />}
          {openSections.length > 0 ? "Collapse All" : "Expand All"}
        </Button>
      </div>

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="space-y-1"
      >
        <AccordionItem value="sirens" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Siren Settings
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground min-w-[180px]">Siren ID</Label>
              <Input
                type="number"
                value={c.sirenId}
                onChange={(e) => update({ sirenId: parseInt(e.target.value) || 0 })}
                className="h-7 text-xs font-mono flex-1"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Use unique IDs (e.g. 5000+) to avoid conflicts. Must match carvariations sirenSettings.
            </p>
            <SliderField
              field={carcolsFields.sequencerBpm}
              value={c.sequencerBpm}
              onChange={(v) => update({ sequencerBpm: v })}
              min={0}
              max={1200}
              step={10}
            />
            <SliderField
              field={carcolsFields.rotationLimit}
              value={c.rotationLimit}
              onChange={(v) => update({ rotationLimit: v })}
              min={0}
              max={360}
              step={1}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="lights" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5" />
              Light Heads
              <span className={`text-xs font-mono ${lightCountColor}`}>
                {c.lights.length}/32
              </span>
              {c.lights.length > 20 && c.lights.length <= 32 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">32-SIREN</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            {c.lights.length > 20 && (
              <div className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded p-2">
                This vehicle uses 32-siren mode ({c.lights.length} lights). Requires FiveM or modded SP.
              </div>
            )}
            {c.lights.map((light, i) => (
              <LightEditor
                key={i}
                light={light}
                index={i}
                onChange={(data) => updateLight(i, data)}
                onRemove={() => removeLight(i)}
              />
            ))}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs gap-1"
                onClick={addLight}
                disabled={c.lights.length >= 32}
              >
                <Plus className="h-3 w-3" /> Add Light
              </Button>
              <Popover open={presetOpen} onOpenChange={setPresetOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs gap-1"
                    disabled={c.lights.length >= 32}
                  >
                    <Zap className="h-3 w-3" /> Light Presets
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 space-y-0.5" align="end">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 px-1">
                    Add Preset Lights ({32 - c.lights.length} slots remaining)
                  </p>
                  {SIREN_LIGHT_PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addPresetLights(p.lights)}
                      disabled={c.lights.length + p.lights.length > 32}
                      className="h-auto w-full justify-start rounded-md p-1.5 text-left text-[11px] disabled:cursor-not-allowed"
                    >
                      <div className="font-medium">{p.label} <span className="text-muted-foreground">({p.lights.length})</span></div>
                      <div className="text-[10px] text-muted-foreground">{p.description}</div>
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="envlight" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Environmental Lighting
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground min-w-[180px]">Color</Label>
              <Input
                value={c.environmentalLightColor}
                onChange={(e) => update({ environmentalLightColor: e.target.value })}
                className="h-7 text-xs font-mono flex-1"
                placeholder="0xFFFF0000"
              />
              <div
                className="w-5 h-5 rounded border border-border shrink-0"
                style={{ backgroundColor: parseArgbColor(c.environmentalLightColor) }}
              />
            </div>
            <SliderField
              field={carcolsFields.environmentalLightIntensity}
              value={c.environmentalLightIntensity}
              onChange={(v) => update({ environmentalLightIntensity: v })}
              min={0}
              max={200}
              step={1}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}

