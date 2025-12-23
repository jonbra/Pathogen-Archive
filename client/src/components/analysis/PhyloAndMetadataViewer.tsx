import React, { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhyloSequence {
  accession?: string;
  name?: string;
  sequence?: string;
  seq?: string;
}

interface Props {
  newick: string;
  sequences?: PhyloSequence[];
  title?: string;
}

const PhyloAndMetadataViewer: React.FC<Props> = ({ 
  newick, 
  sequences = [], 
  title = "Phylogenetic Tree with Metadata" 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !newick) return;

    // Simple SVG tree rendering from Newick
    renderTreeSVG(newick, svgRef.current);
  }, [newick]);

  const renderTreeSVG = (newickStr: string, svg: SVGSVGElement) => {
    // Clear existing content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Parse Newick and build tree structure
    const tree = parseNewick(newickStr);
    if (!tree) return;

    // Set SVG dimensions
    const width = svg.clientWidth || 800;
    const height = Math.max(300, sequences.length * 25 + 100);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));

    // Render tree
    const margin = { top: 20, right: 20, bottom: 20, left: 150 };
    const drawWidth = width - margin.left - margin.right;
    const drawHeight = height - margin.top - margin.bottom;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${margin.left},${margin.top})`);

    // Calculate node positions
    const nodePositions = new Map<any, { x: number; y: number }>();
    const leaves: any[] = [];
    
    collectLeaves(tree, leaves);
    const leafCount = leaves.length || 1;
    
    layoutTree(tree, 0, 0, drawWidth, drawHeight, nodePositions, leaves);

    // Draw branches
    drawBranches(g, tree, nodePositions, drawHeight);
    
    // Draw nodes and labels
    drawNodes(g, tree, nodePositions, leaves);

    svg.appendChild(g);

    // Add axis label
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(drawWidth / 2 + margin.left));
    label.setAttribute("y", String(height - 5));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "12");
    label.setAttribute("fill", "#666");
    label.textContent = "Evolutionary Distance";
    svg.appendChild(label);
  };

  const downloadNewick = () => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(newick));
    element.setAttribute("download", "tree.nwk");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadCSV = () => {
    if (!sequences.length) return;
    
    const headers = ["Accession", "Sequence_Length"];
    const rows = sequences.map((seq) => [
      seq.accession || seq.name || "unknown",
      (seq.sequence || seq.seq || "").length,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
    element.setAttribute("download", "metadata.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadNewick} data-testid="button-download-newick">
              <Download className="w-4 h-4 mr-2" />
              Newick
            </Button>
            {sequences.length > 0 && (
              <Button size="sm" variant="outline" onClick={downloadCSV} data-testid="button-download-metadata-csv">
                <Download className="w-4 h-4 mr-2" />
                Metadata
              </Button>
            )}
          </div>
        </div>

        {/* Tree Visualization */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border overflow-x-auto">
          <svg ref={svgRef} style={{ minHeight: "300px", width: "100%" }} />
        </div>

        {/* Newick Text */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Newick Format:</p>
          <pre className="font-mono text-xs whitespace-pre-wrap break-words">
            {newick}
          </pre>
        </div>
      </div>

      {/* Metadata Table */}
      {sequences.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Sequence Metadata</h3>
          <div className="bg-muted/30 rounded-lg overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3">Accession</th>
                  <th className="text-right p-3">Length (bp)</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((seq, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono text-xs">{seq.accession || seq.name || "unknown"}</td>
                    <td className="text-right p-3 font-mono text-muted-foreground">
                      {(seq.sequence || seq.seq || "").length.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Newick parsing
interface TreeNode {
  name?: string;
  distance?: number;
  children?: TreeNode[];
}

function parseNewick(str: string): TreeNode | null {
  str = str.trim();
  if (str.endsWith(";")) str = str.slice(0, -1);

  let pos = 0;
  const parseNode = (): TreeNode | null => {
    if (pos >= str.length) return null;

    const node: TreeNode = {};

    if (str[pos] === "(") {
      pos++;
      node.children = [];
      while (str[pos] !== ")") {
        const child = parseNode();
        if (child) node.children.push(child);
        if (str[pos] === ",") pos++;
      }
      pos++; // skip )
    }

    // Parse name and distance
    let name = "";
    while (pos < str.length && str[pos] !== ":" && str[pos] !== "," && str[pos] !== ")") {
      name += str[pos];
      pos++;
    }
    if (name) node.name = name;

    if (str[pos] === ":") {
      pos++;
      let dist = "";
      while (pos < str.length && "0123456789.-".includes(str[pos])) {
        dist += str[pos];
        pos++;
      }
      node.distance = parseFloat(dist) || 0;
    }

    return node;
  };

  return parseNode();
}

function collectLeaves(node: TreeNode | undefined, leaves: any[]): void {
  if (!node) return;
  if (!node.children || node.children.length === 0) {
    leaves.push(node);
  } else {
    for (const child of node.children) {
      collectLeaves(child, leaves);
    }
  }
}

function layoutTree(
  node: TreeNode | undefined,
  depth: number,
  yMin: number,
  width: number,
  height: number,
  positions: Map<any, { x: number; y: number }>,
  leaves: any[]
): number {
  if (!node) return yMin;

  let yPos = yMin;
  let minY = yMin;
  let maxY = yMin;

  if (!node.children || node.children.length === 0) {
    // Leaf node
    const leafIndex = leaves.indexOf(node);
    yPos = (leafIndex / Math.max(leaves.length - 1, 1)) * height;
    positions.set(node, { x: width - (depth + 1) * 20, y: yPos });
    return yPos;
  } else {
    // Internal node
    let totalY = 0;
    for (const child of node.children) {
      const childY = layoutTree(child, depth + 1, minY, width, height, positions, leaves);
      totalY += childY;
      minY = Math.min(minY, childY);
      maxY = Math.max(maxY, childY);
    }
    yPos = totalY / node.children.length;
    positions.set(node, { x: width - (depth + 1) * 20, y: yPos });
    return yPos;
  }
}

function drawBranches(
  g: Element,
  node: TreeNode | undefined,
  positions: Map<any, { x: number; y: number }>,
  height: number
): void {
  if (!node || !positions.has(node)) return;

  const parentPos = positions.get(node)!;

  if (node.children) {
    for (const child of node.children) {
      if (positions.has(child)) {
        const childPos = positions.get(child)!;

        // Horizontal line from parent
        const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line1.setAttribute("x1", String(parentPos.x));
        line1.setAttribute("y1", String(parentPos.y));
        line1.setAttribute("x2", String(childPos.x));
        line1.setAttribute("y2", String(parentPos.y));
        line1.setAttribute("stroke", "#999");
        line1.setAttribute("stroke-width", "1");
        g.appendChild(line1);

        // Vertical line to child
        const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line2.setAttribute("x1", String(childPos.x));
        line2.setAttribute("y1", String(parentPos.y));
        line2.setAttribute("x2", String(childPos.x));
        line2.setAttribute("y2", String(childPos.y));
        line2.setAttribute("stroke", "#999");
        line2.setAttribute("stroke-width", "1");
        g.appendChild(line2);
      }

      drawBranches(g, child, positions, height);
    }
  }
}

function drawNodes(
  g: Element,
  node: TreeNode | undefined,
  positions: Map<any, { x: number; y: number }>,
  leaves: any[]
): void {
  if (!node || !positions.has(node)) return;

  const pos = positions.get(node)!;
  const isLeaf = !node.children || node.children.length === 0;

  // Draw node circle
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", String(pos.x));
  circle.setAttribute("cy", String(pos.y));
  circle.setAttribute("r", isLeaf ? "3" : "2");
  circle.setAttribute("fill", isLeaf ? "#0088FE" : "#999");
  g.appendChild(circle);

  // Draw label for leaf nodes
  if (isLeaf && node.name) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(pos.x - 10));
    text.setAttribute("y", String(pos.y + 4));
    text.setAttribute("text-anchor", "end");
    text.setAttribute("font-size", "11");
    text.setAttribute("fill", "#333");
    text.textContent = node.name;
    g.appendChild(text);
  }

  if (node.children) {
    for (const child of node.children) {
      drawNodes(g, child, positions, leaves);
    }
  }
}

export default PhyloAndMetadataViewer;
