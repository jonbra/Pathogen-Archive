import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MicroreactFile {
  $schema?: string;
  name: string;
  description?: string;
  files?: {
    tree?: {
      name?: string;
      format?: string;
      data?: string;
    };
    metadata?: {
      name?: string;
      format?: string;
      data?: string;
    };
  };
  settings?: Record<string, any>;
  [key: string]: any;
}

interface Props {
  microreactData: MicroreactFile | string;
  title?: string;
}

const MicroreactViewer: React.FC<Props> = ({ microreactData, title = "Phylogenetic Project" }) => {
  const [activeTab, setActiveTab] = useState("tree");

  const data: MicroreactFile =
    typeof microreactData === "string"
      ? JSON.parse(microreactData)
      : microreactData;

  const treeData = data.files?.tree?.data;
  const metadataData = data.files?.metadata?.data;
  const metadataRows = metadataData ? metadataData.split("\n") : [];
  const headers = metadataRows[0]?.split(",") || [];
  const rows = metadataRows.slice(1).filter((r) => r.trim());

  const downloadMicroreactFile = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:application/json;charset=utf-8," + encodeURIComponent(jsonString)
    );
    element.setAttribute("download", `${data.name.replace(/\s+/g, "_")}.microreact`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadMetadataCSV = () => {
    if (!metadataData) return;
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(metadataData)
    );
    element.setAttribute("download", "metadata.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadTreeFile = () => {
    if (!treeData) return;
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(treeData)
    );
    element.setAttribute("download", "tree.nwk");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{data.name}</h2>
            {data.description && (
              <p className="text-muted-foreground text-sm mt-1">{data.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadMicroreactFile}
            data-testid="button-download-microreact"
          >
            <Download className="w-4 h-4 mr-2" />
            .microreact
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tree" data-testid="tab-tree">
            Tree ({treeData ? "✓" : "✗"})
          </TabsTrigger>
          <TabsTrigger value="metadata" data-testid="tab-metadata">
            Metadata ({metadataData ? "✓" : "✗"})
          </TabsTrigger>
          <TabsTrigger value="json" data-testid="tab-json">
            Project JSON
          </TabsTrigger>
        </TabsList>

        {/* Tree Tab */}
        <TabsContent value="tree" className="space-y-4">
          {treeData ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadTreeFile}
                data-testid="button-download-tree"
              >
                <Download className="w-4 h-4 mr-2" />
                Newick
              </Button>
              <div className="bg-muted/30 rounded-lg p-4 border border-border overflow-x-auto">
                <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                  {treeData}
                </pre>
              </div>
            </>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              No tree data available
            </Card>
          )}
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-4">
          {metadataData ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadMetadataCSV}
                data-testid="button-download-metadata"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <div className="bg-muted/30 rounded-lg overflow-x-auto border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {headers.map((header, idx) => (
                        <th key={idx} className="text-left p-3 font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => {
                      const cells = row.split(",");
                      return (
                        <tr
                          key={rowIdx}
                          className="border-b border-border hover:bg-muted/20 transition-colors"
                        >
                          {cells.map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-3 font-mono text-xs">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              No metadata available
            </Card>
          )}
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json" className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border overflow-x-auto max-h-96">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

      {/* Project Info */}
      {data.settings && (
        <Card className="p-4 bg-muted/20 border border-border">
          <h4 className="font-semibold mb-3">Visualization Settings</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(data.settings).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MicroreactViewer;
