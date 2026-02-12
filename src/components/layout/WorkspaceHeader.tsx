import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useMetaStore } from "@/store/meta-store";
import { Siren, CarFront, Mountain, Zap, X, PencilLine, Trash2, ArrowRightToLine, PanelsTopLeft } from "lucide-react";
import { VehicleDropdown } from "@/components/VehicleDropdown";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function WorkspaceHeader() {
  const vehicles = useMetaStore((s) => s.vehicles);
  const openVehicleIds = useMetaStore((s) => s.openVehicleIds);
  const activeVehicleId = useMetaStore((s) => s.activeVehicleId);
  const setActiveVehicle = useMetaStore((s) => s.setActiveVehicle);
  const closeVehicleTab = useMetaStore((s) => s.closeVehicleTab);
  const closeTabsToRight = useMetaStore((s) => s.closeTabsToRight);
  const closeOtherTabs = useMetaStore((s) => s.closeOtherTabs);
  const renameVehicle = useMetaStore((s) => s.renameVehicle);
  const removeVehicle = useMetaStore((s) => s.removeVehicle);

  const openVehicles = useMemo(() => {
    return openVehicleIds
      .map((id) => vehicles[id])
      .filter(Boolean);
  }, [openVehicleIds, vehicles]);

  const tabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeVehicleId) return;
    const container = tabsRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLButtonElement>(`button[data-vehicle-tab="${activeVehicleId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeVehicleId]);

  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null);
  const [ctxVehicleId, setCtxVehicleId] = useState<string | null>(null);

  const [actionVehicleId, setActionVehicleId] = useState<string | null>(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const actionVehicle = actionVehicleId ? vehicles[actionVehicleId] : null;

  const closeContext = () => {
    setCtxOpen(false);
    setCtxPos(null);
    setCtxVehicleId(null);
  };

  useEffect(() => {
    if (!ctxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContext();
    };
    const onMouseDown = () => closeContext();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [ctxOpen]);

  const openRename = (id: string) => {
    const v = vehicles[id];
    if (!v) return;
    setActionVehicleId(id);
    setRenameValue(v.name);
    setRenameOpen(true);
  };

  const commitRename = () => {
    if (!actionVehicleId) return;
    const next = renameValue.trim();
    if (!next) return;
    renameVehicle(actionVehicleId, next);
    setRenameOpen(false);
  };

  const iconFor = (vehicle: any): { Icon: any; className: string } => {
    const cls = String(vehicle?.vehicles?.vehicleClass ?? "").toUpperCase();
    if (cls.includes("EMERGENCY")) return { Icon: Siren, className: "text-red-400" };
    if (cls.includes("SPORT")) return { Icon: Zap, className: "text-yellow-400" };
    if (cls.includes("OFFROAD") || cls.includes("SUV")) return { Icon: Mountain, className: "text-amber-400" };
    return { Icon: CarFront, className: "text-muted-foreground" };
  };

  return (
    <div className="h-10 px-2 border-b border-[#131a2b] bg-[#060e27] flex items-center gap-2">
      <div
        ref={tabsRef}
        className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden no-scrollbar"
        onWheel={(e) => {
          const el = tabsRef.current;
          if (!el) return;
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            el.scrollLeft += e.deltaY;
          }
        }}
      >
        <div className="flex items-stretch min-w-max">
          {openVehicles.map((vehicle) => {
            const { Icon, className } = iconFor(vehicle);
            const active = activeVehicleId === vehicle.id;
            return (
              <button
                key={vehicle.id}
                data-vehicle-tab={vehicle.id}
                type="button"
                onClick={() => setActiveVehicle(vehicle.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxVehicleId(vehicle.id);
                  setCtxPos({ x: e.clientX, y: e.clientY });
                  setCtxOpen(true);
                }}
                className={`h-9 px-3 border-r border-border/60 text-xs whitespace-nowrap transition-colors flex items-center gap-2 ${
                  active
                    ? "bg-card text-foreground border-t-2 border-t-primary"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
                }`}
                title={vehicle.name}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? className : "text-muted-foreground"}`} />
                <span className="max-w-[160px] truncate">{vehicle.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <VehicleDropdown hideSelector />

      {ctxOpen && ctxPos && ctxVehicleId && (
        <div
          className="fixed z-[60] border bg-card shadow-lg min-w-56 text-xs"
          style={{ left: ctxPos.x, top: ctxPos.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/40 text-left"
            onClick={() => {
              closeVehicleTab(ctxVehicleId);
              closeContext();
            }}
          >
            <X className="h-3.5 w-3.5" /> Close
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/40 text-left"
            onClick={() => {
              closeTabsToRight(ctxVehicleId);
              closeContext();
            }}
          >
            <ArrowRightToLine className="h-3.5 w-3.5" /> Close to the Right
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/40 text-left"
            onClick={() => {
              closeOtherTabs(ctxVehicleId);
              closeContext();
            }}
          >
            <PanelsTopLeft className="h-3.5 w-3.5" /> Close Others
          </button>
          <div className="h-px bg-border/60" />
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/40 text-left"
            onClick={() => {
              openRename(ctxVehicleId);
              closeContext();
            }}
          >
            <PencilLine className="h-3.5 w-3.5" /> Rename…
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/40 text-left text-destructive"
            onClick={() => {
              setActionVehicleId(ctxVehicleId);
              setDeleteOpen(true);
              closeContext();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}

      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Rename vehicle</AlertDialogTitle>
            <AlertDialogDescription>Updates the tab label and vehicle display name.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitRename()}
              className="h-8 text-xs font-mono"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={commitRename}>Rename</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Vehicle"
        description={`Delete "${actionVehicle?.name ?? ""}" from this workspace? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (actionVehicleId) removeVehicle(actionVehicleId);
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
