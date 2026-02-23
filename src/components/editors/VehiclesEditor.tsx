import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMetaStore } from "@/store/meta-store";
import { SliderField } from "@/components/SliderField";
import { SquareToggle } from "@/components/SquareToggle";
import {
  vehiclesFields,
  vehicleFlags,
  vehicleFlagCategories,
  vehicleTypes,
  vehicleClasses,
  layoutOptions,
  plateTypes,
  dashboardTypes,
  wheelTypes,
} from "@/lib/dictionary";
import { defaultVehicles } from "@/lib/presets";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Info,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import type { FieldInfo } from "@/lib/dictionary";
import type { VehiclesData } from "@/store/meta-store";
import { cn } from "@/lib/utils";

// ─── Default values for dirty-check ────────────────────────────────────────
const DEFAULT_VEHICLES: VehiclesData = JSON.parse(JSON.stringify(defaultVehicles)) as VehiclesData;

// ─── Fields grouped by section ─────────────────────────────────────────────
const IDENTITY_FIELDS: (keyof VehiclesData)[] = ["modelName", "txdName", "handlingId", "gameName", "vehicleMakeName"];
const VISUALS_FIELDS: (keyof VehiclesData)[] = ["lodDistances", "diffuseTint", "dirtLevelMin", "dirtLevelMax"];
const INTERACTION_FIELDS: (keyof VehiclesData)[] = ["layout", "driverSourceExtension"];
const AUDIO_FIELDS: (keyof VehiclesData)[] = ["audioNameHash"];
const TYPE_FIELDS: (keyof VehiclesData)[] = ["type", "vehicleClass"];
const ADVANCED_FIELDS: (keyof VehiclesData)[] = [
  "cameraName",
  "plateType",
  "dashboardType",
  "wheelType",
  "wheelScale",
  "wheelScaleRear",
  "envEffScaleMin",
  "envEffScaleMax",
  "HDTextureDist",
  "defaultBodyHealth",
];

const SECTION_FIELDS: Record<string, (keyof VehiclesData)[]> = {
  identity: IDENTITY_FIELDS,
  visuals: VISUALS_FIELDS,
  interaction: INTERACTION_FIELDS,
  audio: AUDIO_FIELDS,
  type: TYPE_FIELDS,
  advanced: ADVANCED_FIELDS,
};

const ALL_VEHICLES_SECTIONS = ["identity", "visuals", "interaction", "audio", "type", "advanced", "flags"];

const EDITABLE_FIELDS: (keyof VehiclesData)[] = [
  ...IDENTITY_FIELDS,
  ...VISUALS_FIELDS,
  ...INTERACTION_FIELDS,
  ...AUDIO_FIELDS,
  ...TYPE_FIELDS,
  ...ADVANCED_FIELDS,
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function isFieldModified(key: keyof VehiclesData, value: VehiclesData[keyof VehiclesData]): boolean {
  const def = DEFAULT_VEHICLES[key];
  if (Array.isArray(value) && Array.isArray(def)) {
    return JSON.stringify(value) !== JSON.stringify(def);
  }
  if (typeof value === "object" && value !== null && typeof def === "object" && def !== null) {
    return JSON.stringify(value) !== JSON.stringify(def);
  }
  return value !== def;
}

function countSectionChanges(d: VehiclesData, fields: (keyof VehiclesData)[]): number {
  return fields.filter((f) => isFieldModified(f, d[f])).length;
}

function countTotalChanges(d: VehiclesData): number {
  const fieldChanges = EDITABLE_FIELDS.filter((f) => isFieldModified(f, d[f])).length;
  const flagsChanged = JSON.stringify(d.flags) !== JSON.stringify(DEFAULT_VEHICLES.flags) ? 1 : 0;
  return fieldChanges + flagsChanged;
}

// ─── useCopyToClipboard ─────────────────────────────────────────────────────
function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }, []);
  return { copy, copiedKey };
}

