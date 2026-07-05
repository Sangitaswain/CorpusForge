import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, heading, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Icon size={48} className="text-text-muted" />
      <h2 className="text-lg font-semibold text-text-secondary mt-4">{heading}</h2>
      <p className="text-sm text-text-muted text-center max-w-xs mt-2">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 bg-accent-orange hover:bg-accent-orange-bright text-white font-semibold text-sm px-4 py-2 rounded-md transition-fast min-h-[44px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
