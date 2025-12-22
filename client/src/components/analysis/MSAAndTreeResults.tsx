import React from "react";
import MSAAndTreeIframe from "../MSAAndTreeIframe";

interface Props {
  msa?: { name: string; seq: string }[];
  newick?: string;
}


const MSAAndTreeResults: React.FC<Props> = ({ msa, newick }) => {
  // Convert msa to the format expected by msatree.html (name/seq)
  const sequences = msa?.map(seq => ({
    name: seq.name || seq.accession || "seq",
    seq: seq.seq || seq.sequence || ""
  }));
  return (
    <div className="space-y-8">
      <MSAAndTreeIframe sequences={sequences} newick={newick} />
    </div>
  );
};

export default MSAAndTreeResults;
