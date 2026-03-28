import Papa from "papaparse";
import type { CSVRow } from "./types";

const CSV_EXTENSION_PATTERN = /\.csv$/i;
const NON_ALPHANUMERIC_UNDERSCORE_PATTERN = /[^a-zA-Z0-9_]/g;

export interface CSVProcessingOptions {
  maxCellSize: number;
  maxColumns: number;
  maxRows: number;
}

const DEFAULT_OPTIONS: CSVProcessingOptions = {
  maxRows: 10_000,
  maxColumns: 100,
  maxCellSize: 10_000,
};

export interface CSVPipelineResult {
  columns: string[];
  rows: CSVRow[];
  tableName: string;
}

interface RawCSV {
  headers: string[];
  rows: CSVRow[];
}

export async function processCSVFile(
  file: File,
  options: Partial<CSVProcessingOptions> = {}
): Promise<CSVPipelineResult> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const raw = await parseFile(file);
  validateStructure(raw, mergedOptions);
  return normalizeData(file, raw);
}

function parseFile(file: File): Promise<RawCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: "greedy",
      dynamicTyping: true,
      header: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            reject(new Error("CSV file is empty"));
            return;
          }

          const rows = results.data as CSVRow[];
          const headers = results.meta.fields;
          if (!headers || headers.length === 0) {
            reject(new Error("CSV file has no headers"));
            return;
          }

          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      },
      error: (err) => {
        reject(new Error(err.message));
      },
    });
  });
}

function validateStructure(raw: RawCSV, options: CSVProcessingOptions) {
  const { headers, rows } = raw;

  if (headers.length > options.maxColumns) {
    throw new Error(`Too many columns. Maximum ${options.maxColumns} allowed.`);
  }

  if (rows.length > options.maxRows) {
    throw new Error(`Too many rows. Maximum ${options.maxRows} allowed.`);
  }

  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (typeof value === "string" && value.length > options.maxCellSize) {
        throw new Error(
          `Cell value exceeds maximum size of ${options.maxCellSize} characters.`
        );
      }
    }
  }
}

function normalizeData(file: File, raw: RawCSV): CSVPipelineResult {
  const tableName = file.name
    .replace(CSV_EXTENSION_PATTERN, "")
    .replace(NON_ALPHANUMERIC_UNDERSCORE_PATTERN, "_")
    .toLowerCase();

  return {
    tableName,
    columns: raw.headers,
    rows: raw.rows,
  };
}
