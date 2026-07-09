import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompliance, listPatterns, runComplianceCheck, runPatternAnalysis } from '../api/intelligence';

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

export function useCompliance() {
  return useQuery({ queryKey: ['compliance'], queryFn: getCompliance });
}

export function useRunComplianceCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runComplianceCheck,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['compliance'] }),
  });
}
