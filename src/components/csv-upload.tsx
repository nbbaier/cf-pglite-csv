import { cva, type VariantProps } from "class-variance-authority";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import * as React from "react";
import { cn } from "@/lib/utils";

const csvUploadVariants = cva(
	"relative flex flex-col items-center justify-center w-full rounded-md border-2 border-dashed transition-colors",
	{
		variants: {
			variant: {
				default: "border-input dark:border-input/50",
				active:
					"border-primary border-blue-400 bg-blue-50 dark:border-primary dark:bg-blue-950",
			},
			size: {
				default: "min-h-[200px] p-8",
				sm: "min-h-[150px] p-6",
				lg: "min-h-[250px] p-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

interface CSVUploadProps
	extends Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange">,
		VariantProps<typeof csvUploadVariants> {
	onFileProcessed: (data: {
		tableName: string;
		columns: string[];
		rows: string[][];
	}) => void;
	multiple?: boolean;
	maxSize?: number;
	maxFiles?: number;
	disabled?: boolean;
}
const CSVUpload = React.forwardRef<HTMLLabelElement, CSVUploadProps>(
	(
		{
			className,
			variant,
			size,
			onFileProcessed,
			multiple = true,
			maxSize,
			maxFiles,
			disabled = false,
			...props
		},
		ref,
	) => {
		const [isDragging, setIsDragging] = React.useState(false);
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

		const handleDragEnter = (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (!disabled) {
				setIsDragging(true);
			}
		};

		const handleDragLeave = (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);
		};

		const handleDragOver = (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (disabled) {
				e.dataTransfer.dropEffect = "none";
			} else {
				e.dataTransfer.dropEffect = "copy";
			}
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
				const remainingSlots = Math.max(
					0,
					maxFiles - processedFileCountRef.current,
				);
				fileArray = fileArray.slice(0, remainingSlots);
			}

			fileArray = fileArray.filter(validateFile);

			const filesToProcess = multiple ? fileArray : fileArray.slice(0, 1);
			for (const file of filesToProcess) {
				processFile(file);
			}
		};

		const processFile = (file: File) => {
			setIsProcessing(true);
			setError(null); // Clear any previous errors

			const MAX_ROWS = 10000;
			const MAX_COLUMNS = 100;
			const MAX_CELL_SIZE = 10000; // characters

			Papa.parse(file, {
				complete: (results) => {
					try {
						if (!results.data || results.data.length === 0) {
							throw new Error("CSV file is empty");
						}

						const rows = results.data as string[][];
						const headers = rows[0];
						if (!headers || headers.length === 0) {
							throw new Error("CSV file has no headers");
						}

						if (headers.length > MAX_COLUMNS) {
							throw new Error(
								`Too many columns. Maximum ${MAX_COLUMNS} allowed.`,
							);
						}

						const dataRows = rows
							.slice(1)
							.filter((row) => row.some((cell) => cell !== ""));

						if (dataRows.length > MAX_ROWS) {
							throw new Error(`Too many rows. Maximum ${MAX_ROWS} allowed.`);
						}

						// Validate cell sizes
						for (const row of dataRows) {
							if (row.length !== headers.length) {
								throw new Error("Row length does not match header column count");
							}
							for (const cell of row) {
								if (cell.length > MAX_CELL_SIZE) {
									throw new Error(
										`Cell too large. Maximum ${MAX_CELL_SIZE} characters allowed.`,
									);
								}
							}
						}

						const tableName = file.name
							.replace(".csv", "")
							.replace(/[^a-zA-Z0-9_]/g, "_")
							.toLowerCase();

						onFileProcessed({
							tableName,
							columns: headers,
							rows: dataRows,
						});

						processedFileCountRef.current += 1;

						setIsProcessing(false);
					} catch (err) {
						setError(
							err instanceof Error ? err.message : "Failed to process CSV file",
						);
						setIsProcessing(false);
					}
				},
				error: (err) => {
					setError(err.message);
					setIsProcessing(false);
				},
				skipEmptyLines: "greedy",
			});
		};

		const handleDrop = (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			handleFiles(e.dataTransfer.files);
		};

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			handleFiles(e.target.files);
		};

		return (
			<div className="space-y-4 w-full group/csv-upload">
				{error && (
					<div className="p-4 rounded-lg border bg-destructive/10 border-destructive">
						<p className="text-sm font-medium text-destructive">{error}</p>
					</div>
				)}

				<label
					ref={ref}
					htmlFor={inputId}
					className={cn(
						csvUploadVariants({
							variant: isDragging ? "active" : variant,
							size,
							className,
						}),
						disabled && "opacity-50 cursor-not-allowed",
						!disabled &&
							"cursor-pointer hover:border-primary/50 hover:bg-accent/50 dark:hover:border-primary/50",
					)}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					{...props}
				>
					<input
						id={inputId}
						type="file"
						className="hidden"
						onChange={handleInputChange}
						accept=".csv,text/csv,application/csv"
						multiple={multiple}
						disabled={disabled}
					/>

					<div className="flex flex-col items-center justify-center gap-[10px] text-center pointer-events-none">
						<div
							className={cn(
								"p-3 rounded-full transition-colors",
								isDragging
									? "bg-primary/20 text-primary"
									: "bg-muted text-muted-foreground group-hover/csv-upload:bg-primary/20 group-hover/csv-upload:text-primary",
							)}
						>
							<Upload className="size-6" />
						</div>
						<div className="space-y-2">
							<p className="text-base font-medium">
								{isDragging
									? `Drag & drop your ${multiple ? "CSVs" : "CSV"} here, or click to select`
									: `Drag & drop your ${multiple ? "CSVs" : "CSV"} here, or click to select`}
								{isProcessing && "Processing..."}
							</p>
							<p className="text-xs text-muted-foreground/75">
								{`Your ${multiple ? "CSVs" : "CSV"} will be automatically
								converted to database tables`}
							</p>
						</div>
					</div>
				</label>
			</div>
		);
	},
);

export { CSVUpload, csvUploadVariants };
