import { useAnalysis } from "@/hooks/use-analyses";
import { MSAAndTreeResults, MicroreactViewer } from "@/components/analysis";
import { useRoute } from "wouter";
import { useMicroreactData } from "@/hooks/use-microreact";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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

    // --- VISUALIZATIONS FOR RESULTS ---

    // Type: MSA or Phylogeny (show viewers)
    if ((analysis.type === "msa" || analysis.type === "MSA" || analysis.type === "Multiple Sequence Alignment") && Array.isArray(analysis.results?.sequences)) {
      // MSA: results.sequences: [{ accession, sequence }]
      return <MSAAndTreeResults msa={analysis.results.sequences} />;
    }
    if ((analysis.type === "phylogeny" || analysis.type === "Phylogeny") && (typeof analysis.results?.tree === "string" || microreactData)) {
      // Phylogeny: use Microreact viewer
      if (microreactData) {
        return <MicroreactViewer microreactData={microreactData} />;
      }
      return <div className="p-8 text-center">Loading phylogenetic data...</div>;
    }
    
    // Type: GC Content (Example Result Format: { "seq1": 0.45, "seq2": 0.52 })
    if (analysis.type === "gc_content") {
      const data = Object.entries(analysis.results || {}).map(([name, val]: [string, any]) => ({
        name,
        value: (val * 100).toFixed(2)
      }));

      return (
        <div className="space-y-8">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="font-bold mb-4">Raw Data</h4>
            <pre className="text-xs bg-black/5 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(analysis.results, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    // Type: Nucleotide Distribution (Example Result Format: { A: 120, T: 130, G: 90, C: 110 })
    if (analysis.type === "nucleotide_dist") {
      const data = Object.entries(analysis.results || {}).map(([name, value]) => ({ name, value }));
      
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {data.map((item: any, idx) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-bold">{item.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{item.value.toLocaleString()} bases</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
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
