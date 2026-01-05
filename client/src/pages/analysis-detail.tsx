import { useAnalysis } from "@/hooks/use-analyses";
import { MSAAndTreeResults, MicroreactViewer } from "@/components/analysis";
import { useRoute } from "wouter";
import { useMicroreactData } from "@/hooks/use-microreact";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AnalysisDetailPage() {
  const [, params] = useRoute("/analyses/:id");
  const id = Number(params?.id);
  const { data: analysis, isLoading, error } = useAnalysis(id);
  const { data: microreactData } = useMicroreactData(id, analysis?.type === "Phylogeny");

  if (isLoading) return <DetailSkeleton />;
  if (error || !analysis) return <div className="p-8 text-center text-red-500">Analysis not found</div>;

  const renderResults = () => {
    if (analysis.status === "running" || analysis.status === "pending") {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6" />
          <h3 className="text-2xl font-bold animate-pulse">Analysis in Progress...</h3>
          <p className="text-muted-foreground mt-2">Please wait while our algorithms process your sequences.</p>
        </div>
      );
    }

    if (analysis.status === "failed") {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center text-destructive">
          <AlertTriangle className="w-16 h-16 mb-6" />
          <h3 className="text-2xl font-bold">Analysis Failed</h3>
          <p className="opacity-80 mt-2">There was an error processing this job.</p>
        </div>
      );
    }

    if ((analysis.type === "blastn" || analysis.type === "BLASTn") && Array.isArray(analysis.results?.hits)) {
      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Genotype</TableHead>
                  <TableHead className="text-right">% Identity</TableHead>
                  <TableHead className="text-right">Length</TableHead>
                  <TableHead className="text-right">E-Value</TableHead>
                  <TableHead className="text-right">Bit Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.results.hits.map((hit: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{hit.queryId}</TableCell>
                    <TableCell className="font-mono text-xs">{hit.subjectId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{hit.genotype}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{hit.identity}%</TableCell>
                    <TableCell className="text-right">{hit.alignmentLength}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{hit.eValue.toExponential(2)}</TableCell>
                    <TableCell className="text-right">{hit.bitScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }
    if ((analysis.type === "msa" || analysis.type === "MSA" || analysis.type === "Multiple Sequence Alignment") && Array.isArray(analysis.results?.sequences)) {
      // MSA: results.sequences: [{ accession, sequence }]
      return <MSAAndTreeResults msa={analysis.results.sequences} />;
    }
    if ((analysis.type === "phylogeny" || analysis.type === "Phylogeny") && (typeof analysis.results?.tree === "string" || microreactData)) {
      // Phylogeny: use Microreact viewer
      if (microreactData) {
        return <MicroreactViewer microreactData={microreactData} analysisId={id} />;
      }
      return <div className="p-8 text-center">Loading phylogenetic data...</div>;
    }
    
    // Fallback for other types
    return (
      <div className="glass-panel p-6 rounded-xl">
        <h4 className="font-bold mb-4">Results Object</h4>
        <pre className="text-xs font-mono bg-black/5 p-4 rounded-lg overflow-auto max-h-[500px]">
          {JSON.stringify(analysis.results, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{analysis.type.replace('_', ' ').toUpperCase()}</h1>
            <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
              {analysis.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">Analysis ID: {analysis.id} • Started {new Date(analysis.createdAt!).toLocaleString()}</p>
        </div>

        {analysis.status === 'completed' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const blob = new Blob([
                  JSON.stringify(analysis, null, 2)
                ], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analysis_${analysis.id}_report.json`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 100);
              }}
            >
              <Download className="w-4 h-4" />
              Download Report
            </Button>
            {analysis.type === 'Phylogeny' && analysis.results?.tree && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const blob = new Blob([
                    analysis.results.tree
                  ], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `phylogeny_${analysis.id}.nwk`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }, 100);
                }}
              >
                <Download className="w-4 h-4" />
                Download phylogeny (.nwk)
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
        <div className="p-8 border-b border-border bg-muted/20">
          <h2 className="text-lg font-bold">Analysis Results</h2>
        </div>
        <div className="p-8">
          {renderResults()}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="h-[500px] rounded-3xl bg-muted/20 animate-pulse" />
    </div>
  );
}
