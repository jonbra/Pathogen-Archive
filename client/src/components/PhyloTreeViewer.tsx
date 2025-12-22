import React, { useEffect, useRef } from "react";



// Use d3 and phylotree from global (loaded via CDN)
declare const d3: any;
declare const phylotree: any;

declare global {
  interface Window {
    phylotree: any;
  }
}

interface Props {
  newick: string;
}

const PhyloTreeViewer: React.FC<Props> = ({ newick }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !newick) return;
    containerRef.current.innerHTML = "";
    // Use the global phylotree object from CDN (v0.6.0)
    const tree = new phylotree.phylotree(newick);
    tree.container(d3.select(containerRef.current));
    tree.layout("rectangular");
    tree.update();
  }, [newick]);

  return <div ref={containerRef} style={{ height: "300px", width: "100%" }} />;
};

export default PhyloTreeViewer;
