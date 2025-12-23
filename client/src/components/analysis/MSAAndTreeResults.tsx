import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MSASequence {
  accession?: string;
  name?: string;
  sequence?: string;
  seq?: string;
}

interface Props {
  msa?: MSASequence[];
  newick?: string;
}

const MSAAndTreeResults: React.FC<Props> = ({ msa, newick }) => {
  const downloadNewick = () => {
    if (!newick) return;
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(newick));
    element.setAttribute("download", "tree.nwk");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadMSA = () => {
    if (!msa) return;
    const fasta = msa
      .map((seq) => {
        const header = seq.accession || seq.name || "seq";
        const sequence = seq.sequence || seq.seq || "";
        return `>${header}\n${sequence}`;
      })
      .join("\n");
    
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(fasta));
    element.setAttribute("download", "alignment.fasta");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8">
      {msa && msa.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Multiple Sequence Alignment</h3>
            <Button size="sm" variant="outline" onClick={downloadMSA} data-testid="button-download-msa">
              <Download className="w-4 h-4 mr-2" />
              Download FASTA
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto border border-border">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words">
              {msa.map((seq, idx) => {
                const header = seq.accession || seq.name || `seq_${idx}`;
                const sequence = seq.sequence || seq.seq || "";
                return `>${header}\n${sequence}\n`;
              })}
            </pre>
          </div>
        </div>
      )}

      {newick && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Phylogenetic Tree</h3>
            <Button size="sm" variant="outline" onClick={downloadNewick} data-testid="button-download-tree">
              <Download className="w-4 h-4 mr-2" />
              Download Newick
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto border border-border">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words">
              {newick}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default MSAAndTreeResults;
