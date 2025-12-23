import { useQuery } from "@tanstack/react-query";

export function useMicroreactData(analysisId: number, enabled = true) {
  return useQuery({
    queryKey: ["/api/microreact", analysisId],
    enabled: enabled && !!analysisId,
    retry: false,
  });
}
