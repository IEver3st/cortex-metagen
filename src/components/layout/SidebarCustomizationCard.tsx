import React, { useMemo, useRef, useState } from "react";
import {
  EyeOff,
  GripVertical,
  Layers3,
  RotateCcw,
  SquarePen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getSidebarItemDefinition,
  getSidebarItemLabel,
  moveSidebarItem,
  normalizeSidebarCustomizationProfile,
  resetSidebarItem,
  resolveSidebarCustomization,
  setSidebarItemHidden,
  setSidebarItemNickname,
  type SidebarCustomizationProfile,
  type SidebarItemId,
} from "@/lib/sidebar-customization";
import { cn } from "@/lib/utils";
import { useMetaStore } from "@/store/meta-store";
import { useSidebarCustomizationStore } from "@/store/sidebar-customization-store";

type SidebarCustomizationMode = "global" | "workspace";

function isWorkspaceMode(mode: SidebarCustomizationMode): mode is "workspace" {
  return mode === "workspace";
}

export function SidebarCustomizationCard() {
  const globalProfile = useSidebarCustomizationStore((state) => state.globalProfile);
  const setGlobalProfile = useSidebarCustomizationStore((state) => state.setGlobalProfile);
  const resetGlobalProfile = useSidebarCustomizationStore((state) => state.resetGlobalProfile);
  const workspaceSidebarProfile = useMetaStore((state) => state.workspaceSidebarProfile);
  const setWorkspaceSidebarProfile = useMetaStore((state) => state.setWorkspaceSidebarProfile);
  const workspacePath = useMetaStore((state) => state.workspacePath);

  const [mode, setMode] = useState<SidebarCustomizationMode>("global");
  const [dragItemId, setDragItemId] = useState<SidebarItemId | null>(null);
  const [insertBeforeIndex, setInsertBeforeIndex] = useState<number | null>(null);
  const itemRefs = useRef<Map<SidebarItemId, HTMLDivElement>>(new Map());

  const workspaceName = workspacePath?.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() ?? "current workspace";
  const workspaceOverrideEnabled = workspaceSidebarProfile !== null;
  const activeProfile = useMemo(
    () => normalizeSidebarCustomizationProfile(isWorkspaceMode(mode) ? workspaceSidebarProfile : globalProfile),
    [globalProfile, mode, workspaceSidebarProfile],
  );
  const activeCustomization = useMemo(
    () => resolveSidebarCustomization(activeProfile, null),
    [activeProfile],
  );

  const applyProfile = (nextProfile: SidebarCustomizationProfile) => {
    if (isWorkspaceMode(mode)) {
      setWorkspaceSidebarProfile(nextProfile);
      return;
    }

    setGlobalProfile(nextProfile);
  };

  const handleEnableWorkspaceOverride = () => {
    const seedProfile = resolveSidebarCustomization(globalProfile, workspaceSidebarProfile).profile;
    setWorkspaceSidebarProfile(seedProfile);
    setMode("workspace");
  };

  const handleDisableWorkspaceOverride = () => {
    setWorkspaceSidebarProfile(null);
    setMode("global");
  };

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>, itemId: SidebarItemId) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragItemId(itemId);
    setInsertBeforeIndex(null);
  };

  const handleGripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragItemId) return;
    const y = e.clientY;
    const items = activeCustomization.visibleItemIds;
    let insertIndex = items.length;
    for (let i = 0; i < items.length; i++) {
      const ref = itemRefs.current.get(items[i]);
      if (!ref) continue;
      const rect = ref.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        insertIndex = i;
        break;
      }
    }
    setInsertBeforeIndex(insertIndex);
  };

  const handleGripPointerUp = (e: React.PointerEvent<HTMLDivElement>, itemId: SidebarItemId) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (dragItemId && insertBeforeIndex !== null && dragItemId === itemId) {
      const newProfile = moveSidebarItem(activeProfile, dragItemId, insertBeforeIndex);
      applyProfile(newProfile);
    }
    setDragItemId(null);
    setInsertBeforeIndex(null);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted/30 border border-border text-muted-foreground">
                <Layers3 className="size-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-card-foreground">Sidebar organization</h4>
                <p className="text-xs text-muted-foreground">
                  Reorder items, rename them, and hide matching sidebar and toolbar entries.
                </p>
              </div>
            </div>
          </div>

          <div className="inline-flex rounded-md border border-border bg-muted/30 p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === "global" ? "secondary" : "ghost"}
              className="h-8 px-3 text-xs"
              onClick={() => setMode("global")}
            >
              Global default
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "workspace" ? "secondary" : "ghost"}
              className="h-8 px-3 text-xs"
              onClick={() => setMode("workspace")}
            >
              Workspace override
            </Button>
          </div>
        </div>

        {mode === "workspace" && (
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground">Use override for {workspaceName}</p>
                <p className="text-xs text-muted-foreground">
                  Disabled workspaces fall back to the global default layout immediately.
                </p>
              </div>
              <Switch
                checked={workspaceOverrideEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnableWorkspaceOverride();
                    return;
                  }
                  handleDisableWorkspaceOverride();
                }}
                aria-label="Use workspace override"
              />
            </div>

            {!workspaceOverrideEnabled && (
              <div className="mt-3 rounded-md border border-dashed border-border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">
                  This workspace is currently inheriting the global sidebar layout.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 text-xs"
                  onClick={handleEnableWorkspaceOverride}
                >
                  Start from global default
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === "workspace" && !workspaceOverrideEnabled ? null : (
          <>
            <div className="space-y-1">
              {activeCustomization.visibleItemIds.map((itemId, index) => {
                const definition = getSidebarItemDefinition(itemId);
                const label = getSidebarItemLabel(itemId, activeProfile);

                return (
                  <div key={itemId}>
                    {dragItemId !== null && insertBeforeIndex === index && dragItemId !== itemId && (
                      <div className="mx-1 mb-1 h-0.5 rounded-full bg-primary/70" />
                    )}
                    <div
                      ref={(el) => {
                        if (el) itemRefs.current.set(itemId, el);
                        else itemRefs.current.delete(itemId);
                      }}
                      className={cn(
                        "rounded-lg border border-border bg-background/30 p-3 transition-opacity",
                        dragItemId === itemId && "opacity-40",
                      )}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div
                          onPointerDown={(e) => handleGripPointerDown(e, itemId)}
                          onPointerMove={handleGripPointerMove}
                          onPointerUp={(e) => handleGripPointerUp(e, itemId)}
                          className="flex min-w-0 items-start gap-3 lg:w-[260px] cursor-grab active:cursor-grabbing select-none touch-none"
                          aria-label={`Drag ${label}`}
                          title={`Drag to reorder ${label}`}
                        >
                          <div className="mt-0.5 rounded-sm border border-border bg-muted/30 p-1 text-muted-foreground pointer-events-none">
                            <GripVertical className="size-3.5" />
                          </div>
                          <div className="min-w-0 pointer-events-none">
                            <p className="truncate text-sm font-medium text-card-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">{definition.description}</p>
                          </div>
                        </div>

                        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                              Nickname
                            </label>
                            <Input
                              value={activeProfile.nicknames[itemId] ?? ""}
                              onChange={(event) => {
                                applyProfile(setSidebarItemNickname(activeProfile, itemId, event.target.value));
                              }}
                              placeholder={definition.defaultLabel}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked
                              onCheckedChange={(checked) => {
                                applyProfile(setSidebarItemHidden(activeProfile, itemId, !checked));
                              }}
                              aria-label={`Show ${label}`}
                            />
                            <span className="text-xs text-muted-foreground">Visible</span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 justify-start text-xs text-muted-foreground"
                            onClick={() => {
                              applyProfile(resetSidebarItem(activeProfile, itemId));
                            }}
                          >
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* End-of-list drop indicator */}
              {dragItemId !== null && insertBeforeIndex === activeCustomization.visibleItemIds.length && (
                <div className="mx-1 mt-1 h-0.5 rounded-full bg-primary/70" />
              )}
            </div>

            <div className="rounded-lg border border-border bg-background/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Hidden items</p>
                  <p className="text-xs text-muted-foreground">
                    Hidden items stay available here and through settings or hotkeys.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (mode === "workspace") {
                      setWorkspaceSidebarProfile(resolveSidebarCustomization(globalProfile, null).profile);
                      return;
                    }
                    resetGlobalProfile();
                  }}
                >
                  <SquarePen className="mr-1.5 size-3.5" />
                  Reset this layout
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {activeCustomization.hiddenItemIds.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                    No hidden items
                  </div>
                ) : (
                  activeCustomization.hiddenItemIds.map((itemId) => (
                    <Button
                      key={itemId}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 text-xs"
                      onClick={() => {
                        applyProfile(setSidebarItemHidden(activeProfile, itemId, false));
                      }}
                    >
                      <EyeOff className="size-3.5" />
                      {getSidebarItemLabel(itemId, activeProfile)}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
