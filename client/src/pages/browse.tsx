import { useState, useMemo } from "react";
import { useSequences, useDeleteSequence } from "@/hooks/use-sequences";
import { useLocation } from "wouter";
import { Search, Trash2, Filter, ChevronDown, CheckSquare, Square, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function BrowsePage() {
  const [, setLocation] = useLocation();
  const { data: sequences, isLoading } = useSequences();
  const { mutate: deleteSequence } = useDeleteSequence();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Filter sequences
  const filteredSequences = useMemo(() => {
    if (!sequences) return [];
    const term = search.toLowerCase();
    return sequences.filter(seq => 
      seq.accession.toLowerCase().includes(term) || 
      seq.filename.toLowerCase().includes(term) ||
      JSON.stringify(seq.metadata).toLowerCase().includes(term)
    );
  }, [sequences, search]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredSequences.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSequences.map(s => s.id)));
    }
  };

  const handleAnalysis = () => {
    if (selectedIds.size === 0) return;
    // In a real app we might pass IDs via context or URL query params
    // For now we'll store in localStorage or just navigate and let the user re-select if needed
    // But better: Navigate to analysis page with query param
    const ids = Array.from(selectedIds).join(',');
    setLocation(`/analyses/new?ids=${ids}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this sequence?")) {
      deleteSequence(id, {
        onSuccess: () => toast({ title: "Deleted", description: "Sequence removed successfully." })
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Browse Sequences</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading..." : `${filteredSequences.length} sequences available`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="default" 
            disabled={selectedIds.size === 0}
            onClick={handleAnalysis}
            className="bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Analyze Selected ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by accession, filename, or metadata..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-colors"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>Accession</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked>Length</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked>Host</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked>Location</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <div className="glass-panel rounded-xl overflow-hidden shadow-sm border border-border/50">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={filteredSequences.length > 0 && selectedIds.size === filteredSequences.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Accession</TableHead>
              <TableHead>Length (bp)</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="w-4 h-4 rounded bg-muted animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="text-right"><div className="h-8 w-8 ml-auto bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filteredSequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  No sequences found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredSequences.map(seq => (
                <TableRow key={seq.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(seq.id)}
                      onCheckedChange={() => toggleSelect(seq.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium text-primary">
                    {seq.accession}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {seq.sequence.length.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(seq.metadata || {}).slice(0, 3).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-xs font-normal">
                          <span className="opacity-50 mr-1">{k}:</span> {String(v)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(seq.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
