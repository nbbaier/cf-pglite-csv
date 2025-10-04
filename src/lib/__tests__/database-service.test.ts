import type { Results } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	dropTable,
	fetchTablePreview,
	importCSV,
	listTables,
} from "@/lib/database-service";
import { createTableFromCSV } from "@/lib/database-utils";

type MockDb = {
	query: ReturnType<typeof vi.fn>;
	// exec is used when batching in other helpers but not required here.
};

vi.mock("@/lib/database-utils", async () => {
	const actual =
		await vi.importActual<typeof import("@/lib/database-utils")>("@/lib/database-utils");
	return {
		...actual,
		createTableFromCSV: vi.fn(),
	};
});

const asResults = <T extends Record<string, unknown>>(rows: T[]): Results =>
	({
		rows,
		fields: Object.keys(rows[0] ?? {}).map((name) => ({ name, dataTypeID: 0 })),
	}) as unknown as Results;

const createDb = (handler: (sql: string) => Promise<Results>) => ({
	query: vi.fn(handler),
});

const asDatabaseClient = (db: MockDb) =>
	db as unknown as Parameters<typeof listTables>[0];

beforeEach(() => {
	vi.clearAllMocks();
});

describe("listTables", () => {
	it("returns plain table name array", async () => {
		const db = createDb(async () =>
			asResults([{ table_name: "users" }, { table_name: "orders" }]),
		);

		await expect(listTables(asDatabaseClient(db))).resolves.toEqual(["users", "orders"]);
	});
});

describe("fetchTablePreview", () => {
	it("sanitizes table names and returns query result", async () => {
		const result = asResults([{ id: 1 }]);
		const db = createDb(async (sql) => {
			expect(sql).toBe('SELECT * FROM "orders_summary" LIMIT 100');
			return result;
		});

		const client = asDatabaseClient(db);
		const preview = await fetchTablePreview(client, "Orders-Summary");

		expect(preview.sanitizedTableName).toBe("orders_summary");
		expect(preview.result).toBe(result);
	});
});

describe("dropTable", () => {
	it("drops sanitized table and returns refreshed list", async () => {
		const db = createDb(async (sql) => {
			if (sql.startsWith("DROP TABLE")) {
				expect(sql).toBe('DROP TABLE IF EXISTS "temp_table"');
				return asResults([]);
			}
			if (sql.includes("information_schema.tables")) {
				return asResults([{ table_name: "remaining" }]);
			}
			throw new Error(`Unexpected SQL: ${sql}`);
		});

		const client = asDatabaseClient(db);
		const result = await dropTable(client, "Temp-Table");

		expect(result).toEqual({
			tables: ["remaining"],
			sanitizedTableName: "temp_table",
		});
	});
});

describe("importCSV", () => {
	it("creates table, returns preview and refreshed tables", async () => {
		const previewResult = asResults([{ id: 1, name: "Alice" }]);
		const db = createDb(async (sql) => {
			if (sql.startsWith("SELECT *")) {
				expect(sql).toBe('SELECT * FROM "people" LIMIT 100');
				return previewResult;
			}
			if (sql.includes("information_schema.tables")) {
				return asResults([{ table_name: "people" }, { table_name: "orders" }]);
			}
			throw new Error(`Unexpected SQL: ${sql}`);
		});

		const createMock = createTableFromCSV as unknown as ReturnType<typeof vi.fn>;
		createMock.mockResolvedValue({
			tableName: "People",
			sanitizedTableName: "people",
			columns: [],
			rowCount: 1,
		});

		const client = asDatabaseClient(db);
		const result = await importCSV(client, {
			tableName: "People",
			columns: ["name"],
			rows: [["Alice"]],
		});

		expect(createMock).toHaveBeenCalledWith(client, "People", ["name"], [["Alice"]]);
		expect(result.metadata.sanitizedTableName).toBe("people");
		expect(result.preview).toBe(previewResult);
		expect(result.tables).toEqual(["people", "orders"]);
	});
});
