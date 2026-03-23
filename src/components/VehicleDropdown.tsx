import { useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createDefaultVehicle, createVehicleFromPreset, presetConfigs, type PresetType } from "@/lib/presets";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";

type CreateMode = "blank" | "preset" | "copy";

export function VehicleDropdown({ hideSelector = false }: { hideSelector?: boolean }) {
  const vehicles = useMetaStore((state) => state.vehicles);
  const activeVehicleId = useMetaStore((state) => state.activeVehicleId);
  const setActiveVehicle = useMetaStore((state) => state.setActiveVehicle);
  const addVehicle = useMetaStore((state) => state.addVehicle);
  const removeVehicle = useMetaStore((state) => state.removeVehicle);
  const cloneVehicle = useMetaStore((state) => state.cloneVehicle);

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
    const query = presetSearch.toLowerCase();
    return (Object.entries(presetConfigs) as [PresetType, typeof presetConfigs[PresetType]][]).filter(([, config]) => {
      if (!query) return true;
      return config.label.toLowerCase().includes(query) || config.category.toLowerCase().includes(query);
    });
  }, [presetSearch]);

  const canCreate =
    newName.trim().length > 0 &&
    (createMode === "blank" ||
      (createMode === "preset" && selectedPreset !== null) ||
      (createMode === "copy" && copySourceId !== null));

  const handleCreate = () => {
    if (!canCreate) return;
    const name = newName.trim();

    if (createMode === "preset" && selectedPreset) {
      addVehicle(createVehicleFromPreset(name, selectedPreset));
    } else if (createMode === "copy" && copySourceId) {
      cloneVehicle(copySourceId, name);
    } else {
      const allTypes = new Set<MetaFileType>(["handling", "vehicles", "carcols", "carvariations"]);
      addVehicle(createDefaultVehicle(name, allTypes));
    }

    setNewName("");
    setSelectedPreset(null);
    setCopySourceId(null);
    setPresetSearch("");
    setAddOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {!hideSelector ? (
        <Select value={activeVehicleId ?? ""} onValueChange={setActiveVehicle}>
          <SelectTrigger className="w-64 border-border/80 bg-background/40">
            <SelectValue placeholder="Select vehicle" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="max-h-80">
            {vehicleList.length ? (
              vehicleList.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} — {vehicle.vehicles.vehicleClass.replace("VC_", "")}
                </SelectItem>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">No vehicles loaded yet.</div>
            )}
          </SelectContent>
        </Select>
      ) : null}

      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Plus className="size-4" />
                Add vehicle
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Create a new vehicle entry</TooltipContent>
        </Tooltip>

        <PopoverContent className="w-[26rem] space-y-4 border-border/80 bg-popover p-4 shadow-sm" align="start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="panel-label">Vehicle manager</p>
              <Badge variant="outline">New entry</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Start blank, from a preset, or from an existing vehicle.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-name">Vehicle name / hash</Label>
            <Input
              id="vehicle-name"
              placeholder="e.g. police4, adder, mycar"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreate();
              }}
              autoFocus
            />
          </div>

          <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as CreateMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="blank">Blank</TabsTrigger>
              <TabsTrigger value="preset">Preset</TabsTrigger>
              <TabsTrigger value="copy">Copy</TabsTrigger>
            </TabsList>
          </Tabs>

          {createMode === "preset" ? (
            <div className="space-y-2">
              <Input placeholder="Search presets" value={presetSearch} onChange={(event) => setPresetSearch(event.target.value)} />
              <ScrollArea className="h-40 rounded-lg border border-border/70 bg-background/30 p-2">
                <div className="space-y-2 pr-2">
                  {filteredPresets.map(([key, config]) => (
                    <Button
                      key={key}
                      type="button"
                      variant={selectedPreset === key ? "default" : "ghost"}
                      className="flex h-auto w-full items-start justify-start gap-3 px-3 py-2 text-left"
                      onClick={() => setSelectedPreset(key)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className={selectedPreset === key ? "text-xs text-primary-foreground/80" : "text-xs text-muted-foreground"}>{config.category}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}

          {createMode === "copy" ? (
            <ScrollArea className="h-40 rounded-lg border border-border/70 bg-background/30 p-2">
              <div className="space-y-2 pr-2">
                {vehicleList.length ? (
                  vehicleList.map((vehicle) => (
                    <Button
                      key={vehicle.id}
                      type="button"
                      variant={copySourceId === vehicle.id ? "default" : "ghost"}
                      className="flex h-auto w-full items-start justify-start gap-3 px-3 py-2 text-left"
                      onClick={() => setCopySourceId(vehicle.id)}
                    >
                      <Copy className="mt-0.5 size-3.5" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{vehicle.name}</p>
                        <p className={copySourceId === vehicle.id ? "text-xs text-primary-foreground/80" : "text-xs text-muted-foreground"}>
                          {vehicle.vehicles.vehicleClass.replace("VC_", "")}
                        </p>
                      </div>
                    </Button>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No vehicles available to copy.</p>
                )}
              </div>
            </ScrollArea>
          ) : null}

          <Button className="w-full" onClick={handleCreate} disabled={!canCreate}>
            Create vehicle
          </Button>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              disabled={!activeVehicle}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Delete selected vehicle</TooltipContent>
      </Tooltip>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete vehicle"
        description={`Are you sure you want to delete “${activeVehicle?.name ?? ""}”? This removes all handling, vehicles, carcols, and carvariations data for the entry.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (!activeVehicleId) return;
          removeVehicle(activeVehicleId);
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
