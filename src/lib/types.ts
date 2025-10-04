export type CSVRow = Record<string, string | boolean | number>;

export type RawCSV = {
	headers: string[];
	rows: string[][];
};
