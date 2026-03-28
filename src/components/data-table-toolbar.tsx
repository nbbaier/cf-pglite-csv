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

export function DataTableToolbar<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const isFiltered = table.getState().globalFilter
    ? table.getState().globalFilter.length > 0
    : false;

  return (
    <div className="flex items-center justify-between space-x-4 border-t pt-3 pl-4">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          className="h-8 w-[150px] text-sm lg:w-[250px]"
          onChange={(e) => table.setGlobalFilter(String(e.target.value))}
          placeholder="Search..."
          value={(table.getState().globalFilter as string) ?? ""}
        />

        {isFiltered && (
          <Button
            className="-ml-2 h-8"
            onClick={() => table.resetGlobalFilter()}
            variant="ghost"
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
            className="hidden h-8 w-8 p-0 lg:flex"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
            variant="outline"
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            className="h-8 w-8 p-0"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            variant="outline"
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <div className="items-center justify-center px-1 font-medium text-sm">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </div>
          <Button
            className="h-8 w-8 p-0"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            variant="outline"
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            className="hidden h-8 w-8 p-0 lg:flex"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            variant="outline"
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
          <Select
            onValueChange={(value) => {
              if (value === "All") {
                const rowLength = table.getFilteredRowModel().rows.length;
                table.setPageSize(rowLength);
              } else {
                table.setPageSize(Number(value));
              }
            }}
            value={
              table.getState().pagination.pageSize ===
              table.getFilteredRowModel().rows.length
                ? "All"
                : `${table.getState().pagination.pageSize}`
            }
          >
            <SelectTrigger className="h-8 border-0 shadow-none ring-0 focus:ring-0">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50, "All"].map((pageSize) => (
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
