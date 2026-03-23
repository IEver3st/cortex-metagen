import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Folder, Plus, Pin, Command } from "lucide-react";

import { GenerateProjectDialog } from "@/components/layout/GenerateProjectDialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/workspace-store";

interface WorkspaceHomeProps {
  onOpenFolder?: () => void;
  onOpenFile?: () => void;
  onOpenRecentFile?: (path: string) => void;
  onOpenRecentWorkspace?: (path: string) => void;
  recentFiles: string[];
  recentWorkspaces: string[];
  workspacePath?: string | null;
}

function getBaseName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function trimPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.length <= 40) return normalized;
  return `...${normalized.slice(-40)}`;
}

export function WorkspaceHome({
  onOpenFolder,
  onOpenRecentWorkspace,
  recentWorkspaces,
}: WorkspaceHomeProps) {
  const recent = recentWorkspaces.slice(0, 5);
  const [generateOpen, setGenerateOpen] = useState(false);

  const descriptors = useWorkspaceStore((s) => s.descriptors);
  const pinnedWorkspaces = useMemo(
    () => descriptors.filter((descriptor) => descriptor.pinned),
    [descriptors]
  );
  const togglePinned = useWorkspaceStore((s) => s.togglePinned);
  const toggleCommandPalette = useWorkspaceStore((s) => s.toggleCommandPalette);

  const descriptorByRoot = new Map(
    descriptors.map((d) => [d.roots[0]?.replace(/\\/g, "/").replace(/\/+$/, ""), d])
  );

  function getDescriptorForPath(path: string) {
    const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
    return descriptorByRoot.get(normalized);
  }

  return (
    <div className="relative h-full overflow-hidden bg-background-app text-foreground flex items-center justify-center">
      <motion.div
        className="relative w-full max-w-4xl px-8 py-12 flex flex-col md:flex-row gap-12 md:gap-16"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="flex-1 space-y-10">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.05, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 36 36"
                className="h-9 w-9 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="2,18 18,10 34,18" />
                <polyline points="18,10 18,34" />
                <polyline points="2,18 2,30 18,34" />
                <line x1="34" y1="18" x2="34" y2="30" />
                <polyline points="18,34 34,30" />
              </svg>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground font-display">METAGEN</h1>
            </div>
          </motion.div>

          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Start</p>

              <div className="space-y-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    size="lg"
                    className="group flex w-full max-w-sm items-center justify-start gap-3 rounded-lg"
                    onClick={onOpenFolder}
                  >
                    <div className="rounded-md bg-primary-foreground/20 p-1.5">
                      <Folder className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-primary-foreground">Open Folder</p>
                    </div>
                  </Button>
                </motion.div>

                <div className="space-y-0.5 pt-2">
                  <Button
                    type="button"
                    onClick={() => setGenerateOpen(true)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    <span className="font-medium">Generate a New Project</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={toggleCommandPalette}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <Command className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    <span className="font-medium">Command Palette</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-sans">Ctrl+Shift+P</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
            className="space-y-6"
          >
            {pinnedWorkspaces.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground flex items-center gap-1.5">
                  <Pin className="size-3 text-primary/70" />
                  Pinned
                </p>

                <div className="space-y-1.5">
                  {pinnedWorkspaces.map((ws) => (
                    <motion.div
                      key={ws.configPath}
                      whileHover={{ x: 4 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="group flex h-auto w-full items-center justify-between rounded-lg border-primary/15 bg-primary/[0.03] p-3 text-left hover:bg-accent"
                        onClick={() => {
                          const rootPath = ws.roots[0];
                          if (rootPath) onOpenRecentWorkspace?.(rootPath);
                        }}
                      >
                        <div className="min-w-0 pr-4">
                          <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-foreground">
                            {ws.name}
                          </p>
                          <p className="mt-0.5 truncate font-sans text-[10px] text-muted-foreground">
                            {trimPath(ws.roots[0] ?? "")}
                          </p>
                        </div>
                        <Pin className="h-3 w-3 shrink-0 text-primary/60" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Recent Projects</p>

              <div className="space-y-1.5">
                {recent.length === 0 ? (
                  <div className="p-6 rounded-lg border border-border bg-card text-center">
                    <p className="text-muted-foreground text-xs text-center mx-auto">No recent projects found</p>
                  </div>
                ) : (
                  recent.map((path) => {
                    const descriptor = getDescriptorForPath(path);
                    return (
                      <motion.div
                        key={path}
                        className="flex items-center group"
                      >
                        <motion.div
                          whileHover={{ x: 4 }}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            className="flex h-auto flex-1 items-center justify-between rounded-lg border-border bg-card p-3 text-left hover:bg-accent"
                            onClick={() => onOpenRecentWorkspace?.(path)}
                          >
                            <div className="min-w-0 pr-4">
                              <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-foreground">
                                {descriptor?.name ?? getBaseName(path)}
                              </p>
                              <p className="mt-0.5 truncate font-sans text-[10px] text-muted-foreground">
                                {trimPath(path)}
                              </p>
                            </div>
                          </Button>
                        </motion.div>

                        {descriptor && (
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinned(descriptor.configPath);
                            }}
                            variant="ghost"
                            size="icon-xs"
                            aria-label={descriptor.pinned ? "Unpin workspace" : "Pin workspace"}
                            className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Pin className={`size-3 ${descriptor.pinned ? "text-primary" : "text-muted-foreground"}`} />
                          </Button>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              {recent.length > 0 && (
                <Button variant="ghost" size="sm" className="ml-1 justify-start px-2 text-sm text-muted-foreground">
                  Show More...
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none opacity-40">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground font-display">Cortex by Ever3st</p>
      </div>

      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" className="text-foreground" />
          <line x1="20" y1="100" x2="120" y2="0" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" className="text-foreground" />
          <line x1="40" y1="100" x2="140" y2="0" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" className="text-foreground" />
        </svg>
      </div>

      <GenerateProjectDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  );
}
