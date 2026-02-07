import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { useMetaStore } from "@/store/meta-store";
import { SliderField } from "@/components/SliderField";
import { carvariationsFields } from "@/lib/dictionary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronsDownUp, ChevronsUpDown } from "lucide-react";

const ALL_CV_SECTIONS = ["colors", "sirens", "kits", "plates"];

export function CarvariationsEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateCarvariations = useMetaStore((s) => s.updateCarvariations);
  const [openSections, setOpenSections] = useState<string[]>(ALL_CV_SECTIONS);

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select or create a vehicle to edit carvariations
      </div>
    );
  }

  const cv = vehicle.carvariations;
  const update = useCallback((data: Record<string, any>) =>
    updateCarvariations(activeId, data), [updateCarvariations, activeId]);

  const addColor = () => {
    update({
      colors: [
        ...cv.colors,
        { primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 },
      ],
    });
  };

  const updateColor = (
    index: number,
    field: string,
    value: number
  ) => {
    const colors = cv.colors.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    update({ colors });
  };

  const removeColor = (index: number) => {
    if (cv.colors.length <= 1) return;
    update({ colors: cv.colors.filter((_, i) => i !== index) });
  };

  const addKit = () => {
    update({ kits: [...cv.kits, "0_default_modkit"] });
  };

  const updateKit = (index: number, value: string) => {
    const kits = cv.kits.map((k, i) => (i === index ? value : k));
    update({ kits });
  };

  const removeKit = (index: number) => {
    if (cv.kits.length <= 1) return;
    update({ kits: cv.kits.filter((_, i) => i !== index) });
  };

  return (
    <motion.div
      className="space-y-1 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Label className="text-xs text-muted-foreground shrink-0">
          Model Name
        </Label>
        <Input
          value={cv.modelName}
          onChange={(e) => update({ modelName: e.target.value.toLowerCase() })}
          className="h-7 text-xs font-mono max-w-[200px]"
        />
      </div>

      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          onClick={() => setOpenSections(openSections.length > 0 ? [] : ALL_CV_SECTIONS)}
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
        <AccordionItem value="colors" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Color Combinations ({cv.colors.length})
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            {cv.colors.map((color, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Color Set #{i + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => removeColor(i)}
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
                      <Label className="text-[11px] text-muted-foreground min-w-[60px]">
                        {label}
                      </Label>
                      <Input
                        type="number"
                        value={color[field]}
                        onChange={(e) =>
                          updateColor(i, field, parseInt(e.target.value) || 0)
                        }
                        min={0}
                        max={160}
                        className="h-6 text-xs font-mono flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1"
              onClick={addColor}
            >
              <Plus className="h-3 w-3" /> Add Color Set
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sirens" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Siren & Lights
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <SliderField
              field={carvariationsFields.sirenSettings}
              value={cv.sirenSettings}
              onChange={(v) => update({ sirenSettings: Math.round(v) })}
              min={0}
              max={50}
              step={1}
            />
            <SliderField
              field={carvariationsFields.lightSettings}
              value={cv.lightSettings}
              onChange={(v) => update({ lightSettings: Math.round(v) })}
              min={0}
              max={50}
              step={1}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="kits" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Kits & Mods ({cv.kits.length})
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            {cv.kits.map((kit, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={kit}
                  onChange={(e) => updateKit(i, e.target.value)}
                  className="h-7 text-xs font-mono flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => removeKit(i)}
                  disabled={cv.kits.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1"
              onClick={addKit}
            >
              <Plus className="h-3 w-3" /> Add Kit
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="plates" className="border rounded-md px-3">
          <AccordionTrigger className="text-sm font-medium py-2">
            Windows & Plates
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-2">
            <SliderField
              field={carvariationsFields.windows}
              value={cv.windows}
              onChange={(v) => update({ windows: Math.round(v) })}
              min={0}
              max={3}
              step={1}
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Plate Probabilities
              </Label>
              <div className="flex gap-2">
                {["Standard", "Yellow/Black", "Blue/White"].map((label, i) => (
                  <div key={i} className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      value={cv.plateProbabilities[i] ?? 0}
                      onChange={(e) => {
                        const probs = [...cv.plateProbabilities];
                        probs[i] = parseInt(e.target.value) || 0;
                        update({ plateProbabilities: probs });
                      }}
                      min={0}
                      max={100}
                      className="h-6 text-xs font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
