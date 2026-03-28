import type { PGlite } from "@electric-sql/pglite";
import type { PGliteWithLive } from "@electric-sql/pglite/live";
import type { CSVRow } from "./types";

const NON_ALPHANUMERIC_UNDERSCORE_PATTERN = /[^a-z0-9_]/g;
const LEADING_DIGIT_PATTERN = /^[0-9]/;
const DOUBLE_QUOTE_PATTERN = /"/g;

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MM_DD_YYYY = /^\d{2}\/\d{2}\/\d{4}$/;
const DATE_MM_DD_YY = /^\d{2}\/\d{2}\/\d{2}$/;
const DATE_M_D_YYYY = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const DATE_YYYY_M_D = /^\d{4}\/\d{1,2}\/\d{1,2}$/;

const TIME_HH_MM_SS = /^\d{1,2}:\d{2}:\d{2}$/;
const TIME_HH_MM = /^\d{1,2}:\d{2}$/;
const TIME_HH_MM_SS_AMPM = /^\d{1,2}:\d{2}:\d{2}\s*(AM|PM|am|pm)$/;
const TIME_HH_MM_AMPM = /^\d{1,2}:\d{2}\s*(AM|PM|am|pm)$/;

const TIMESTAMP_ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
const TIMESTAMP_YYYY_MM_DD_HH_MM_SS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const TIMESTAMP_MM_DD_YYYY_HH_MM_SS =
  /^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}:\d{2}$/;
const TIMESTAMP_WITH_MILLIS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PK_ID_PATTERN = /^id$/i;
const PK_PK_PATTERN = /^pk$/i;
const PK_KEY_PATTERN = /^key$/i;
const PK_UUID_PATTERN = /^uuid$/i;
const PK_GUID_PATTERN = /^guid$/i;
const PK_SUFFIX_ID_PATTERN = /^.*_id$/i;
const PK_SUFFIX_KEY_PATTERN = /^.*_key$/i;
const PK_SUFFIX_UUID_PATTERN = /^.*_uuid$/i;
const PK_SUFFIX_GUID_PATTERN = /^.*_guid$/i;

interface ColumnDefinition {
  isAutoIncrement?: boolean;
  name: string;
  nullable: boolean;
  pgType: string;
}

interface TypeInference {
  hasBoolean: boolean;
  hasDate: boolean;
  hasDecimals: boolean;
  hasNull: boolean;
  hasNumber: boolean;
  hasString: boolean;
  hasTime: boolean;
  hasTimestamp: boolean;
  hasUUID: boolean;
  isSequential: boolean;
  maxLength: number;
  maxValue: number;
  minValue: number;
}

interface ColumnMetadata {
  originalName: string;
  pgType: string;
  sanitizedName: string;
}

interface TableMetadata {
  columns: ColumnMetadata[];
  rowCount: number;
  sanitizedTableName: string;
  tableName: string;
}

interface CreateTableOptions {
  includeIfNotExists?: boolean;
  primaryKeyName?: string;
}

export function sanitizeSqlIdentifier(identifier: string): string {
  let sanitized = identifier
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_UNDERSCORE_PATTERN, "_");

  if (LEADING_DIGIT_PATTERN.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  if (isReservedWord(sanitized)) {
    sanitized = `${sanitized}_col`;
  }

  return sanitized;
}

export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(DOUBLE_QUOTE_PATTERN, '""')}"`;
}

