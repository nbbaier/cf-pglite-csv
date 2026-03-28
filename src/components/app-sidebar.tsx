import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { Database, MoreHorizontal, Table } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { CSVPipelineResult } from "@/lib/csv-processing";
import { CSVUpload } from "./csv-upload";
import { DropTableDialog } from "./drop-table-dialog";
import { ModeToggle } from "./mode-toggle";
import { SchemaDialog } from "./schema-dialog";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export interface SchemaData {
  character_maximum_length: string | null;
  column_default: string | null;
  column_name: string;
  data_type: string;
  is_nullable: string;
  is_primary_key: string;
}

interface AddSidebarProps {
  database: PGliteWithLive;
  onDropTable: (tableName: string) => void;
  onFileProcessed: (data: CSVPipelineResult) => void;
  onGetSchema: (tableName: string) => Promise<SchemaData[]>;
  onTableClick: (tableName: string) => void;
  tables: string[];
}

export function AppSidebar({
  onTableClick,
  onFileProcessed,
  onDropTable,
  onGetSchema,
  ...props
}: AddSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const [dropDialogOpen, setDropDialogOpen] = useState(false);
  const [tableToDrop, setTableToDrop] = useState<string | null>(null);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [schemaData, setSchemaData] = useState<SchemaData[]>([]);
  const [schemaTableName, setSchemaTableName] = useState<string | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const handleTableClick = (tableName: string) => {
    onTableClick(tableName);
  };

  const handleFileProcessed = (data: CSVPipelineResult) => {
    onFileProcessed(data);
  };

  const handleDropTable = (tableName: string) => {
    onDropTable(tableName);
  };

  const handleDropTableClick = (tableName: string) => {
    setTableToDrop(tableName);
    setDropDialogOpen(true);
  };

  const handleGetSchema = async (tableName: string) => {
    setSchemaLoading(true);
    setSchemaTableName(tableName);
    try {
      const schema = await onGetSchema(tableName);
      setSchemaData(schema);
      setSchemaDialogOpen(true);
    } catch (error) {
      console.error("Error fetching schema:", error);
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleConfirmDrop = () => {
    if (tableToDrop) {
      handleDropTable(tableToDrop);
      setDropDialogOpen(false);
      setTableToDrop(null);
    }
  };

  const tableActions = [
    {
      key: "drop",
      label: "Drop table",
      onSelect: handleDropTableClick,
      tone: "destructive" as const,
    },
    {
      key: "schema",
      label: "Get schema",
      onSelect: handleGetSchema,
    },
  ];

  return (
    <>
      <Sidebar {...props}>
        <SidebarHeader className="h-16 border-b">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                    <Database className="size-6" />
                  </div>
                  <div className="flex flex-col gap-0.5 font-bold text-xl leading-none">
                    <span className="font-medium">CSV Analyzer</span>
                  </div>
                </div>
                <ModeToggle />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Tables</SidebarGroupLabel>
            <SidebarMenu>
              {props.tables.map((tableName) => (
                <DropdownMenu key={tableName}>
                  <SidebarMenuItem key={tableName}>
                    <div className="flex w-full items-center">
                      <SidebarMenuButton
                        className="flex-1 font-mono text-sm data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        onClick={() => handleTableClick(tableName)}
                      >
                        <Table />
                        <span>{tableName}</span>
                      </SidebarMenuButton>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="ml-auto h-6 w-6 p-0 hover:bg-sidebar-accent"
                          onClick={(e) => e.stopPropagation()}
                          size="sm"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-lg"
                      side="bottom"
                    >
                      {tableActions.map((action) => (
                        <DropdownMenuItem
                          className={
                            action.tone === "destructive"
                              ? "text-destructive focus:text-destructive"
                              : undefined
                          }
                          key={action.key}
                          onSelect={(event) => {
                            event.preventDefault();
                            action.onSelect(tableName);
                          }}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </SidebarMenuItem>
                </DropdownMenu>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <CSVUpload
            maxSize={5 * 1024 * 1024}
            multiple={true}
            onFileProcessed={handleFileProcessed}
            size="default"
            variant="default"
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <DropTableDialog
        dialogOpen={dropDialogOpen}
        handleConfirmDrop={handleConfirmDrop}
        setDialogOpen={setDropDialogOpen}
        tableToDrop={tableToDrop || ""}
      />
      <SchemaDialog
        dialogOpen={schemaDialogOpen}
        schemaData={schemaData}
        schemaLoading={schemaLoading}
        schemaTableName={schemaTableName || ""}
        setDialogOpen={setSchemaDialogOpen}
      />
    </>
  );
}
