import { useSequences } from "@/hooks/use-sequences";
import { useAnalyses } from "@/hooks/use-analyses";
import { Dna, Activity, FileText, Database } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Link } from "wouter";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: sequences, isLoading: loadingSeq } = useSequences();
  const { data: analyses, isLoading: loadingAnalysis } = useAnalyses();

  const totalSequences = sequences?.length || 0;
  const totalAnalyses = analyses?.length || 0;
  const completedAnalyses = analyses?.filter(a => a.status === 'completed').length || 0;
  
  // Calculate total base pairs roughly
  const totalBasePairs = sequences?.reduce((acc, seq) => acc + seq.sequence.length, 0) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome back to your genomic dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingSeq || loadingAnalysis ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted/50 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard 
              title="Total Sequences" 
              value={totalSequences} 
              icon={<Dna className="w-6 h-6" />} 
              description="Stored in database"
            />
            <StatCard 
              title="Analyses Run" 
              value={totalAnalyses} 
              icon={<Activity className="w-6 h-6" />} 
              description={`${completedAnalyses} completed successfully`}
            />
            <StatCard 
              title="Base Pairs" 
              value={totalBasePairs.toLocaleString()} 
              icon={<Database className="w-6 h-6" />} 
              description="Total sequenced volume"
            />
            <StatCard 
              title="Reports Generated" 
              value={completedAnalyses} 
              icon={<FileText className="w-6 h-6" />} 
              description="Available for download"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Sequences</h2>
            <Link href="/browse" className="text-sm font-medium text-primary hover:underline">View All</Link>
          </div>
          
          {loadingSeq ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sequences && sequences.length > 0 ? (
            <div className="space-y-4">
              {sequences.slice(0, 5).map(seq => (
                <div key={seq.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-mono text-sm font-bold">
                      {seq.accession.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium font-mono text-sm">{seq.accession}</p>
                      <p className="text-xs text-muted-foreground">{seq.sequence.length.toLocaleString()} bp</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {new Date(seq.createdAt!).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No sequences found. <Link href="/upload" className="text-primary hover:underline">Upload some data</Link>.
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Analyses</h2>
            <Link href="/analyses" className="text-sm font-medium text-primary hover:underline">View All</Link>
          </div>
          
          {loadingAnalysis ? (
             <div className="space-y-4">
               <Skeleton className="h-12 w-full" />
               <Skeleton className="h-12 w-full" />
               <Skeleton className="h-12 w-full" />
             </div>
          ) : analyses && analyses.length > 0 ? (
            <div className="space-y-4">
              {analyses.slice(0, 5).map(analysis => (
                <div key={analysis.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      analysis.status === 'completed' ? "bg-emerald-500" :
                      analysis.status === 'running' ? "bg-blue-500 animate-pulse" :
                      analysis.status === 'failed' ? "bg-red-500" : "bg-gray-400"
                    )} />
                    <div>
                      <p className="font-medium text-sm">{analysis.type}</p>
                      <p className="text-xs text-muted-foreground capitalize">{analysis.status}</p>
                    </div>
                  </div>
                  <Link href={`/analyses/${analysis.id}`} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-background border hover:bg-muted transition-colors">
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-12 text-muted-foreground">
              No analyses run yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
