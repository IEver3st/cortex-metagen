import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Bug, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK_URL = "https://github.com/iever3st/cortex-metagen/issues/new";

type FormState = "idle" | "submitting" | "success" | "error";

export function BugReportForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    formState !== "submitting" &&
    title.trim().length > 0 &&
    description.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setFormState("submitting");
    setErrorMessage(null);

    try {
      await invoke("submit_bug_report", {
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim() || "No steps provided.",
      });

      setFormState("success");
      setTitle("");
      setDescription("");
      setSteps("");
    } catch (err) {
      setFormState("error");
      setErrorMessage(
        typeof err === "string" ? err : "Unexpected error. Please try again.",
      );
    }
  }, [canSubmit, title, description, steps]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(FALLBACK_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (formState === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-8 text-emerald-400" />
        <div>
          <p className="text-sm font-medium text-slate-200">Report submitted</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Your bug report was created on GitHub. Thank you for helping improve
            Cortex Metagen.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-slate-400 hover:text-slate-200"
          onClick={() => setFormState("idle")}
        >
          Submit another report
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="bug-title" className="text-xs font-medium text-slate-300">
          Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="bug-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary of the issue"
          className="h-8 border-[#1b2b46] bg-[#0b1424] text-sm text-slate-100 placeholder:text-slate-600"
          disabled={formState === "submitting"}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label
          htmlFor="bug-description"
          className="text-xs font-medium text-slate-300"
        >
          Description <span className="text-red-400">*</span>
        </Label>
        <textarea
          id="bug-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what went wrong, what you expected to happen, and any relevant context."
          rows={4}
          disabled={formState === "submitting"}
          className={cn(
            "w-full resize-none rounded-md border border-[#1b2b46] bg-[#0b1424] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        <Label
          htmlFor="bug-steps"
          className="text-xs font-medium text-slate-300"
        >
          Steps to reproduce
          <span className="ml-1.5 font-normal text-slate-600">(optional)</span>
        </Label>
        <textarea
          id="bug-steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder={"1. Open a .meta file\n2. Navigate to...\n3. Observe..."}
          rows={3}
          disabled={formState === "submitting"}
          className={cn(
            "w-full resize-none rounded-md border border-[#1b2b46] bg-[#0b1424] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {/* Error state */}
      {formState === "error" && (
        <div className="flex items-start gap-2.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
          <div className="space-y-1 text-xs">
            <p className="font-medium text-red-300">Couldn't submit report</p>
            {errorMessage && <p className="text-slate-500">{errorMessage}</p>}
            <p className="text-slate-500">
              You can still report manually — copy the link below and open it in
              your browser:
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <code className="rounded bg-[#0b1424] px-2 py-0.5 text-[11px] text-slate-400 select-all">
                {FALLBACK_URL}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-200"
                onClick={handleCopyUrl}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {formState === "submitting" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Bug className="size-3.5" />
              Submit Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
