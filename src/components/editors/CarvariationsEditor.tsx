import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { ChevronsDownUp, ChevronsUpDown, Plus, Trash2 } from "lucide-react";

import { SliderField } from "@/components/SliderField";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { carvariationsFields } from "@/lib/dictionary";
import { useMetaStore } from "@/store/meta-store";
import type {
  CarvariationColorSet,
  CarvariationPlateProbability,
  CarvariationsData,
} from "@/store/meta-store";

const ALL_CV_SECTIONS = ["colors", "sirens", "kits", "plates"];
const MAX_COLOR_VARIATIONS = 25;

function formatEnabledLiveries(liveries?: boolean[]): string {
  return (liveries ?? [])
    .map((enabled, index) => (enabled ? index + 1 : null))
    .filter((index): index is number => index !== null)
    .join(", ");
}

function parseEnabledLiveries(rawValue: string): boolean[] {
  const slots = rawValue
    .split(/[,\s]+/)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (slots.length === 0) return [];

  const maxSlot = Math.max(...slots);
  const liveries = Array.from({ length: maxSlot }, () => false);
  for (const slot of new Set(slots)) {
    liveries[slot - 1] = true;
  }
  return liveries;
}

function parseCommaSeparatedList(rawValue: string): string[] {
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseNonNegativeInt(rawValue: string, fallback = 0): number {
  const value = Number.parseInt(rawValue, 10);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function CarvariationsEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateCarvariations = useMetaStore((s) => s.updateCarvariations);
  const [openSections, setOpenSections] = useState<string[]>(ALL_CV_SECTIONS);
  const update = useCallback((data: Partial<CarvariationsData>) => {
    if (!activeId) return;
    updateCarvariations(activeId, data);
  }, [updateCarvariations, activeId]);

  if (!vehicle || !activeId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select or create a vehicle to edit carvariations
      </div>
    );
  }

  const cv = vehicle.carvariations;
  const plateTotal = cv.plateProbabilities.reduce((sum, plate) => sum + plate.value, 0);

  const addColor = () => {
    if (cv.colors.length >= MAX_COLOR_VARIATIONS) return;
    update({
      colors: [
        ...cv.colors,
        { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0, liveries: [] },
      ],
    });
  };

  const updateColor = (index: number, patch: Partial<CarvariationColorSet>) => {
    update({
      colors: cv.colors.map((color, colorIndex) =>
        colorIndex === index ? { ...color, ...patch } : color
      ),
    });
  };

  const removeColor = (index: number) => {
    if (cv.colors.length <= 1) return;
    update({ colors: cv.colors.filter((_, colorIndex) => colorIndex !== index) });
  };

  const addKit = () => {
    update({ kits: [...cv.kits, "0_default_modkit"] });
  };

  const updateKit = (index: number, value: string) => {
    update({
      kits: cv.kits.map((kit, kitIndex) => (kitIndex === index ? value : kit)),
    });
  };

  const removeKit = (index: number) => {
    if (cv.kits.length <= 1) return;
    update({ kits: cv.kits.filter((_, kitIndex) => kitIndex !== index) });
  };

  const addPlateProbability = () => {
    update({
      plateProbabilities: [
        ...cv.plateProbabilities,
        { name: `Plate ${cv.plateProbabilities.length + 1}`, value: 0 },
      ],
    });
  };

  const updatePlateProbability = (
    index: number,
    patch: Partial<CarvariationPlateProbability>
  ) => {
    update({
      plateProbabilities: cv.plateProbabilities.map((plate, plateIndex) =>
        plateIndex === index ? { ...plate, ...patch } : plate
      ),
    });
  };

  const removePlateProbability = (index: number) => {
    if (cv.plateProbabilities.length <= 1) return;
    update({
      plateProbabilities: cv.plateProbabilities.filter((_, plateIndex) => plateIndex !== index),
    });
  };

  return (
    <motion.div
      className="space-y-1 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-4 flex items-center gap-3">
        <Label className="shrink-0 text-xs text-muted-foreground">
          Model Name
        </Label>
        <Input
          value={cv.modelName}
          onChange={(event) => update({ modelName: event.target.value.toLowerCase() })}
          className="h-7 max-w-[200px] font-mono text-xs"
        />
      </div>

      <div className="mb-1 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setOpenSections(openSections.length > 0 ? [] : ALL_CV_SECTIONS)}
          className="gap-1 text-[10px]"
        >
          {openSections.length > 0
            ? <ChevronsDownUp className="h-3 w-3" />
            : <ChevronsUpDown className="h-3 w-3" />}
          {openSections.length > 0 ? "Collapse All" : "Expand All"}
        </Button>
      </div>

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="space-y-1"
      >
        <AccordionItem value="colors" className="rounded-md border px-3">
          <AccordionTrigger className="py-2 text-sm font-medium">
            Color Variations ({cv.colors.length}/{MAX_COLOR_VARIATIONS})
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-3">
            {cv.colors.map((color, index) => (
              <div key={index} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Color Set #{index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => removeColor(index)}
                    disabled={cv.colors.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["primary", "Primary"],
                      ["secondary", "Secondary"],
                      ["pearl", "Pearl"],
                      ["wheels", "Wheels"],
                      ["interior", "Interior"],
                      ["dashboard", "Dashboard"],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="flex items-center gap-2">
                      <Label className="min-w-[60px] text-[11px] text-muted-foreground">
                        {label}
                      </Label>
                      <Input
                        type="number"
                        value={color[field]}
                        onChange={(event) =>
                          updateColor(index, { [field]: parseNonNegativeInt(event.target.value) })
                        }
                        min={0}
                        max={160}
                        className="h-6 flex-1 font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Enabled Livery Slots
                  </Label>
                  <Input
                    value={formatEnabledLiveries(color.liveries)}
                    onChange={(event) =>
                      updateColor(index, { liveries: parseEnabledLiveries(event.target.value) })
                    }
                    placeholder="Example: 2, 4, 7"
                    className="h-7 font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Enter 1-based livery positions from the wiki schema. Blank means no livery overrides.
                  </p>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full gap-1 text-xs"
              onClick={addColor}
              disabled={cv.colors.length >= MAX_COLOR_VARIATIONS}
            >
              <Plus className="h-3 w-3" /> Add Color Variation
            </Button>
            <p className="text-[10px] text-muted-foreground">
              GTAMods documents a maximum of 25 color variations per vehicle.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sirens" className="rounded-md border px-3">
          <AccordionTrigger className="py-2 text-sm font-medium">
            Siren & Lights
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="space-y-1 rounded-md border p-3">
              <Label className="text-xs text-muted-foreground">
                {carvariationsFields.sirenSettings.name}
              </Label>
              <Input
                type="number"
                value={cv.sirenSettings}
                onChange={(event) => update({ sirenSettings: parseNonNegativeInt(event.target.value) })}
                min={0}
                className="h-7 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Supports high custom IDs. This must match the Siren ID used in carcols.meta.
              </p>
            </div>
            <div className="space-y-1 rounded-md border p-3">
              <Label className="text-xs text-muted-foreground">
                {carvariationsFields.lightSettings.name}
              </Label>
              <Input
                type="number"
                value={cv.lightSettings}
                onChange={(event) => update({ lightSettings: parseNonNegativeInt(event.target.value) })}
                min={0}
                className="h-7 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Use the exact light settings ID expected by the target setup. The editor no longer clamps this field.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="kits" className="rounded-md border px-3">
          <AccordionTrigger className="py-2 text-sm font-medium">
            Kits & Mods ({cv.kits.length})
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-3">
            {cv.kits.map((kit, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={kit}
                  onChange={(event) => updateKit(index, event.target.value)}
                  className="h-7 flex-1 font-mono text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => removeKit(index)}
                  disabled={cv.kits.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full gap-1 text-xs"
              onClick={addKit}
            >
              <Plus className="h-3 w-3" /> Add Kit
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="plates" className="rounded-md border px-3">
          <AccordionTrigger className="py-2 text-sm font-medium">
            Windows & Plates
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <SliderField
              field={carvariationsFields.windows}
              value={cv.windows}
              onChange={(value) => update({ windows: Math.round(value) })}
              min={0}
              max={3}
              step={1}
            />
            <div className="space-y-1 rounded-md border p-3">
              <Label className="text-xs text-muted-foreground">
                Windows With Exposed Edges
              </Label>
              <Input
                value={cv.windowsWithExposedEdges.join(", ")}
                onChange={(event) =>
                  update({ windowsWithExposedEdges: parseCommaSeparatedList(event.target.value) })
                }
                placeholder="window_lf, window_rf"
                className="h-7 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Comma-separated bone names to emit under <code>&lt;windowsWithExposedEdges&gt;</code>.
              </p>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Plate Probabilities
                </Label>
                <span className={`text-[10px] ${plateTotal === 100 ? "text-emerald-500" : "text-amber-500"}`}>
                  Total: {plateTotal}
                </span>
              </div>
              {cv.plateProbabilities.map((plate, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={plate.name}
                    onChange={(event) => updatePlateProbability(index, { name: event.target.value })}
                    placeholder="Plate name"
                    className="h-7 flex-[2] font-mono text-xs"
                  />
                  <Input
                    type="number"
                    value={plate.value}
                    onChange={(event) =>
                      updatePlateProbability(index, { value: parseNonNegativeInt(event.target.value) })
                    }
                    min={0}
                    className="h-7 w-24 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => removePlateProbability(index)}
                    disabled={cv.plateProbabilities.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-full gap-1 text-xs"
                onClick={addPlateProbability}
              >
                <Plus className="h-3 w-3" /> Add Plate Entry
              </Button>
              <p className="text-[10px] text-muted-foreground">
                GTAMods documents these values as probabilities that should add up to 100.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
