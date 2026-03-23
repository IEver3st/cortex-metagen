import { memo, useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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

    return presets.find((preset) => {
      const values = preset.values as Record<string, number>;
      return Object.entries(values).every(([key, presetValue]) => currentValues[key] !== undefined && Math.abs(currentValues[key] - presetValue) < 0.01);
    }) ?? null;
  }, [currentValues, presets]);

  const handleApply = useCallback(
    (preset: SectionPreset) => {
      onApply(preset);
      setOpen(false);
    },
    [onApply],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="h-7 gap-1.5" onClick={(event) => event.stopPropagation()}>
          <Layers className="size-3" />
          <span className="max-w-24 truncate">{activePreset ? activePreset.label : "Preset"}</span>
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 space-y-3 border-border/80 bg-popover p-0 shadow-sm" align="end" sideOffset={6} onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="panel-label">{config.title}</p>
            {activePreset ? <Badge variant="default">Active</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{presets.length} presets available for this section.</p>
        </div>

        <ScrollArea className="h-64 px-2 pb-2">
          <div className="space-y-2 pr-2">
            {presets.map((preset) => {
              const isActive = activePreset?.id === preset.id;

              return (
                <Button
                  key={preset.id}
                  type="button"
                  variant={isActive ? "default" : "ghost"}
                  className="flex h-auto w-full items-start justify-start gap-3 px-3 py-3 text-left"
                  onClick={() => handleApply(preset)}
                >
                  <div className="mt-0.5 flex w-4 justify-center">{isActive ? <Check className="size-3" /> : null}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className={cn("truncate text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{preset.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});
