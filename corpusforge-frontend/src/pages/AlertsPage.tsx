import { BellOff } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';

export default function AlertsPage() {
  return (
    <div className="pt-6 px-6">
      <h1 className="text-2xl font-semibold text-text-primary">Alerts</h1>
      <EmptyState
        icon={BellOff}
        heading="No alerts yet"
        description="Alerts will appear here once pattern matches, outdated procedures, and coverage gaps are detected automatically. Coming soon."
      />
    </div>
  );
}
