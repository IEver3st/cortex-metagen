import { useCallback, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check as checkForAppUpdate, type Update } from "@tauri-apps/plugin-updater";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_DELAY_MS = 5000;
const IS_DEV = Boolean(import.meta.env?.DEV);
const UPDATER_ENDPOINT = "https://github.com/IEver3st/cortex-metagen/releases/latest/download/latest.json";

export type UpdaterStatusKind =
  | "idle"
  | "checking"
  | "available"
  | "latest"
  | "ahead"
  | "unavailable"
  | "error";

interface InspectUpdaterReleaseResult {
  version: string | null;
  pubDate: string | null;
  url: string | null;
}

interface DiagnosticsResult extends InspectUpdaterReleaseResult {
  statusKind: UpdaterStatusKind;
  statusNote: string;
}

export interface UpdateCheckerState {
  available: boolean;
  latest: string | null;
  currentVersion: string | null;
  publishedVersion: string | null;
  publishedDate: string | null;
  releaseUrl: string | null;
  notes: string;
  checking: boolean;
  installing: boolean;
  progressPercent: number;
  error: string;
  dismissed: boolean;
  statusKind: UpdaterStatusKind;
  statusNote: string;
  lastCheckedAt: number | null;
}

export interface UpdateCheckerResult extends UpdateCheckerState {
  dismiss: () => void;
  install: () => Promise<boolean>;
  checkNow: () => Promise<void>;
}

const INITIAL_STATE: UpdateCheckerState = {
  available: false,
  latest: null,
  currentVersion: null,
  publishedVersion: null,
  publishedDate: null,
  releaseUrl: null,
  notes: "",
  checking: false,
  installing: false,
  progressPercent: 0,
  error: "",
  dismissed: false,
  statusKind: "idle",
  statusNote: "Automatic updates will be checked after startup in packaged builds.",
  lastCheckedAt: null,
};

const store = {
  state: INITIAL_STATE,
  listeners: new Set<(state: UpdateCheckerState) => void>(),
  initialized: false,
  timerId: null as ReturnType<typeof setInterval> | null,
  initialDelayId: null as ReturnType<typeof setTimeout> | null,
  update: null as Update | null,
  downloadedBytes: 0,
  totalBytes: 0,
  checkInFlight: false,
  currentVersionPromise: null as Promise<string | null> | null,
};

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Reflect.has(window, "__TAURI_INTERNALS__");
}

function emit(nextState: UpdateCheckerState): void {
  store.state = nextState;
  for (const listener of store.listeners) {
    listener(store.state);
  }
}

function setStoreState(partial: Partial<UpdateCheckerState>): void {
  emit({ ...store.state, ...partial });
}

