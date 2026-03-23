import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { WorkspaceSwitcherWorkspace } from "@/store/workspace-switcher-store";

import { WorkspaceScene } from "./WorkspaceScene";

const THUMBNAIL_WIDTH = 132;
const THUMBNAIL_HEIGHT = 84;
const THUMBNAIL_SCENE_WIDTH = 320;
const THUMBNAIL_SCENE_HEIGHT = 204;
const THUMBNAIL_SCENE_SCALE = THUMBNAIL_WIDTH / THUMBNAIL_SCENE_WIDTH;

interface WorkspaceSwitcherProps {
  open: boolean;
  workspaces: WorkspaceSwitcherWorkspace[];
  activeWorkspaceId: string | null;
  highlightedWorkspaceId: string | null;
  hoveredWorkspaceId: string | null;
  keyboardPreviewActive: boolean;
  renamingWorkspaceId: string | null;
  deleteConfirmationId: string | null;
  onHoverWorkspace: (id: string | null) => void;
  onHighlightWorkspace: (id: string | null) => void;
  onActivateWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onSetRenamingWorkspace: (id: string | null) => void;
  onRequestDeleteWorkspace: (id: string | null) => void;
  onDeleteWorkspace: (id: string) => void;
}

interface WorkspaceLabelProps {
  workspace: WorkspaceSwitcherWorkspace;
  index: number;
  active: boolean;
  hovered: boolean;
  renaming: boolean;
  deleteConfirming: boolean;
  open: boolean;
  onActivateWorkspace: (id: string) => void;
  onHighlightWorkspace: (id: string | null) => void;
  onHoverWorkspace: (id: string | null) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onSetRenamingWorkspace: (id: string | null) => void;
  onRequestDeleteWorkspace: (id: string | null) => void;
  onDeleteWorkspace: (id: string) => void;
}

