import { describe, expect, it } from "vitest";
import { processCSVFile } from "@/lib/csv-processing";

const createCSVFile = (content: string, name = "My Data.csv") =>
	new File([content], name, { type: "text/csv" });

describe("processCSVFile", () => {
	it("returns normalized data with sanitized table name", async () => {
		const csv = ["Name,Age", "Alice,30", "Bob,40"].join("\n");
		const file = createCSVFile(csv);

		const result = await processCSVFile(file);

		expect(result.tableName).toBe("my_data");
		expect(result.columns).toEqual(["Name", "Age"]);
		expect(result.rows).toEqual([
			["Alice", "30"],
			["Bob", "40"],
		]);
	});

	it("throws when exceeding configured column count", async () => {
		const csv = ["A,B", "1,2"].join("\n");
		const file = createCSVFile(csv);

		await expect(
			processCSVFile(file, {
				maxColumns: 1,
			}),
		).rejects.toThrow(/too many columns/i);
	});

	it("throws when row length does not match headers", async () => {
		const csv = ["A,B", "1"].join("\n");
		const file = createCSVFile(csv);

		await expect(processCSVFile(file)).rejects.toThrow(
			/row length does not match header column count/i,
		);
	});
});
