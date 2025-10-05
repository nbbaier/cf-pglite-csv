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
import { withToast } from "@/lib/toast-utils";

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
		await withToast(() => fetchTablePreview(db, tableName), {
			successMessage: ({ sanitizedTableName }) =>
				`Loaded data from table "${sanitizedTableName}"`,
			onSuccess: ({ result, sanitizedTableName, query }) => {
				React.startTransition(() => {
					setEditorContent(query);
					setUploadedData(result);
					setCurrentTableName(sanitizedTableName);
				});
			},
			onError: (error) => {
				console.error("[App] Error loading table:", error);
			},
			fallbackErrorMessage: "Failed to load table data",
		});
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
		} catch (err) {
			console.error("[App] Error during upload:", err);

			toast.error(err instanceof Error ? err.message : "Failed to process CSV file", {
				id: toastId,
			});
		}
	};

	const handleRunQuery = async (query: string) => {
		if (!query.trim()) return;
		await withToast(
			async () => {
				return executeQuery(db, query);
			},
			{
				successMessage: "Query executed successfully",
				onSuccess: (result) => {
					React.startTransition(() => {
						setUploadedData(result);
					});
				},
				onError: (error) => {
					console.error("[App] Error executing query:", error);
				},
				fallbackErrorMessage: "Failed to execute query",
			},
		);
	};

	const handleDropTable = async (tableName: string) => {
		await withToast(() => dropTableService(db, tableName), {
			successMessage: ({ sanitizedTableName }) =>
				`Table "${sanitizedTableName}" dropped successfully`,
			onSuccess: ({ tables, sanitizedTableName }) => {
				React.startTransition(() => {
					setTableList(tables);

					if (currentTableName === tableName || currentTableName === sanitizedTableName) {
						setUploadedData(null);
						setEditorContent("");
						setCurrentTableName(null);
					}
				});
			},
			onError: (error) => {
				console.error("[App] Error dropping table:", error);
			},
			fallbackErrorMessage: "Failed to drop table",
		});
	};

	const handleGetSchema = async (tableName: string) => {
		const result = await withToast(() => getSchemaService(db, tableName), {
			onError: (error) => {
				console.error("Error fetching schema:", error);
			},
			fallbackErrorMessage: "Failed to fetch table schema",
		});

		const schemaData = result.rows || [];
		return schemaData as Array<{
			column_name: string;
			data_type: string;
			character_maximum_length: string | null;
			is_nullable: string;
			column_default: string | null;
			is_primary_key: string;
		}>;
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
