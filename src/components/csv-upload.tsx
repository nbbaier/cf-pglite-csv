import { cva, type VariantProps } from "class-variance-authority";
import { Upload } from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  forwardRef,
  type HTMLAttributes,
  useId,
  useRef,
  useState,
} from "react";
import { type CSVPipelineResult, processCSVFile } from "@/lib/csv-processing";
import { cn } from "@/lib/utils";

const csvUploadVariants = cva(
  "relative flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors",
  {
    variants: {
      variant: {
        default: "border-input dark:border-input/50",
        active:
          "border-blue-400 border-primary bg-blue-50 dark:border-primary dark:bg-blue-950",
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
  }
);

interface CSVUploadProps
  extends Omit<HTMLAttributes<HTMLLabelElement>, "onChange">,
    VariantProps<typeof csvUploadVariants> {
  disabled?: boolean;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  onFileProcessed: (data: CSVPipelineResult) => void;
}
const CSVUpload = forwardRef<HTMLLabelElement, CSVUploadProps>(
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
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputId = useId();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const processedFileCountRef = useRef(0);

    const isValidCSV = (file: File): boolean => {
      const fileName = file.name.toLowerCase();
      const fileType = file.type;

      return (
        fileName.endsWith(".csv") ||
        fileType === "text/csv" ||
        fileType === "application/csv"
      );
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: DragEvent) => {
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
      if (!newFiles || disabled) {
        return;
      }

      let fileArray = Array.from(newFiles);

      if (!multiple) {
        fileArray = fileArray.slice(0, 1);
      } else if (maxFiles !== undefined) {
        const remainingSlots = Math.max(
          0,
          maxFiles - processedFileCountRef.current
        );
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
        setError(
          err instanceof Error ? err.message : "Failed to process CSV file"
        );
      } finally {
        setIsProcessing(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      handleFiles(e.dataTransfer.files);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    };

    return (
      <div className="group/csv-upload w-full space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="font-medium text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: label requires drag handlers for CSV upload */}
        <label
          className={cn(
            csvUploadVariants({
              variant: isDragging ? "active" : variant,
              size,
              className,
            }),
            disabled && "cursor-not-allowed opacity-50",
            !disabled &&
              "cursor-pointer hover:border-primary/50 hover:bg-accent/50 dark:hover:border-primary/50"
          )}
          htmlFor={inputId}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          ref={ref}
          {...props}
        >
          <input
            accept=".csv,text/csv,application/csv"
            className="hidden"
            disabled={disabled}
            id={inputId}
            multiple={multiple}
            onChange={handleInputChange}
            type="file"
          />

          <div className="pointer-events-none flex flex-col items-center justify-center gap-[10px] text-center">
            <div
              className={cn(
                "rounded-full p-3 transition-colors",
                isDragging
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground group-hover/csv-upload:bg-primary/20 group-hover/csv-upload:text-primary"
              )}
            >
              <Upload className="size-6" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-base">
                {isDragging
                  ? `Drag & drop your ${multiple ? "CSVs" : "CSV"} here, or click to select`
                  : `Drag & drop your ${multiple ? "CSVs" : "CSV"} here, or click to select`}
                {isProcessing && "Processing..."}
              </p>
              <p className="text-muted-foreground/75 text-xs">
                {`Your ${multiple ? "CSVs" : "CSV"} will be automatically
								converted to database tables`}
              </p>
            </div>
          </div>
        </label>
      </div>
    );
  }
);

export { CSVUpload, csvUploadVariants };
