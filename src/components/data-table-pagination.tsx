import type { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DataTableViewOptions } from "./data-table-view-options";
import { Input } from "./ui/input";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
}

export function DataTablePagination<TData>({
	table,
}: DataTablePaginationProps<TData>) {
	const isFiltered = table.getState().globalFilter
		? table.getState().globalFilter.length > 0
		: false;

	return (
		<div className="flex justify-between items-center pt-3 pl-4 space-x-4 border-t">
			<div className="flex flex-1 items-center space-x-2">
				<Input
					placeholder="Search..."
					value={(table.getState().globalFilter as string) ?? ""}
					onChange={(e) => table.setGlobalFilter(String(e.target.value))}
					className="text-sm h-8 w-[150px] lg:w-[250px]"
				/>

				{isFiltered && (
					<Button
						variant="ghost"
						onClick={() => table.resetGlobalFilter()}
						className="-ml-2 h-8"
					>
						<X />
					</Button>
				)}
			</div>
			<div>
				<DataTableViewOptions table={table} />
			</div>
			<div className="flex items-center space-x-4 lg:space-x-8">
				{" "}
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						className="hidden p-0 w-8 h-8 lg:flex"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to first page</span>
						<ChevronsLeft />
					</Button>
					<Button
						variant="outline"
						className="p-0 w-8 h-8"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to previous page</span>
						<ChevronLeft />
					</Button>
					<div className="justify-center items-center px-1 text-sm font-medium">
						{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
					</div>
					<Button
						variant="outline"
						className="p-0 w-8 h-8"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to next page</span>
						<ChevronRight />
					</Button>
					<Button
						variant="outline"
						className="hidden p-0 w-8 h-8 lg:flex"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to last page</span>
						<ChevronsRight />
					</Button>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="h-8 border-0 ring-0 shadow-none focus:ring-0">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 30, 40, 50].map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
