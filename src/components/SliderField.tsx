import { memo } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Info } from "lucide-react";
import type { FieldInfo } from "@/lib/dictionary";

interface SliderFieldProps {
  field: FieldInfo;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}

export const SliderField = memo(function SliderField({
  field,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
}: SliderFieldProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex items-center gap-1.5 min-w-[180px] shrink-0">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-muted-foreground cursor-help">
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
              className="text-muted-foreground/50 hover:text-primary transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
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
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1"
      />
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        className="w-20 h-7 text-xs text-center tabular-nums"
      />
    </div>
  );
});
