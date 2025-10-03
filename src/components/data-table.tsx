import {
	type ColumnDef,
	type ColumnFiltersState,
	filterFns,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { Dot } from "lucide-react";
import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	className?: string;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	className,
}: DataTableProps<TData, TValue>) {
	const [rowSelection, setRowSelection] = useState({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
		},
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		globalFilterFn: filterFns.includesString,
	});

	const filteredRowModel = table.getFilteredRowModel();
	const filteredSelectedRowModel = table.getFilteredSelectedRowModel();

	const allColumns = table.getAllColumns();

	return (
		<div className={cn("flex flex-col space-y-3 h-full", className)}>
			<div className="flex flex-shrink-0 items-center pt-3 pr-4 pl-4 space-x-1">
				<div className="text-sm text-muted-foreground">
					<div className="flex-1 text-sm text-muted-foreground">
						<div className="block md:hidden">
							{filteredRowModel.rows.length} ×{" "}
							{allColumns.filter((column) => column.getIsVisible()).length -
								1}{" "}
						</div>
						<div className="hidden md:block">
							{filteredRowModel.rows.length} rows ×{" "}
							{allColumns.filter((column) => column.getIsVisible()).length - 1}{" "}
							columns
						</div>
					</div>
				</div>
				<Dot className="size-4" />
				<div className="text-sm text-muted-foreground">
					<div className="flex-1 text-sm text-muted-foreground">
						<div className="block md:hidden">
							{" "}
							{filteredSelectedRowModel.rows.length} /{" "}
							{filteredRowModel.rows.length} selected
						</div>
						<div className="hidden md:block">
							{filteredSelectedRowModel.rows.length} of{" "}
							{filteredRowModel.rows.length} row(s) selected
						</div>
					</div>
				</div>
			</div>

			<DataTablePagination table={table} />

			<div className="overflow-auto flex-1 border-t">
				<Table className="border-b">
					<TableHeader className="sticky top-0 z-10 bg-background">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id} className="bg-muted">
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
