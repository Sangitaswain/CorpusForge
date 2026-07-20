import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// A known, unresolved Firefox-only rendering quirk on the graph canvas: after panning, the
// canvas can go blank until another interaction repaints it (Chromium is unaffected — see
// project memory). This is a one-time, dismissible heads-up, not a fix — purely cosmetic,
// touches nothing in GraphCanvas/graphLens.
const STORAGE_KEY = 'corpusforge:firefox-notice-dismissed';

function isFirefox(): boolean {
  return /firefox/i.test(navigator.userAgent);
}

export default function FirefoxNotice() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed || !isFirefox()) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Best-effort — worst case the notice reappears next visit, no functional impact.
    }
  };

  return (
    <div className="flex items-start gap-2 border border-accent-orange/40 bg-accent-orange/10 rounded-md px-3 py-2 mt-3">
      <AlertTriangle size={14} className="text-accent-orange mt-0.5 shrink-0" />
      <p className="text-xs text-text-primary flex-1">
        This graph view is best experienced in Chrome. In Firefox, panning can occasionally leave
        the canvas blank until the next click or drag.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="text-text-muted hover:text-text-primary shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center"
      >
        <X size={14} />
      </button>
    </div>
  );
}
