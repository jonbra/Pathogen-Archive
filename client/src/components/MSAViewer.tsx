
import React, { useEffect, useRef } from "react";

// MSA and lodash are loaded globally via CDN in index.html
declare const MSA: any;

type Sequence = { name: string; seq: string };

interface Props {
  sequences: Sequence[];
}

const MSAViewer: React.FC<Props> = ({ sequences }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || sequences.length === 0) return;
    containerRef.current.innerHTML = "";
    const msa = new MSA({
      el: containerRef.current,
      seqs: sequences,
      vis: { conserv: false, overviewbox: false },
    });
    msa.render();
  }, [sequences]);

  return <div ref={containerRef} style={{ height: "300px", width: "100%" }} />;
};

export default MSAViewer;
