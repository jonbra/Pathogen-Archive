import React, { useState, useEffect, useRef } from "react";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

declare global {
  interface Window {
    d3: any;
    phylotree: any;
  }
}

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
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const data: MicroreactFile =
    typeof microreactData === "string"
      ? JSON.parse(microreactData)
      : microreactData;

  const treeData = data.files?.tree?.data;
  const metadataData = data.files?.metadata?.data;
  const metadataRows = metadataData ? metadataData.split("\n") : [];
  const headers = metadataRows[0]?.split(",") || [];
  const rows = metadataRows.slice(1).filter((r) => r.trim());

  useEffect(() => {
    if (activeTab === "tree" && treeData && treeContainerRef.current && window.d3) {
      // Clear previous tree
      treeContainerRef.current.innerHTML = "";
      
      try {
        const svg = window.d3.select(treeContainerRef.current)
          .append("svg")
          .attr("width", "100%")
          .attr("height", isFullscreen ? "800" : "500");

        // Initialize phylotree using d3.layout.phylotree (standard for 0.6.x)
        const tree = window.d3.layout.phylotree()
          .svg(svg)
          .options({
            "draw-size-nodes": true,
            "selectable": true,
            "collapsible": true
          });

        // Parse Newick
        tree(treeData);

        // Styling
        tree.style_nodes((element: any, data: any) => {
          if (data.name) {
            element.style("fill", "hsl(var(--primary))");
          }
        });

        tree.style_edges((element: any) => {
          element.style("stroke", "hsl(var(--border))");
          element.style("stroke-width", "1.5px");
        });

        // Render
        tree.layout();

      } catch (err) {
        console.error("Error rendering phylogenetic tree:", err);
        treeContainerRef.current.innerHTML = `<div class="p-4 text-destructive">Error rendering tree: ${String(err)}</div>`;
      }
    }
  }, [activeTab, treeData, isFullscreen]);

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
        <TabsList className="mb-4">
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadTreeFile}
                    data-testid="button-download-tree"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Newick
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? (
                      <><Minimize2 className="w-4 h-4 mr-2" /> Small View</>
                    ) : (
                      <><Maximize2 className="w-4 h-4 mr-2" /> Expand</>
                    )}
                  </Button>
                </div>
              </div>
              
              <div 
                className={`bg-white dark:bg-slate-900 rounded-lg border border-border overflow-hidden transition-all duration-300 ${isFullscreen ? 'min-h-[800px]' : 'min-h-[500px]'}`}
              >
                <div 
                  ref={treeContainerRef} 
                  className="w-full h-full p-4 [&_.phylotree-node_text]:text-[10px] [&_.phylotree-node_text]:fill-foreground"
                />
              </div>

              <Card className="p-4 bg-muted/20 border-dashed">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Raw Newick String</h4>
                <div className="bg-muted/30 rounded p-3 border border-border max-h-24 overflow-y-auto">
                  <code className="text-[10px] break-all leading-tight opacity-70">
                    {treeData}
                  </code>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-center text-muted-foreground border-dashed">
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
              <div className="bg-muted/30 rounded-lg overflow-x-auto border border-border shadow-inner">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border sticky top-0">
                    <tr>
                      {headers.map((header, idx) => (
                        <th key={idx} className="text-left p-3 font-semibold whitespace-nowrap">
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
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          {cells.map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-3 font-mono text-xs whitespace-nowrap">
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
            <Card className="p-6 text-center text-muted-foreground border-dashed">
              No metadata available
            </Card>
          )}
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json" className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border overflow-x-auto max-h-[500px] shadow-inner">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

      {/* Project Info */}
      {data.settings && (
        <Card className="p-4 bg-muted/20 border border-border shadow-sm">
          <h4 className="text-sm font-semibold mb-3 border-b border-border pb-2">Visualization Settings</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
            {Object.entries(data.settings).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground text-xs">{key}:</span>
                <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-xs">{String(value)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MicroreactViewer;
