import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Car } from "lucide-react";
import { useMetaStore } from "@/store/meta-store";
import { createVehicleFromPreset, presetConfigs, type PresetType } from "@/lib/presets";

export function PresetPicker() {
  const addVehicle = useMetaStore((s) => s.addVehicle);
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const map = new Map<string, { key: PresetType; label: string }[]>();
    for (const [key, config] of Object.entries(presetConfigs)) {
      const cat = config.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push({ key: key as PresetType, label: config.label });
    }
    return map;
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    const filtered = new Map<string, { key: PresetType; label: string }[]>();
    for (const [cat, items] of categories) {
      const matched = items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q) ||
          presetConfigs[i.key].description.toLowerCase().includes(q)
      );
      if (matched.length > 0) filtered.set(cat, matched);
    }
    return filtered;
  }, [categories, search]);

  const handleCreate = () => {
    if (!selectedPreset || !name.trim()) return;
    const entry = createVehicleFromPreset(name.trim(), selectedPreset);
    addVehicle(entry);
    setName("");
    setSelectedPreset(null);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border-none bg-transparent shadow-none">
          <Car className="h-3.5 w-3.5" />
          Presets
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-2" align="start">
        <p className="text-xs font-medium">Create from Preset</p>
        <Input
          placeholder="Search presets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs"
        />
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {[...filteredCategories.entries()].map(([cat, items]) => (
            <div key={cat}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 px-0.5">
                {cat}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {items.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPreset(key)}
                    className={`text-left p-1.5 rounded border text-[11px] transition-colors ${
                      selectedPreset === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="font-medium truncate">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredCategories.size === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-2">No presets match "{search}"</p>
          )}
        </div>
        {selectedPreset && (
          <p className="text-[10px] text-muted-foreground border-t pt-2">
            {presetConfigs[selectedPreset].description}
          </p>
        )}
        <Input
          placeholder="Vehicle name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="h-7 text-xs"
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          onClick={handleCreate}
          disabled={!selectedPreset || !name.trim()}
        >
          Create Vehicle
        </Button>
      </PopoverContent>
    </Popover>
  );
}
