import { PGlite, type Results } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { PGliteProvider, usePGlite } from "@electric-sql/pglite-react";
import { Command, CornerDownLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { CodeEditor } from "@/components/editor";
import { PGLiteTable } from "@/components/pglite-table";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {
	createTableFromCSV,
	sanitizeSqlIdentifier,
} from "@/lib/database-utils";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";

const dbGlobal = await PGlite.create({
	extensions: { live },
	dataDir: "idb://csv-analyzer",
});

export default function Page() {
	const db = usePGlite(dbGlobal);
	const [uploadedData, setUploadedData] = useState<Results | null>(null);
	const [tableList, setTableList] = useState<{ table_name: string }[]>([]);
	const [editorContent, setEditorContent] = useState<string>("");
	const [currentTableName, setCurrentTableName] = useState<string | null>(null);

	useEffect(() => {
		const loadTables = async () => {
			try {
				const tableNames = await db.query<{ table_name: string }>(
					`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
				);
				setTableList(tableNames.rows);
			} catch (err) {
				console.error("[App] Error loading tables:", err);
			}
		};

		loadTables();
	}, [db]);

	const handleTableClick = async (tableName: string) => {
		try {
			const sanitizedTableName = sanitizeSqlIdentifier(tableName);
			const sql = `SELECT * FROM "${sanitizedTableName}" LIMIT 100`;
			setEditorContent(sql);
			const result = await db.query<Record<string, unknown>>(sql);
			setUploadedData(result);
			setCurrentTableName(tableName);
			toast.success(`Loaded data from table "${tableName}"`);
		} catch (err) {
			console.error("[App] Error loading table:", err);
			toast.error(
				err instanceof Error ? err.message : "Failed to load table data",
			);
		}
	};

	const handleFileProcessed = async (data: {
		tableName: string;
		columns: string[];
		rows: string[][];
	}) => {
		console.debug("[App] handleFileProcessed called with:", {
			tableName: data.tableName,
			columns: data.columns,
			rowCount: data.rows.length,
		});

		const toastId = toast.loading("Creating table and importing data...");

		try {
			console.debug("[App] Calling createTableFromCSV...");

			const metadata = await createTableFromCSV(
				db,
				data.tableName,
				data.columns,
				data.rows,
			);

			console.debug(
				"[App] Table created successfully with metadata:",
				metadata,
			);

			const result = await db.query<Record<string, unknown>>(
				`SELECT * FROM "${metadata.sanitizedTableName}" LIMIT 100`,
			);
			const tableNames = await db.query<{ table_name: string }>(
				`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
			);
			setTableList(tableNames.rows);
			setUploadedData(result);
			setCurrentTableName(metadata.sanitizedTableName);

			toast.success(
				`Table "${metadata.sanitizedTableName}" created and data imported`,
				{ id: toastId },
			);

			console.debug("[App] Upload complete!");
		} catch (err) {
			console.error("[App] Error during upload:", err);

			// Dismiss loading toast and show error
			toast.error(
				err instanceof Error ? err.message : "Failed to process CSV file",
				{ id: toastId },
			);
		}
	};

	const handleRunQuery = async (query: string) => {
		try {
			console.log(query);
			const result = await db.query<Record<string, unknown>>(query);
			setUploadedData(result);
			toast.success("Query executed successfully");
		} catch (err) {
			console.error("[App] Error executing query:", err);
			toast.error(
				err instanceof Error ? err.message : "Failed to execute query",
			);
		}
	};

	const handleDropTable = async (tableName: string) => {
		try {
			const sanitizedTableName = sanitizeSqlIdentifier(tableName);
			await db.query(`DROP TABLE IF EXISTS "${sanitizedTableName}"`);

			// Refresh table list
			const tableNames = await db.query<{ table_name: string }>(
				`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
			);
			setTableList(tableNames.rows);

			// Clear data only if the dropped table is currently displayed
			if (currentTableName === tableName || currentTableName === sanitizedTableName) {
				setUploadedData(null);
				setEditorContent("");
				setCurrentTableName(null);
			}

			toast.success(`Table "${tableName}" dropped successfully`);
		} catch (err) {
			console.error("[App] Error dropping table:", err);
			toast.error(err instanceof Error ? err.message : "Failed to drop table");
		}
	};

	return (
		<PGliteProvider db={db}>
			<SidebarProvider>
				<AppSidebar
					database={db}
					tables={tableList}
					onTableClick={handleTableClick}
					onFileProcessed={handleFileProcessed}
					onDropTable={handleDropTable}
				/>
				<SidebarInset>
					<header className="flex gap-2 justify-between items-center px-4 h-16 border-b shrink-0">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbPage>{currentTableName || "Query"}</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
						<Button
							variant="outline"
							size="sm"
							className="ml-auto group/run-query"
							onClick={() => handleRunQuery(editorContent)}
							disabled={!editorContent}
						>
							Run Query
							<span className=" bg-muted text-black/75 pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1 py-2.5 font-mono text-[10px] font-medium opacity-100 select-none group-hover/run-query:bg-gray-200/75">
								<Command className="size-3.5" />
								<CornerDownLeft className="-ml-0.5 size-3.5" />
							</span>
						</Button>
					</header>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel defaultSize={40}>
							<div className="flex justify-center items-center h-full">
								<CodeEditor
									content={editorContent}
									onRunQuery={handleRunQuery}
									onContentChange={setEditorContent}
								/>
							</div>
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel defaultSize={60}>
							<div className="w-full h-full">
								{uploadedData ? (
									<PGLiteTable data={uploadedData} />
								) : (
									<div className="flex justify-center items-center h-full text-muted-foreground">
										<p>
											No data loaded. Upload a CSV or run a query to see
											results.
										</p>
									</div>
								)}
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</SidebarInset>
			</SidebarProvider>
			<Toaster />
		</PGliteProvider>
	);
}
