import type { PGlite, Results } from "@electric-sql/pglite";
import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { createTableFromCSV, sanitizeSqlIdentifier } from "./database-utils";
import type { CSVRow } from "./types";

type DatabaseClient = PGlite | PGliteWithLive;

const DEFAULT_PREVIEW_LIMIT = 100;

export async function listTables(db: DatabaseClient) {
	const tables = await db.query<{ table_name: string }>(
		"SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
	);
	return tables.rows.map((table) => table.table_name);
}

export async function fetchTablePreview(
	db: DatabaseClient,
	tableName: string,
	limit: number = DEFAULT_PREVIEW_LIMIT,
) {
	const sanitized = sanitizeSqlIdentifier(tableName);
	const query = `SELECT * FROM "${sanitized}" LIMIT ${limit}`;
	const result: Results = await db.query<Record<string, unknown>>(query);
	return { result, sanitizedTableName: sanitized, query };
}

export async function runQuery(db: DatabaseClient, query: string) {
	const result = await db.query<Record<string, unknown>>(query);
	console.log(result);
	return result;
}

export async function dropTable(db: DatabaseClient, tableName: string) {
	const sanitizedTableName = sanitizeSqlIdentifier(tableName);
	await db.query(`DROP TABLE IF EXISTS "${sanitizedTableName}"`);
	const tables = await listTables(db);
	return { tables, sanitizedTableName };
}

type ImportCSVParams = {
	tableName: string;
	columns: string[];
	rows: CSVRow[];
	previewLimit?: number;
};

export async function importCSV(db: DatabaseClient, params: ImportCSVParams) {
	const { tableName, columns, rows, previewLimit = DEFAULT_PREVIEW_LIMIT } = params;
	const metadata = await createTableFromCSV(db, tableName, columns, rows);
	const { result: preview, query } = await fetchTablePreview(
		db,
		metadata.sanitizedTableName,
		previewLimit,
	);
	const tables = await listTables(db);
	return {
		metadata,
		preview,
		query,
		tables,
	};
}

export async function getSchema(db: DatabaseClient, tableName: string) {
	const sanitizedTableName = sanitizeSqlIdentifier(tableName);

	const query = `SELECT
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE
        WHEN pk.constraint_type = 'PRIMARY KEY' THEN 'YES'
        ELSE 'NO'
    END AS is_primary_key
FROM
    information_schema.columns c
    LEFT JOIN information_schema.key_column_usage ku ON c.table_name = ku.table_name
    AND c.column_name = ku.column_name
    LEFT JOIN information_schema.table_constraints pk ON ku.constraint_name = pk.constraint_name
    AND pk.constraint_type = 'PRIMARY KEY'
WHERE
    c.table_name = '${sanitizedTableName}'
ORDER BY
    c.ordinal_position;`;

	const result = await db.query<Record<string, unknown>>(query);
	return result;
}
