import type { Column, RowModel } from "@tanstack/react-table";
import { Dot } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableStatsHeadersProps<TData, TValue> {
  allColumns: Column<TData, TValue>[];
  className?: string;
  filteredRowModel: RowModel<TData>;
  filteredSelectedRowModel: RowModel<TData>;
}

export function DataTableStatsHeaders<TData, TValue>({
  filteredRowModel,
  filteredSelectedRowModel,
  allColumns,
  className,
}: DataTableStatsHeadersProps<TData, TValue>) {
  return (
    <div className={cn("flex flex-shrink-0 items-center space-x-1", className)}>
      <div className="text-muted-foreground text-sm">
        <div className="flex-1 text-muted-foreground text-sm">
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
      <div className="text-muted-foreground text-sm">
        <div className="flex-1 text-muted-foreground text-sm">
          <div className="block md:hidden">
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
  );
}
