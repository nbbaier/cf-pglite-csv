import { Table } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

interface NoDataProps {
	onUploadClick?: () => void;
	onRunSampleQuery?: () => void;
}

export function NoData({ onUploadClick, onRunSampleQuery }: NoDataProps) {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Table />
				</EmptyMedia>
				<EmptyTitle>No Data Loaded</EmptyTitle>
				<EmptyDescription>
					You haven&apos;t loaded any data yet. Get started by loading your first CSV
					file.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<div className="flex gap-2">
					<Button onClick={onRunSampleQuery}>Run Sample Query</Button>
					<Button variant="outline" onClick={onUploadClick}>
						Upload CSV
					</Button>
				</div>
			</EmptyContent>
		</Empty>
	);
}
