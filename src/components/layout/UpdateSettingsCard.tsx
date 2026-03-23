import { ArrowDownCircle, ExternalLink, LoaderCircle, RefreshCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UpdateCheckerResult, UpdaterStatusKind } from "@/lib/updater";
import { cn } from "@/lib/utils";

interface UpdateSettingsCardProps {
  update: UpdateCheckerResult;
}

function formatDate(value: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatCheckTime(value: number | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadgeClassName(statusKind: UpdaterStatusKind): string {
  switch (statusKind) {
    case "available":
      return "border-primary/50 bg-primary/10 text-primary";
    case "latest":
      return "border-border bg-muted/50 text-muted-foreground";
    case "ahead":
      return "border-border bg-muted/50 text-muted-foreground";
    case "error":
      return "border-destructive/50 bg-destructive/10 text-destructive";
    case "checking":
      return "border-border bg-muted/50 text-muted-foreground";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function statusLabel(statusKind: UpdaterStatusKind): string {
  switch (statusKind) {
    case "available":
      return "Update Available";
    case "latest":
      return "Up to Date";
    case "ahead":
      return "Ahead of Feed";
    case "checking":
      return "Checking";
    case "error":
      return "Feed Error";
    case "unavailable":
      return "No Compatible Build";
    default:
      return "Idle";
  }
}

export function UpdateSettingsCard({ update }: UpdateSettingsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-4 border-b border-border p-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          {update.checking || update.installing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium leading-none text-card-foreground">Automatic Updates</h4>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
              statusBadgeClassName(update.statusKind)
            )}>
              {statusLabel(update.statusKind)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-5">
            Signed releases are checked after startup and then every 30 minutes while the desktop app is running.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <StatTile label="Current version" value={update.currentVersion ? `v${update.currentVersion}` : "Loading..."} />
          <StatTile label="Published version" value={update.publishedVersion ? `v${update.publishedVersion}` : "-"} />
          <StatTile label="Last checked" value={formatCheckTime(update.lastCheckedAt)} />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Status</p>
          <p className="mt-1 text-xs leading-5 text-foreground">{update.statusNote}</p>
          {update.publishedDate ? (
            <p className="mt-2 text-xs text-muted-foreground">Published {formatDate(update.publishedDate)}</p>
          ) : null}
          {update.releaseUrl ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="size-3" />
              <span className="truncate">{update.releaseUrl}</span>
            </p>
          ) : null}
          {update.error ? <p className="mt-2 text-xs text-destructive">{update.error}</p> : null}
        </div>

        {update.installing ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.max(update.progressPercent, 4)}%` }}
              />
            </div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Installing... {update.progressPercent}%
            </p>
          </div>
        ) : null}

        {update.notes ? (
          <div className="rounded-lg border border-border bg-background-app/50 p-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Release Notes</p>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">{update.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            disabled={update.checking || update.installing}
            onClick={() => {
              void update.checkNow();
            }}
          >
            <RefreshCcw className={`mr-1.5 size-3.5 ${update.checking ? "animate-spin" : ""}`} />
            Check now
          </Button>

          <Button
            size="sm"
            className="h-9 text-xs font-medium text-primary-foreground"
            disabled={!update.available || update.installing}
            onClick={() => {
              void update.install();
            }}
          >
            {update.installing ? (
              <>
                <LoaderCircle className="mr-1.5 size-3.5 animate-spin" /> Installing
              </>
            ) : (
              <>
                <ArrowDownCircle className="mr-1.5 size-3.5" /> Install update
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}