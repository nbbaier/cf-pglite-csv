import type { PGlite } from "@electric-sql/pglite";
import type { PGliteWithLive } from "@electric-sql/pglite/live";

type ColumnMetadata = {
	originalName: string;
	sanitizedName: string;
	type: PostgresColumnType;
};

type TableMetadata = {
	tableName: string;
	sanitizedTableName: string;
	columns: ColumnMetadata[];
	rowCount: number;
};

type PostgresColumnType = "TEXT" | "INTEGER" | "REAL" | "DATE" | "BOOLEAN";

export function sanitizeSqlIdentifier(identifier: string): string {
	// Only allow alphanumeric and underscore, must start with letter or underscore
	const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
	if (!/^[a-z_]/.test(sanitized)) {
		return `_${sanitized}`;
	}
	return sanitized;
}

export async function createTableFromCSV(
	db: PGlite | PGliteWithLive,
	tableName: string,
	columns: string[],
	rows: string[][],
): Promise<TableMetadata> {
	console.debug("[databaseUtils] createTableFromCSV called", {
		tableName,
		columns,
		rowCount: rows.length,
	});

	const sanitizedTableName = sanitizeSqlIdentifier(tableName);
	const seenColumnNames = new Map<string, number>();
	const sanitizedColumns = columns.map((originalName) => {
		const baseName = sanitizeSqlIdentifier(originalName);
		const usageCount = seenColumnNames.get(baseName) ?? 0;
		seenColumnNames.set(baseName, usageCount + 1);
		return usageCount === 0 ? baseName : `${baseName}_${usageCount}`;
	});

	console.debug("[databaseUtils] Sanitized names", {
		sanitizedTableName,
		sanitizedColumns,
	});

	const columnTypes: PostgresColumnType[] = sanitizedColumns.map((_, columnIndex) => {
		const columnValues = rows.map((row) => row[columnIndex]?.toString() ?? "");
		return determineColumnType(columnValues);
	});

	console.debug("[databaseUtils] Column types determined", columnTypes);

	if (sanitizedColumns.length === 0) {
		throw new Error("CSV file must include at least one column header");
	}

	const columnDefinitions = sanitizedColumns
		.map((col, i) => `"${col}" ${columnTypes[i]}`)
		.join(", ");

	const metadata: TableMetadata = {
		tableName,
		sanitizedTableName,
		columns: columns.map((originalName, i) => ({
			originalName,
			sanitizedName: sanitizedColumns[i],
			type: columnTypes[i],
		})),
		rowCount: rows.length,
	};

	const dropTableSQL = `DROP TABLE IF EXISTS "${sanitizedTableName}" CASCADE`;
	console.debug("[databaseUtils] Dropping table if exists...");
	try {
		await db.exec(dropTableSQL);
		console.debug("[databaseUtils] Table dropped");
	} catch (err) {
		console.debug("[databaseUtils] No table to drop or error:", err);
	}

	const createTableSQL = `CREATE TABLE IF NOT EXISTS "${sanitizedTableName}" (${columnDefinitions})`;
	console.debug("[databaseUtils] Creating table...", createTableSQL);
	await db.exec(createTableSQL);
	console.debug("[databaseUtils] Table created");

	const insertSQLPrefix = `INSERT INTO "${sanitizedTableName}" (${sanitizedColumns
		.map((c) => `"${c}"`)
		.join(", ")})`;

	console.debug("[databaseUtils] Preparing insert statement prefix...", insertSQLPrefix);

	await db.exec("BEGIN");
	try {
		if (rows.length === 0) {
			await db.exec("COMMIT");
			console.debug("[databaseUtils] No rows to insert; transaction committed");
			return metadata;
		}

		const BASE_BATCH_SIZE = 500;
		const MAX_PARAMS_PER_BATCH = 32000;
		const columnCount = sanitizedColumns.length;
		const rowsPerBatch = Math.max(
			1,
			Math.min(
				BASE_BATCH_SIZE,
				Math.floor(MAX_PARAMS_PER_BATCH / Math.max(1, columnCount)),
			),
		);
		const totalBatches = Math.ceil(rows.length / rowsPerBatch);

		for (let i = 0; i < rows.length; i += rowsPerBatch) {
			const batch = rows.slice(i, i + rowsPerBatch);
			console.debug(
				`[databaseUtils] Processing batch ${Math.floor(i / rowsPerBatch) + 1} of ${totalBatches}`,
			);

			const batchPlaceholders: string[] = [];
			const batchValues: Array<string | number | boolean | null> = [];

			batch.forEach((row, rowIndex) => {
				const convertedValues = columnTypes.map((type, columnIndex) => {
					const val = row[columnIndex];
					if (val === "" || val === null || val === undefined) {
						return null;
					}
					if (type === "INTEGER" || type === "REAL") {
						const num = Number(val);
						return Number.isNaN(num) ? null : num;
					}
					if (type === "BOOLEAN") {
						const trimmedVal = val.toString().trim().toLowerCase();
						return ["true", "yes", "1", "t", "y"].includes(trimmedVal);
					}
					return val.toString();
				});

				batchValues.push(...convertedValues);
				const placeholderOffset = rowIndex * columnCount;
				const rowPlaceholders = sanitizedColumns.map((_, columnIndex) => {
					return `$${placeholderOffset + columnIndex + 1}`;
				});
				batchPlaceholders.push(`(${rowPlaceholders.join(", ")})`);
			});

			if (batchPlaceholders.length > 0) {
				const insertSQL = `${insertSQLPrefix} VALUES ${batchPlaceholders.join(", ")}`;
				await db.query(insertSQL, batchValues);
			}
		}

		await db.exec("COMMIT");
		console.debug("[databaseUtils] All rows inserted successfully");
	} catch (err) {
		await db.exec("ROLLBACK");
		console.error("[databaseUtils] Transaction failed, rolling back:", err);
		throw err;
	}

	return metadata;
}
function determineColumnType(columnValues: string[]): PostgresColumnType {
	const nonEmptyValues = columnValues.filter(
		(v) => v !== "" && v !== null && v !== undefined,
	);

	if (nonEmptyValues.length === 0) {
		return "TEXT";
	}

	const sampleSize = Math.min(100, nonEmptyValues.length);
	const typeCounts: Partial<Record<PostgresColumnType, number>> = {};

	for (let i = 0; i < sampleSize; i++) {
		const type = inferDataType(nonEmptyValues[i]);
		typeCounts[type] = (typeCounts[type] ?? 0) + 1;

		if (typeCounts.TEXT && typeCounts.TEXT > sampleSize * 0.1) {
			return "TEXT";
		}
	}

	if (typeCounts.BOOLEAN && typeCounts.BOOLEAN === sampleSize) {
		return "BOOLEAN";
	}

	if (typeCounts.REAL) {
		return "REAL";
	}

	if (typeCounts.INTEGER) {
		return "INTEGER";
	}

	if (typeCounts.DATE) {
		return "DATE";
	}

	return "TEXT";
}

function inferDataType(value: string): PostgresColumnType {
	if (value === "" || value === null || value === undefined) {
		return "TEXT";
	}

	const trimmedValue = value.trim().toLowerCase();
	const booleanValues = [
		"true",
		"false",
		"yes",
		"no",
		"1",
		"0",
		"t",
		"f",
		"y",
		"n",
	];
	if (booleanValues.includes(trimmedValue)) {
		return "BOOLEAN";
	}

	if (!Number.isNaN(Number(value)) && value.trim() !== "") {
		if (value.includes(".")) {
			return "REAL";
		}
		return "INTEGER";
	}

	const datePattern = /^\d{4}-\d{2}-\d{2}$/;
	if (datePattern.test(value)) {
		return "DATE";
	}

	return "TEXT";
}
