// ---------------------------------------------------------------------------
// logger.ts — Background ring-buffer logger for Cortex Metagen
//
// Captures structured log entries in memory (up to MAX_ENTRIES). Automatically
// intercepts console.warn / console.error so unhandled errors are captured
// without any additional instrumentation. Also listens for uncaught window
// errors and unhandled promise rejections.
//
// Usage:
//   logger.info("app", "File opened", { path: "/foo/bar.meta" });
//   logger.error("tauri", "Invoke failed", err);
//
// At bug-report time call logger.getLogsAsText() to get a formatted string
// ready to attach to the GitHub issue body.
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  /** JSON-serialized extra context, if provided */
  data?: string;
}

const MAX_ENTRIES = 500;

let _nextId = 0;
const _entries: LogEntry[] = [];

// Preserve original console methods before patching so we never recurse.
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function _safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function _push(level: LogLevel, category: string, message: string, data?: unknown): void {
  const entry: LogEntry = {
    id: ++_nextId,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...(data !== undefined && { data: _safeStringify(data) }),
  };

  _entries.push(entry);
  if (_entries.length > MAX_ENTRIES) {
    _entries.shift();
  }
}

// ---------------------------------------------------------------------------
// Console interception — captures all warn/error calls from the app and
// third-party libraries automatically.
// ---------------------------------------------------------------------------

console.warn = (...args: unknown[]) => {
  _origWarn(...args);
  const [first, ...rest] = args;
  _push("warn", "console", String(first), rest.length > 0 ? rest : undefined);
};

console.error = (...args: unknown[]) => {
  _origError(...args);
  const [first, ...rest] = args;
  _push("error", "console", String(first), rest.length > 0 ? rest : undefined);
};

// ---------------------------------------------------------------------------
// Global error listeners
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    const detail =
      event.error instanceof Error
        ? (event.error.stack ?? event.error.message)
        : `${event.filename}:${event.lineno}:${event.colno}`;
    _push("error", "window", event.message || "Uncaught error", detail);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason =
      event.reason instanceof Error
        ? (event.reason.stack ?? event.reason.message)
        : String(event.reason);
    _push("error", "promise", "Unhandled promise rejection", reason);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const logger = {
  /** Low-level diagnostic; not shown in console. */
  debug(category: string, message: string, data?: unknown): void {
    _push("debug", category, message, data);
  },

  /** Informational event; not shown in console. */
  info(category: string, message: string, data?: unknown): void {
    _push("info", category, message, data);
  },

  /** Warning — also forwarded to the original console.warn. */
  warn(category: string, message: string, data?: unknown): void {
    _push("warn", category, message, data);
    _origWarn(`[${category}] ${message}`, ...(data !== undefined ? [data] : []));
  },

  /** Error — also forwarded to the original console.error. */
  error(category: string, message: string, data?: unknown): void {
    _push("error", category, message, data);
    _origError(`[${category}] ${message}`, ...(data !== undefined ? [data] : []));
  },

  /** Returns a shallow copy of all captured log entries. */
  getLogs(): LogEntry[] {
    return [..._entries];
  },

  /**
   * Returns all log entries as a single formatted string suitable for
   * inclusion in a bug report.
   */
  getLogsAsText(): string {
    if (_entries.length === 0) return "(no logs captured)";
    return _entries
      .map((e) => {
        const lvl = e.level.toUpperCase().padEnd(5);
        const base = `[${e.timestamp}] [${lvl}] [${e.category}] ${e.message}`;
        if (!e.data) return base;
        const indented = e.data.replace(/\n/g, "\n  ");
        return `${base}\n  ${indented}`;
      })
      .join("\n");
  },

  /** Removes all entries from the ring buffer. */
  clear(): void {
    _entries.length = 0;
  },
};
