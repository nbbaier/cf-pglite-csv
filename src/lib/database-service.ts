import type { PGlite, Results } from "@electric-sql/pglite";
import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { createTableFromCSV, sanitizeSqlIdentifier } from "./database-utils";

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
	return db.query<Record<string, unknown>>(query);
}

export async function dropTable(db: DatabaseClient, tableName: string) {
	const sanitizedTableName = sanitizeSqlIdentifier(tableName);
	await db.query(`DROP TABLE IF EXISTS "${sanitizedTableName}"`);
	const tables = await listTables(db);
	return { tables, sanitizedTableName };
}

export type ImportCSVParams = {
	tableName: string;
	columns: string[];
	rows: string[][];
	previewLimit?: number;
};

export async function importCSV(db: DatabaseClient, params: ImportCSVParams) {
	const {
		tableName,
		columns,
		rows,
		previewLimit = DEFAULT_PREVIEW_LIMIT,
	} = params;
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
