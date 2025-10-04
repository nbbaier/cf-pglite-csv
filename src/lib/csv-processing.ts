import Papa from "papaparse";

type CSVProcessingOptions = {
	maxRows: number;
	maxColumns: number;
	maxCellSize: number;
};

const DEFAULT_OPTIONS: CSVProcessingOptions = {
	maxRows: 10_000,
	maxColumns: 100,
	maxCellSize: 10_000,
};

type CSVPipelineResult = {
	tableName: string;
	columns: string[];
	rows: string[][];
};

type RawCSV = {
	headers: string[];
	dataRows: string[][];
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
		Papa.parse<string[]>(file, {
			skipEmptyLines: "greedy",
			complete: (results) => {
				try {
					if (!results.data || results.data.length === 0) {
						reject(new Error("CSV file is empty"));
						return;
					}

					const rows = results.data as string[][];
					const headers = rows[0];
					if (!headers || headers.length === 0) {
						reject(new Error("CSV file has no headers"));
						return;
					}

					const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== ""));

					resolve({ headers, dataRows });
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
	const { headers, dataRows } = raw;

	if (headers.length > options.maxColumns) {
		throw new Error(`Too many columns. Maximum ${options.maxColumns} allowed.`);
	}

	if (dataRows.length > options.maxRows) {
		throw new Error(`Too many rows. Maximum ${options.maxRows} allowed.`);
	}

	for (const row of dataRows) {
		if (row.length !== headers.length) {
			throw new Error("Row length does not match header column count");
		}

		for (const cell of row) {
			if (cell.length > options.maxCellSize) {
				throw new Error(`Cell too large. Maximum ${options.maxCellSize} characters allowed.`);
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
		rows: raw.dataRows,
	};
}
