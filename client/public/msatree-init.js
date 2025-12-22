// msatree-init.js
// Initialization logic for MSA and PhyloTree viewers

// Debug: Check what globals are available
console.log('window.MSA:', window.MSA);
console.log('window.msa:', window.msa);
console.log('window:', Object.keys(window));

function renderMSAAndTree(sequences, newick) {
  document.getElementById("msa-container").innerHTML = "";
  document.getElementById("tree-container").innerHTML = "";
  if (sequences && sequences.length) {
    // Try all possible global names for MSA
    const MSAClass = window.MSA || window.msa || undefined;
    if (!MSAClass) {
      console.error('MSA global not found! Available window keys:', Object.keys(window));
      return;
    }
    const msaViewer = new MSAClass({
      el: document.getElementById("msa-container"),
      seqs: sequences,
      vis: { conserv: false, overviewbox: false }
    });
    msaViewer.render();
  }
  if (newick) {
    const tree = new phylotree.phylotree(newick);
    tree.container(d3.select("#tree-container"));
    tree.layout("rectangular");
    tree.update();
  }
}

// Listen for postMessage from parent
window.addEventListener("message", (event) => {
  const { sequences, newick } = event.data || {};
  if (sequences || newick) {
    renderMSAAndTree(sequences, newick);
  }
});

// Example data for standalone view
const exampleSequences = [
  { name: "seq1", seq: "ATGCGT" },
  { name: "seq2", seq: "ATG-GT" },
  { name: "seq3", seq: "ATGCGC" }
];
const exampleNewick = "((seq1,seq2),seq3);";
renderMSAAndTree(exampleSequences, exampleNewick);
