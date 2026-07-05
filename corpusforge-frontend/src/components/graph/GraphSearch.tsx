import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface GraphSearchProps {
  onSearch: (value: string) => void;
  activeFocus: string;
}

export default function GraphSearch({ onSearch, activeFocus }: GraphSearchProps) {
  const [value, setValue] = useState('');

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(value.trim())}
          placeholder="Search node..."
          className="bg-bg-elevated border border-border-default rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/20 transition-fast w-44 sm:w-56"
        />
      </div>
      {activeFocus && (
        <button
          onClick={() => {
            setValue('');
            onSearch('');
          }}
          className="inline-flex items-center gap-1 text-xs text-accent-teal hover:underline min-h-[32px]"
        >
          <X size={12} /> {activeFocus}
        </button>
      )}
    </div>
  );
}
