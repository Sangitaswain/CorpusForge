import { BellOff, RefreshCw } from 'lucide-react';
import { useAlertCount, useAlerts, useCheckAlertsNow, useDismissAlert, useDismissAllAlerts } from '../hooks/useAlerts';
import AlertCard from '../components/alerts/AlertCard';
import EmptyState from '../components/shared/EmptyState';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function AlertsPage() {
  const { data: alerts, isLoading, error } = useAlerts();
  const { data: countData } = useAlertCount();
  const checkNow = useCheckAlertsNow();
  const dismiss = useDismissAlert();
  const dismissAll = useDismissAllAlerts();

  const unreadCount = countData?.unread_count ?? 0;

  return (
    <div className="pt-6 px-4 sm:px-6 pb-10 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Alerts {unreadCount > 0 && <span className="text-text-muted font-normal">({unreadCount} unread)</span>}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Proactive checks for pattern matches, outdated procedures, knowledge cliffs, and coverage gaps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => checkNow.mutate()}
            disabled={checkNow.isPending}
            className="inline-flex items-center gap-2 bg-accent-orange hover:bg-accent-orange-bright disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-md transition-fast min-h-[44px]"
          >
            <RefreshCw size={16} className={checkNow.isPending ? 'animate-spin' : ''} />
            {checkNow.isPending ? 'Checking…' : 'Check Now'}
          </button>
          {alerts && alerts.length > 0 && (
            <button
              onClick={() => dismissAll.mutate()}
              disabled={dismissAll.isPending}
              className="border border-border-default text-text-secondary hover:bg-bg-elevated disabled:opacity-60 font-semibold text-sm px-4 py-2 rounded-md transition-fast min-h-[44px]"
            >
              Dismiss All
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {isLoading && <LoadingSpinner />}
        {error && <ErrorBanner message={error.message} />}
        {!isLoading && !error && alerts?.length === 0 && (
          <EmptyState
            icon={BellOff}
            heading="No alerts right now"
            description="Alerts fire automatically when new documents are ingested. Run a check now to scan everything already in the system."
            actionLabel="Check Now"
            onAction={() => checkNow.mutate()}
          />
        )}
        {alerts?.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onDismiss={(id) => dismiss.mutate(id)} />
        ))}
      </div>
    </div>
  );
}
