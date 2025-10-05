import { PGlite, type Results } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { PGliteProvider, usePGlite } from "@electric-sql/pglite-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { CodeEditor } from "@/components/editor";
import { NoData } from "@/components/empty-data";
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
import type { CSVPipelineResult } from "@/lib/csv-processing";
import {
	dropTable as dropTableService,
	runQuery as executeQuery,
	fetchTablePreview,
	getSchema as getSchemaService,
	importCSV,
	listTables,
} from "@/lib/database-service";
import type { CSVRow } from "@/lib/types";

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

			React.startTransition(() => {
				setEditorContent(query);
				setUploadedData(result);
				setCurrentTableName(sanitizedTableName);
			});

			toast.success(`Loaded data from table "${sanitizedTableName}"`);
		} catch (err) {
			console.error("[App] Error loading table:", err);
			toast.error(err instanceof Error ? err.message : "Failed to load table data");
		}
	};

	const handleRunSampleQuery = () => {
		const sampleQuery = "SELECT 'hello world' as message";
		setEditorContent(sampleQuery);
		handleRunQuery(sampleQuery);
	};

	const handleFileProcessed = async (data: CSVPipelineResult) => {
		const toastId = toast.loading("Creating table and importing data...");

		try {
			const { metadata, preview, tables, query } = await importCSV(db, data);

			React.startTransition(() => {
				setTableList(tables);
				setUploadedData(preview);
				setCurrentTableName(metadata.sanitizedTableName);
				setEditorContent(query);
			});

			toast.success(`Table "${metadata.sanitizedTableName}" created and data imported`, {
				id: toastId,
			});

			console.debug("[App] Upload complete!");
		} catch (err) {
			console.error("[App] Error during upload:", err);

			toast.error(err instanceof Error ? err.message : "Failed to process CSV file", {
				id: toastId,
			});
		}
	};

	const handleRunQuery = async (query: string) => {
		try {
			console.log(query);
			const result = await executeQuery(db, query);

			React.startTransition(() => {
				setUploadedData(result);
			});

			toast.success("Query executed successfully");
		} catch (err) {
			console.error("[App] Error executing query:", err);
			toast.error(err instanceof Error ? err.message : "Failed to execute query");
		}
	};

	const handleDropTable = async (tableName: string) => {
		try {
			const { tables, sanitizedTableName } = await dropTableService(db, tableName);

			React.startTransition(() => {
				setTableList(tables);

				if (currentTableName === tableName || currentTableName === sanitizedTableName) {
					setUploadedData(null);
					setEditorContent("");
					setCurrentTableName(null);
				}
			});

			toast.success(`Table "${sanitizedTableName}" dropped successfully`);
		} catch (err) {
			console.error("[App] Error dropping table:", err);
			toast.error(err instanceof Error ? err.message : "Failed to drop table");
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			const file = files[0];

			processCSVFile(file)
				.then(handleFileProcessed)
				.catch((err) => {
					console.error("Error processing CSV file:", err);
					toast.error(err instanceof Error ? err.message : "Failed to process CSV file");
				});
		}

		e.target.value = "";
	};

	const handleGetSchema = async (tableName: string) => {
		try {
			const result = await getSchemaService(db, tableName);

			const schemaData = result.rows || [];
			return schemaData as Array<{
				column_name: string;
				data_type: string;
				character_maximum_length: string | null;
				is_nullable: string;
				column_default: string | null;
				is_primary_key: string;
			}>;
		} catch (error) {
			console.error("Error fetching schema:", error);
			toast.error("Failed to fetch table schema");
			throw error;
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
						onGetSchema={handleGetSchema}
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
										<div className="flex justify-center items-center h-full">
											<NoData
												onRunSampleQuery={handleRunSampleQuery}
												onFileProcessed={handleFileProcessed}
											/>
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
