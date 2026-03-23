import { useCallback, useMemo } from "react";
import {
  Wrench,
  CarFront,
  Siren,
  Package,
  Palette,
  LayoutPanelTop,
  FolderOpen,
  FolderTree,
  Save,
  Undo2,
  Redo2,
  Settings,
  Code,
  Files,
  Plus,
  Home,
  PanelLeft,
  PackageCheck,
  Pin,
  Trash2,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import { useWorkspaceStore } from "@/store/workspace-store";

import type { ComponentType } from "react";

interface CommandAction {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  shortcut?: string;
  group: string;
  disabled?: boolean;
  action: () => void;
}

interface CommandPaletteProps {
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSaveFile?: () => void;
  onExportAll?: () => Promise<void>;
  onOpenRecentWorkspace?: (path: string) => void;
}

const TAB_ICONS: Record<MetaFileType, ComponentType<{ className?: string }>> = {
  handling: Wrench,
  vehicles: CarFront,
  carcols: Siren,
  modkits: Package,
  carvariations: Palette,
  vehiclelayouts: LayoutPanelTop,
};

const TAB_LABELS: Record<MetaFileType, string> = {
  handling: "Handling Editor",
  vehicles: "Vehicles Editor",
  carcols: "Sirens Editor",
  modkits: "ModKits Editor",
  carvariations: "Variations Editor",
  vehiclelayouts: "Layouts Editor",
};

export function CommandPalette({
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onExportAll,
  onOpenRecentWorkspace,
}: CommandPaletteProps) {
  const open = useWorkspaceStore((s) => s.commandPaletteOpen);
  const setOpen = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const descriptors = useWorkspaceStore((s) => s.descriptors);

  const setActiveTab = useMetaStore((s) => s.setActiveTab);
  const setUIView = useMetaStore((s) => s.setUIView);
  const toggleCodePreview = useMetaStore((s) => s.toggleCodePreview);
  const toggleSidebarCollapsed = useMetaStore((s) => s.toggleSidebarCollapsed);
  const undo = useMetaStore((s) => s.undo);
  const redo = useMetaStore((s) => s.redo);
  const canUndo = useMetaStore((s) => s.canUndo);
  const canRedo = useMetaStore((s) => s.canRedo);
  const vehicles = useMetaStore((s) => s.vehicles);
  const reopenVehicleTab = useMetaStore((s) => s.reopenVehicleTab);
  const startNewProject = useMetaStore((s) => s.startNewProject);

  const hasVehicles = Object.keys(vehicles).length > 0;

  const runAction = useCallback(
    (action: () => void) => {
      setOpen(false);
      // Defer to next frame so the dialog closes first
      requestAnimationFrame(action);
    },
    [setOpen]
  );

  const commands = useMemo<CommandAction[]>(() => {
    const cmds: CommandAction[] = [];

    // -- File commands --
    cmds.push({
      id: "file:open",
      label: "Open File",
      icon: FolderOpen,
      shortcut: "Ctrl+O",
      group: "File",
      action: () => onOpenFile?.(),
    });
    cmds.push({
      id: "file:open-folder",
      label: "Open Folder",
      icon: FolderTree,
      group: "File",
      action: () => onOpenFolder?.(),
    });
    cmds.push({
      id: "file:save",
      label: "Save",
      icon: Save,
      shortcut: "Ctrl+S",
      group: "File",
      disabled: !hasVehicles,
      action: () => onSaveFile?.(),
    });
    cmds.push({
      id: "file:export-all",
      label: "Export All to ZIP",
      icon: PackageCheck,
      group: "File",
      disabled: !hasVehicles,
      action: () => void onExportAll?.(),
    });
    cmds.push({
      id: "file:new-project",
      label: "New Project",
      icon: Plus,
      group: "File",
      action: () => startNewProject(),
    });

    // -- Navigation commands --
    cmds.push({
      id: "nav:home",
      label: "Go to Home",
      icon: Home,
      group: "Navigation",
      action: () => setUIView("home"),
    });
    cmds.push({
      id: "nav:settings",
      label: "Open Settings",
      icon: Settings,
      group: "Navigation",
      action: () => setUIView("settings"),
    });
    cmds.push({
      id: "nav:merge",
      label: "Open Meta Merging",
      icon: Files,
      group: "Navigation",
      action: () => setUIView("merge"),
    });

    // -- Editor tab commands --
    for (const tab of Object.keys(TAB_LABELS) as MetaFileType[]) {
      cmds.push({
        id: `tab:${tab}`,
        label: `Switch to ${TAB_LABELS[tab]}`,
        icon: TAB_ICONS[tab],
        group: "Editor Tabs",
        disabled: !hasVehicles,
        action: () => {
          setActiveTab(tab);
          setUIView("workspace");
        },
      });
    }

    // -- View commands --
    cmds.push({
      id: "view:toggle-code",
      label: "Toggle Code Preview",
      icon: Code,
      group: "View",
      action: () => toggleCodePreview(),
    });
    cmds.push({
      id: "view:toggle-sidebar",
      label: "Toggle Sidebar",
      icon: PanelLeft,
      group: "View",
      action: () => toggleSidebarCollapsed(),
    });

    // -- Edit commands --
    cmds.push({
      id: "edit:undo",
      label: "Undo",
      icon: Undo2,
      shortcut: "Ctrl+Z",
      group: "Edit",
      disabled: !canUndo(),
      action: () => undo(),
    });
    cmds.push({
      id: "edit:redo",
      label: "Redo",
      icon: Redo2,
      shortcut: "Ctrl+Y",
      group: "Edit",
      disabled: !canRedo(),
      action: () => redo(),
    });

    return cmds;
  }, [
    hasVehicles,
    onOpenFile,
    onOpenFolder,
    onSaveFile,
    onExportAll,
    setActiveTab,
    setUIView,
    toggleCodePreview,
    toggleSidebarCollapsed,
    undo,
    redo,
    canUndo,
    canRedo,
    startNewProject,
  ]);

  const vehicleEntries = useMemo(() => Object.values(vehicles), [vehicles]);

  const groups = useMemo(() => {
    const groupMap = new Map<string, CommandAction[]>();
    for (const cmd of commands) {
      const existing = groupMap.get(cmd.group) ?? [];
      existing.push(cmd);
      groupMap.set(cmd.group, existing);
    }
    return groupMap;
  }, [commands]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Search for commands, vehicles, or workspaces"
      showCloseButton={false}
      className="max-w-xl border-border/70 bg-popover shadow"
    >
      <CommandInput
        placeholder="Type a command or search..."
        className="text-foreground placeholder:text-muted-foreground"
      />
      <CommandList className="max-h-[400px] border-t border-border/60">
        <CommandEmpty className="text-muted-foreground">
          No results found.
        </CommandEmpty>

        {/* Vehicle entries for quick switch */}
        {vehicleEntries.length > 0 && (
          <CommandGroup heading="Vehicles" className="text-muted-foreground">
            {vehicleEntries.map((v) => (
              <CommandItem
                key={v.id}
                value={`vehicle ${v.name} ${v.vehicles.modelName} ${v.vehicles.handlingId}`}
                onSelect={() =>
                  runAction(() => {
                    reopenVehicleTab(v.id);
                    setUIView("workspace");
                  })
                }
                className="text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <CarFront className="size-4 text-muted-foreground" />
                <span>{v.name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {v.vehicles.modelName}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="bg-border/60" />

        {/* Recent workspaces */}
        {descriptors.length > 0 && (
          <>
            <CommandGroup heading="Workspaces" className="text-muted-foreground">
              {descriptors.slice(0, 8).map((ws) => {
                const rootPath = ws.roots[0] ?? "";
                return (
                  <CommandItem
                    key={ws.configPath}
                    value={`workspace ${ws.name} ${ws.roots.join(" ")}`}
                    onSelect={() =>
                      runAction(() => {
                        if (rootPath) onOpenRecentWorkspace?.(rootPath);
                      })
                    }
                    className="text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    {ws.pinned ? (
                      <Pin className="size-4 text-primary" />
                    ) : (
                      <FolderTree className="size-4 text-muted-foreground" />
                    )}
                    <span>{ws.name}</span>
                    <span className="ml-auto max-w-[200px] truncate text-[10px] text-muted-foreground">
                      {rootPath}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator className="bg-border/60" />
          </>
        )}

        {/* Command groups */}
        {[...groups.entries()].map(([group, cmds]) => (
          <CommandGroup key={group} heading={group} className="text-muted-foreground">
            {cmds.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <CommandItem
                  key={cmd.id}
                  value={cmd.label}
                  disabled={cmd.disabled}
                  onSelect={() => runAction(cmd.action)}
                  className="text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <CommandShortcut className="text-muted-foreground">
                      {cmd.shortcut}
                    </CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
