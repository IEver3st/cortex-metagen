import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";
import type { WorkspaceSwitcherWorkspace } from "@/store/workspace-switcher-store";

const SURFACE_PRIMARY = "var(--background)";
const SURFACE_SECONDARY = "var(--card)";
const SURFACE_ELEVATED = "var(--secondary)";
const BORDER_SUBTLE = "var(--border)";
const BORDER_DEFAULT = "color-mix(in oklch, var(--border) 72%, var(--foreground) 28%)";
const TEXT_PRIMARY = "var(--foreground)";
const TEXT_SECONDARY = "color-mix(in oklch, var(--foreground) 88%, var(--muted-foreground) 12%)";
const TEXT_MUTED = "var(--muted-foreground)";
const TEXT_FAINT = "color-mix(in oklch, var(--muted-foreground) 70%, transparent)";
const ACCENT = "var(--primary)";
const WARNING = "color-mix(in oklch, var(--destructive) 45%, var(--foreground) 55%)";

function getWorkspaceFolderLabel(workspace: WorkspaceSwitcherWorkspace): string {
  if (!workspace.folderPath) return "Untitled";
  const parts = workspace.folderPath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? workspace.folderPath;
}

function toDisplayPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts.slice(-2).join("/") || normalized;
}

function buildMetaFiles(workspace: WorkspaceSwitcherWorkspace): string[] {
  const files = workspace.openFiles.length > 0
    ? workspace.openFiles
    : Object.values(workspace.snapshot?.sourceFileByType ?? {}).filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

  return files.slice(0, 6);
}

interface WorkspaceSceneProps {
  workspace: WorkspaceSwitcherWorkspace;
  compact?: boolean;
  className?: string;
}

