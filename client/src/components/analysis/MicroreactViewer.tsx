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
  
  // Parse CSV properly (handle quoted values with commas)
  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const metadataRows = metadataData ? metadataData.split("\n").filter(r => r.trim()) : [];
  const headers = metadataRows[0] ? parseCSVRow(metadataRows[0]) : [];
  const rows = metadataRows.slice(1).filter((r) => r.trim());

  useEffect(() => {
    if (activeTab === "tree" && treeData && treeContainerRef.current && window.d3) {
      // Clear previous tree
      treeContainerRef.current.innerHTML = "";
      
      try {
        const containerWidth = treeContainerRef.current.clientWidth || 800;
        const containerHeight = isFullscreen ? 800 : 500;
        
        const svg = window.d3.select(treeContainerRef.current)
          .append("svg")
          .attr("width", containerWidth)
          .attr("height", containerHeight);

        // phylotree.js v1.x+ uses the phylotree global directly
        // Check for different API patterns
        let tree: any;
        
        if (window.phylotree && typeof window.phylotree === 'function') {
          // phylotree v1.x style: phylotree(newick) returns tree object
          tree = window.phylotree(treeData);
        } else if (window.phylotree && window.phylotree.phylotree) {
          // Some builds export as phylotree.phylotree
          tree = new window.phylotree.phylotree(treeData);
        } else if (window.d3.layout && window.d3.layout.phylotree) {
          // Legacy d3.layout.phylotree style (older versions)
          tree = window.d3.layout.phylotree()(treeData);
        } else {
          // Fallback: render tree manually using simple D3 visualization
          renderSimpleTree(svg, treeData, containerWidth, containerHeight);
          return;
        }

        // Configure and render if we got a tree object
        if (tree && tree.render) {
          tree.render({
            container: svg,
            width: containerWidth,
            height: containerHeight,
            "draw-size-bubbles": false,
            selectable: true,
            collapsible: true
          });
        } else if (tree && tree.svg) {
          tree.svg(svg);
          tree.layout();
        }

      } catch (err) {
        console.error("Error rendering phylogenetic tree:", err);
        // Fallback to simple tree rendering
        try {
          const containerWidth = treeContainerRef.current!.clientWidth || 800;
          const containerHeight = isFullscreen ? 800 : 500;
          treeContainerRef.current!.innerHTML = "";
          const svg = window.d3.select(treeContainerRef.current)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);
          renderSimpleTree(svg, treeData, containerWidth, containerHeight);
        } catch (fallbackErr) {
          console.error("Fallback rendering also failed:", fallbackErr);
          treeContainerRef.current!.innerHTML = `<div class="p-4 text-destructive">Error rendering tree: ${String(err)}</div>`;
        }
      }
    }
  }, [activeTab, treeData, isFullscreen]);

  // Simple Newick tree parser and renderer as fallback
  const renderSimpleTree = (svg: any, newick: string, width: number, height: number) => {
    // Parse Newick format into a tree structure
    const parseNewick = (str: string): any => {
      const ancestors: any[] = [];
      let tree: any = {};
      const tokens = str.split(/\s*(;|\(|\)|,|:)\s*/);
      let subtree: any;
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        switch (token) {
          case '(':
            subtree = {};
            tree.children = [subtree];
            ancestors.push(tree);
            tree = subtree;
            break;
          case ',':
            subtree = {};
            ancestors[ancestors.length - 1].children.push(subtree);
            tree = subtree;
            break;
          case ')':
            tree = ancestors.pop();
            break;
          case ':':
            break;
          default:
            const x = tokens[i - 1];
            if (x === ')' || x === '(' || x === ',') {
              tree.name = token;
            } else if (x === ':') {
              tree.length = parseFloat(token);
            }
        }
      }
      return tree;
    };

    const root = parseNewick(newick);
    
    // Count leaves for layout
    const countLeaves = (node: any): number => {
      if (!node.children) return 1;
      return node.children.reduce((sum: number, child: any) => sum + countLeaves(child), 0);
    };
    
    const leafCount = countLeaves(root);
    const margin = { top: 20, right: 120, bottom: 20, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Assign positions
    let leafIndex = 0;
    const assignPositions = (node: any, depth: number): void => {
      node.depth = depth;
      if (!node.children) {
        node.y = (leafIndex / (leafCount - 1 || 1)) * innerHeight;
        leafIndex++;
      } else {
        node.children.forEach((child: any) => assignPositions(child, depth + 1));
        const ys = node.children.map((c: any) => c.y);
        node.y = (Math.min(...ys) + Math.max(...ys)) / 2;
      }
    };
    
    // Find max depth
    const getMaxDepth = (node: any): number => {
      if (!node.children) return 0;
      return 1 + Math.max(...node.children.map(getMaxDepth));
    };
    
    assignPositions(root, 0);
    const maxDepth = getMaxDepth(root) || 1;
    
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Draw tree recursively
    const drawNode = (node: any) => {
      const x = (node.depth / maxDepth) * innerWidth;
      
      if (node.children) {
        node.children.forEach((child: any) => {
          const childX = (child.depth / maxDepth) * innerWidth;
          // Draw horizontal line to child level
          g.append("line")
            .attr("x1", x)
            .attr("y1", node.y)
            .attr("x2", x)
            .attr("y2", child.y)
            .attr("stroke", "hsl(var(--border))")
            .attr("stroke-width", 1.5);
          // Draw vertical line to child
          g.append("line")
            .attr("x1", x)
            .attr("y1", child.y)
            .attr("x2", childX)
            .attr("y2", child.y)
            .attr("stroke", "hsl(var(--border))")
            .attr("stroke-width", 1.5);
          drawNode(child);
        });
      }
      
      // Draw node
      g.append("circle")
        .attr("cx", x)
        .attr("cy", node.y)
        .attr("r", 4)
        .attr("fill", node.children ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))");
      
      // Draw label for leaves
      if (!node.children && node.name) {
        g.append("text")
          .attr("x", x + 8)
          .attr("y", node.y)
          .attr("dy", "0.35em")
          .attr("font-size", "11px")
          .attr("fill", "hsl(var(--foreground))")
          .text(node.name);
      }
    };
    
    drawNode(root);
  };

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
                      const cells = parseCSVRow(row);
                      return (
                        <tr
                          key={rowIdx}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          {cells.map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-3 font-mono text-xs whitespace-nowrap">
                              {cell || '—'}
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
