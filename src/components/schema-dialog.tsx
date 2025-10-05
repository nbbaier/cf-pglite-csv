import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { KeyRound as KeyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaData } from "./app-sidebar";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

type SchemaDialogProps = {
	dialogOpen: boolean;
	setDialogOpen: (open: boolean) => void;
	schemaTableName: string;
	schemaData: SchemaData[];
	schemaLoading: boolean;
};

type SchemaDisplayData = {
	column_name: string;
	data_type: string;
	is_nullable: string;
	is_primary_key: string;
};

export function SchemaDialog({
	dialogOpen,
	setDialogOpen,
	schemaTableName,
	schemaData,
	schemaLoading,
}: SchemaDialogProps) {
	const schemaColumns: ColumnDef<SchemaDisplayData>[] = [
		{
			accessorKey: "is_primary_key",
			cell: ({ row }) => {
				return (
					<div className="flex items-center justify-center">
						{row.getValue("is_primary_key") === "YES" ? (
							<KeyIcon className="size-4" />
						) : (
							""
						)}
					</div>
				);
			},
			header: "",
		},
		{
			accessorKey: "column_name",
			cell: ({ row }) => {
				return <div>{row.getValue("column_name")}</div>;
			},
			header: "Column Name",
		},
		{
			accessorKey: "data_type",
			cell: ({ row }) => {
				return <div>{row.getValue("data_type")}</div>;
			},
			header: "Data Type",
		},
		{
			accessorKey: "is_nullable",
			cell: ({ row }) => {
				return <div>{row.getValue("is_nullable") === "YES" ? "" : "not null"}</div>;
			},
			header: "Nullable",
		},
	];

	const schemaDisplayData = schemaData.map((data) => {
		return {
			column_name: data.column_name,
			data_type:
				data.data_type === "character varying"
					? `varchar(${data.character_maximum_length})`
					: data.data_type,
			is_nullable: data.is_nullable,
			is_primary_key: data.is_primary_key,
		};
	});

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>
						Table Schema{" "}
						<span className="bg-muted rounded ml-1 px-1 pb-0.5 border  font-mono">
							{schemaTableName}
						</span>
					</DialogTitle>
					<DialogDescription>
						Column information and constraints for the selected table.
					</DialogDescription>
				</DialogHeader>
				{schemaLoading ? (
					<div className="flex justify-center items-center py-8">
						<div className="text-muted-foreground">Loading schema...</div>
					</div>
				) : (
					<div className="max-h-96 overflow-auto">
						<SchemaTable
							data={schemaDisplayData}
							columns={schemaColumns}
							className="text-sm font-mono"
						/>
					</div>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={() => setDialogOpen(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function SchemaTable<TData, TValue>({
	columns,
	data,
	className,
}: {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	className?: string;
}) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className={cn("border rounded-md", className)}>
			<Table>
				<TableHeader className="bg-muted">
					<TableRow>
						{columns.map((column) => (
							<TableHead className="font-semibold" key={column.id}>
								{column.header?.toString()}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow className="" key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<TableCell className="" key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
