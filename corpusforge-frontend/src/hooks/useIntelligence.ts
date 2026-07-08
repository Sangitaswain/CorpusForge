import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPatterns, runPatternAnalysis } from '../api/intelligence';

export function usePatterns() {
  return useQuery({ queryKey: ['patterns'], queryFn: listPatterns });
}

export function useRunPatternAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runPatternAnalysis,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['patterns'] }),
  });
}
