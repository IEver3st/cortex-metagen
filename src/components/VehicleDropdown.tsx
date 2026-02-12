import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Copy, Trash2 } from "lucide-react";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import { createDefaultVehicle, createVehicleFromPreset, presetConfigs, type PresetType } from "@/lib/presets";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type CreateMode = "blank" | "preset" | "copy";

export function VehicleDropdown({ hideSelector = false }: { hideSelector?: boolean }) {
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeVehicleId = useMetaStore((s) => s.activeVehicleId);
  const setActiveVehicle = useMetaStore((s) => s.setActiveVehicle);
  const addVehicle = useMetaStore((s) => s.addVehicle);
  const removeVehicle = useMetaStore((s) => s.removeVehicle);
  const cloneVehicle = useMetaStore((s) => s.cloneVehicle);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>("blank");
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>(null);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState("");

  const vehicleList = Object.values(vehicles);
  const activeVehicle = activeVehicleId ? vehicles[activeVehicleId] : null;

  const filteredPresets = useMemo(() => {
    const q = presetSearch.toLowerCase();
    return (Object.entries(presetConfigs) as [PresetType, typeof presetConfigs[PresetType]][]).filter(
      ([, cfg]) => !q || cfg.label.toLowerCase().includes(q) || cfg.category.toLowerCase().includes(q)
    );
  }, [presetSearch]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const name = newName.trim();

    if (createMode === "preset" && selectedPreset) {
      const entry = createVehicleFromPreset(name, selectedPreset);
      addVehicle(entry);
    } else if (createMode === "copy" && copySourceId) {
      cloneVehicle(copySourceId, name);
    } else {
      const allTypes = new Set<MetaFileType>(["handling", "vehicles", "carcols", "carvariations"]);
      const entry = createDefaultVehicle(name, allTypes);
      addVehicle(entry);
    }

    setNewName("");
    setSelectedPreset(null);
    setCopySourceId(null);
    setPresetSearch("");
    setAddOpen(false);
  };

  const handleDelete = () => {
    if (!activeVehicleId) return;
    removeVehicle(activeVehicleId);
    setDeleteOpen(false);
  };

  const canCreate =
    newName.trim().length > 0 &&
    (createMode === "blank" ||
      (createMode === "preset" && selectedPreset !== null) ||
      (createMode === "copy" && copySourceId !== null));

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
      {!hideSelector && (
        <Select value={activeVehicleId ?? ""} onValueChange={setActiveVehicle}>
          <SelectTrigger className="w-[200px] h-8 text-sm border-none bg-transparent shadow-none">
            <SelectValue placeholder="Select vehicle..." />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="max-h-60">
            {vehicleList.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} — {v.vehicles.vehicleClass.replace("VC_", "")}
              </SelectItem>
            ))}
            {vehicleList.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No vehicles — add one to get started
              </div>
            )}
          </SelectContent>
        </Select>
      )}

      {/* Add Vehicle */}
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add vehicle</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-80 p-3 space-y-2.5" align="start">
          <p className="text-xs font-medium">New Vehicle</p>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Vehicle Name / Hash</Label>
            <Input
              placeholder="e.g. police4, adder, mycar..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canCreate && handleCreate()}
              className="h-7 text-xs font-mono"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["blank", "preset", "copy"] as CreateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCreateMode(mode)}
                  className={`text-[11px] py-1 px-2 rounded border transition-colors ${
                    createMode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  {mode === "blank" ? "Blank" : mode === "preset" ? "Preset" : "Copy"}
                </button>
              ))}
            </div>
          </div>

          {createMode === "preset" && (
            <div className="space-y-1">
              <Input
                placeholder="Search presets..."
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                className="h-6 text-[11px]"
              />
              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                {filteredPresets.map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPreset(key)}
                    className={`w-full text-left p-1.5 rounded text-[11px] transition-colors ${
                      selectedPreset === key
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="font-medium">{cfg.label}</span>
                    <span className="text-muted-foreground ml-1.5">({cfg.category})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {createMode === "copy" && (
            <div className="space-y-1">
              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                {vehicleList.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-2">No vehicles loaded to copy from</p>
                ) : (
                  vehicleList.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setCopySourceId(v.id)}
                      className={`w-full text-left p-1.5 rounded text-[11px] transition-colors ${
                        copySourceId === v.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{v.name}</span>
                      <span className="text-muted-foreground ml-1.5">
                        ({v.vehicles.vehicleClass.replace("VC_", "")})
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleCreate}
            disabled={!canCreate}
          >
            Create Vehicle
          </Button>
        </PopoverContent>
      </Popover>

      {/* Delete Vehicle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-destructive hover:text-destructive"
              disabled={!activeVehicle}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Delete vehicle</TooltipContent>
      </Tooltip>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Vehicle"
        description={`Are you sure you want to delete "${activeVehicle?.name ?? ""}"? This will permanently remove all handling, vehicles, carcols, and carvariations data for this vehicle. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="No Thanks"
        variant="destructive"
        onConfirm={handleDelete}
      />
      </div>
    </TooltipProvider>
  );
}