const WorkspaceLabel = memo(function WorkspaceLabel({
  workspace,
  index,
  active,
  hovered,
  renaming,
  deleteConfirming,
  open,
  onActivateWorkspace,
  onHighlightWorkspace,
  onHoverWorkspace,
  onRenameWorkspace,
  onSetRenamingWorkspace,
  onRequestDeleteWorkspace,
  onDeleteWorkspace,
}: WorkspaceLabelProps) {
  const [draftName, setDraftName] = useState(workspace.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!renaming) {
      return;
    }

    setDraftName(workspace.name);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, renaming, workspace.name]);

  const commitRename = () => {
    onRenameWorkspace(workspace.id, draftName.trim() || workspace.name);
    onSetRenamingWorkspace(null);
  };

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-2"
      style={{ width: THUMBNAIL_WIDTH }}
    >
      <button
        type="button"
        className={cn(
          "group relative overflow-visible rounded-[6px] border-[1.5px] bg-card text-left transition-[transform,opacity,border-color] duration-150 ease-out",
          hovered && "scale-[1.04]",
          (hovered || active) && !deleteConfirming && "border-primary",
          deleteConfirming && "border-destructive",
          !hovered && !active && !deleteConfirming && "border-border/70"
        )}
        style={{
          width: THUMBNAIL_WIDTH,
          height: THUMBNAIL_HEIGHT,
          willChange: "transform, opacity",
        }}
        onMouseEnter={() => {
          onHoverWorkspace(workspace.id);
          onHighlightWorkspace(workspace.id);
        }}
        onMouseLeave={() => onHoverWorkspace(null)}
        onClick={() => onActivateWorkspace(workspace.id)}
      >
        {active ? (
          <span className="absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" />
        ) : null}
        <span
          className={cn(
            "absolute left-2 top-1.5 font-mono text-[9px]",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {index + 1}
        </span>
        <div className="absolute inset-0 overflow-hidden rounded-[4px]">
          <div
            style={{
              width: THUMBNAIL_SCENE_WIDTH,
              height: THUMBNAIL_SCENE_HEIGHT,
              transform: `scale(${THUMBNAIL_SCENE_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <WorkspaceScene workspace={workspace} compact />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className={cn(
            "absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100",
            deleteConfirming && "border-destructive/40 text-destructive"
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (deleteConfirming) {
              onDeleteWorkspace(workspace.id);
              return;
            }
            onRequestDeleteWorkspace(workspace.id);
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      </button>

      {renaming ? (
        <Input
          ref={inputRef}
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitRename();
            }
            if (event.key === "Escape") {
              setDraftName(workspace.name);
              onSetRenamingWorkspace(null);
            }
          }}
          className="h-7 rounded-[4px] border-[0.5px] px-2 text-center font-mono text-[10px]"
          style={{ width: THUMBNAIL_WIDTH }}
        />
      ) : (
        <button
          type="button"
          className={cn(
            "truncate text-center font-mono text-[10px] transition-colors",
            deleteConfirming
              ? "text-destructive"
              : active
                ? "text-foreground"
                : hovered
                  ? "text-muted-foreground"
                  : "text-muted-foreground/70"
          )}
          onDoubleClick={() => onSetRenamingWorkspace(workspace.id)}
          onClick={() => onActivateWorkspace(workspace.id)}
          style={{ width: THUMBNAIL_WIDTH }}
        >
          {deleteConfirming ? "Confirm delete" : workspace.name}
        </button>
      )}
    </div>
  );
}, (previousProps, nextProps) => {
  return (
    previousProps.workspace === nextProps.workspace &&
    previousProps.index === nextProps.index &&
    previousProps.active === nextProps.active &&
    previousProps.hovered === nextProps.hovered &&
    previousProps.renaming === nextProps.renaming &&
    previousProps.deleteConfirming === nextProps.deleteConfirming &&
    previousProps.open === nextProps.open
  );
});

export const WorkspaceSwitcher = memo(function WorkspaceSwitcher({
  open,
  workspaces,
  activeWorkspaceId,
  highlightedWorkspaceId,
  hoveredWorkspaceId,
  keyboardPreviewActive,
  renamingWorkspaceId,
  deleteConfirmationId,
  onHoverWorkspace,
  onHighlightWorkspace,
  onActivateWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onSetRenamingWorkspace,
  onRequestDeleteWorkspace,
  onDeleteWorkspace,
}: WorkspaceSwitcherProps) {
  useEffect(() => {
    if (!deleteConfirmationId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => onRequestDeleteWorkspace(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [deleteConfirmationId, onRequestDeleteWorkspace]);

  const previewWorkspaceId =
    hoveredWorkspaceId ?? (keyboardPreviewActive ? highlightedWorkspaceId : null);

  const previewWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === previewWorkspaceId) ?? null,
    [previewWorkspaceId, workspaces]
  );

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[19px] top-0 z-50"
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 flex flex-col bg-background-app transition-[transform,opacity] duration-180",
          open ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-6 opacity-0"
        )}
      >
        <div className="border-b border-[0.5px] border-border/60 bg-background-app px-4 pt-4">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-start justify-center gap-4 pb-4">
            {workspaces.map((workspace, index) => {
              const hovered =
                workspace.id === hoveredWorkspaceId ||
                (keyboardPreviewActive && workspace.id === highlightedWorkspaceId);
              const active = workspace.id === activeWorkspaceId;
              const dimmed =
                hoveredWorkspaceId !== null && hoveredWorkspaceId !== workspace.id;

              return (
                <div
                  key={`${workspace.id}-${workspace.previewVersion}`}
                  className={cn(
                    "transition-opacity duration-150",
                    dimmed && "opacity-50"
                  )}
                >
                  <WorkspaceLabel
                    workspace={workspace}
                    index={index}
                    active={active}
                    hovered={hovered}
                    renaming={workspace.id === renamingWorkspaceId}
                    deleteConfirming={workspace.id === deleteConfirmationId}
                    open={open}
                    onActivateWorkspace={onActivateWorkspace}
                    onHighlightWorkspace={onHighlightWorkspace}
                    onHoverWorkspace={onHoverWorkspace}
                    onRenameWorkspace={onRenameWorkspace}
                    onSetRenamingWorkspace={onSetRenamingWorkspace}
                    onRequestDeleteWorkspace={onRequestDeleteWorkspace}
                    onDeleteWorkspace={onDeleteWorkspace}
                  />
                </div>
              );
            })}

            <div
              className="flex shrink-0 flex-col items-center gap-2"
              style={{ width: THUMBNAIL_WIDTH }}
            >
              <Button
                type="button"
                variant="outline"
                className="h-16 w-[100px] rounded-[6px] border-[0.5px] border-dashed border-border bg-card font-mono text-[10px] text-muted-foreground transition-[transform,opacity,border-color,color] duration-150 ease-out hover:border-primary hover:text-primary"
                style={{
                  width: THUMBNAIL_WIDTH,
                  height: THUMBNAIL_HEIGHT,
                  willChange: "transform, opacity",
                }}
                onMouseEnter={() => onHoverWorkspace(null)}
                onClick={onCreateWorkspace}
              >
                <Plus className="size-4" />
              </Button>
              <span
                className="truncate text-center font-mono text-[10px] text-muted-foreground"
                style={{ width: THUMBNAIL_WIDTH }}
              >
                Add workspace
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-background-app">
          {workspaces.map((workspace) => {
            const visible = previewWorkspace?.id === workspace.id;

            return (
              <div
                key={`preview-${workspace.id}-${workspace.previewVersion}`}
                className="absolute inset-0 px-4 py-4 transition-opacity duration-150"
                style={{
                  opacity: visible ? 1 : 0,
                  visibility: visible ? "visible" : "hidden",
                  pointerEvents: visible ? "auto" : "none",
                  willChange: "opacity",
                  contain: "layout paint style",
                }}
              >
                <WorkspaceScene workspace={workspace} />
              </div>
            );
          })}

          {!previewWorkspace ? (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-muted-foreground">
              hover a workspace to preview
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
