import Papa from "papaparse";
import type { CSVRow } from "./types";

export type CSVProcessingOptions = {
	maxRows: number;
	maxColumns: number;
	maxCellSize: number;
};

const DEFAULT_OPTIONS: CSVProcessingOptions = {
	maxRows: 10_000,
	maxColumns: 100,
	maxCellSize: 10_000,
};

export type CSVPipelineResult = {
	tableName: string;
	columns: string[];
	rows: CSVRow[];
};

type RawCSV = {
	headers: string[];
	rows: CSVRow[];
};

export async function processCSVFile(
	file: File,
	options: Partial<CSVProcessingOptions> = {},
): Promise<CSVPipelineResult> {
	const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
	const raw = await parseFile(file);
	validateStructure(raw, mergedOptions);
	return normalizeData(file, raw);
}

async function parseFile(file: File): Promise<RawCSV> {
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
					`Cell value exceeds maximum size of ${options.maxCellSize} characters.`,
				);
			}
		}
	}
}

function normalizeData(file: File, raw: RawCSV): CSVPipelineResult {
	const tableName = file.name
		.replace(/\.csv$/i, "")
		.replace(/[^a-zA-Z0-9_]/g, "_")
		.toLowerCase();

	return {
		tableName,
		columns: raw.headers,
		rows: raw.rows,
	};
}
