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
import type { CSVRow } from "@/lib/types";
import { CSVUpload } from "./csv-upload";
import { DropTableDialog } from "./drop-table-dialog";
import { ModeToggle } from "./mode-toggle";
import { SchemaDialog } from "./schema-dialog";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type CSVData = {
	tableName: string;
	columns: string[];
	rows: CSVRow[];
};

export type SchemaData = {
	column_name: string;
	data_type: string;
	character_maximum_length: string | null;
	is_nullable: string;
	column_default: string | null;
	is_primary_key: string;
};

type AddSidebarProps = {
	database: PGliteWithLive;
	tables: string[];
	onTableClick: (tableName: string) => void;
	onFileProcessed: (data: {
		tableName: string;
		columns: string[];
		rows: CSVRow[];
	}) => void;
	onDropTable: (tableName: string) => void;
	onGetSchema: (tableName: string) => Promise<SchemaData[]>;
};

export function AppSidebar({
	onTableClick,
	onFileProcessed,
	onDropTable,
	onGetSchema,
	...props
}: AddSidebarProps & React.ComponentProps<typeof Sidebar>) {
	const [dropDialogOpen, setDropDialogOpen] = useState(false);
	const [tableToDrop, setTableToDrop] = useState<string | null>(null);
	const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
	const [schemaData, setSchemaData] = useState<SchemaData[]>([]);
	const [schemaTableName, setSchemaTableName] = useState<string | null>(null);
	const [schemaLoading, setSchemaLoading] = useState(false);

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
		setDropDialogOpen(true);
	};

	const handleGetSchema = async (tableName: string) => {
		setSchemaLoading(true);
		setSchemaTableName(tableName);
		try {
			const schema = await onGetSchema(tableName);
			setSchemaData(schema);
			setSchemaDialogOpen(true);
		} catch (error) {
			console.error("Error fetching schema:", error);
		} finally {
			setSchemaLoading(false);
		}
	};

	const handleConfirmDrop = () => {
		if (tableToDrop) {
			handleDropTable(tableToDrop);
			setDropDialogOpen(false);
			setTableToDrop(null);
		}
	};

	const tableActions = [
		{
			key: "drop",
			label: "Drop table",
			onSelect: handleDropTableClick,
			tone: "destructive" as const,
		},
		{
			key: "schema",
			label: "Get schema",
			onSelect: handleGetSchema,
		},
	];

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
												className="font-mono text-sm data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex-1"
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
			<DropTableDialog
				dialogOpen={dropDialogOpen}
				setDialogOpen={setDropDialogOpen}
				tableToDrop={tableToDrop || ""}
				handleConfirmDrop={handleConfirmDrop}
			/>
			<SchemaDialog
				dialogOpen={schemaDialogOpen}
				setDialogOpen={setSchemaDialogOpen}
				schemaTableName={schemaTableName || ""}
				schemaData={schemaData}
				schemaLoading={schemaLoading}
			/>
		</>
	);
}
