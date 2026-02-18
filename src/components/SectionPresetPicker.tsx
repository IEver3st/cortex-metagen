import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Check } from "lucide-react";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<SectionPreset | null>(
    null
  );

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

  const handleSelect = (preset: SectionPreset) => {
    setSelectedId(preset.id);
  };

  const handleApply = () => {
    const preset = presets.find((p) => p.id === selectedId);
    if (preset) {
      onApply(preset);
      setOpen(false);
      setSelectedId(null);
    }
  };

  const displayPreset = hoveredPreset || presets.find((p) => p.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-200
            ${activePreset
              ? "bg-primary/15 text-primary hover:bg-primary/25"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          `}
        >
          <Sparkles className="h-3 w-3" />
          {activePreset ? activePreset.label : "Preset"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b bg-muted/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {config.title} Presets
          </div>
        </div>

        <div className="p-1.5 space-y-0.5 max-h-52 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {presets.map((preset) => {
              const isSelected = selectedId === preset.id;
              const isActive = activePreset?.id === preset.id;

              return (
                <motion.button
                  key={preset.id}
                  type="button"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleSelect(preset)}
                  onMouseEnter={() => setHoveredPreset(preset)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all duration-150
                    ${isSelected
                      ? "bg-primary/15 text-primary"
                      : isActive
                        ? "bg-success/10 text-success hover:bg-success/15"
                        : "hover:bg-muted text-foreground"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{preset.label}</span>
                    {isActive && (
                      <Check className="h-3 w-3 text-success shrink-0" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {displayPreset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t"
            >
              <div className="p-2 bg-muted/20">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {displayPreset.description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-2 border-t bg-muted/20">
          <button
            type="button"
            onClick={handleApply}
            disabled={!selectedId || selectedId === activePreset?.id}
            className={`w-full py-1.5 rounded text-[11px] font-medium transition-all duration-200
              ${selectedId && selectedId !== activePreset?.id
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {selectedId === activePreset?.id ? "Already Applied" : "Apply Preset"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
