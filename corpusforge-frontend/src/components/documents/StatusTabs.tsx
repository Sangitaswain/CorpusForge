import type { DocumentStatus } from '../../types/document';

const TABS: { label: string; value: DocumentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Processing', value: 'processing' },
  { label: 'Done', value: 'done' },
  { label: 'Failed', value: 'failed' },
];

interface StatusTabsProps {
  active: DocumentStatus | 'all';
  onChange: (value: DocumentStatus | 'all') => void;
}

export default function StatusTabs({ active, onChange }: StatusTabsProps) {
  return (
    <div className="flex gap-4 border-b border-border-default">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`text-sm pb-2.5 -mb-px border-b-2 min-h-[44px] transition-fast ${
            active === tab.value
              ? 'text-text-primary font-semibold border-accent-teal'
              : 'text-text-secondary font-medium border-transparent hover:text-text-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
