import { useState, useMemo, memo, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sectionPresetConfigs,
  type SectionId,
  type SectionPreset,
} from "@/lib/section-presets";

interface SectionPresetPickerProps {
  sectionId: SectionId;
  onApply: (preset: SectionPreset) => void;
  currentValues?: Record<string, number>;
}

export const SectionPresetPicker = memo(function SectionPresetPicker({
  sectionId,
  onApply,
  currentValues,
}: SectionPresetPickerProps) {
  const [open, setOpen] = useState(false);

  const config = sectionPresetConfigs[sectionId];
  const presets = config.presets;

  const activePreset = useMemo(() => {
    if (!currentValues) return null;
    for (const preset of presets) {
      const values = preset.values as Record<string, number>;
      const keys = Object.keys(values);
      const matches = keys.every(
        (k) =>
          currentValues[k] !== undefined &&
          Math.abs(currentValues[k] - values[k]) < 0.01
      );
      if (matches) return preset;
    }
    return null;
  }, [currentValues, presets]);

  const handleApply = useCallback(
    (preset: SectionPreset) => {
      onApply(preset);
      setOpen(false);
    },
    [onApply]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center gap-1.5 h-6 px-2 rounded text-[10px] font-medium transition-colors cursor-pointer",
            "border border-slate-700/50 bg-white/[0.02] hover:bg-white/[0.05]",
            "text-slate-500 hover:text-slate-300",
            activePreset && "text-slate-400"
          )}
        >
          <Layers className="size-3 text-slate-500" />
          <span className="truncate max-w-[72px]">
            {activePreset ? activePreset.label : "Preset"}
          </span>
          <ChevronDown
            className={cn(
              "size-2.5 text-slate-500 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-60 p-0 border-slate-700/60 bg-[#0c0f14] shadow-xl"
        align="end"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-700/30">
          <div className="text-[11px] font-semibold text-slate-300 tracking-tight">
            {config.title}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">
            {presets.length} presets available
          </div>
        </div>

        {/* Preset list */}
        <div className="py-1 max-h-60 overflow-y-auto">
          {presets.map((preset) => {
            const isActive = activePreset?.id === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApply(preset)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2",
                  isActive
                    ? "bg-white/[0.05] text-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                )}
              >
                <div className="w-4 shrink-0 flex justify-center">
                  {isActive && <Check className="size-3 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-[11px]", isActive && "text-slate-200")}>
                    {preset.label}
                  </div>
                  <div className="text-[9px] text-slate-600 truncate mt-0.5">
                    {preset.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});