export async function createTableFromCSV(
  db: PGlite | PGliteWithLive,
  tableName: string,
  columns: string[],
  rows: CSVRow[],
  options?: CreateTableOptions
): Promise<TableMetadata> {
  const sanitizedTableName = sanitizeSqlIdentifier(tableName);

  const { includeIfNotExists, primaryKeyName } = options || {};

  const { sql: createTableSQL, columnMetadata } = generateCreateTableStatement(
    sanitizedTableName,
    columns,
    rows,
    { primaryKeyName, includeIfNotExists }
  );

  const dropTableSQL = `DROP TABLE IF EXISTS ${quoteIdent(sanitizedTableName)} CASCADE`;
  const insertStatements = rows.map((row) =>
    generateInsertStatement(sanitizedTableName, columnMetadata, row)
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

    const BATCH_SIZE = 500;
    await db.transaction(async (tx) => {
      for (let i = 0; i < insertStatements.length; i += BATCH_SIZE) {
        const batch = insertStatements.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((statement) => tx.query(statement.sql, statement.values))
        );
      }
    });
  } catch (err) {
    throw new Error(
      `Failed to import table ${tableName}: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }
  return metadata;
}

function isDateString(value: string): boolean {
  // Common date patterns: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.
  const datePatterns = [
    DATE_YYYY_MM_DD,
    DATE_MM_DD_YYYY,
    DATE_MM_DD_YY,
    DATE_M_D_YYYY,
    DATE_YYYY_M_D,
  ];

  if (!datePatterns.some((pattern) => pattern.test(value))) {
    return false;
  }

  // Try to parse as date to validate
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isTimeString(value: string): boolean {
  // Time patterns: HH:MM:SS, HH:MM, H:MM:SS AM/PM
  const timePatterns = [
    TIME_HH_MM_SS,
    TIME_HH_MM,
    TIME_HH_MM_SS_AMPM,
    TIME_HH_MM_AMPM,
  ];

  return timePatterns.some((pattern) => pattern.test(value));
}

function isTimestampString(value: string): boolean {
  // Timestamp patterns: ISO 8601, common formats
  const timestampPatterns = [
    TIMESTAMP_ISO_8601,
    TIMESTAMP_YYYY_MM_DD_HH_MM_SS,
    TIMESTAMP_MM_DD_YYYY_HH_MM_SS,
    TIMESTAMP_WITH_MILLIS,
  ];

  if (!timestampPatterns.some((pattern) => pattern.test(value))) {
    return false;
  }

  // Try to parse as date to validate
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isUUIDString(value: string): boolean {
  return UUID_V4_PATTERN.test(value);
}

function isSequential(values: (number | string)[]): boolean {
  const numericValues = values
    .filter(
      (v) =>
        typeof v === "number" ||
        (typeof v === "string" && !Number.isNaN(Number(v)))
    )
    .map((v) => Number(v))
    .sort((a, b) => a - b);

  if (numericValues.length < 3) {
    return false;
  }

  for (let i = 1; i < numericValues.length; i++) {
    if (numericValues[i] - numericValues[i - 1] !== 1) {
      return false;
    }
  }

  return true;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: type inference requires complex branching logic
function inferColumnPgType(
  columnName: string,
  rows: CSVRow[]
): ColumnDefinition {
  const inference: TypeInference = {
    hasNull: false,
    hasBoolean: false,
    hasNumber: false,
    hasString: false,
    maxLength: 0,
    hasDecimals: false,
    minValue: Number.POSITIVE_INFINITY,
    maxValue: Number.NEGATIVE_INFINITY,
    hasDate: false,
    hasTime: false,
    hasTimestamp: false,
    hasUUID: false,
    isSequential: false,
  };

  const values: (number | string)[] = [];

  for (const row of rows) {
    const value = row[columnName];

    if (value === null || value === undefined || value === "") {
      inference.hasNull = true;
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      values.push(value);
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

      if (isDateString(value)) {
        inference.hasDate = true;
      } else if (isTimeString(value)) {
        inference.hasTime = true;
      } else if (isTimestampString(value)) {
        inference.hasTimestamp = true;
      } else if (isUUIDString(value)) {
        inference.hasUUID = true;
      }
    }
  }

  if (values.length > 0) {
    inference.isSequential = isSequential(values);
  }

  let pgType: string;
  let isAutoIncrement = false;

  if (inference.hasTimestamp) {
    pgType = "timestamp";
  } else if (inference.hasDate && !inference.hasTime) {
    pgType = "date";
  } else if (inference.hasTime && !inference.hasDate) {
    pgType = "time";
  } else if (inference.hasUUID && !inference.hasString) {
    pgType = "uuid";
  } else if (
    inference.hasString &&
    (inference.hasNumber || inference.hasBoolean)
  ) {
    pgType = "text";
  } else if (
    inference.hasBoolean &&
    !inference.hasNumber &&
    !inference.hasString
  ) {
    pgType = "boolean";
  } else if (
    inference.hasNumber &&
    !inference.hasBoolean &&
    !inference.hasString
  ) {
    if (inference.hasDecimals) {
      pgType = "numeric";
    } else if (inference.minValue >= -32_768 && inference.maxValue <= 32_767) {
      pgType = "smallint";
    } else if (
      inference.minValue >= -2_147_483_648 &&
      inference.maxValue <= 2_147_483_647
    ) {
      pgType = "integer";
    } else {
      pgType = "bigint";
    }
  } else if (
    inference.hasString &&
    !inference.hasNumber &&
    !inference.hasBoolean
  ) {
    if (inference.maxLength > 255) {
      pgType = "text";
    } else if (inference.maxLength > 0) {
      const bufferLength = Math.max(
        Math.ceil(inference.maxLength * 1.2),
        inference.maxLength + 10
      );
      pgType = `varchar(${Math.min(bufferLength, 255)})`;
    } else {
      pgType = "text";
    }
  } else {
    pgType = "text";
  }

  if (
    inference.isSequential &&
    inference.hasNumber &&
    !inference.hasDecimals &&
    !inference.hasString &&
    !inference.hasBoolean &&
    inference.minValue >= 1
  ) {
    if (inference.maxValue <= 32_767) {
      pgType = "smallserial";
    } else if (inference.maxValue <= 2_147_483_647) {
      pgType = "serial";
    } else {
      pgType = "bigserial";
    }
    isAutoIncrement = true;
  }

  return {
    name: columnName,
    pgType,
    nullable: inference.hasNull,
    isAutoIncrement,
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
  fallbackName: string
): string {
  const primaryKeyPatterns = [
    PK_ID_PATTERN,
    PK_PK_PATTERN,
    PK_KEY_PATTERN,
    PK_UUID_PATTERN,
    PK_GUID_PATTERN,
    PK_SUFFIX_ID_PATTERN,
    PK_SUFFIX_KEY_PATTERN,
    PK_SUFFIX_UUID_PATTERN,
    PK_SUFFIX_GUID_PATTERN,
  ];

  for (const column of columns) {
    if (
      primaryKeyPatterns.some((pattern) => pattern.test(column.name)) &&
      isColumnSuitableForPrimaryKey(column, rows)
    ) {
      return column.name;
    }
  }

  for (const column of columns) {
    if (isColumnSuitableForPrimaryKey(column, rows)) {
      return column.name;
    }
  }

  return fallbackName;
}

function isColumnSuitableForPrimaryKey(
  column: ColumnDefinition,
  rows: CSVRow[]
): boolean {
  if (column.nullable) {
    return false;
  }

  const suitableTypes = [
    "integer",
    "bigint",
    "smallint",
    "serial",
    "bigserial",
    "smallserial",
    "text",
    "varchar",
  ];
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
  options?: CreateTableOptions
): { sql: string; columnMetadata: ColumnMetadata[] } {
  if (rows.length === 0) {
    throw new Error("Cannot generate table definition from empty dataset");
  }

  const { includeIfNotExists = true, primaryKeyName = "csv_id" } =
    options || {};

  const columnNames = new Set<string>(headers);

  const columns: ColumnDefinition[] = Array.from(columnNames).map((colName) =>
    inferColumnPgType(colName, rows)
  );

  let sql = `CREATE TABLE ${includeIfNotExists ? "IF NOT EXISTS " : ""}${quoteIdent(sanitizedTableName)} (\n`;

  const primaryKeyColumn = findBestPrimaryKeyColumn(
    columns,
    rows,
    primaryKeyName
  );

  const existingColumn = columns.find((col) => col.name === primaryKeyColumn);

  if (existingColumn) {
    const pkSanitized = sanitizeSqlIdentifier(primaryKeyColumn);
    sql += `  ${quoteIdent(pkSanitized)} ${existingColumn.pgType} PRIMARY KEY,\n`;
  } else {
    const pkSanitized = sanitizeSqlIdentifier(primaryKeyName);
    sql += `  ${quoteIdent(pkSanitized)} serial PRIMARY KEY,\n`;
  }

  const columnsToDefine = columns.filter(
    (col) => col.name !== primaryKeyColumn
  );

  const columnDefs = columnsToDefine.map((col) => {
    const colName = sanitizeSqlIdentifier(col.name);
    const nullable = col.nullable ? "" : " NOT NULL";
    return `  ${quoteIdent(colName)} ${col.pgType}${nullable}`;
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
  data: CSVRow
): {
  sql: string;
  values: (string | number | boolean)[];
} {
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const columnNames = columns
    .map((c) => quoteIdent(c.sanitizedName))
    .join(", ");
  const values = columns.map(
    (c) => data[c.originalName] as string | number | boolean
  );

  return {
    sql: `INSERT INTO ${quoteIdent(sanitizedTableName)} (${columnNames}) VALUES (${placeholders})`,
    values,
  };
}
