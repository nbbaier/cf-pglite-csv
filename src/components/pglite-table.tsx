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
		const processed = data.rows.map((row) => {
			const pgliteRow = row as PGLiteRow;
			const rowObject: TableRow = {};

			data.fields.forEach((column) => {
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
			});

			return rowObject;
		});

		return processed;
	}, [data.fields, data.rows]);

	const columns = useMemo<ColumnDef<TableRow>[]>(() => {
		const select: ColumnDef<TableRow>[] = [
			{
				id: "select",
				header: ({ table }) => (
					<div className="mx-1">
						<Checkbox
							checked={
								table.getIsAllPageRowsSelected() ||
								(table.getIsSomePageRowsSelected() && "indeterminate")
							}
							onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
							aria-label="Select all"
							className="translate-y-[2px]"
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className="mx-1">
						<Checkbox
							checked={row.getIsSelected()}
							onCheckedChange={(value) => row.toggleSelected(!!value)}
							aria-label="Select row"
							className="translate-y-[2px]"
						/>
					</div>
				),
				enableSorting: false,
				enableHiding: false,
			},
		];
		const intermediate: ColumnDef<TableRow>[] = data.fields.map((column) => ({
			accessorKey: column.name,
			header: ({ column: col }) => (
				<DataTableColumnHeader column={col} title={column.name} />
			),
			cell: ({ row }) => {
				const value = row.getValue<string | number | boolean | null>(column.name);
				const displayValue = value === null ? "" : String(value);
				return <div className="max-w-[500px] truncate">{displayValue}</div>;
			},
		}));
		return [...select, ...intermediate];
	}, [data.fields]);

	return (
		<div className="flex flex-col space-y-3 h-full">
			<div className="flex-1 min-h-0">
				<DataTable columns={columns} data={tableData} />
			</div>
		</div>
	);
}
