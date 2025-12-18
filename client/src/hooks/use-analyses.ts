import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useAnalyses() {
  return useQuery({
    queryKey: [api.analyses.list.path],
    queryFn: async () => {
      const res = await fetch(api.analyses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analyses");
      return api.analyses.list.responses[200].parse(await res.json());
    },
    // Poll every 5 seconds for status updates if there are pending jobs
    refetchInterval: 5000 
  });
}

export function useAnalysis(id: number) {
  return useQuery({
    queryKey: [api.analyses.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.analyses.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch analysis");
      return api.analyses.get.responses[200].parse(await res.json());
    },
    refetchInterval: (query) => {
      // Poll while status is pending or running
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    }
  });
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { type: string; sequenceIds: number[]; parameters: Record<string, any> }) => {
      const validated = api.analyses.create.input.parse(data);
      const res = await fetch(api.analyses.create.path, {
        method: api.analyses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.analyses.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create analysis");
      }
      return api.analyses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.analyses.list.path] });
    },
  });
}
