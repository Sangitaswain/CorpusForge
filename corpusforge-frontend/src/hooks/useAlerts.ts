import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkAlertsNow, dismissAlert, dismissAllAlerts, getAlertCount, getAlerts } from '../api/alerts';

export function useAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: getAlerts });
}

// Sidebar badge — polled every 60s, same interval FP-07 originally specified.
export function useAlertCount() {
  return useQuery({ queryKey: ['alert-count'], queryFn: getAlertCount, refetchInterval: 60_000 });
}

function useInvalidateAlerts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alert-count'] });
  };
}

export function useCheckAlertsNow() {
  const invalidate = useInvalidateAlerts();
  return useMutation({ mutationFn: checkAlertsNow, onSettled: invalidate });
}

export function useDismissAlert() {
  const invalidate = useInvalidateAlerts();
  return useMutation({ mutationFn: dismissAlert, onSettled: invalidate });
}

export function useDismissAllAlerts() {
  const invalidate = useInvalidateAlerts();
  return useMutation({ mutationFn: dismissAllAlerts, onSettled: invalidate });
}
