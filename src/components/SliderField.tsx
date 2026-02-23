import { memo, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
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
import { Info, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldInfo } from "@/lib/dictionary";

interface SliderFieldProps {
  field: FieldInfo;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  defaultValue?: number;
  displayUnit?: string;
  toDisplayValue?: (value: number) => number;
  fromDisplayValue?: (value: number) => number;
  displayStep?: number;
}

export const SliderField = memo(function SliderField({
  field,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  defaultValue,
  displayUnit,
  toDisplayValue,
  fromDisplayValue,
  displayStep,
}: SliderFieldProps) {
  const isChanged = defaultValue !== undefined && value !== defaultValue;
  const toDisplay = toDisplayValue ?? ((raw: number) => raw);
  const fromDisplay = fromDisplayValue ?? ((display: number) => display);
  const effectiveStep = displayStep ?? Math.max(toDisplay(step), Number.EPSILON);
  const displayValue = toDisplay(value);
  const displayMin = toDisplay(min);
  const displayMax = toDisplay(max);
  const displayDefaultValue = defaultValue !== undefined ? toDisplay(defaultValue) : undefined;
  const unitLabel = displayUnit ?? field.unit;

  const handleReset = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  return (
    <div className="group/field flex flex-col gap-1 py-1.5 px-1 rounded-md transition-colors hover:bg-white/[0.02]">
      {/* Top row: label + value + unit + reset */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Changed indicator dot — orange only */}
          <div className="w-1.5 shrink-0 flex justify-center">
            {isChanged && (
              <div className="size-1.5 rounded-full bg-orange-500" />
            )}
          </div>

          {/* Field name with tooltip */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[13px] font-medium text-slate-300 cursor-help truncate">
                  {field.name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{field.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Info popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-slate-600 hover:text-slate-400 transition-colors opacity-0 group-hover/field:opacity-100"
              >
                <Info className="size-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-72 text-xs space-y-2">
              <p className="font-medium text-foreground">{field.name}</p>
              <p className="text-muted-foreground">{field.description}</p>
              {field.valueUp && (
                <p>
                  <span className="text-green-500 font-medium">▲ Up:</span>{" "}
                  {field.valueUp}
                </p>
              )}
              {field.valueDown && (
                <p>
                  <span className="text-red-500 font-medium">▼ Down:</span>{" "}
                  {field.valueDown}
                </p>
              )}
              {field.example && (
                <p className="text-muted-foreground italic">
                  Example: {field.example}
                </p>
              )}
              {field.docsUrl && (
                <a
                  href={field.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-primary hover:underline"
                >
                  Open FiveM documentation
                </a>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Value + unit + reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Input
            type="number"
            value={effectiveStep >= 1 ? Math.round(displayValue) : Number(displayValue.toFixed(2))}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(fromDisplay(v));
            }}
            step={effectiveStep}
            min={displayMin}
            max={displayMax}
            disabled={disabled}
            className={cn(
              "w-[72px] h-6 text-xs text-right tabular-nums font-mono bg-transparent px-1.5 transition-colors",
              isChanged
                ? "border-orange-500/40 focus:border-orange-500/60"
                : "border-slate-700/50 focus:border-slate-500"
            )}
          />
          {unitLabel && (
            <span className="text-[10px] text-slate-500 font-mono w-[28px] text-left truncate">
              {unitLabel}
            </span>
          )}
          {!unitLabel && <span className="w-[28px]" />}

          {/* Reset button — only visible when changed */}
          <button
            type="button"
            onClick={handleReset}
            disabled={!isChanged}
            className="size-5 flex items-center justify-center rounded text-slate-600 transition-all disabled:opacity-0 hover:text-orange-400 hover:bg-orange-500/10"
            title={displayDefaultValue !== undefined ? `Reset to ${effectiveStep >= 1 ? Math.round(displayDefaultValue) : displayDefaultValue.toFixed(2)}` : undefined}
          >
            <RotateCcw className="size-3" />
          </button>
        </div>
      </div>

      {/* Slider row with range labels */}
      <div className="flex items-center gap-2 pl-3">
        <span className="text-[9px] text-slate-600 font-mono w-[36px] text-right shrink-0">
          {effectiveStep >= 1 ? displayMin.toFixed(0) : displayMin.toFixed(1)}
        </span>
        <Slider
          value={[displayValue]}
          onValueChange={([v]) => onChange(fromDisplay(v))}
          min={displayMin}
          max={displayMax}
          step={effectiveStep}
          disabled={disabled}
          className="flex-1"
        />
        <span className="text-[9px] text-slate-600 font-mono w-[36px] text-left shrink-0">
          {effectiveStep >= 1 ? displayMax.toFixed(0) : displayMax.toFixed(1)}
        </span>
      </div>
    </div>
  );
});
