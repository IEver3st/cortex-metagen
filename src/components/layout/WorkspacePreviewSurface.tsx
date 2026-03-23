import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";
import type { WorkspaceRecord } from "@/lib/workspace-switcher";

interface WorkspacePreviewSurfaceProps {
  workspace: WorkspaceRecord;
  className?: string;
  scale?: number;
}

const PREVIEW_WIDTH = 960;
const PREVIEW_HEIGHT = 540;

interface PreviewNode {
  id: string;
  label: string;
  depth: number;
  active: boolean;
  folder: boolean;
}

function getBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] || filePath;
}

function getTabs(workspace: WorkspaceRecord): string[] {
  const files = workspace.workspace.openFiles.length > 0
    ? workspace.workspace.openFiles
    : Object.values(workspace.snapshot?.sourceFileByType ?? {});

  return files.slice(0, 4).map((filePath) => getBasename(filePath));
}

function getTree(workspace: WorkspaceRecord): PreviewNode[] {
  const files = workspace.workspace.openFiles.length > 0
    ? workspace.workspace.openFiles
    : workspace.snapshot?.workspaceMetaFiles ?? [];
  const nodes: PreviewNode[] = [];
  const seenFolders = new Set<string>();

  for (const filePath of files.slice(0, 8)) {
    const normalized = filePath.replace(/\\/g, "/");
    const segments = normalized.split("/").filter(Boolean);
    const folders = segments.slice(0, -1);

    folders.forEach((segment, index) => {
      const key = folders.slice(0, index + 1).join("/");
      if (seenFolders.has(key)) return;
      seenFolders.add(key);
      nodes.push({
        id: `folder-${key}`,
        label: segment,
        depth: index,
        active: false,
        folder: true,
      });
    });

    nodes.push({
      id: `file-${normalized}`,
      label: segments[segments.length - 1] ?? normalized,
      depth: folders.length,
      active: normalized === (workspace.workspace.activeFile ?? ""),
      folder: false,
    });
  }

  return nodes;
}

export const WorkspacePreviewSurface = memo(function WorkspacePreviewSurface({
  workspace,
  className,
  scale = 1,
}: WorkspacePreviewSurfaceProps) {
  const tabs = useMemo(() => getTabs(workspace), [workspace]);
  const tree = useMemo(() => getTree(workspace), [workspace]);
  const snapshot = workspace.snapshot;
  const showExplorer = snapshot?.explorerVisible ?? true;
  const showCodePreview = true;
  const activeTabLabel = snapshot ? `${snapshot.activeTab}.meta` : "scratch workspace";

  return (
    <div
      className={cn("overflow-hidden rounded-[6px] border border-[#30363d] bg-[#0d1117] text-[#e6edf3]", className)}
    >
      <div
        className="origin-top-left"
        style={{
          width: `${PREVIEW_WIDTH}px`,
          height: `${PREVIEW_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily: "var(--metagen-font-ui)",
        }}
      >
        <div className="flex h-full flex-col bg-[#0d1117]">
          <div className="flex h-9 items-center justify-between border-b border-[#21262d] bg-[#161b22] px-3">
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontFamily: "var(--metagen-font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                }}
              >
                METAGEN
              </span>
              <span style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "10px", color: "#8b949e" }}>
                {workspace.workspace.name}
              </span>
            </div>
            <span style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "10px", color: "#484f58" }}>
              {workspace.workspace.folderPath ? "workspace" : "scratch"}
            </span>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="flex w-[52px] shrink-0 flex-col border-r border-[#21262d] bg-[#161b22]">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="mx-auto mt-3 h-8 w-8 rounded-[4px] border border-[#21262d]"
                  style={{ backgroundColor: item === 0 ? "#1c2128" : "transparent" }}
                />
              ))}
            </div>

            {showExplorer && (
              <div className="flex w-[224px] shrink-0 flex-col border-r border-[#21262d] bg-[#161b22]">
                <div className="border-b border-[#21262d] px-3 py-2">
                  <div style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "10px", color: "#8b949e", letterSpacing: "0.08em" }}>
                    explorer
                  </div>
                </div>
                <div className="flex-1 px-2 py-2">
                  {tree.length > 0 ? (
                    <div className="space-y-1">
                      {tree.map((node) => (
                        <div
                          key={node.id}
                          className="flex h-6 items-center rounded-[4px] pr-2 text-[11px]"
                          style={{
                            paddingLeft: `${node.depth * 12 + 8}px`,
                            color: node.active ? "#e6edf3" : "#8b949e",
                            backgroundColor: node.active ? "#1c2128" : "transparent",
                          }}
                        >
                          <span className="mr-2" style={{ color: "#484f58", fontFamily: "var(--metagen-font-mono)" }}>
                            {node.folder ? "/" : "-"}
                          </span>
                          <span className="truncate">{node.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "10px", color: "#484f58" }}>
                      no files loaded
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex min-w-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="border-b border-[#21262d] bg-[#161b22] px-3 py-2">
                  <div className="flex items-center gap-2">
                    {tabs.length > 0 ? (
                      tabs.map((tab, index) => (
                        <div
                          key={`${workspace.workspace.id}-${tab}-${index}`}
                          className="max-w-[180px] truncate rounded-[4px] border px-2 py-1"
                          style={{
                            borderColor: index === 0 ? "#00c9a7" : "#21262d",
                            color: index === 0 ? "#e6edf3" : "#8b949e",
                            fontFamily: "var(--metagen-font-mono)",
                            fontSize: "10px",
                          }}
                        >
                          {tab}
                        </div>
                      ))
                    ) : (
                      <div
                        className="rounded-[4px] border px-2 py-1"
                        style={{
                          borderColor: "#21262d",
                          color: "#484f58",
                          fontFamily: "var(--metagen-font-mono)",
                          fontSize: "10px",
                        }}
                      >
                        no tabs
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col bg-[#0d1117]">
                  <div className="border-b border-[#21262d] px-4 py-3">
                    <div style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "10px", color: "#8b949e", letterSpacing: "0.08em" }}>
                      {activeTabLabel}
                    </div>
                    <div className="mt-1 text-[13px] text-[#e6edf3]">
                      {workspace.workspace.name}
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-3 px-4 py-4">
                    {[0, 1, 2, 3].map((sectionIndex) => (
                      <div
                        key={`${workspace.workspace.id}-${sectionIndex}`}
                        className="rounded-[6px] border border-[#21262d] bg-[#161b22] p-3"
                      >
                        <div style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "10px", color: "#484f58", letterSpacing: "0.08em" }}>
                          section {sectionIndex + 1}
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-2 rounded-full bg-[#21262d]" />
                          <div className="h-2 w-4/5 rounded-full bg-[#21262d]" />
                          <div className="h-2 w-3/5 rounded-full bg-[#21262d]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {showCodePreview && (
                <div className="flex w-[280px] shrink-0 flex-col border-l border-[#21262d] bg-[#161b22]">
                  <div className="border-b border-[#21262d] px-3 py-2" style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "10px", color: "#8b949e", letterSpacing: "0.08em" }}>
                    preview
                  </div>
                  <div className="flex-1 space-y-2 px-3 py-3" style={{ fontFamily: "var(--metagen-font-mono)", fontSize: "11px", color: "#8b949e" }}>
                    {[1, 2, 3, 4, 5, 6].map((line) => (
                      <div key={`${workspace.workspace.id}-line-${line}`} className="flex items-center gap-3">
                        <span className="w-5 text-right text-[#484f58]">{line}</span>
                        <div className={cn("h-2 rounded-full bg-[#21262d]", line % 2 === 0 ? "w-2/3" : "w-5/6")} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
