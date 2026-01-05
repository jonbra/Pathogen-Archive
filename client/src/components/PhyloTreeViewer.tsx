import React, { useEffect, useRef } from "react";

// Use d3 and phylotree from global (loaded via CDN)
declare const d3: any;
declare const phylotree: any;

declare global {
  interface Window {
    phylotree: any;
    d3: any;
  }
}

interface Props {
  newick: string;
}

// Simple Newick tree parser and renderer as fallback
const renderSimpleTree = (svg: any, newick: string, width: number, height: number) => {
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
  
  const countLeaves = (node: any): number => {
    if (!node.children) return 1;
    return node.children.reduce((sum: number, child: any) => sum + countLeaves(child), 0);
  };
  
  const leafCount = countLeaves(root);
  const margin = { top: 20, right: 120, bottom: 20, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
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
  
  const getMaxDepth = (node: any): number => {
    if (!node.children) return 0;
    return 1 + Math.max(...node.children.map(getMaxDepth));
  };
  
  assignPositions(root, 0);
  const maxDepth = getMaxDepth(root) || 1;
  
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const drawNode = (node: any) => {
    const x = (node.depth / maxDepth) * innerWidth;
    
    if (node.children) {
      node.children.forEach((child: any) => {
        const childX = (child.depth / maxDepth) * innerWidth;
        g.append("line")
          .attr("x1", x).attr("y1", node.y)
          .attr("x2", x).attr("y2", child.y)
          .attr("stroke", "hsl(var(--border))").attr("stroke-width", 1.5);
        g.append("line")
          .attr("x1", x).attr("y1", child.y)
          .attr("x2", childX).attr("y2", child.y)
          .attr("stroke", "hsl(var(--border))").attr("stroke-width", 1.5);
        drawNode(child);
      });
    }
    
    g.append("circle")
      .attr("cx", x).attr("cy", node.y).attr("r", 4)
      .attr("fill", node.children ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))");
    
    if (!node.children && node.name) {
      g.append("text")
        .attr("x", x + 8).attr("y", node.y).attr("dy", "0.35em")
        .attr("font-size", "11px").attr("fill", "hsl(var(--foreground))")
        .text(node.name);
    }
  };
  
  drawNode(root);
};

const PhyloTreeViewer: React.FC<Props> = ({ newick }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !newick) return;
    containerRef.current.innerHTML = "";
    
    const width = containerRef.current.clientWidth || 600;
    const height = 300;
    
    try {
      // Try different phylotree API patterns
      if (window.phylotree && typeof window.phylotree === 'function') {
        const tree = window.phylotree(newick);
        const svg = window.d3.select(containerRef.current).append("svg")
          .attr("width", width).attr("height", height);
        if (tree.render) {
          tree.render({ container: svg, width, height });
        } else if (tree.svg) {
          tree.svg(svg);
          tree.layout();
        }
      } else if (window.phylotree && window.phylotree.phylotree) {
        const tree = new window.phylotree.phylotree(newick);
        const svg = window.d3.select(containerRef.current).append("svg")
          .attr("width", width).attr("height", height);
        tree.render({ container: svg, width, height });
      } else {
        // Fallback to simple D3-based tree rendering
        const svg = window.d3.select(containerRef.current).append("svg")
          .attr("width", width).attr("height", height);
        renderSimpleTree(svg, newick, width, height);
      }
    } catch (err) {
      console.error("PhyloTreeViewer error:", err);
      // Fallback rendering
      try {
        containerRef.current.innerHTML = "";
        const svg = window.d3.select(containerRef.current).append("svg")
          .attr("width", width).attr("height", height);
        renderSimpleTree(svg, newick, width, height);
      } catch (fallbackErr) {
        containerRef.current.innerHTML = `<div class="p-4 text-red-500">Failed to render tree</div>`;
      }
    }
  }, [newick]);

  return <div ref={containerRef} style={{ height: "300px", width: "100%" }} />;
};

export default PhyloTreeViewer;
