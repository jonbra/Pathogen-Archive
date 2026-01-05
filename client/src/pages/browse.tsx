import { useState, useMemo } from "react";
import { useSequences, useDeleteSequence } from "@/hooks/use-sequences";
import { useLocation } from "wouter";
import { Search, Trash2, Filter, ChevronDown, CheckSquare, Square, PlayCircle, ArrowUpDown } from "lucide-react";
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
import type { Sequence } from "@shared/schema";

type SortField = "sample_id" | "header" | "year" | "gene" | "genotype" | "country" | "outbreak" | "length";
type SortDirection = "asc" | "desc";

export default function BrowsePage() {
  const [, setLocation] = useLocation();
  const { data: sequences, isLoading } = useSequences();
  const { mutate: deleteSequence } = useDeleteSequence();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Helper to extract year from samplingDate or metadata
  const getYear = (seq: Sequence): string => {
    if (seq.samplingDate) {
      const parts = seq.samplingDate.split('.');
      return parts[0] || '';
    }
    const year = seq.metadata?.year || seq.metadata?.Year;
    return year ? String(year) : '';
  };

  // Helper to extract gene from metadata or genotype
  const getGene = (seq: Sequence): string => {
    const gene = seq.metadata?.gene || seq.metadata?.Gene || '';
    return gene ? String(gene) : '';
  };

  // Filter and sort sequences
  const displaySequences = useMemo(() => {
    if (!sequences) return [];
    const term = search.toLowerCase();
    
    let filtered = sequences.filter(seq => 
      seq.accession.toLowerCase().includes(term) || 
      seq.sequenceId?.toLowerCase().includes(term) ||
      seq.genotype?.toLowerCase().includes(term) ||
      seq.filename.toLowerCase().includes(term) ||
      JSON.stringify(seq.metadata).toLowerCase().includes(term)
    );

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortField) {
          case 'sample_id':
            aVal = a.sequenceId || '';
            bVal = b.sequenceId || '';
            break;
          case 'header':
            aVal = a.accession;
            bVal = b.accession;
            break;
          case 'year':
            aVal = getYear(a);
            bVal = getYear(b);
            break;
          case 'gene':
            aVal = getGene(a);
            bVal = getGene(b);
            break;
          case 'genotype':
            aVal = a.genotype || '';
            bVal = b.genotype || '';
            break;
          case 'country':
            aVal = a.country || '';
            bVal = b.country || '';
            break;
          case 'outbreak':
            aVal = a.outbreak || '';
            bVal = b.outbreak || '';
            break;
          case 'length':
            aVal = a.sequence.length;
            bVal = b.sequence.length;
            break;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [sequences, search, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
      data-testid={`button-sort-${field}`}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortField === field && (
          <ArrowUpDown className={`w-4 h-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
        )}
      </div>
    </TableHead>
  );

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === displaySequences.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displaySequences.map(s => s.id)));
    }
  };

  const handleAnalysis = () => {
    if (selectedIds.size === 0) return;
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
            {isLoading ? "Loading..." : `${displaySequences.length} sequences available`}
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
                  checked={displaySequences.length > 0 && selectedIds.size === displaySequences.length}
                  onCheckedChange={toggleAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <SortableHeader field="sample_id" label="Sample ID" />
              <SortableHeader field="header" label="Header" />
              <SortableHeader field="year" label="Year" />
              <SortableHeader field="gene" label="Gene" />
              <SortableHeader field="genotype" label="Genotype" />
              <SortableHeader field="country" label="Country" />
              <SortableHeader field="outbreak" label="Outbreak" />
              <SortableHeader field="length" label="Length (bp)" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="w-4 h-4 rounded bg-muted animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="text-right"><div className="h-8 w-8 ml-auto bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : displaySequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-32 text-muted-foreground">
                  No sequences found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              displaySequences.map(seq => (
                <TableRow key={seq.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(seq.id)}
                      onCheckedChange={() => toggleSelect(seq.id)}
                      data-testid={`checkbox-sequence-${seq.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium" data-testid={`text-sample-id-${seq.id}`}>
                    {seq.sequenceId || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-primary" data-testid={`text-header-${seq.id}`}>
                    {seq.accession}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-year-${seq.id}`}>
                    {getYear(seq) || '—'}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-gene-${seq.id}`}>
                    {getGene(seq) || '—'}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-genotype-${seq.id}`}>
                    {seq.genotype || '—'}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-country-${seq.id}`}>
                    {seq.country || '—'}
                  </TableCell>
                  <TableCell className="text-sm" data-testid={`text-outbreak-${seq.id}`}>
                    {seq.outbreak || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground" data-testid={`text-length-${seq.id}`}>
                    {seq.sequence.length.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(seq.id)} 
                      className="text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-${seq.id}`}
                    >
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
