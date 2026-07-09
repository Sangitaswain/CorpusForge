import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-600 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-sm rounded-md px-4 py-3">
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss error" className="min-h-[44px] min-w-[44px] flex items-center justify-center -my-2 -mr-2">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
