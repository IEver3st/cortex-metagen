import { ArrowDownCircle, ExternalLink, LoaderCircle, RefreshCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UpdateCheckerResult, UpdaterStatusKind } from "@/lib/updater";

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
      return "border-cyan-300/25 bg-cyan-400/10 text-cyan-200";
    case "latest":
      return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
    case "ahead":
      return "border-amber-300/20 bg-amber-400/10 text-amber-200";
    case "error":
      return "border-rose-300/20 bg-rose-400/10 text-rose-200";
    case "checking":
      return "border-sky-300/20 bg-sky-400/10 text-sky-200";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-300";
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
    <div className="rounded-md border border-[#1b2b46] bg-[#0b1424]">
      <div className="flex items-start gap-4 border-b border-[#1b2b46] p-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-cyan-400/10 text-cyan-200">
          {update.checking || update.installing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium leading-none text-slate-200">Automatic Updates</h4>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusBadgeClassName(update.statusKind)}`}>
              {statusLabel(update.statusKind)}
            </span>
          </div>
          <p className="text-xs leading-5 text-slate-500">
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

        <div className="rounded-md border border-white/6 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Status</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{update.statusNote}</p>
          {update.publishedDate ? (
            <p className="mt-2 text-[11px] text-slate-500">Published {formatDate(update.publishedDate)}</p>
          ) : null}
          {update.releaseUrl ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <ExternalLink className="size-3" /> {update.releaseUrl}
            </p>
          ) : null}
          {update.error ? <p className="mt-2 text-xs text-rose-300">{update.error}</p> : null}
        </div>

        {update.installing ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-300 transition-[width] duration-200"
                style={{ width: `${Math.max(update.progressPercent, 4)}%` }}
              />
            </div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Installing... {update.progressPercent}%
            </p>
          </div>
        ) : null}

        {update.notes ? (
          <div className="rounded-md border border-white/6 bg-[#08111f] p-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Release Notes</p>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{update.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-200 hover:bg-white/6 hover:text-white"
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
            className="h-8 bg-cyan-300 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
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
    <div className="rounded-md border border-white/6 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}