// ─── CopyButton ────────────────────────────────────────────────────────────
function CopyButton({ text, copyKey, copiedKey, onCopy }: {
  text: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const isCopied = copiedKey === copyKey;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy(text, copyKey); }}
            className={cn(
              "flex items-center justify-center h-5 w-5 rounded transition-all duration-200",
              isCopied
                ? "text-green-500"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isCopied ? (
                <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Check className="h-3 w-3" />
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Copy className="h-3 w-3" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {isCopied ? "Copied!" : `Copy ${text}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── ModifiedDot ────────────────────────────────────────────────────────────
function ModifiedDot({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
          title="Modified from default"
        />
      )}
    </AnimatePresence>
  );
}

// ─── FieldLabel ─────────────────────────────────────────────────────────────
function FieldLabel({ field, modified }: { field: FieldInfo; modified?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 min-w-[180px] shrink-0">
      <ModifiedDot show={!!modified} />
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "text-xs cursor-help transition-colors",
              modified ? "text-foreground font-medium" : "text-muted-foreground font-normal"
            )}>
              {field.name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{field.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground/40 hover:text-primary transition-colors"
          >
            <Info className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-72 text-xs space-y-2">
          <p className="font-medium text-foreground">{field.name}</p>
          <p className="text-muted-foreground">{field.description}</p>
          {field.example && (
            <p className="text-muted-foreground italic">
              Example: {field.example}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── SectionChangeBadge ─────────────────────────────────────────────────────
function SectionChangeBadge({ count, onReset }: { count: number; onReset: () => void }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1 ml-auto mr-1" onClick={(e) => e.stopPropagation()}>
      <span className="text-[10px] tabular-nums font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
        {count} changed
      </span>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onReset}
              className="text-muted-foreground/50 hover:text-red-400 transition-colors p-0.5 rounded"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Reset section to defaults</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ─── IdentityHeaderCard ──────────────────────────────────────────────────────
function IdentityHeaderCard({ d, onCopy, copiedKey }: {
  d: VehiclesData;
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
}) {
  const typeLabel = d.type.replace("VEHICLE_TYPE_", "");
  const classLabel = d.vehicleClass.replace("VC_", "");

  return (
    <div className="rounded-lg border bg-card/60 p-3 mb-3 space-y-2.5">
      {/* Primary identity row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-base font-semibold tracking-tight truncate leading-none">
              {d.gameName || d.modelName || "Unnamed"}
            </p>
            <CopyButton text={d.gameName || d.modelName} copyKey="gameName" copiedKey={copiedKey} onCopy={onCopy} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {d.vehicleMakeName ? `${d.vehicleMakeName} · ` : ""}
            <span className="font-mono">{d.modelName}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-medium border rounded px-1.5 py-0.5 text-muted-foreground bg-muted/40">
            {typeLabel}
          </span>
          <span className="text-[10px] font-medium border rounded px-1.5 py-0.5 text-muted-foreground bg-muted/40">
            {classLabel}
          </span>
        </div>
      </div>

      {/* ID chips row */}
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-1 text-[10px] font-mono bg-muted/50 border border-border/60 rounded px-2 py-1 cursor-pointer hover:bg-muted/80 transition-colors group"
                onClick={() => onCopy(d.handlingId, "handlingId")}
              >
                <span className="text-muted-foreground">HANDLING</span>
                <span className="font-medium text-foreground">{d.handlingId}</span>
                <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                  {copiedKey === "handlingId" ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Click to copy Handling ID</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-1 text-[10px] font-mono bg-muted/50 border border-border/60 rounded px-2 py-1 cursor-pointer hover:bg-muted/80 transition-colors group"
                onClick={() => onCopy(d.audioNameHash, "audioNameHash")}
              >
                <span className="text-muted-foreground">AUDIO</span>
                <span className="font-medium text-foreground">{d.audioNameHash}</span>
                <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                  {copiedKey === "audioNameHash" ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Click to copy Audio Hash</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {d.flags.length > 0 && (
          <span className="text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
            {d.flags.length} flag{d.flags.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── UnsavedBar ──────────────────────────────────────────────────────────────
function UnsavedBar({ count, onDiscard }: { count: number; onDiscard: () => void }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 text-[11px] border border-amber-400/20 bg-amber-400/5 rounded-md px-3 py-1.5 mb-2"
        >
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
          <span className="text-amber-400 font-medium">{count} unsaved change{count !== 1 ? "s" : ""}</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onDiscard}
            className="text-muted-foreground hover:text-red-400 transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-red-400/10"
          >
            Discard
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── LodDistancesEditor ───────────────────────────────────────────────────────
function LodDistancesEditor({ value, onChange, modified }: {
  value: string;
  onChange: (v: string) => void;
  modified: boolean;
}) {
  const chips = value.trim().split(/\s+/).filter(Boolean);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const LOD_LABELS = ["High", "Med", "Low", "V.Low", "Culled"];

  const updateChip = (index: number, newVal: string) => {
    const updated = [...chips];
    updated[index] = newVal;
    onChange(updated.join(" "));
  };

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex items-center gap-1.5 min-w-[180px] shrink-0">
        <ModifiedDot show={modified} />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-xs cursor-help", modified ? "text-foreground font-medium" : "text-muted-foreground")}>
                LOD Distances
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Distance thresholds (meters) at which the model switches to lower-detail LOD levels.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-1 flex-wrap flex-1">
        {chips.map((chip, i) => (
          <TooltipProvider key={i} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  {editingIndex === i ? (
                    <input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        if (editValue.trim()) updateChip(i, parseFloat(editValue).toString());
                        setEditingIndex(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          if (editValue.trim()) updateChip(i, parseFloat(editValue).toString());
                          setEditingIndex(null);
                        }
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                      className="w-14 h-6 text-[11px] text-center font-mono bg-input border border-primary rounded px-1 outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingIndex(i); setEditValue(chip); }}
                      className="flex flex-col items-center h-auto py-0.5 px-2 bg-muted/50 hover:bg-muted border border-border/60 rounded text-center transition-colors group"
                    >
                      <span className="text-[9px] text-muted-foreground/60">{LOD_LABELS[i] ?? `L${i}`}</span>
                      <span className="text-[11px] font-mono font-medium leading-tight">{chip}</span>
                    </button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {LOD_LABELS[i] ?? `LOD ${i}`} detail — click to edit
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

// ─── DiffuseTintEditor ────────────────────────────────────────────────────────
const ARGB_PATTERN = /^0x[0-9A-Fa-f]{8}$/;

function DiffuseTintEditor({ value, onChange, modified }: {
  value: string;
  onChange: (v: string) => void;
  modified: boolean;
}) {
  const isValid = ARGB_PATTERN.test(value);

  // Convert ARGB hex (0xAARRGGBB) to CSS hex color (#RRGGBB) for the color picker
  const toPickerColor = (argb: string): string => {
    const hex = argb.replace("0x", "");
    if (hex.length !== 8) return "#ffffff";
    return `#${hex.slice(2)}`;
  };

  const fromPickerColor = (color: string, currentArgb: string): string => {
    const hex = color.replace("#", "");
    const currentHex = currentArgb.replace("0x", "");
    const alpha = currentHex.length === 8 ? currentHex.slice(0, 2) : "00";
    return `0x${alpha}${hex.toUpperCase()}`;
  };

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex items-center gap-1.5 min-w-[180px] shrink-0">
        <ModifiedDot show={modified} />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-xs cursor-help", modified ? "text-foreground font-medium" : "text-muted-foreground")}>
                Diffuse Tint
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              ARGB color tint applied to the vehicle diffuse texture. Format: 0xAARRGGBB
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="text-muted-foreground/40 hover:text-primary transition-colors">
              <Info className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" className="w-64 text-xs space-y-1.5">
            <p className="font-medium text-foreground">Diffuse Tint</p>
            <p className="text-muted-foreground">ARGB color tint applied to the vehicle diffuse texture.</p>
            <p className="text-muted-foreground italic">Format: 0xAARRGGBB (e.g. 0x00FFFFFF = no tint)</p>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-2 flex-1">
        {/* Swatch + color picker */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="cursor-pointer relative shrink-0">
                <div
                  className="h-7 w-7 rounded border border-border/80 overflow-hidden"
                  style={{ backgroundColor: isValid ? toPickerColor(value) : "#888" }}
                />
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={isValid ? toPickerColor(value) : "#ffffff"}
                  onChange={(e) => onChange(fromPickerColor(e.target.value, value))}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Open color picker</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "h-7 text-xs font-mono flex-1",
              !isValid && value !== "" && "border-red-500/60 focus-visible:ring-red-500/50"
            )}
            placeholder="0xAARRGGBB"
          />
          {!isValid && value !== "" && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs text-red-400">
                  Must be format 0xAARRGGBB (e.g. 0x00FFFFFF)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {!isValid && value !== "" && (
          <p className="text-[10px] text-red-400 leading-tight">Invalid ARGB</p>
        )}
      </div>
    </div>
  );
}

// ─── FlagsSection ─────────────────────────────────────────────────────────────
function FlagsSection({ flags, onToggle }: {
  flags: string[];
  onToggle: (flag: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return vehicleFlags.filter((f) => {
      if (showActiveOnly && !flags.includes(f.value)) return false;
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.value.toLowerCase().includes(q)
      );
    });
  }, [search, showActiveOnly, flags]);

  const filteredByCategory = useMemo(() => {
    return vehicleFlagCategories.map((cat) => ({
      cat,
      flags: filtered.filter((f) => f.category === cat),
    }));
  }, [filtered]);

  const totalActive = flags.length;
  const hasSearch = search.length > 0 || showActiveOnly;

  return (
    <div className="space-y-2 pb-1">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flags…"
            className="h-7 text-xs pl-6 pr-2"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={cn(
                  "flex items-center gap-1 h-7 px-2 rounded border text-[10px] font-medium transition-all duration-200 shrink-0",
                  showActiveOnly
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {showActiveOnly ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {totalActive} active
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {showActiveOnly ? "Show all flags" : "Show active flags only"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Category groups */}
      {filteredByCategory.map(({ cat, flags: catFlags }) => {
        if (catFlags.length === 0) return null;
        const catActiveCount = catFlags.filter((f) => flags.includes(f.value)).length;
        const isCollapsed = collapsedCategories.has(cat) && !hasSearch;

        return (
          <div key={cat} className="rounded-md border border-border/50 overflow-hidden">
            {/* Category header */}
            <button
              type="button"
              onClick={() => { if (!hasSearch) toggleCategory(cat); }}
              className={cn(
                "w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors",
                "bg-muted/30 hover:bg-muted/50",
                hasSearch && "cursor-default"
              )}
            >
              {!hasSearch && (
                isCollapsed
                  ? <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  : <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
                {cat}
              </span>
              {catActiveCount > 0 && (
                <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                  {catActiveCount} on
                </span>
              )}
            </button>

            {/* Flags list */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="divide-y divide-border/30">
                    {catFlags.map((flag) => {
                      const isActive = flags.includes(flag.value);
                      return (
                        <div
                          key={flag.value}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 cursor-pointer transition-colors",
                            isActive ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/40"
                          )}
                          onClick={() => onToggle(flag.value)}
                        >
                          <SquareToggle
                            checked={isActive}
                            onCheckedChange={() => onToggle(flag.value)}
                            label=""
                          />
                          <div className="min-w-0 flex-1">
                            <span className={cn("text-xs", isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                              {flag.label}
                            </span>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-[10px] text-muted-foreground leading-tight truncate cursor-help">
                                    {flag.description}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs text-xs">
                                  {flag.description}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {isActive && (
                            <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0 hidden lg:block">
                              {flag.value}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No flags match &ldquo;{search}&rdquo;
          {showActiveOnly && " (active only)"}
        </div>
      )}
    </div>
  );
}

// ─── SectionHeader wrapper ────────────────────────────────────────────────────
function SectionTrigger({ title, changeCount, onReset }: {
  title: string;
  changeCount: number;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center w-full pr-1 gap-2">
      <span className="text-sm font-semibold">{title}</span>
      <SectionChangeBadge count={changeCount} onReset={onReset} />
    </div>
  );
}

// ─── InputRow helper ──────────────────────────────────────────────────────────
function InputRow({ field, value, onChange, modified, type = "text", upperCase }: {
  field: FieldInfo;
  value: string;
  onChange: (v: string) => void;
  modified: boolean;
  type?: string;
  upperCase?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-1.5 px-1 rounded transition-colors",
      modified && "bg-amber-400/3"
    )}>
      <FieldLabel field={field} modified={modified} />
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(upperCase ? e.target.value.toUpperCase() : e.target.value)}
        className={cn(
          "h-7 text-xs font-mono flex-1 transition-colors",
          upperCase && "uppercase",
          modified && "border-amber-400/30 focus-visible:ring-amber-400/30"
        )}
      />
    </div>
  );
}

// ─── SelectRow helper ─────────────────────────────────────────────────────────
function SelectRow({ field, value, onChange, options, modified }: {
  field: FieldInfo;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  modified: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-1.5 px-1 rounded transition-colors",
      modified && "bg-amber-400/3"
    )}>
      <FieldLabel field={field} modified={modified} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(
          "h-7 text-xs flex-1 transition-colors",
          modified && "border-amber-400/30"
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export function VehiclesEditor() {
  const activeId = useMetaStore((s) => s.activeVehicleId);
  const vehicle = useMetaStore((s) =>
    s.activeVehicleId ? s.vehicles[s.activeVehicleId] : null
  );
  const updateVehicles = useMetaStore((s) => s.updateVehicles);
  const [openSections, setOpenSections] = useState<string[]>(ALL_VEHICLES_SECTIONS);
  const { copy, copiedKey } = useCopyToClipboard();

  const update = useCallback((data: Partial<VehiclesData>) => {
    if (!activeId) return;
    updateVehicles(activeId, data);
  }, [updateVehicles, activeId]);

  const toggleFlag = useCallback((flag: string) => {
    const currentFlags = vehicle?.vehicles.flags ?? [];
    const flags = currentFlags.includes(flag)
      ? currentFlags.filter((f) => f !== flag)
      : [...currentFlags, flag];
    update({ flags });
  }, [vehicle?.vehicles.flags, update]);

  const resetSection = useCallback((fields: (keyof VehiclesData)[]) => {
    const partial: Partial<VehiclesData> = {};
    for (const f of fields) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (partial as any)[f] = DEFAULT_VEHICLES[f];
    }
    update(partial);
  }, [update]);

  const discardAll = useCallback(() => {
    update({ ...DEFAULT_VEHICLES });
  }, [update]);

  if (!vehicle || !activeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select or create a vehicle to edit vehicles.meta
      </div>
    );
  }

  const d = vehicle.vehicles;
  const totalChanges = countTotalChanges(d);

  // Per-field modified checks
  const mod = (key: keyof VehiclesData) => isFieldModified(key, d[key]);

  // Section change counts
  const sectionChanges = (sectionId: string) =>
    sectionId === "flags"
      ? (d.flags.length !== DEFAULT_VEHICLES.flags.length || JSON.stringify(d.flags) !== JSON.stringify(DEFAULT_VEHICLES.flags) ? 1 : 0)
      : countSectionChanges(d, SECTION_FIELDS[sectionId] ?? []);

  return (
    <motion.div
      className="space-y-1 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Identity summary header card */}
      <IdentityHeaderCard d={d} onCopy={copy} copiedKey={copiedKey} />

      {/* Unsaved changes banner */}
      <UnsavedBar count={totalChanges} onDiscard={discardAll} />

      {/* Collapse/expand all */}
      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          onClick={() => setOpenSections(openSections.length > 0 ? [] : ALL_VEHICLES_SECTIONS)}
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
        {/* ── Identification & Links ── */}
        <AccordionItem value="identity" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 hover:no-underline">
            <SectionTrigger
              title="Identification & Links"
              changeCount={sectionChanges("identity")}
              onReset={() => resetSection(IDENTITY_FIELDS)}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-0.5">
            <InputRow field={vehiclesFields.modelName} value={d.modelName} onChange={(v) => update({ modelName: v })} modified={mod("modelName")} />
            <InputRow field={vehiclesFields.txdName} value={d.txdName} onChange={(v) => update({ txdName: v })} modified={mod("txdName")} />
            <InputRow field={vehiclesFields.handlingId} value={d.handlingId} onChange={(v) => update({ handlingId: v.toUpperCase() })} modified={mod("handlingId")} upperCase />
            <InputRow field={vehiclesFields.gameName} value={d.gameName} onChange={(v) => update({ gameName: v.toUpperCase() })} modified={mod("gameName")} upperCase />
            <InputRow field={vehiclesFields.vehicleMakeName} value={d.vehicleMakeName} onChange={(v) => update({ vehicleMakeName: v.toUpperCase() })} modified={mod("vehicleMakeName")} upperCase />
          </AccordionContent>
        </AccordionItem>

        {/* ── Visuals & Rendering ── */}
        <AccordionItem value="visuals" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 hover:no-underline">
            <SectionTrigger
              title="Visuals & Rendering"
              changeCount={sectionChanges("visuals")}
              onReset={() => resetSection(VISUALS_FIELDS)}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-0.5">
            <LodDistancesEditor
              value={d.lodDistances}
              onChange={(v) => update({ lodDistances: v })}
              modified={mod("lodDistances")}
            />
            <DiffuseTintEditor
              value={d.diffuseTint}
              onChange={(v) => update({ diffuseTint: v })}
              modified={mod("diffuseTint")}
            />
            <div className={cn("rounded transition-colors", mod("dirtLevelMin") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.dirtLevelMin}
                value={d.dirtLevelMin}
                onChange={(v) => update({ dirtLevelMin: v })}
                min={0}
                max={1}
                step={0.01}
              />
              {mod("dirtLevelMin") && (
                <div className="flex justify-between text-[9px] text-muted-foreground/60 px-[186px] -mt-0.5 pb-1">
                  <span>0 = spotless</span>
                  <span>1 = caked in mud</span>
                </div>
              )}
            </div>
            <div className={cn("rounded transition-colors", mod("dirtLevelMax") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.dirtLevelMax}
                value={d.dirtLevelMax}
                onChange={(v) => update({ dirtLevelMax: v })}
                min={0}
                max={1}
                step={0.01}
              />
              {mod("dirtLevelMax") && (
                <div className="flex justify-between text-[9px] text-muted-foreground/60 px-[186px] -mt-0.5 pb-1">
                  <span>0 = stays clean</span>
                  <span>1 = fully filthy</span>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Character Interaction ── */}
        <AccordionItem value="interaction" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 hover:no-underline">
            <SectionTrigger
              title="Character Interaction"
              changeCount={sectionChanges("interaction")}
              onReset={() => resetSection(INTERACTION_FIELDS)}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-0.5">
            <SelectRow field={vehiclesFields.layout} value={d.layout} onChange={(v) => update({ layout: v })} options={layoutOptions} modified={mod("layout")} />
            <InputRow field={vehiclesFields.driverSourceExtension} value={d.driverSourceExtension} onChange={(v) => update({ driverSourceExtension: v })} modified={mod("driverSourceExtension")} />
          </AccordionContent>
        </AccordionItem>

        {/* ── Audio & Effects ── */}
        <AccordionItem value="audio" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 hover:no-underline">
            <SectionTrigger
              title="Audio & Effects"
              changeCount={sectionChanges("audio")}
              onReset={() => resetSection(AUDIO_FIELDS)}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-0.5">
            <InputRow field={vehiclesFields.audioNameHash} value={d.audioNameHash} onChange={(v) => update({ audioNameHash: v.toUpperCase() })} modified={mod("audioNameHash")} upperCase />
          </AccordionContent>
        </AccordionItem>

        {/* ── Type & Class ── */}
        <AccordionItem value="type" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 hover:no-underline">
            <SectionTrigger
              title="Type & Class"
              changeCount={sectionChanges("type")}
              onReset={() => resetSection(TYPE_FIELDS)}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-0.5">
            <SelectRow field={vehiclesFields.type} value={d.type} onChange={(v) => update({ type: v })} options={vehicleTypes} modified={mod("type")} />
            <SelectRow field={vehiclesFields.vehicleClass} value={d.vehicleClass} onChange={(v) => update({ vehicleClass: v })} options={vehicleClasses} modified={mod("vehicleClass")} />
          </AccordionContent>
        </AccordionItem>


        {/* ── Advanced vehicles.meta ── */}
        <AccordionItem value="advanced" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 hover:no-underline">
            <SectionTrigger
              title="Advanced / vehicles.meta"
              changeCount={sectionChanges("advanced")}
              onReset={() => resetSection(ADVANCED_FIELDS)}
            />
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-0.5">
            <InputRow
              field={vehiclesFields.cameraName}
              value={d.cameraName}
              onChange={(v) => update({ cameraName: v })}
              modified={mod("cameraName")}
            />
            <SelectRow
              field={vehiclesFields.plateType}
              value={d.plateType}
              onChange={(v) => update({ plateType: v })}
              options={plateTypes}
              modified={mod("plateType")}
            />
            <SelectRow
              field={vehiclesFields.dashboardType}
              value={d.dashboardType}
              onChange={(v) => update({ dashboardType: v })}
              options={dashboardTypes}
              modified={mod("dashboardType")}
            />
            <SelectRow
              field={vehiclesFields.wheelType}
              value={d.wheelType}
              onChange={(v) => update({ wheelType: v })}
              options={wheelTypes}
              modified={mod("wheelType")}
            />
            <div className={cn("rounded transition-colors", mod("wheelScale") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.wheelScale}
                value={d.wheelScale}
                onChange={(v) => update({ wheelScale: v })}
                min={0.5}
                max={2}
                step={0.01}
              />
            </div>
            <div className={cn("rounded transition-colors", mod("wheelScaleRear") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.wheelScaleRear}
                value={d.wheelScaleRear}
                onChange={(v) => update({ wheelScaleRear: v })}
                min={0.5}
                max={2}
                step={0.01}
              />
            </div>
            <div className={cn("rounded transition-colors", mod("envEffScaleMin") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.envEffScaleMin}
                value={d.envEffScaleMin}
                onChange={(v) => update({ envEffScaleMin: v })}
                min={0}
                max={2}
                step={0.01}
              />
            </div>
            <div className={cn("rounded transition-colors", mod("envEffScaleMax") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.envEffScaleMax}
                value={d.envEffScaleMax}
                onChange={(v) => update({ envEffScaleMax: v })}
                min={0}
                max={2}
                step={0.01}
              />
            </div>
            <div className={cn("rounded transition-colors", mod("HDTextureDist") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.HDTextureDist}
                value={d.HDTextureDist}
                onChange={(v) => update({ HDTextureDist: v })}
                min={0}
                max={500}
                step={1}
              />
            </div>
            <div className={cn("rounded transition-colors", mod("defaultBodyHealth") && "bg-amber-400/3")}>
              <SliderField
                field={vehiclesFields.defaultBodyHealth}
                value={d.defaultBodyHealth}
                onChange={(v) => update({ defaultBodyHealth: v })}
                min={100}
                max={2000}
                step={10}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
        {/* ── Flags ── */}
        <AccordionItem value="flags" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 hover:no-underline">
            <div className="flex items-center w-full pr-1 gap-2">
              <span className="text-sm font-semibold">Flags</span>
              {d.flags.length > 0 && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 ml-0.5">
                  {d.flags.length} active
                </span>
              )}
              {d.flags.length > 0 && (
                <div className="ml-auto mr-1" onClick={(e) => e.stopPropagation()}>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => update({ flags: [] })}
                          className="text-muted-foreground/50 hover:text-red-400 transition-colors p-0.5 rounded"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Clear all flags</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <FlagsSection flags={d.flags} onToggle={toggleFlag} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </motion.div>
  );
}
