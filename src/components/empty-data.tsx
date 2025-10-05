import { Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import type { CSVPipelineResult } from "@/lib/csv-processing";
import { CSVUpload } from "./csv-upload";

interface NoDataProps {
	onRunSampleQuery?: () => void;
	onFileProcessed: (data: CSVPipelineResult) => void;
}

export function NoData({ onRunSampleQuery, onFileProcessed }: NoDataProps) {
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
				<div className="flex flex-col items-center gap-4 w-full max-w-md">
					{onRunSampleQuery && (
						<Button onClick={onRunSampleQuery}>Run Sample Query</Button>
					)}
					<CSVUpload size="sm" onFileProcessed={onFileProcessed} multiple={false} />
				</div>
			</EmptyContent>
		</Empty>
	);
}
