import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-accent-teal" />
    </div>
  );
}
