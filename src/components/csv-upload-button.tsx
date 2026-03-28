import { Upload } from "lucide-react";
import {
  type ChangeEvent,
  forwardRef,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { type CSVPipelineResult, processCSVFile } from "@/lib/csv-processing";

interface CSVUploadButtonProps {
  children?: ReactNode;
  disabled?: boolean;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  onFileProcessed: (data: CSVPipelineResult) => void;
}

export const CSVUploadButton = forwardRef<
  HTMLButtonElement,
  CSVUploadButtonProps
>(
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
    ref
  ) => {
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

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    };

    const handleButtonClick = () => {
      if (!(disabled || isProcessing)) {
        const input = document.getElementById(inputId) as HTMLInputElement;
        input?.click();
      }
    };

    return (
      <div className="w-full space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="font-medium text-destructive text-sm">{error}</p>
          </div>
        )}

        <input
          accept=".csv,text/csv,application/csv"
          className="hidden"
          disabled={disabled}
          id={inputId}
          multiple={multiple}
          onChange={handleInputChange}
          type="file"
        />

        <Button
          disabled={disabled || isProcessing}
          onClick={handleButtonClick}
          ref={ref}
          {...props}
        >
          <Upload className="mr-2 h-4 w-4" />
          {children || (isProcessing ? "Processing..." : "Upload CSV")}
        </Button>
      </div>
    );
  }
);

CSVUploadButton.displayName = "CSVUploadButton";
