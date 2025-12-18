import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useSequences() {
  return useQuery({
    queryKey: [api.sequences.list.path],
    queryFn: async () => {
      const res = await fetch(api.sequences.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sequences");
      return api.sequences.list.responses[200].parse(await res.json());
    },
  });
}

export function useUploadSequences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.sequences.upload.path, {
        method: api.sequences.upload.method,
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.sequences.upload.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to upload sequences");
      }
      return api.sequences.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sequences.list.path] });
    },
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sequences.delete.path, { id });
      const res = await fetch(url, { 
        method: api.sequences.delete.method,
        credentials: "include"
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Sequence not found");
        }
        throw new Error("Failed to delete sequence");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sequences.list.path] });
    },
  });
}
