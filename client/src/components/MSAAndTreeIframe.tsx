import React, { useRef, useEffect } from "react";

interface Props {
  sequences?: { name: string; seq: string }[];
  newick?: string;
  width?: string;
  height?: string;
}

const MSAAndTreeIframe: React.FC<Props> = ({ sequences, newick, width = "100%", height = "650px" }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && (sequences || newick)) {
      iframeRef.current.contentWindow?.postMessage({ sequences, newick }, "*");
    }
  }, [sequences, newick]);

  return (
    <iframe
      ref={iframeRef}
      src="/msatree.html"
      style={{ width, height, border: "1px solid #ccc" }}
      title="MSA & PhyloTree Viewer"
    />
  );
};

export default MSAAndTreeIframe;
