import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useEntitySearch } from '../../hooks/useGraph';
import { NODE_COLORS, NODE_TYPE_LABELS, nodeTypeOf } from '../../utils/constants';

interface GraphSearchProps {
  onSearch: (value: string) => void;
  activeFocus: string;
}

export default function GraphSearch({ onSearch, activeFocus }: GraphSearchProps) {
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const { data: results = [] } = useEntitySearch(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (name: string) => {
    setValue('');
    setIsOpen(false);
    onSearch(name);
  };

  const showDropdown = isOpen && value.trim().length >= 2 && results.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setIsOpen(true);
              setHighlighted(0);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (!showDropdown) {
                if (e.key === 'Enter') commit(value.trim());
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlighted((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlighted((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                commit(results[highlighted].name);
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder="Search P-101, INC-2022-07…"
            // text-md (16px), not text-sm (13px) — avoids iOS Safari's auto-zoom-on-focus
            // for inputs under 16px.
            className="bg-bg-elevated border border-border-default rounded-md pl-9 pr-3 py-2 text-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/20 transition-fast w-44 sm:w-56"
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

      {showDropdown && (
        // SEARCH-2/SEARCH-7 — mono name + type indicator per row, not the Heat Stamp shape
        // itself (IDENT-2 reserves that for actual citations, not entity matches).
        <ul className="absolute top-full left-0 mt-1 w-64 bg-bg-surface border border-border-default rounded-md shadow-elevated overflow-hidden z-30">
          {results.map((result, i) => {
            const type = nodeTypeOf(result.type);
            return (
              <li key={result.id}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(result.name);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-fast ${
                    i === highlighted ? 'bg-bg-elevated' : ''
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[type] }} />
                  <span className="font-mono text-sm text-text-primary truncate">{result.name}</span>
                  <span className="text-2xs text-text-muted ml-auto shrink-0">{NODE_TYPE_LABELS[type]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
