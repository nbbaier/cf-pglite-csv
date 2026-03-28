import type { Table } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const allColumns = table.getAllColumns();
  const hideableColumns = allColumns.filter((column) => column.getCanHide());
  const allVisible = hideableColumns.every((column) => column.getIsVisible());

  const toggleAllColumns = (value: boolean) => {
    for (const column of hideableColumns) {
      column.toggleVisibility(value);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="mr-auto flex h-8" size="sm" variant="outline">
          <Settings2 />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="">
        <DropdownMenuCheckboxItem
          checked={allVisible}
          onCheckedChange={toggleAllColumns}
        >
          All columns
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => {
          return (
            <DropdownMenuCheckboxItem
              checked={column.getIsVisible()}
              key={column.id}
              onCheckedChange={(value: boolean) =>
                column.toggleVisibility(!!value)
              }
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
