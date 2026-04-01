import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Lightbulb,
  Loader2,
  Monitor,
  MemoryStick,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK_BUG_URL =
  "https://github.com/iever3st/cortex-metagen/issues/new?labels=bug%2Cuser-report";
const FALLBACK_FEATURE_URL =
  "https://github.com/iever3st/cortex-metagen/issues/new?labels=enhancement%2Cuser-report";

type FormState = "idle" | "submitting" | "success" | "error";

// ---------------------------------------------------------------------------
// System info collection (anonymous, client-side only)
// ---------------------------------------------------------------------------

export interface SystemInfo {
  gpu?: string;
  cpuCores?: number;
  ramGb?: number;
  os?: string;
}

function getGpu(): string | undefined {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return undefined;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return undefined;
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
    // Strip driver noise  keep only the GPU model portion
    return renderer.replace(/\s*\(.*?\)\s*/g, "").trim() || undefined;
  } catch {
    return undefined;
  }
}

function collectSystemInfo(): SystemInfo {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
  };
  const gpu = getGpu();
  const cpuCores = nav.hardwareConcurrency ?? undefined;
  const ramGb = nav.deviceMemory ?? undefined;

  // Best-effort OS detection from userAgent
  const ua = navigator.userAgent;
  let os: string | undefined;
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  return {
    ...(gpu !== undefined && { gpu }),
    ...(cpuCores !== undefined && { cpuCores }),
    ...(ramGb !== undefined && { ramGb }),
    ...(os !== undefined && { os }),
  };
}

// ---------------------------------------------------------------------------
// System info display badge
// ---------------------------------------------------------------------------

