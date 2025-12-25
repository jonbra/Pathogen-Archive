import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sequence, SequenceSearchParams } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Save, Play, CheckSquare, Square } from "lucide-react";
import { useLocation } from "wouter";

export default function SearchPage() {
  const [params, setParams] = useState<SequenceSearchParams>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: results, isLoading, refetch } = useQuery<Sequence[]>({
    queryKey: ["/api/sequences/search", params],
    enabled: false,
  });

  const saveSearchMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/saved-searches", data);
    },
    onSuccess: () => {
      toast({ title: "Search saved successfully" });
      setIsSaveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/saved-searches"] });
    },
  });

  const handleSearch = () => {
    refetch();
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (results) {
      if (selectedIds.length === results.length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(results.map(s => s.id));
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStartAnalysis = () => {
    if (selectedIds.length === 0) return;
    sessionStorage.setItem("selectedSequenceIds", JSON.stringify(selectedIds));
    setLocation("/analyses/new");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Advanced Sequence Search</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Genotype</Label>
            <Input 
              value={params.genotype || ""} 
              onChange={e => setParams(p => ({ ...p, genotype: e.target.value }))}
              placeholder="e.g. IA, IB"
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input 
              value={params.country || ""} 
              onChange={e => setParams(p => ({ ...p, country: e.target.value }))}
              placeholder="e.g. Norway"
            />
          </div>
          <div className="space-y-2">
            <Label>Sampling Date</Label>
            <Input 
              value={params.samplingDate || ""} 
              onChange={e => setParams(p => ({ ...p, samplingDate: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="space-y-2">
            <Label>Outbreak</Label>
            <Input 
              value={params.outbreak || ""} 
              onChange={e => setParams(p => ({ ...p, outbreak: e.target.value }))}
            />
          </div>
          <div className="flex items-center space-x-2 pt-8">
            <Checkbox 
              id="complete" 
              checked={params.requireComplete}
              onCheckedChange={checked => setParams(p => ({ ...p, requireComplete: !!checked }))}
            />
            <Label htmlFor="complete">Require all fields (exclude missing data)</Label>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} className="w-full">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Results ({results.length})</CardTitle>
            <div className="space-x-2">
              <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Save className="mr-2 h-4 w-4" /> Save Search
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Current Search</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Search name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={saveDescription} onChange={e => setSaveDescription(e.target.value)} placeholder="Description" />
                    </div>
                    <Button 
                      onClick={() => saveSearchMutation.mutate({ name: saveName, description: saveDescription, params })}
                      className="w-full"
                    >
                      Confirm Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={handleStartAnalysis} disabled={selectedIds.length === 0}>
                <Play className="mr-2 h-4 w-4" /> Analyze Selected ({selectedIds.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={results.length > 0 && selectedIds.length === results.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Accession</TableHead>
                  <TableHead>Genotype</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Outbreak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(seq => (
                  <TableRow key={seq.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(seq.id)}
                        onCheckedChange={() => toggleSelect(seq.id)}
                      />
                    </TableCell>
                    <TableCell>{seq.accession}</TableCell>
                    <TableCell>{seq.genotype || "-"}</TableCell>
                    <TableCell>{seq.country || "-"}</TableCell>
                    <TableCell>{seq.samplingDate || "-"}</TableCell>
                    <TableCell>{seq.outbreak || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
