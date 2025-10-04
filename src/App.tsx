import { PGlite, type Results } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { PGliteProvider, usePGlite } from "@electric-sql/pglite-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { CodeEditor } from "@/components/editor";
import { PGLiteTable } from "@/components/pglite-table";
import { ThemeProvider } from "@/components/theme-provider";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import {
	dropTable as dropTableService,
	runQuery as executeQuery,
	fetchTablePreview,
	importCSV,
	listTables,
} from "@/lib/database-service";

const dbGlobal = await PGlite.create({
	extensions: { live },
	dataDir: "idb://csv-analyzer",
});

export default function Page() {
	const db = usePGlite(dbGlobal);
	const [uploadedData, setUploadedData] = useState<Results | null>(null);
	const [tableList, setTableList] = useState<string[]>([]);
	const [editorContent, setEditorContent] = useState<string>("");
	const [currentTableName, setCurrentTableName] = useState<string | null>(null);

	useEffect(() => {
		const loadTables = async () => {
			try {
				const tableNames = await listTables(db);
				setTableList(tableNames);
			} catch (err) {
				console.error("[App] Error loading tables:", err);
			}
		};

		loadTables();
	}, [db]);

	const handleTableClick = async (tableName: string) => {
		try {
			const { result, sanitizedTableName, query } = await fetchTablePreview(
				db,
				tableName,
			);
			setEditorContent(query);
			setUploadedData(result);
			setCurrentTableName(sanitizedTableName);
			toast.success(`Loaded data from table "${sanitizedTableName}"`);
		} catch (err) {
			console.error("[App] Error loading table:", err);
			toast.error(err instanceof Error ? err.message : "Failed to load table data");
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
			const { metadata, preview, tables, query } = await importCSV(db, data);
			setTableList(tables);
			setUploadedData(preview);
			setCurrentTableName(metadata.sanitizedTableName);
			setEditorContent(query);

			toast.success(`Table "${metadata.sanitizedTableName}" created and data imported`, {
				id: toastId,
			});

			console.debug("[App] Upload complete!");
		} catch (err) {
			console.error("[App] Error during upload:", err);

			// Dismiss loading toast and show error
			toast.error(err instanceof Error ? err.message : "Failed to process CSV file", {
				id: toastId,
			});
		}
	};

	const handleRunQuery = async (query: string) => {
		try {
			console.log(query);
			const result = await executeQuery(db, query);
			setUploadedData(result);
			toast.success("Query executed successfully");
		} catch (err) {
			console.error("[App] Error executing query:", err);
			toast.error(err instanceof Error ? err.message : "Failed to execute query");
		}
	};

	const handleDropTable = async (tableName: string) => {
		try {
			const { tables, sanitizedTableName } = await dropTableService(db, tableName);
			setTableList(tables);

			// Clear data only if the dropped table is currently displayed
			if (currentTableName === tableName || currentTableName === sanitizedTableName) {
				setUploadedData(null);
				setEditorContent("");
				setCurrentTableName(null);
			}

			toast.success(`Table "${sanitizedTableName}" dropped successfully`);
		} catch (err) {
			console.error("[App] Error dropping table:", err);
			toast.error(err instanceof Error ? err.message : "Failed to drop table");
		}
	};

	return (
		<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
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
								Run
								<KbdGroup>
									<Kbd>⌘</Kbd>
									<Kbd>⏎</Kbd>
								</KbdGroup>
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
											<p>No data loaded. Upload a CSV or run a query to see results.</p>
										</div>
									)}
								</div>
							</ResizablePanel>
						</ResizablePanelGroup>
					</SidebarInset>
				</SidebarProvider>
				<Toaster />
			</PGliteProvider>
		</ThemeProvider>
	);
}
