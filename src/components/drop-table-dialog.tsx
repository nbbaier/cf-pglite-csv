import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

type DropTableDialogProps = {
	dialogOpen: boolean;
	setDialogOpen: (open: boolean) => void;
	tableToDrop: string;
	handleConfirmDrop: () => void;
};

export function DropTableDialog({
	dialogOpen,
	setDialogOpen,
	tableToDrop,
	handleConfirmDrop,
}: DropTableDialogProps) {
	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm Drop Table</DialogTitle>
					<DialogDescription>
						Are you sure you want to drop the table "{tableToDrop}"? This action cannot be
						undone and will permanently delete all data in the table.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setDialogOpen(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleConfirmDrop}>
						Drop Table
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
