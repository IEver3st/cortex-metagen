import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Zap, Check, ChevronRight, Settings2 } from "lucide-react";
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
  const [hoveredPreset, setHoveredPreset] = useState<SectionPreset | null>(null);

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
          className="group relative flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer"
          style={{
            background: activePreset
              ? "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)"
              : "linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)",
            color: activePreset ? "#22c55e" : "#a78bfa",
            boxShadow: open
              ? activePreset
                ? "0 0 0 1px rgba(34, 197, 94, 0.3), 0 4px 12px -2px rgba(34, 197, 94, 0.2)"
                : "0 0 0 1px rgba(139, 92, 246, 0.3), 0 4px 12px -2px rgba(139, 92, 246, 0.25)"
              : "none",
          }}
        >
          {!activePreset && (
            <motion.span
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)",
              }}
              initial={false}
              transition={{ duration: 0.2 }}
            />
          )}
          <motion.div
            className={`relative z-10 flex items-center gap-1.5 ${!activePreset ? "group-hover:gap-2" : ""}`}
            transition={{ duration: 0.2 }}
          >
            {activePreset ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center size-4 rounded-full bg-green-500/20"
              >
                <Check className="size-2.5 text-green-500" />
              </motion.div>
            ) : (
              <Settings2 className="size-3.5" />
            )}
            <span className="relative">
              {activePreset ? activePreset.label : "Quick Tune"}
            </span>
            {!activePreset && (
              <motion.span
                className="text-[8px] opacity-60"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 0.6, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {presets.length}
              </motion.span>
            )}
            <motion.div
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="size-3 opacity-50" />
            </motion.div>
          </motion.div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0 border-0 shadow-2xl"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 15, 0.99) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
        }}
      >
        <div className="relative overflow-hidden rounded-t-xl">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.3), transparent 60%)",
            }}
          />
          <div className="relative p-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-6 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)",
                }}
              >
                <Zap className="size-3.5 text-violet-400" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-white/90">
                  {config.title}
                </div>
                <div className="text-[9px] text-white/40 uppercase tracking-wider">
                  {presets.length} presets available
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-2 space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {presets.map((preset, index) => {
              const isSelected = selectedId === preset.id;
              const isActive = activePreset?.id === preset.id;

              return (
                <motion.button
                  key={preset.id}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  onClick={() => handleSelect(preset)}
                  onMouseEnter={() => setHoveredPreset(preset)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  className={`relative w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 group overflow-hidden
                    ${isSelected
                      ? "text-violet-300"
                      : isActive
                        ? "text-green-300"
                        : "text-white/70 hover:text-white"
                    }
                  `}
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)"
                      : isActive
                        ? "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)"
                        : "transparent",
                  }}
                >
                  {isSelected && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-violet-400"
                      layoutId="selected-indicator"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isSelected ? "text-violet-300" : isActive ? "text-green-400" : ""}`}>
                        {preset.label}
                      </span>
                      {isActive && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 text-[9px] text-green-400/80 font-medium uppercase tracking-wider"
                        >
                          <Check className="size-2.5" />
                          Active
                        </motion.span>
                      )}
                    </div>
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      animate={{ x: isSelected ? 0 : 4 }}
                    >
                      <ChevronRight className="size-3.5 text-white/30" />
                    </motion.div>
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
              className="overflow-hidden border-t border-white/5"
            >
              <div className="p-3 bg-white/[0.02]">
                <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">
                  {displayPreset.label}
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  {displayPreset.description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-3 border-t border-white/5 bg-white/[0.01]">
          <motion.button
            type="button"
            onClick={handleApply}
            disabled={!selectedId || selectedId === activePreset?.id}
            className="relative w-full py-2.5 rounded-lg text-[11px] font-semibold transition-all duration-200 overflow-hidden"
            style={{
              background: selectedId && selectedId !== activePreset?.id
                ? "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                : "rgba(255, 255, 255, 0.05)",
              color: selectedId && selectedId !== activePreset?.id
                ? "white"
                : "rgba(255, 255, 255, 0.3)",
            }}
            whileHover={selectedId && selectedId !== activePreset?.id ? { scale: 1.02 } : {}}
            whileTap={selectedId && selectedId !== activePreset?.id ? { scale: 0.98 } : {}}
          >
            {selectedId === activePreset?.id ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check className="size-3" />
                Currently Applied
              </span>
            ) : selectedId ? (
              <span className="flex items-center justify-center gap-1.5">
                <Zap className="size-3" />
                Apply Preset
              </span>
            ) : (
              "Select a preset"
            )}
          </motion.button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
