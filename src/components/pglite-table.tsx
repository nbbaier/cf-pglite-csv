import type { Results } from "@electric-sql/pglite";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "./data-table";
import { DataTableColumnHeader } from "./data-table-column-headers";
import { Checkbox } from "./ui/checkbox";

type TableRow = Record<string, string | number | boolean | null>;
type PGLiteRow = Record<string, unknown>;

export function PGLiteTable({ data }: { data: Results }) {
  const tableData = useMemo<TableRow[]>(() => {
    if (!(data?.rows && Array.isArray(data.rows)) || data.rows.length === 0) {
      return [];
    }

    const maxRows = 10_000;
    const rowsToProcess = data.rows.slice(0, maxRows);

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: converting forEach to for...of merged complexity scopes
    const processed = rowsToProcess.map((row) => {
      const pgliteRow = row as PGLiteRow;
      const rowObject: TableRow = {};

      if (data.fields && Array.isArray(data.fields)) {
        for (const column of data.fields) {
          const value = pgliteRow[column.name];
          if (value === undefined || value === null) {
            rowObject[column.name] = null;
          } else if (typeof value === "boolean") {
            rowObject[column.name] = value;
          } else if (typeof value === "number") {
            rowObject[column.name] = value;
          } else {
            rowObject[column.name] = String(value);
          }
        }
      }

      return rowObject;
    });

    return processed;
  }, [data.fields, data.rows]);

  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    if (
      !(data?.fields && Array.isArray(data.fields)) ||
      data.fields.length === 0
    ) {
      return [];
    }

    const select: ColumnDef<TableRow>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <div className="mx-1">
            <Checkbox
              aria-label="Select all"
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              className="translate-y-[2px]"
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="mx-1">
            <Checkbox
              aria-label="Select row"
              checked={row.getIsSelected()}
              className="translate-y-[2px]"
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ];

    const maxColumns = 50;
    const fieldsToProcess = data.fields.slice(0, maxColumns);

    const intermediate: ColumnDef<TableRow>[] = fieldsToProcess.map(
      (column) => ({
        accessorKey: column.name,
        header: ({ column: col }) => (
          <DataTableColumnHeader column={col} title={column.name} />
        ),
        cell: ({ row }) => {
          const value = row.getValue<string | number | boolean | null>(
            column.name
          );
          const displayValue = value === null ? "" : String(value);
          return <div className="max-w-[500px] truncate">{displayValue}</div>;
        },
      })
    );
    return [...select, ...intermediate];
  }, [data.fields]);

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="min-h-0 flex-1">
        <DataTable columns={columns} data={tableData} />
      </div>
    </div>
  );
}
