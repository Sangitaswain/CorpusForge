import type { ActivityEvent } from '../../utils/dashboardStats';
import { formatRelativeTime } from '../../utils/dashboardStats';

const DOT_STYLES: Record<ActivityEvent['tone'], string> = {
  default: 'bg-accent-teal',
  warning: 'bg-accent-orange',
  critical: 'bg-red-500',
};

export default function RecentActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-text-muted py-6 text-center">No activity yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4 p-3">
      {events.map((event) => (
        <li key={event.id} className="flex items-start gap-3">
          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${DOT_STYLES[event.tone]}`} />
          <div className="min-w-0">
            <p className="text-sm text-text-primary truncate">{event.label}</p>
            <p className="text-xs text-text-muted">{formatRelativeTime(event.timestamp)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
