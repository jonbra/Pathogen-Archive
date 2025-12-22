import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateAnalysis } from "@/hooks/use-analyses";
import { useSequences } from "@/hooks/use-sequences";
import { useToast } from "@/hooks/use-toast";
import { BarChart, PieChart, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const ANALYSIS_TYPES = [
  {
    id: "gc_content",
    title: "GC Content Analysis",
    description: "Calculate GC percentage across selected sequences.",
    icon: BarChart,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "nucleotide_dist",
    title: "Nucleotide Distribution",
    description: "Breakdown of A, T, G, C composition.",
    icon: PieChart,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "msa",
    title: "Multiple Sequence Alignment",
    description: "Align selected sequences using MAFFT.",
    icon: Activity,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  }
];

export default function NewAnalysisPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const preSelectedIds = searchParams.get('ids')?.split(',').map(Number) || [];

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSequenceIds, setSelectedSequenceIds] = useState<Set<number>>(new Set(preSelectedIds));
  
  const { data: sequences } = useSequences();
  const { mutate: createAnalysis, isPending } = useCreateAnalysis();

  const handleRun = () => {
    if (!selectedType) {
      toast({ title: "Error", description: "Please select an analysis type", variant: "destructive" });
      return;
    }
    if (selectedSequenceIds.size === 0) {
      toast({ title: "Error", description: "Please select at least one sequence", variant: "destructive" });
      return;
    }

    // Only allow MSA analysis if msa is selected
    if (selectedType === "msa") {
      createAnalysis({
        type: "msa",
        sequenceIds: Array.from(selectedSequenceIds),
        parameters: {}
      }, {
        onSuccess: () => {
          toast({ title: "Analysis Started", description: "Job has been queued successfully." });
          setLocation("/analyses");
        }
      });
    } else if (selectedType === "gc_content" || selectedType === "nucleotide_dist") {
      createAnalysis({
        type: selectedType,
        sequenceIds: Array.from(selectedSequenceIds),
        parameters: {}
      }, {
        onSuccess: () => {
          toast({ title: "Analysis Started", description: "Job has been queued successfully." });
          setLocation("/analyses");
        }
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">New Analysis</h1>
        <p className="text-muted-foreground mt-2">Configure and run a new genomic analysis job.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 1. Choose Analysis Type */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
            Select Analysis Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ANALYSIS_TYPES.map(type => (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative",
                  selectedType === type.id
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", type.bgColor, type.color)}>
                  <type.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">{type.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{type.description}</p>
                {selectedType === type.id && (
                  <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 2. Confirm Sequences */}
        <section className="glass-panel p-6 rounded-2xl">
           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
            Confirm Selection
          </h2>
          
          <div className="max-h-64 overflow-y-auto border border-border/50 rounded-xl bg-background/50">
            {sequences ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      {/* Checkbox for all could go here */}
                    </th>
                    <th className="px-4 py-3 text-left">Accession</th>
                    <th className="px-4 py-3 text-right">Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sequences.map(seq => (
                    <tr key={seq.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Checkbox 
                          checked={selectedSequenceIds.has(seq.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedSequenceIds);
                            if (checked) next.add(seq.id);
                            else next.delete(seq.id);
                            setSelectedSequenceIds(next);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono">{seq.accession}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{seq.sequence.length.toLocaleString()} bp</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">Loading sequences...</div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>{selectedSequenceIds.size} sequences selected for analysis</span>
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            size="lg"
            onClick={handleRun}
            disabled={!selectedType || selectedSequenceIds.size === 0 || isPending}
            className="w-full md:w-auto text-lg px-8 shadow-xl shadow-primary/20"
          >
            {isPending ? "Starting Job..." : "Run Analysis"}
          </Button>
        </div>
      </div>
    </div>
  );
}
