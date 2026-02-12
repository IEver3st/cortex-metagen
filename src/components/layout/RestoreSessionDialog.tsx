import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { History } from "lucide-react";

interface RestoreSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleCount: number;
  timestamp?: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RestoreSessionDialog({ open, onOpenChange, vehicleCount, timestamp, onRestore, onDiscard }: RestoreSessionDialogProps) {
  const timeLabel = timestamp ? new Date(timestamp).toLocaleString() : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <History />
          </AlertDialogMedia>
          <AlertDialogTitle>Restore previous session?</AlertDialogTitle>
          <AlertDialogDescription>
            {vehicleCount > 0
              ? `A draft session with ${vehicleCount} vehicle${vehicleCount === 1 ? "" : "s"} is available${timeLabel ? ` from ${timeLabel}` : ""}.`
              : "A previous session draft is available."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Start fresh</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
