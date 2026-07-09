import { Check, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ChecklistItem {
  label: string;
  done: boolean;
  to: string;
}

export default function GettingStartedChecklist({ items }: { items: ChecklistItem[] }) {
  const navigate = useNavigate();
  if (items.every((item) => item.done)) return null;

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5">
      <h2 className="text-sm font-semibold text-text-primary">Getting Started</h2>
      <div className="flex flex-col gap-2 mt-3">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
            disabled={item.done}
            className={`flex items-center gap-2.5 text-sm text-left min-h-[36px] ${
              item.done ? 'text-text-muted' : 'text-text-primary hover:text-accent-teal transition-fast'
            }`}
          >
            {item.done ? (
              <Check size={16} className="text-accent-teal shrink-0" />
            ) : (
              <Circle size={16} className="text-text-muted shrink-0" />
            )}
            <span className={item.done ? 'line-through' : ''}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
