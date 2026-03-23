import { useMemo, useState } from "react";
import { Car } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMetaStore } from "@/store/meta-store";
import { createVehicleFromPreset, presetConfigs, type PresetType } from "@/lib/presets";

export function PresetPicker() {
  const addVehicle = useMetaStore((state) => state.addVehicle);
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const groups = new Map<string, { key: PresetType; label: string }[]>();

    for (const [key, config] of Object.entries(presetConfigs)) {
      const category = config.category;
      groups.set(category, [...(groups.get(category) ?? []), { key: key as PresetType, label: config.label }]);
    }

    return groups;
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;

    const query = search.toLowerCase();
    const filtered = new Map<string, { key: PresetType; label: string }[]>();

    for (const [category, items] of categories) {
      const matches = items.filter(({ key, label }) => {
        const preset = presetConfigs[key];
        return label.toLowerCase().includes(query) || category.toLowerCase().includes(query) || preset.description.toLowerCase().includes(query);
      });

      if (matches.length) filtered.set(category, matches);
    }

    return filtered;
  }, [categories, search]);

  const handleCreate = () => {
    if (!selectedPreset || !name.trim()) return;
    addVehicle(createVehicleFromPreset(name.trim(), selectedPreset));
    setName("");
    setSelectedPreset(null);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs">
          <Car className="size-3.5" />
          Presets
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-3 border-border/80 bg-popover p-4 shadow-sm" align="start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="panel-label">Preset library</p>
            {selectedPreset ? <Badge variant="default">{presetConfigs[selectedPreset].label}</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">Create a new vehicle from the current template catalog.</p>
        </div>

        <Input placeholder="Search presets" value={search} onChange={(event) => setSearch(event.target.value)} />

        <ScrollArea className="h-72 rounded-lg border border-border/70 bg-background/30 p-2">
          <div className="space-y-3 pr-2">
            {[...filteredCategories.entries()].map(([category, items]) => (
              <div key={category} className="space-y-2">
                <p className="panel-label">{category}</p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(({ key, label }) => (
                    <Button
                      key={key}
                      type="button"
                      variant={selectedPreset === key ? "default" : "outline"}
                      className="h-auto justify-start px-3 py-2 text-left text-xs"
                      onClick={() => setSelectedPreset(key)}
                    >
                      <span className="truncate">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {!filteredCategories.size ? <p className="py-8 text-center text-sm text-muted-foreground">No presets match “{search}”.</p> : null}
          </div>
        </ScrollArea>

        {selectedPreset ? <p className="text-xs text-muted-foreground">{presetConfigs[selectedPreset].description}</p> : null}

        <Input
          placeholder="Vehicle name or hash"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleCreate();
          }}
        />

        <Button className="w-full" onClick={handleCreate} disabled={!selectedPreset || !name.trim()}>
          Create vehicle
        </Button>
      </PopoverContent>
    </Popover>
  );
}
