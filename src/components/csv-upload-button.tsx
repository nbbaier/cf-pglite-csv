import { Upload } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { type CSVPipelineResult, processCSVFile } from "@/lib/csv-processing";

interface CSVUploadButtonProps {
	onFileProcessed: (data: CSVPipelineResult) => void;
	multiple?: boolean;
	maxSize?: number;
	maxFiles?: number;
	disabled?: boolean;
	children?: React.ReactNode;
}

export const CSVUploadButton = React.forwardRef<HTMLButtonElement, CSVUploadButtonProps>(
	(
		{
			onFileProcessed,
			multiple = true,
			maxSize,
			maxFiles,
			disabled = false,
			children,
			...props
		},
		ref,
	) => {
		const inputId = React.useId();
		const [isProcessing, setIsProcessing] = React.useState(false);
		const [error, setError] = React.useState<string | null>(null);
		const processedFileCountRef = React.useRef(0);

		const isValidCSV = (file: File): boolean => {
			const fileName = file.name.toLowerCase();
			const fileType = file.type;

			return (
				fileName.endsWith(".csv") ||
				fileType === "text/csv" ||
				fileType === "application/csv"
			);
		};

		const validateFile = (file: File): boolean => {
			if (!isValidCSV(file)) {
				console.warn(`File ${file.name} is not a valid CSV file`);
				return false;
			}
			if (maxSize && file.size > maxSize) {
				console.warn(`File ${file.name} exceeds max size of ${maxSize} bytes`);
				return false;
			}
			return true;
		};

		const handleFiles = (newFiles: FileList | null) => {
			if (!newFiles || disabled) return;

			let fileArray = Array.from(newFiles);

			if (!multiple) {
				fileArray = fileArray.slice(0, 1);
			} else if (maxFiles !== undefined) {
				const remainingSlots = Math.max(0, maxFiles - processedFileCountRef.current);
				fileArray = fileArray.slice(0, remainingSlots);
			}

			fileArray = fileArray.filter(validateFile);

			const filesToProcess = multiple ? fileArray : fileArray.slice(0, 1);
			for (const file of filesToProcess) {
				processFile(file);
			}
		};

		const processFile = async (file: File) => {
			setIsProcessing(true);
			setError(null);
			try {
				const result = await processCSVFile(file);
				onFileProcessed(result);
				processedFileCountRef.current += 1;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to process CSV file");
			} finally {
				setIsProcessing(false);
			}
		};

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			handleFiles(e.target.files);
		};

		const handleButtonClick = () => {
			if (!disabled && !isProcessing) {
				const input = document.getElementById(inputId) as HTMLInputElement;
				input?.click();
			}
		};

		return (
			<div className="space-y-4 w-full">
				{error && (
					<div className="p-4 rounded-lg border bg-destructive/10 border-destructive">
						<p className="text-sm font-medium text-destructive">{error}</p>
					</div>
				)}

				<input
					id={inputId}
					type="file"
					className="hidden"
					onChange={handleInputChange}
					accept=".csv,text/csv,application/csv"
					multiple={multiple}
					disabled={disabled}
				/>

				<Button
					ref={ref}
					onClick={handleButtonClick}
					disabled={disabled || isProcessing}
					{...props}
				>
					<Upload className="w-4 h-4 mr-2" />
					{children || (isProcessing ? "Processing..." : "Upload CSV")}
				</Button>
			</div>
		);
	},
);

CSVUploadButton.displayName = "CSVUploadButton";
