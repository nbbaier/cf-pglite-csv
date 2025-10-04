import type { PGlite } from "@electric-sql/pglite";
import type { PGliteWithLive } from "@electric-sql/pglite/live";
import type { CSVRow } from "./types";

interface ColumnDefinition {
	name: string;
	pgType: string;
	nullable: boolean;
}

interface TypeInference {
	hasNull: boolean;
	hasBoolean: boolean;
	hasNumber: boolean;
	hasString: boolean;
	maxLength: number;
	hasDecimals: boolean;
	minValue: number;
	maxValue: number;
}

type ColumnMetadata = {
	originalName: string;
	sanitizedName: string;
	pgType: string;
};

type TableMetadata = {
	tableName: string;
	sanitizedTableName: string;
	columns: ColumnMetadata[];
	rowCount: number;
};

interface CreateTableOptions {
	includeIfNotExists?: boolean;
	primaryKeyName?: string;
}

export function sanitizeSqlIdentifier(identifier: string): string {
	let sanitized = identifier.trim().replace(/[^a-zA-Z0-9_]/g, "_");

	const needsQuoting =
		/[^a-z0-9_]/i.test(sanitized) ||
		/^[0-9]/.test(sanitized) ||
		isReservedWord(sanitized);

	if (needsQuoting) {
		sanitized = sanitized.replace(/"/g, '""');
		return `"${sanitized}"`;
	}

	return sanitized;
}

export async function createTableFromCSV(
	db: PGlite | PGliteWithLive,
	tableName: string,
	columns: string[],
	rows: CSVRow[],
	options?: CreateTableOptions,
): Promise<TableMetadata> {
	const sanitizedTableName = sanitizeSqlIdentifier(tableName);

	const { includeIfNotExists, primaryKeyName } = options || {};

	const { sql: createTableSQL, columnMetadata } = generateCreateTableStatement(
		sanitizedTableName,
		columns,
		rows,
		{ primaryKeyName, includeIfNotExists },
	);

	const dropTableSQL = `DROP TABLE IF EXISTS "${sanitizedTableName}" CASCADE`;
	const insertStatements = rows.map((row) =>
		generateInsertStatement(sanitizedTableName, columnMetadata, row),
	);

	const metadata: TableMetadata = {
		tableName,
		sanitizedTableName,
		columns: columnMetadata,
		rowCount: rows.length,
	};

	try {
		await db.exec(dropTableSQL);
		await db.exec(createTableSQL);
		await db.transaction(async (tx) => {
			insertStatements.forEach(async (statement) => {
				await tx.query(statement.sql, statement.values);
			});
		});
	} catch (err) {
		throw new Error(
			`No table to drop or error: ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
	return metadata;
}

function inferColumnType(columnName: string, rows: CSVRow[]): ColumnDefinition {
	const inference: TypeInference = {
		hasNull: false,
		hasBoolean: false,
		hasNumber: false,
		hasString: false,
		maxLength: 0,
		hasDecimals: false,
		minValue: Infinity,
		maxValue: -Infinity,
	};

	for (const row of rows) {
		const value = row[columnName];

		if (value === null || value === undefined || value === "") {
			inference.hasNull = true;
			continue;
		}

		if (typeof value === "boolean") {
			inference.hasBoolean = true;
		} else if (typeof value === "number") {
			inference.hasNumber = true;
			inference.minValue = Math.min(inference.minValue, value);
			inference.maxValue = Math.max(inference.maxValue, value);

			if (!Number.isInteger(value)) {
				inference.hasDecimals = true;
			}
		} else if (typeof value === "string") {
			inference.hasString = true;
			inference.maxLength = Math.max(inference.maxLength, value.length);
		}
	}

	let pgType: string;

	// If we have mixed types with strings, default to text
	if (inference.hasString && (inference.hasNumber || inference.hasBoolean)) {
		pgType = "text";
	}
	// Pure boolean column
	else if (inference.hasBoolean && !inference.hasNumber && !inference.hasString) {
		pgType = "boolean";
	}
	// Pure numeric column
	else if (inference.hasNumber && !inference.hasBoolean && !inference.hasString) {
		if (inference.hasDecimals) {
			pgType = "numeric";
		} else {
			// Choose integer type based on range
			if (inference.minValue >= -32768 && inference.maxValue <= 32767) {
				pgType = "smallint";
			} else if (inference.minValue >= -2147483648 && inference.maxValue <= 2147483647) {
				pgType = "integer";
			} else {
				pgType = "bigint";
			}
		}
	}
	// Pure string column
	else if (inference.hasString && !inference.hasNumber && !inference.hasBoolean) {
		// Use text for long strings or variable length, varchar for shorter fixed-ish lengths
		if (inference.maxLength > 255) {
			pgType = "text";
		} else if (inference.maxLength > 0) {
			// Add some buffer to the max length (20% or minimum 10 chars)
			const bufferLength = Math.max(
				Math.ceil(inference.maxLength * 1.2),
				inference.maxLength + 10,
			);
			pgType = `varchar(${Math.min(bufferLength, 255)})`;
		} else {
			pgType = "text";
		}
	}
	// All nulls or empty - default to text
	else {
		pgType = "text";
	}

	return {
		name: columnName,
		pgType,
		nullable: inference.hasNull,
	};
}

function isReservedWord(word: string): boolean {
	const reserved = new Set([
		"select",
		"from",
		"where",
		"insert",
		"update",
		"delete",
		"create",
		"drop",
		"alter",
		"table",
		"index",
		"view",
		"user",
		"group",
		"order",
		"by",
		"limit",
		"offset",
		"join",
		"inner",
		"outer",
		"left",
		"right",
		"on",
		"as",
		"and",
		"or",
		"not",
		"null",
		"true",
		"false",
		"default",
		"primary",
		"foreign",
		"key",
		"references",
		"constraint",
		"unique",
		"check",
		"cascade",
		"restrict",
		"grant",
		"revoke",
		"commit",
		"rollback",
	]);
	return reserved.has(word.toLowerCase());
}

function findBestPrimaryKeyColumn(
	columns: ColumnDefinition[],
	rows: CSVRow[],
	fallbackName: string,
): string {
	// Common primary key column name patterns (case-insensitive)
	const primaryKeyPatterns = [
		/^id$/i,
		/^pk$/i,
		/^key$/i,
		/^uuid$/i,
		/^guid$/i,
		/^.*_id$/i,
		/^.*_key$/i,
		/^.*_uuid$/i,
		/^.*_guid$/i,
	];

	// First, look for columns that match common primary key patterns
	for (const column of columns) {
		if (primaryKeyPatterns.some((pattern) => pattern.test(column.name))) {
			// Check if this column has unique values and no nulls
			if (isColumnSuitableForPrimaryKey(column, rows)) {
				return column.name;
			}
		}
	}

	// Second, look for any column that's suitable as a primary key
	for (const column of columns) {
		if (isColumnSuitableForPrimaryKey(column, rows)) {
			return column.name;
		}
	}

	// Fall back to the provided name
	return fallbackName;
}

function isColumnSuitableForPrimaryKey(
	column: ColumnDefinition,
	rows: CSVRow[],
): boolean {
	if (column.nullable) {
		return false;
	}

	const suitableTypes = ["integer", "bigint", "smallint", "text", "varchar"];
	if (!suitableTypes.some((type) => column.pgType.startsWith(type))) {
		return false;
	}

	const values = new Set();
	let hasNulls = false;

	for (const row of rows) {
		const value = row[column.name];
		if (value === null || value === undefined || value === "") {
			hasNulls = true;
			break;
		}
		values.add(value);
	}

	return !hasNulls && values.size === rows.length;
}

function generateCreateTableStatement(
	sanitizedTableName: string,
	headers: string[],
	rows: CSVRow[],
	options?: CreateTableOptions,
): { sql: string; columnMetadata: ColumnMetadata[] } {
	if (rows.length === 0) {
		throw new Error("Cannot generate table definition from empty dataset");
	}

	const { includeIfNotExists = true, primaryKeyName = "csv_id" } = options || {};

	const columnNames = new Set<string>(headers);

	const columns: ColumnDefinition[] = Array.from(columnNames).map((colName) =>
		inferColumnType(colName, rows),
	);

	let sql = `CREATE TABLE ${includeIfNotExists ? "IF NOT EXISTS " : ""}${sanitizedTableName} (\n`;

	// Find the best existing column for primary key, or use fallback
	const primaryKeyColumn = findBestPrimaryKeyColumn(columns, rows, primaryKeyName);

	// Check if we found an existing suitable column
	const existingColumn = columns.find((col) => col.name === primaryKeyColumn);

	if (existingColumn) {
		// Use existing column as primary key
		sql += `  ${sanitizeSqlIdentifier(primaryKeyColumn)} ${existingColumn.pgType} PRIMARY KEY,\n`;
	} else {
		// Add new serial primary key column
		sql += `  ${sanitizeSqlIdentifier(primaryKeyName)} serial PRIMARY KEY,\n`;
	}

	// Filter out the column that's being used as primary key to avoid duplication
	const columnsToDefine = columns.filter((col) => col.name !== primaryKeyColumn);

	const columnDefs = columnsToDefine.map((col) => {
		const colName = sanitizeSqlIdentifier(col.name);
		const nullable = col.nullable ? "" : " NOT NULL";
		return `  ${colName} ${col.pgType}${nullable}`;
	});

	sql += columnDefs.join(",\n");
	sql += "\n);";

	const columnMetadata = columns.map((col) => ({
		originalName: col.name,
		sanitizedName: sanitizeSqlIdentifier(col.name) || col.name,
		pgType: col.pgType,
	}));

	return { sql, columnMetadata };
}

function generateInsertStatement(
	sanitizedTableName: string,
	columns: ColumnMetadata[],
	data: CSVRow,
): {
	sql: string;
	values: (string | number | boolean)[];
} {
	const placeholders = Object.keys(data)
		.map((_, index) => `$${index + 1}`)
		.join(", ");
	const columnNames = columns.map((c) => c.sanitizedName).join(", ");
	return {
		sql: `INSERT INTO ${sanitizedTableName} (${columnNames}) VALUES (${placeholders})`,
		values: Object.values(data),
	};
}