interface SystemInfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function SystemInfoRow({ icon, label, value }: SystemInfoRowProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex shrink-0 items-center text-muted-foreground/60">
        {icon}
      </span>
      <span className="w-10 shrink-0 text-muted-foreground/70">{label}</span>
      <span className="truncate font-mono text-[11px] text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

interface SystemInfoPanelProps {
  info: SystemInfo;
}

function SystemInfoPanel({ info }: SystemInfoPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const hasAnyInfo =
    info.gpu !== undefined ||
    info.cpuCores !== undefined ||
    info.ramGb !== undefined ||
    info.os !== undefined;

  if (!hasAnyInfo) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/60">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <span className="text-xs font-medium text-muted-foreground">
          System info attached
        </span>
        <span className="text-muted-foreground/60">
          {expanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border/40 px-3 py-2.5 space-y-1.5">
          {info.os && (
            <SystemInfoRow
              icon={<Monitor className="size-3" />}
              label="OS"
              value={info.os}
            />
          )}
          {info.gpu && (
            <SystemInfoRow
              icon={<Monitor className="size-3" />}
              label="GPU"
              value={info.gpu}
            />
          )}
          {info.cpuCores !== undefined && (
            <SystemInfoRow
              icon={<Cpu className="size-3" />}
              label="CPU"
              value={`${info.cpuCores} logical cores`}
            />
          )}
          {info.ramGb !== undefined && (
            <SystemInfoRow
              icon={<MemoryStick className="size-3" />}
              label="RAM"
              value={`~${info.ramGb} GB`}
            />
          )}
          <p className="pt-0.5 text-[10px] text-muted-foreground/45 leading-4">
            No personal data collected  only anonymous hardware identifiers.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bug report form
// ---------------------------------------------------------------------------

interface BugFormProps {
  systemInfo: SystemInfo;
  onSuccess: () => void;
}

function BugForm({ systemInfo, onSuccess }: BugFormProps) {
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
      logger.info("bug-report", "Submitting bug report", {
        title: title.trim(),
        hasSteps: steps.trim().length > 0,
      });

      await invoke("submit_bug_report", {
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim() || "No steps provided.",
        logs: logger.getLogsAsText(),
        systemInfo: Object.keys(systemInfo).length > 0 ? systemInfo : null,
      });

      logger.info("bug-report", "Bug report submitted successfully");
      setFormState("success");
      setTitle("");
      setDescription("");
      setSteps("");
      onSuccess();
    } catch (err) {
      logger.error("bug-report", "Failed to submit bug report", err);
      setFormState("error");
      setErrorMessage(
        typeof err === "string" ? err : "Unexpected error. Please try again.",
      );
    }
  }, [canSubmit, title, description, steps, systemInfo, onSuccess]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(FALLBACK_BUG_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bug-title" className="text-xs font-medium text-foreground">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="bug-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary of the issue"
          className="h-9 text-sm"
          disabled={formState === "submitting"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bug-description" className="text-xs font-medium text-foreground">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="bug-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what went wrong, what you expected to happen, and any relevant context."
          rows={4}
          disabled={formState === "submitting"}
          className={cn(
            "min-h-28 resize-none rounded-xl bg-card/80 text-sm shadow-xs",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bug-steps" className="text-xs font-medium text-foreground">
          Steps to reproduce
          <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="bug-steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder={"1. Open a .meta file\n2. Navigate to...\n3. Observe..."}
          rows={3}
          disabled={formState === "submitting"}
          className={cn(
            "min-h-20 resize-none rounded-xl bg-card/80 text-sm shadow-xs",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      <SystemInfoPanel info={systemInfo} />

      <p className="text-xs text-muted-foreground leading-5">
        Recent in-app debug logs are attached automatically so bug reports
        include background context.
      </p>

      {formState === "error" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1 text-xs">
            <p className="font-medium text-destructive">Couldn't submit report</p>
            {errorMessage && (
              <p className="text-muted-foreground">{errorMessage}</p>
            )}
            <p className="text-muted-foreground">
              You can still report manually  copy the link below and open it in
              your browser:
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <code className="rounded bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground select-all">
                {FALLBACK_BUG_URL}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={handleCopyUrl}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          size="sm"
          className="h-9 gap-1.5 text-xs"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {formState === "submitting" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Submitting...
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

// ---------------------------------------------------------------------------
// Feature suggestion form
// ---------------------------------------------------------------------------

interface FeatureFormProps {
  systemInfo: SystemInfo;
  onSuccess: () => void;
}

function FeatureForm({ systemInfo, onSuccess }: FeatureFormProps) {
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [idea, setIdea] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    formState !== "submitting" &&
    title.trim().length > 0 &&
    idea.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setFormState("submitting");
    setErrorMessage(null);

    try {
      logger.info("feature-request", "Submitting feature request", {
        title: title.trim(),
      });

      await invoke("submit_feature_request", {
        title: title.trim(),
        problem: problem.trim() || "Not specified.",
        idea: idea.trim(),
        systemInfo: Object.keys(systemInfo).length > 0 ? systemInfo : null,
      });

      logger.info("feature-request", "Feature request submitted successfully");
      setFormState("success");
      setTitle("");
      setProblem("");
      setIdea("");
      onSuccess();
    } catch (err) {
      logger.error("feature-request", "Failed to submit feature request", err);
      setFormState("error");
      setErrorMessage(
        typeof err === "string" ? err : "Unexpected error. Please try again.",
      );
    }
  }, [canSubmit, title, problem, idea, systemInfo, onSuccess]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(FALLBACK_FEATURE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="feat-title" className="text-xs font-medium text-foreground">
          Feature title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="feat-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A short name for the feature or improvement"
          className="h-9 text-sm"
          disabled={formState === "submitting"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feat-problem" className="text-xs font-medium text-foreground">
          What problem does this solve?
          <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="feat-problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Is there a workflow that's slow or painful? Something important that's missing?"
          rows={3}
          disabled={formState === "submitting"}
          className={cn(
            "min-h-20 resize-none rounded-xl bg-card/80 text-sm shadow-xs",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feat-idea" className="text-xs font-medium text-foreground">
          Describe your idea <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="feat-idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe the feature you'd like to see. Include any details about how it should work."
          rows={4}
          disabled={formState === "submitting"}
          className={cn(
            "min-h-28 resize-none rounded-xl bg-card/80 text-sm shadow-xs",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      <SystemInfoPanel info={systemInfo} />

      {formState === "error" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1 text-xs">
            <p className="font-medium text-destructive">Couldn't submit suggestion</p>
            {errorMessage && (
              <p className="text-muted-foreground">{errorMessage}</p>
            )}
            <p className="text-muted-foreground">
              You can still suggest manually  copy the link below and open it in
              your browser:
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <code className="rounded bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground select-all">
                {FALLBACK_FEATURE_URL}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={handleCopyUrl}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          size="sm"
          className="h-9 gap-1.5 text-xs"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {formState === "submitting" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Lightbulb className="size-3.5" />
              Submit Suggestion
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

interface SuccessStateProps {
  type: "bug" | "feature";
  onReset: () => void;
}

function SuccessState({ type, onReset }: SuccessStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <CheckCircle2 className="size-8 text-primary" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {type === "bug" ? "Report submitted" : "Suggestion submitted"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {type === "bug"
            ? "Your bug report was created on GitHub. Thank you for helping improve Cortex Metagen."
            : "Your feature suggestion was created on GitHub. Thank you for helping shape Cortex Metagen."}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 text-xs text-muted-foreground hover:text-foreground"
        onClick={onReset}
      >
        Submit another
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface BugReportFormProps {
  /** Pre-select a specific tab on mount ("bug" or "feature"). */
  defaultTab?: "bug" | "feature";
}

export function BugReportForm({ defaultTab = "bug" }: BugReportFormProps) {
  const [systemInfo] = useState<SystemInfo>(() => collectSystemInfo());
  const [activeTab, setActiveTab] = useState<"bug" | "feature">(defaultTab);
  const [successType, setSuccessType] = useState<"bug" | "feature" | null>(null);

  // Sync defaultTab when it changes externally (e.g. opened from feature CTA)
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (successType !== null) {
    return (
      <SuccessState
        type={successType}
        onReset={() => setSuccessType(null)}
      />
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "bug" | "feature")}
      className="w-full"
    >
      <TabsList className="mb-5 grid w-full grid-cols-2">
        <TabsTrigger value="bug" className="gap-1.5 text-xs">
          <Bug className="size-3.5" />
          Bug Report
        </TabsTrigger>
        <TabsTrigger value="feature" className="gap-1.5 text-xs">
          <Lightbulb className="size-3.5" />
          Feature Suggestion
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bug">
        <BugForm
          systemInfo={systemInfo}
          onSuccess={() => setSuccessType("bug")}
        />
      </TabsContent>

      <TabsContent value="feature">
        <FeatureForm
          systemInfo={systemInfo}
          onSuccess={() => setSuccessType("feature")}
        />
      </TabsContent>
    </Tabs>
  );
}