export const WorkspaceScene = memo(function WorkspaceScene({
  workspace,
  compact = false,
  className,
}: WorkspaceSceneProps) {
  const metaFiles = useMemo(() => buildMetaFiles(workspace), [workspace]);
  const activeFile = workspace.activeFile ?? metaFiles[0] ?? null;
  const folderLabel = getWorkspaceFolderLabel(workspace);
  const vehicleCount = workspace.snapshot ? Object.keys(workspace.snapshot.vehicles).length : 0;
  const activeTab = workspace.snapshot?.activeTab ?? "handling";
  const sidebarCollapsed = workspace.snapshot?.sidebarCollapsed ?? false;
  const codePreviewVisible = true;
  const emptyState = metaFiles.length === 0;

  const editorRows = activeFile
    ? [
        `<${activeTab}>`,
        `  <path>${toDisplayPath(activeFile)}</path>`,
        `  <vehicles>${vehicleCount}</vehicles>`,
        `  <dirty>${workspace.hasUnsavedState ? "true" : "false"}</dirty>`,
        `</${activeTab}>`,
      ]
    : [
        "<workspace>",
        "  <state>empty</state>",
        "  <hint>open a folder or file</hint>",
        "</workspace>",
      ];

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[6px] border-[0.5px]",
        className,
      )}
      style={{
        borderColor: BORDER_SUBTLE,
        backgroundColor: SURFACE_PRIMARY,
      }}
    >
      <div className="absolute inset-0 flex flex-col font-sans">
        <div
          className="flex items-center justify-between border-b px-3"
          style={{
            height: compact ? 24 : 34,
            borderColor: BORDER_SUBTLE,
            backgroundColor: SURFACE_SECONDARY,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                color: ACCENT,
              }}
            >
              METAGEN
            </span>
            <span
              className="truncate"
              style={{
                maxWidth: compact ? 68 : 160,
                fontSize: compact ? 7 : 12,
                color: TEXT_SECONDARY,
              }}
            >
              {workspace.name}
            </span>
          </div>

          <div
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: TEXT_FAINT,
            }}
          >
            <span>{vehicleCount} vehicles</span>
            {workspace.hasUnsavedState && (
              <span style={{ color: WARNING }}>
                unsaved
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className="min-h-0 shrink-0 border-r"
            style={{
              width: compact ? (sidebarCollapsed ? "14%" : "22%") : (sidebarCollapsed ? "16%" : "24%"),
              borderColor: BORDER_SUBTLE,
              backgroundColor: SURFACE_SECONDARY,
              opacity: sidebarCollapsed ? 0.42 : 1,
            }}
          >
            <div
              className="border-b px-2"
              style={{
                height: compact ? 18 : 28,
                borderColor: BORDER_SUBTLE,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: TEXT_FAINT,
                display: "flex",
                alignItems: "center",
              }}
            >
              explorer
            </div>

            <div className="space-y-1 px-2 py-2">
              <div
                className="truncate"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: TEXT_MUTED,
                }}
              >
                {folderLabel}
              </div>

              {metaFiles.slice(0, compact ? 3 : 5).map((filePath) => {
                const active = filePath === activeFile;
                return (
                  <div
                    key={filePath}
                    className="truncate rounded-[4px] border px-1.5 py-1"
                    style={{
                      borderColor: active ? ACCENT : BORDER_SUBTLE,
                      color: active ? TEXT_PRIMARY : TEXT_FAINT,
                      backgroundColor: active ? SURFACE_ELEVATED : "transparent",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                    }}
                  >
                    {toDisplayPath(filePath)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div
                className="flex items-center gap-1 border-b px-2"
                style={{
                  height: compact ? 18 : 28,
                  borderColor: BORDER_SUBTLE,
                  backgroundColor: SURFACE_SECONDARY,
                }}
              >
                {(metaFiles.length > 0 ? metaFiles : [activeTab]).slice(0, compact ? 2 : 4).map((filePath) => {
                  const label = filePath.includes(".") ? toDisplayPath(filePath) : `${filePath}.meta`;
                  const active = filePath === activeFile || (!activeFile && filePath === activeTab);
                  return (
                    <div
                      key={filePath}
                      className="truncate rounded-t-[4px] border border-b-0 px-2"
                      style={{
                        maxWidth: compact ? 42 : 140,
                        height: compact ? 14 : 22,
                        borderColor: active ? BORDER_DEFAULT : BORDER_SUBTLE,
                        backgroundColor: active ? SURFACE_ELEVATED : SURFACE_PRIMARY,
                        color: active ? TEXT_PRIMARY : TEXT_FAINT,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              <div
                className="flex-1 px-3 py-3"
                style={{
                  backgroundColor: SURFACE_PRIMARY,
                }}
              >
                {emptyState ? (
                  <div
                    className="flex h-full items-center justify-center"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: compact ? 10 : 11,
                      color: TEXT_FAINT,
                    }}
                  >
                    empty workspace
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {editorRows.map((row, index) => (
                      <div
                        key={`${workspace.id}-${row}-${index}`}
                        className="truncate"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: index === 1 ? TEXT_PRIMARY : TEXT_MUTED,
                        }}
                      >
                        {row}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {codePreviewVisible && (
              <div
                className="min-h-0 shrink-0 border-l"
                style={{
                  width: compact ? "34%" : "38%",
                  borderColor: BORDER_SUBTLE,
                  backgroundColor: SURFACE_ELEVATED,
                }}
              >
                <div
                  className="border-b px-2"
                  style={{
                    height: compact ? 18 : 28,
                    borderColor: BORDER_SUBTLE,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    color: TEXT_FAINT,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  preview
                </div>

                <div className="space-y-2 px-3 py-3">
                  <div
                    className="rounded-[4px] border px-2 py-1"
                    style={{
                      borderColor: BORDER_SUBTLE,
                      color: TEXT_SECONDARY,
                      fontSize: 10,
                    }}
                  >
                    Active file: {activeFile ? toDisplayPath(activeFile) : "none"}
                  </div>
                  <div
                    className="rounded-[4px] border px-2 py-1"
                    style={{
                      borderColor: BORDER_SUBTLE,
                      color: TEXT_MUTED,
                      fontSize: 10,
                    }}
                  >
                    Folder: {folderLabel}
                  </div>
                  <div
                    className="rounded-[4px] border px-2 py-1"
                    style={{
                      borderColor: BORDER_SUBTLE,
                      color: TEXT_MUTED,
                      fontSize: 10,
                    }}
                  >
                    Open tabs: {metaFiles.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
