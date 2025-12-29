import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateAnalysis, useAnalyses } from "@/hooks/use-analyses";
import { useSequences } from "@/hooks/use-sequences";
import { useToast } from "@/hooks/use-toast";
import { BarChart, PieChart, Activity, Info, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const ANALYSIS_TYPES = [
  {
    id: "msa",
    title: "Multiple Sequence Alignment",
    description: "Align selected sequences using MAFFT.",
    icon: Activity,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  }
  ,{
    id: "Phylogeny",
    title: "Phylogeny",
    description: "Construct a phylogenetic tree using IQ-TREE (requires aligned sequences).",
    icon: FileText,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "blastn",
    title: "BLASTn",
    description: "Search for sequences using BLASTn against a database of sequences.",
    icon: Search,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  }
];

export default function NewAnalysisPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const preSelectedIds = searchParams.get('ids')?.split(',').map(Number) || [];

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSequenceIds, setSelectedSequenceIds] = useState<Set<number>>(new Set(preSelectedIds));
  const [selectedMSAId, setSelectedMSAId] = useState<number | null>(null);
  
  const { data: sequences } = useSequences();
  const { mutate: createAnalysis, isPending } = useCreateAnalysis();
  const { data: allAnalyses } = useAnalyses();

  const handleRun = () => {
    if (!selectedType) {
      toast({ title: "Error", description: "Please select an analysis type", variant: "destructive" });
      return;
    }
    if (selectedType !== "Phylogeny" && selectedSequenceIds.size === 0) {
      toast({ title: "Error", description: "Please select at least one sequence", variant: "destructive" });
      return;
    }

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
    } else if (selectedType === "blastn") {
      createAnalysis({
        type: "blastn",
        sequenceIds: Array.from(selectedSequenceIds),
        parameters: { 
          sequenceIds: Array.from(selectedSequenceIds),
          createNewDb: true 
        } 
      }, {
        onSuccess: () => {
          toast({ title: "Analysis Started", description: "Job has been queued successfully." });
          setLocation("/analyses");
        }
      });
    } else if (selectedType === "Phylogeny") {
      if (!selectedMSAId) {
        toast({ title: "Error", description: "Please select an MSA analysis as input for Phylogeny.", variant: "destructive" });
        return;
      }
      createAnalysis({
        type: "Phylogeny",
        sequenceIds: [], // Not needed for phylogeny
        parameters: { msaAnalysisId: selectedMSAId }
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

        {/* 2. Confirm Sequences (hide for Phylogeny) */}
        {selectedType !== "Phylogeny" && (
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
        )}

        {/* 3. Select MSA for Phylogeny */}
        {selectedType === "Phylogeny" && (
          <section className="glass-panel p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
              Select MSA Analysis
            </h2>
            <div>
              <select
                className="w-full p-2 border rounded"
                value={selectedMSAId ?? ''}
                onChange={e => setSelectedMSAId(Number(e.target.value) || null)}
              >
                <option value="">-- Select MSA Analysis --</option>
                {allAnalyses?.filter(a => (
                  (a.type === 'msa' || a.type === 'MSA' || a.type === 'Multiple Sequence Alignment') &&
                  a.status === 'completed'
                )).map(a => (
                  <option key={a.id} value={a.id}>
                    {`#${a.id} - ${a.type} (${a.createdAt ? new Date(a.createdAt).toLocaleString() : ''})`}
                  </option>
                ))}
              </select>
              <div className="text-sm text-muted-foreground mt-2">
                Only completed MSA analyses are shown.
              </div>
            </div>
          </section>
        )}

        {/* Action Bar */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            size="lg"
            onClick={handleRun}
            disabled={
              !selectedType ||
              (selectedType !== "Phylogeny" && selectedSequenceIds.size === 0) ||
              isPending ||
              (selectedType === "Phylogeny" && !selectedMSAId)
            }
            className="w-full md:w-auto text-lg px-8 shadow-xl shadow-primary/20"
          >
            {isPending ? "Starting Job..." : "Run Analysis"}
          </Button>
        </div>
      </div>
    </div>
  );
}
