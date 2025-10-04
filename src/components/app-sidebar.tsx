import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { Database, MoreHorizontal, Table } from "lucide-react";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { CSVUpload } from "./csv-upload";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type CSVData = {
	tableName: string;
	columns: string[];
	rows: string[][];
};

type AddSidebarProps = {
	database: PGliteWithLive;
	tables: string[];
	onTableClick: (tableName: string) => void;
	onFileProcessed: (data: { tableName: string; columns: string[]; rows: string[][] }) => void;
	onDropTable: (tableName: string) => void;
};

export function AppSidebar({
	onTableClick,
	onFileProcessed,
	onDropTable,
	...props
}: AddSidebarProps & React.ComponentProps<typeof Sidebar>) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [tableToDrop, setTableToDrop] = useState<string | null>(null);

	const handleTableClick = (tableName: string) => {
		onTableClick(tableName);
	};

	const handleFileProcessed = (data: CSVData) => {
		onFileProcessed(data);
	};

	const handleDropTable = (tableName: string) => {
		onDropTable(tableName);
	};

	const handleDropTableClick = useCallback((tableName: string) => {
		setTableToDrop(tableName);
		setDialogOpen(true);
	}, []);

	const handleConfirmDrop = () => {
		if (tableToDrop) {
			handleDropTable(tableToDrop);
			setDialogOpen(false);
			setTableToDrop(null);
		}
	};

	const tableActions = useMemo(
		() => [
			{
				key: "drop",
				label: "Drop table",
				onSelect: handleDropTableClick,
				tone: "destructive" as const,
			},
		],
		[handleDropTableClick],
	);

	return (
		<>
			<Sidebar {...props}>
				<SidebarHeader className="border-b h-16">
					<SidebarMenu>
						<SidebarMenuItem>
							<div className="flex items-center justify-between p-2">
								<div className="flex items-center gap-2">
									<div className="flex justify-center items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground aspect-square size-8">
										<Database className="size-4" />
									</div>
									<div className="flex flex-col gap-0.5 leading-none text-base">
										<span className="font-medium">CSV Analyzer</span>
									</div>
								</div>
								<ModeToggle />
							</div>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Tables</SidebarGroupLabel>
						<SidebarMenu>
							{props.tables.map((tableName) => (
								<DropdownMenu key={tableName}>
									<SidebarMenuItem key={tableName}>
										<div className="flex items-center w-full">
											<SidebarMenuButton
												onClick={() => handleTableClick(tableName)}
												className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex-1"
											>
												<Table />
												<span>{tableName}</span>
											</SidebarMenuButton>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="p-0 ml-auto w-6 h-6 hover:bg-sidebar-accent"
													onClick={(e) => e.stopPropagation()}
												>
													<MoreHorizontal className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
										</div>
										<DropdownMenuContent side="bottom" align="end" className="rounded-lg">
											{tableActions.map((action) => (
												<DropdownMenuItem
													key={action.key}
													onSelect={(event) => {
														event.preventDefault();
														action.onSelect(tableName);
													}}
													className={
														action.tone === "destructive"
															? "text-destructive focus:text-destructive"
															: undefined
													}
												>
													{action.label}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</SidebarMenuItem>
								</DropdownMenu>
							))}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<CSVUpload
						variant="default"
						size="default"
						onFileProcessed={handleFileProcessed}
						maxSize={5 * 1024 * 1024}
						multiple={true}
					/>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Drop Table</DialogTitle>
						<DialogDescription>
							Are you sure you want to drop the table "{tableToDrop}"? This action cannot be undone
							and will permanently delete all data in the table.
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
		</>
	);
}
