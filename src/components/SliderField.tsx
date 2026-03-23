import { memo, useCallback } from "react";
import { Info, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    if (defaultValue !== undefined) onChange(defaultValue);
  }, [defaultValue, onChange]);

  return (
    <div className="surface-panel group/field space-y-3 px-4 py-3 transition-colors hover:bg-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full bg-transparent transition-colors", isChanged && "bg-primary")} />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate text-sm font-medium text-card-foreground">{field.name}</span>
              </TooltipTrigger>
              <TooltipContent side="top">{field.description}</TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
                  <Info className="size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" className="w-72 space-y-2 text-xs">
                <p className="text-sm font-medium text-card-foreground">{field.name}</p>
                <p className="text-muted-foreground">{field.description}</p>
                {field.valueUp ? <p><span className="font-medium text-primary">Up:</span> {field.valueUp}</p> : null}
                {field.valueDown ? <p><span className="font-medium text-destructive">Down:</span> {field.valueDown}</p> : null}
                {field.example ? <p className="text-muted-foreground">Example: {field.example}</p> : null}
                {field.docsUrl ? (
                  <a href={field.docsUrl} target="_blank" rel="noreferrer" className="inline-flex text-primary underline-offset-4 hover:underline">
                    Open FiveM documentation
                  </a>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            {effectiveStep >= 1 ? Math.round(displayMin) : Number(displayMin.toFixed(2))}
            {unitLabel ? ` ${unitLabel}` : ""} to {effectiveStep >= 1 ? Math.round(displayMax) : Number(displayMax.toFixed(2))}
            {unitLabel ? ` ${unitLabel}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={effectiveStep >= 1 ? Math.round(displayValue) : Number(displayValue.toFixed(2))}
            onChange={(event) => {
              const nextValue = Number.parseFloat(event.target.value);
              if (!Number.isNaN(nextValue)) onChange(fromDisplay(nextValue));
            }}
            step={effectiveStep}
            min={displayMin}
            max={displayMax}
            disabled={disabled}
            className={cn("w-28 text-right text-sm tabular-nums", isChanged && "border-primary/40")}
          />
          {unitLabel ? <span className="w-10 text-xs text-muted-foreground">{unitLabel}</span> : <span className="w-10" />}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={!isChanged}
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  <RotateCcw className="size-3" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {displayDefaultValue !== undefined
                ? `Reset to ${effectiveStep >= 1 ? Math.round(displayDefaultValue) : Number(displayDefaultValue.toFixed(2))}`
                : "Reset value"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-12 text-right text-[10px] text-muted-foreground">
          {effectiveStep >= 1 ? displayMin.toFixed(0) : displayMin.toFixed(1)}
        </span>
        <Slider
          value={[displayValue]}
          onValueChange={([nextValue]) => onChange(fromDisplay(nextValue))}
          min={displayMin}
          max={displayMax}
          step={effectiveStep}
          disabled={disabled}
          className="flex-1"
        />
        <span className="w-12 text-[10px] text-muted-foreground">
          {effectiveStep >= 1 ? displayMax.toFixed(0) : displayMax.toFixed(1)}
        </span>
      </div>
    </div>
  );
});
