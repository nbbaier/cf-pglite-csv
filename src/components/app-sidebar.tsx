import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { Database, MoreHorizontal, Table } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
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
	tables: { table_name: string }[];
	onTableClick: (tableName: string) => void;
	onFileProcessed: (data: {
		tableName: string;
		columns: string[];
		rows: string[][];
	}) => void;
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

	const handleDropTableClick = (tableName: string) => {
		setTableToDrop(tableName);
		setDialogOpen(true);
	};

	const handleConfirmDrop = () => {
		if (tableToDrop) {
			handleDropTable(tableToDrop);
			setDialogOpen(false);
			setTableToDrop(null);
		}
	};

	return (
		<>
			<Sidebar {...props}>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<div className="flex justify-center items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground aspect-square size-8">
									<Database className="size-4" />
								</div>
								<div className="flex flex-col gap-0.5 leading-none text-base">
									<span className="font-medium">CSV Analyzer</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Tables</SidebarGroupLabel>
						<SidebarMenu>
							{props.tables.map((item) => (
								<DropdownMenu key={item.table_name}>
									<SidebarMenuItem key={item.table_name}>
										<div className="flex items-center w-full">
											<SidebarMenuButton
												onClick={() => handleTableClick(item.table_name)}
												className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex-1"
											>
												<Table />
												<span>{item.table_name}</span>
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
										<DropdownMenuContent
											side="bottom"
											align="end"
											className="rounded-lg"
										>
											<DropdownMenuItem asChild>
												<Button
													variant="link"
													onClick={() => handleDropTableClick(item.table_name)}
												>
													Drop table
												</Button>
											</DropdownMenuItem>
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
							Are you sure you want to drop the table "{tableToDrop}"? This
							action cannot be undone and will permanently delete all data in
							the table.
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
