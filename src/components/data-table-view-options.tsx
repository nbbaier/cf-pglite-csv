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

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
	const allColumns = table.getAllColumns();
	const hideableColumns = allColumns.filter((column) => column.getCanHide());
	const allVisible = hideableColumns.every((column) => column.getIsVisible());

	const toggleAllColumns = (value: boolean) => {
		hideableColumns.forEach((column) => {
			column.toggleVisibility(value);
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="flex mr-auto h-8">
					<Settings2 />
					View
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="">
				<DropdownMenuCheckboxItem checked={allVisible} onCheckedChange={toggleAllColumns}>
					All columns
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				{hideableColumns.map((column) => {
					return (
						<DropdownMenuCheckboxItem
							key={column.id}
							// className="capitalize"
							checked={column.getIsVisible()}
							onCheckedChange={(value: boolean) => column.toggleVisibility(!!value)}
						>
							{column.id}
						</DropdownMenuCheckboxItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