function subscribe(listener: (state: UpdateCheckerState) => void): () => void {
  store.listeners.add(listener);
  listener(store.state);
  return () => {
    store.listeners.delete(listener);
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function normalizeVersion(version: string): number[] {
  return version
    .split(/[^0-9]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => Number.parseInt(segment, 10));
}

function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

async function replaceUpdate(nextUpdate: Update | null): Promise<void> {
  const previousUpdate = store.update;
  store.update = nextUpdate;

  if (previousUpdate && previousUpdate !== nextUpdate) {
    try {
      await previousUpdate.close();
    } catch {
      // Ignore updater resource cleanup errors.
    }
  }
}

async function ensureCurrentVersionLoaded(): Promise<string | null> {
  if (store.state.currentVersion) {
    return store.state.currentVersion;
  }

  if (store.currentVersionPromise) {
    return store.currentVersionPromise;
  }

  if (!isTauriRuntime()) {
    return null;
  }

  store.currentVersionPromise = getVersion()
    .then((version) => {
      const currentVersion = version.trim();
      setStoreState({ currentVersion });
      return currentVersion;
    })
    .catch(() => {
      setStoreState({ currentVersion: "unknown" });
      return "unknown";
    });

  return store.currentVersionPromise;
}

async function inspectPublishedRelease(currentVersion: string | null): Promise<DiagnosticsResult> {
  try {
    const feed = await invoke<InspectUpdaterReleaseResult>("inspect_updater_release", {
      endpoint: UPDATER_ENDPOINT,
    });

    const publishedVersion = feed.version?.trim() || null;
    const pubDate = feed.pubDate?.trim() || null;
    const url = feed.url?.trim() || null;

    if (!publishedVersion || !currentVersion || currentVersion === "unknown") {
      return {
        version: publishedVersion,
        pubDate,
        url,
        statusKind: "idle",
        statusNote: publishedVersion
          ? `Latest published version: v${publishedVersion}.`
          : "No published updater feed metadata was returned.",
      };
    }

    const comparison = compareVersions(currentVersion, publishedVersion);

    if (comparison === 0) {
      return {
        version: publishedVersion,
        pubDate,
        url,
        statusKind: "latest",
        statusNote: `You're already running the latest published version (v${publishedVersion}).`,
      };
    }

    if (comparison > 0) {
      return {
        version: publishedVersion,
        pubDate,
        url,
        statusKind: "ahead",
        statusNote: `This build (${currentVersion}) is newer than the published feed (${publishedVersion}).`,
      };
    }

    return {
      version: publishedVersion,
      pubDate,
      url,
      statusKind: "unavailable",
      statusNote: `Version v${publishedVersion} is published, but no compatible update was offered to this build.`,
    };
  } catch (error) {
    return {
      version: null,
      pubDate: null,
      url: null,
      statusKind: "error",
      statusNote: getErrorMessage(error, "Unable to inspect the published release feed."),
    };
  }
}

async function runCheck({ manual = false }: { manual?: boolean } = {}): Promise<void> {
  if (store.checkInFlight) {
    return;
  }

  if (!isTauriRuntime()) {
    if (manual) {
      setStoreState({
        checking: false,
        error: "Updater is only available inside the desktop app runtime.",
        statusKind: "error",
        statusNote: "Updater is only available inside the desktop app runtime.",
      });
    }
    return;
  }

  store.checkInFlight = true;
  setStoreState({
    checking: true,
    error: "",
    statusKind: "checking",
    statusNote: manual ? "Checking for updates..." : "Checking for background updates...",
  });

  try {
    const currentVersion = await ensureCurrentVersionLoaded();
    const update = await checkForAppUpdate();
    await replaceUpdate(update);

    if (update) {
      setStoreState({
        available: true,
        latest: update.version,
        publishedVersion: update.version,
        publishedDate: update.date ?? null,
        releaseUrl: null,
        notes: update.body?.trim() ?? "",
        dismissed: false,
        checking: false,
        installing: false,
        progressPercent: 0,
        error: "",
        statusKind: "available",
        statusNote: `Version v${update.version} is ready to install.`,
        lastCheckedAt: Date.now(),
        currentVersion: currentVersion ?? store.state.currentVersion,
      });
      return;
    }

    const diagnostics = await inspectPublishedRelease(currentVersion);
    setStoreState({
      available: false,
      latest: diagnostics.version,
      publishedVersion: diagnostics.version,
      publishedDate: diagnostics.pubDate,
      releaseUrl: diagnostics.url,
      notes: "",
      checking: false,
      installing: false,
      progressPercent: 0,
      error: diagnostics.statusKind === "error" ? diagnostics.statusNote : "",
      statusKind: diagnostics.statusKind,
      statusNote: diagnostics.statusNote,
      lastCheckedAt: Date.now(),
      currentVersion: currentVersion ?? store.state.currentVersion,
    });
  } catch (error) {
    const message = getErrorMessage(error, "Unable to reach the update server.");
    setStoreState({
      available: false,
      checking: false,
      installing: false,
      progressPercent: 0,
      error: message,
      statusKind: "error",
      statusNote: message,
      lastCheckedAt: Date.now(),
    });
  } finally {
    store.checkInFlight = false;
  }
}

async function installUpdate(): Promise<boolean> {
  if (!store.update) {
    return false;
  }

  store.downloadedBytes = 0;
  store.totalBytes = 0;

  setStoreState({
    installing: true,
    error: "",
    progressPercent: 0,
    statusNote: `Downloading v${store.update.version}...`,
  });

  try {
    await store.update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        store.downloadedBytes = 0;
        store.totalBytes = event.data.contentLength ?? 0;
        setStoreState({
          progressPercent: 0,
          statusNote: store.totalBytes > 0
            ? `Downloading v${store.update?.version ?? ""}...`
            : `Preparing v${store.update?.version ?? ""}...`,
        });
        return;
      }

      if (event.event === "Progress") {
        store.downloadedBytes += event.data.chunkLength;
        if (store.totalBytes > 0) {
          const progressPercent = Math.min(
            100,
            Math.round((store.downloadedBytes / store.totalBytes) * 100),
          );
          setStoreState({ progressPercent });
        }
        return;
      }

      setStoreState({
        progressPercent: 100,
        statusNote: "Update installed. Restarting app...",
      });
    });

    await relaunch();
    return true;
  } catch (error) {
    setStoreState({
      installing: false,
      error: getErrorMessage(error, "Update installation failed."),
      statusKind: "error",
      statusNote: "Update installation failed. Please try again.",
    });
    return false;
  }
}

function dismiss(): void {
  setStoreState({ dismissed: true });
}

export function ensureUpdaterInitialized(): void {
  if (store.initialized || !isTauriRuntime()) {
    return;
  }

  store.initialized = true;
  void ensureCurrentVersionLoaded();

  if (IS_DEV) {
    setStoreState({
      statusKind: "idle",
      statusNote: "Automatic update polling is disabled while running in development mode.",
    });
    return;
  }

  store.initialDelayId = window.setTimeout(() => {
    void runCheck({ manual: false });
  }, INITIAL_DELAY_MS);

  store.timerId = window.setInterval(() => {
    void runCheck({ manual: false });
  }, CHECK_INTERVAL_MS);
}

export function useUpdateChecker(): UpdateCheckerResult {
  const [state, setState] = useState(store.state);

  useEffect(() => {
    ensureUpdaterInitialized();
    return subscribe(setState);
  }, []);

  const install = useCallback(() => installUpdate(), []);
  const checkNow = useCallback(async () => {
    await runCheck({ manual: true });
  }, []);
  const dismissUpdate = useCallback(() => {
    dismiss();
  }, []);

  return {
    ...state,
    dismiss: dismissUpdate,
    install,
    checkNow,
  };
}
