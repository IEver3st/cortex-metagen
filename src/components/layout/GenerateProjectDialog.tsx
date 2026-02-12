import { useMemo, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMetaStore } from "@/store/meta-store";
import { createVehicleFromPreset, presetConfigs, type PresetType } from "@/lib/presets";

interface GenerateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateProjectDialog({ open, onOpenChange }: GenerateProjectDialogProps) {
  const startNewProject = useMetaStore((s) => s.startNewProject);
  const addVehicle = useMetaStore((s) => s.addVehicle);

  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>(null);
  const [vehicleName, setVehicleName] = useState("");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const map = new Map<string, { key: PresetType; label: string; description: string }[]>();
    for (const [key, config] of Object.entries(presetConfigs)) {
      const preset = key as PresetType;
      const category = config.category;
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push({
        key: preset,
        label: config.label,
        description: config.description,
      });
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;

    const out = new Map<string, { key: PresetType; label: string; description: string }[]>();
    for (const [category, items] of categories.entries()) {
      const matched = items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          category.toLowerCase().includes(q),
      );
      if (matched.length) out.set(category, matched);
    }
    return out;
  }, [categories, search]);

  const canCreate = Boolean(selectedPreset && vehicleName.trim());

  const handleCreate = () => {
    if (!selectedPreset) return;
    const name = vehicleName.trim();
    if (!name) return;

    startNewProject();
    addVehicle(createVehicleFromPreset(name, selectedPreset));

    setSelectedPreset(null);
    setVehicleName("");
    setSearch("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedPreset(null);
    setVehicleName("");
    setSearch("");
    onOpenChange(false);
  };

  const selectedDescription = selectedPreset ? presetConfigs[selectedPreset].description : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle>Generate new vehicle project</AlertDialogTitle>
          <AlertDialogDescription>
            Pick a preset and a vehicle name. Cortex Metagen will create starter handling/vehicles/carcols/carvariations data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium">Preset</p>
            <Input
              placeholder="Search presets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <ScrollArea className="h-56 rounded-md border">
            <div className="p-3 space-y-3">
              {[...filtered.entries()].map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedPreset(item.key)}
                        className={
                          "rounded-md border px-2.5 py-2 text-left text-xs transition-colors " +
                          (selectedPreset === item.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-accent hover:text-accent-foreground")
                        }
                      >
                        <div className="font-medium leading-none">{item.label}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground whitespace-normal">
                          {item.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {filtered.size === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No presets match “{search.trim()}”.
                </div>
              )}
            </div>
          </ScrollArea>

          {selectedDescription && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {selectedDescription}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium">Vehicle name</p>
            <Input
              placeholder="e.g. apexgt"
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreate} disabled={!canCreate}>
            Generate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
