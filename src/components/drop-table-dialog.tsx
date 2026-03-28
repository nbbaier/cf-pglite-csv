import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface DropTableDialogProps {
  dialogOpen: boolean;
  handleConfirmDrop: () => void;
  setDialogOpen: (open: boolean) => void;
  tableToDrop: string;
}

export function DropTableDialog({
  dialogOpen,
  setDialogOpen,
  tableToDrop,
  handleConfirmDrop,
}: DropTableDialogProps) {
  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Drop Table</DialogTitle>
          <DialogDescription>
            Are you sure you want to drop the table "{tableToDrop}"? This action
            cannot be undone and will permanently delete all data in the table.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setDialogOpen(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleConfirmDrop} variant="destructive">
            Drop Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
