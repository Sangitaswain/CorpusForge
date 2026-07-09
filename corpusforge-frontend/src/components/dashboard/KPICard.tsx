import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
}

export default function KPICard({ title, value, caption, icon: Icon }: KPICardProps) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        <Icon size={16} className="text-text-muted" />
      </div>
      <p className="text-kpi font-bold text-text-primary mt-2">{value}</p>
      {caption && <p className="text-xs text-text-muted mt-3">{caption}</p>}
    </div>
  );
}
